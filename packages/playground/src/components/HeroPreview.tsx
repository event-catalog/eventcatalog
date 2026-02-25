import { memo, useState, useEffect, useRef, useCallback } from 'react';
import type { GraphNode, GraphEdge } from '@eventcatalog/visualiser';
import { registerEcLanguage } from '../monaco/ec-language';

// Self-contained DSL for the parser (inline definitions so it renders without import resolution)
const HERO_DSL = `visualizer main {
  channel orderCreated {
    version 1.0.0
    address "orders.created"
    protocol "kafka"
  }

  channel orderShipped {
    version 1.0.0
    address "orders.shipped"
    protocol "kafka"
  }

  domain OrderManagement {
    version 1.0.0
    summary "Handles the full order lifecycle"

    service OrderService {
      version 1.0.0
      summary "Manages order lifecycle"

      sends event OrderCreated to orderCreated {
        version 1.0.0
        summary "Fired when a new order is placed"
      }

      sends event OrderShipped to orderShipped {
        version 1.0.0
        summary "Fired when an order has been shipped"
      }

      receives event OrderCancelled {
        version 1.0.0
        summary "Handles order cancellation requests"
      }
    }
  }

  service ShippingService {
    version 1.0.0
    summary "Handles shipping and delivery"
    @note("Migrating to new carrier API in Q3")

    receives event OrderCreated from orderCreated
    sends event OrderShipped to orderShipped
  }

  service NotificationService {
    version 1.0.0
    summary "Sends customer notifications"
    @note("Supports email, SMS, and push channels")

    receives event OrderCreated from orderCreated
    receives event OrderShipped from orderShipped
  }
}`;

// The code shown in the Monaco editor — shows import syntax prominently
const EDITOR_CODE = `// 1. Import the OrderService from your AsyncAPI spec
import OrderService from "./orders-asyncapi.yml"

// 2. Import specific events and channels to use
import events { OrderCreated, OrderShipped }
  from "./orders-asyncapi.yml"
import channels { orderCreated, orderShipped }
  from "./orders-asyncapi.yml"

visualizer main {

  // 3. Place the imported service inside a domain
  domain OrderManagement {
    version 1.0.0
    summary "Handles the full order lifecycle"

    service OrderService
  }

  // 4. Wire up other services using the imported events
  service ShippingService {
    version 1.0.0
    summary "Handles shipping and delivery"
    @note("Migrating to new carrier API in Q3")

    receives event OrderCreated from orderCreated
    sends event OrderShipped to orderShipped
  }

  service NotificationService {
    version 1.0.0
    summary "Sends customer notifications"
    @note("Supports email, SMS, and push channels")

    receives event OrderCreated from orderCreated
    receives event OrderShipped from orderShipped
  }
}`;

// Sample AsyncAPI spec shown when clicking the asyncapi tab
const ASYNCAPI_CODE = `asyncapi: 3.0.0
info:
  title: Order Service
  version: 1.0.0
  description: Manages order lifecycle events

channels:
  orderCreated:
    address: orders.created
    messages:
      OrderCreated:
        payload:
          type: object
          properties:
            orderId:
              type: string
              format: uuid
            customerId:
              type: string
            totalAmount:
              type: number
            currency:
              type: string
            items:
              type: array
              items:
                type: object
                properties:
                  productId:
                    type: string
                  quantity:
                    type: integer
                  price:
                    type: number

  orderShipped:
    address: orders.shipped
    messages:
      OrderShipped:
        payload:
          type: object
          properties:
            orderId:
              type: string
              format: uuid
            trackingNumber:
              type: string
            carrier:
              type: string
            estimatedDelivery:
              type: string
              format: date-time

operations:
  sendOrderCreated:
    action: send
    channel:
      $ref: "#/channels/orderCreated"
  sendOrderShipped:
    action: send
    channel:
      $ref: "#/channels/orderShipped"
  receiveOrderCancelled:
    action: receive
    channel:
      address: orders.cancelled`;

// Sample OpenAPI spec shown when clicking the openapi tab
const OPENAPI_CODE = `openapi: 3.0.3
info:
  title: Payments API
  version: 1.0.0
  description: Handles payment processing

paths:
  /payments:
    post:
      summary: Process a payment
      operationId: processPayment
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                orderId:
                  type: string
                  format: uuid
                amount:
                  type: number
                currency:
                  type: string
                method:
                  type: string
                  enum: [credit_card, debit_card, bank_transfer]
      responses:
        "201":
          description: Payment processed
          content:
            application/json:
              schema:
                type: object
                properties:
                  paymentId:
                    type: string
                  status:
                    type: string
                    enum: [pending, completed, failed]

  /payments/{paymentId}:
    get:
      summary: Get payment status
      operationId: getPaymentStatus
      parameters:
        - name: paymentId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Payment details
          content:
            application/json:
              schema:
                type: object
                properties:
                  paymentId:
                    type: string
                  orderId:
                    type: string
                  status:
                    type: string
                  amount:
                    type: number`;

interface HeroFile {
  name: string;
  content: string;
  language: string;
}

const HERO_FILES: HeroFile[] = [
  { name: 'main.ec', content: EDITOR_CODE, language: 'ec' },
  { name: 'orders-asyncapi.yml', content: ASYNCAPI_CODE, language: 'yaml' },
  { name: 'payments-openapi.yml', content: OPENAPI_CODE, language: 'yaml' },
];

interface DslGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  visualizers?: string[];
  activeVisualizer?: string;
  title?: string;
  empty?: boolean;
  options?: Record<string, unknown>;
}

/** Lazily parse the hero DSL once and cache the result. */
let cachedGraph: DslGraph | null = null;

async function parseHeroDsl(): Promise<DslGraph> {
  if (cachedGraph) return cachedGraph;

  const langModule = await import('@eventcatalog/language-server');
  const { EmptyFileSystem, URI } = await import('langium');

  const services = langModule.createEcServices(EmptyFileSystem);
  const uri = URI.parse('file:///hero-preview.ec');
  const document = services.shared.workspace.LangiumDocumentFactory.fromString(HERO_DSL, uri);
  services.shared.workspace.LangiumDocuments.addDocument(document);
  await services.shared.workspace.DocumentBuilder.build([document]);

  const graph: DslGraph = langModule.astToGraph(document.parseResult.value);

  try {
    services.shared.workspace.LangiumDocuments.deleteDocument(uri);
  } catch {
    // Ignore cleanup errors
  }

  cachedGraph = graph;
  return graph;
}

const LiveVisualizer = memo(function LiveVisualizer({ graph, id, portalId }: { graph: DslGraph; id: string; portalId: string }) {
  const [NodeGraph, setNodeGraph] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    import('@eventcatalog/visualiser').then((mod) => {
      setNodeGraph(() => mod.NodeGraph);
    });
  }, []);

  if (!NodeGraph) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <NodeGraph
        id={id}
        portalId={portalId}
        graph={graph}
        mode="full"
        zoomOnScroll={false}
        showSearch={false}
        includeKey={false}
      />
    </div>
  );
});

/** Read-only Monaco editor for the code panel */
const HeroEditor = memo(function HeroEditor({ value, language }: { value: string; language: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;

    import('@monaco-editor/react').then((mod) => {
      // We can't use the React component easily here since we need beforeMount,
      // so we'll set state to trigger a render instead
      if (!disposed) {
        setReady(true);
      }
    });

    return () => { disposed = true; };
  }, []);

  const [ready, setReady] = useState(false);
  const [MonacoEditor, setMonacoEditor] = useState<any>(null);

  useEffect(() => {
    if (!ready) return;
    import('@monaco-editor/react').then((mod) => {
      setMonacoEditor(() => mod.default);
    });
  }, [ready]);

  const handleBeforeMount = useCallback((monaco: any) => {
    // Register EC language + dark theme synchronously before editor mounts
    const langs = monaco.languages.getLanguages();
    if (!langs.some((l: any) => l.id === 'ec')) {
      registerEcLanguage(monaco);
    }
  }, []);

  const handleMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, language);
    }
  }, [language]);

  if (!MonacoEditor) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#484f58', fontSize: 12 }}>Loading editor...</span>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }} onKeyDown={(e) => e.stopPropagation()}>
      <MonacoEditor
        height="100%"
        language={language}
        theme="ec-dark"
        value={value}
        beforeMount={handleBeforeMount}
        onMount={handleMount}
        options={{
          readOnly: true,
          fontSize: window.innerWidth <= 768 ? 11 : 13,
          lineHeight: window.innerWidth <= 768 ? 17 : 20,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          padding: { top: 12 },
          automaticLayout: true,
          tabSize: 2,
          renderWhitespace: 'none',
          bracketPairColorization: { enabled: true },
          lineNumbers: window.innerWidth <= 768 ? 'off' : 'on',
          folding: false,
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
          },
          domReadOnly: true,
          contextmenu: false,
        }}
      />
    </div>
  );
});

const MIN_SPLIT = 25;
const MAX_SPLIT = 75;
const DEFAULT_SPLIT = 40;

export const HeroPreview = memo(function HeroPreview() {
  const [graph, setGraph] = useState<DslGraph | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const [splitPct, setSplitPct] = useState(DEFAULT_SPLIT);
  const isDragging = useRef(false);
  const [activeTab, setActiveTab] = useState(0);

  const loadGraph = useCallback(() => {
    if (started.current) return;
    started.current = true;
    parseHeroDsl().then(setGraph);
  }, []);

  // Start loading when the component is near the viewport
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadGraph();
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadGraph]);

  // Resize handle
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !bodyRef.current) return;
      const rect = bodyRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setSplitPct(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, pct)));
    };

    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="hero-preview-wrapper" ref={containerRef}>
      <div className="editor-window">
        <div className="editor-titlebar">
          <div className="editor-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="editor-tabs">
            {HERO_FILES.map((file, i) => (
              <div
                key={file.name}
                className={`editor-tab${i === activeTab ? ' active' : ''}`}
                onClick={() => setActiveTab(i)}
                style={{ cursor: 'pointer' }}
              >
                {file.name}
              </div>
            ))}
          </div>
        </div>
        <div className="hero-editor-body" ref={bodyRef}>
          <div className="hero-editor-code" style={{ width: `${splitPct}%` }}>
            <HeroEditor value={HERO_FILES[activeTab].content} language={HERO_FILES[activeTab].language} />
          </div>
          <div
            className="hero-resize-handle"
            onMouseDown={onMouseDown}
          >
            <div className="hero-resize-line" />
          </div>
          <div className="hero-editor-viz hero-editor-viz-desktop" style={{ width: `${100 - splitPct}%` }}>
            <div id="hero-preview-portal" style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
            {graph ? (
              <LiveVisualizer graph={graph} id="hero-preview" portalId="hero-preview-portal" />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#4a4f63', fontSize: 12 }}>Loading visualizer...</span>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Mobile: visualizer as separate card below editor */}
      <div className="hero-viz-mobile">
        <div className="hero-viz-mobile-label">Live preview</div>
        <div className="hero-viz-mobile-inner">
          <div id="hero-preview-portal-mobile" style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
          {graph ? (
            <LiveVisualizer graph={graph} id="hero-preview-mobile" portalId="hero-preview-portal-mobile" />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#4a4f63', fontSize: 12 }}>Loading visualizer...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/** Standalone visualizer for embedding in the "Visualize and share" step. */
export const StepVisualizer = memo(function StepVisualizer() {
  const [graph, setGraph] = useState<DslGraph | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          parseHeroDsl().then(setGraph);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const [NodeGraph, setNodeGraph] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (!graph) return;
    import('@eventcatalog/visualiser').then((mod) => {
      setNodeGraph(() => mod.NodeGraph);
    });
  }, [graph]);

  return (
    <div ref={containerRef} className="step-viz-container">
      <div id="step-viz-portal" style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
      {graph && NodeGraph ? (
        <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <NodeGraph
            id="step-visualizer"
            portalId="step-viz-portal"
            graph={graph}
            mode="full"
            zoomOnScroll={false}
            showSearch={false}
            includeKey={false}
          />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#4a4f63', fontSize: 12 }}>Loading visualizer...</span>
        </div>
      )}
    </div>
  );
});
