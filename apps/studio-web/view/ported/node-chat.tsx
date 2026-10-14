// Ported from event-catalog/eventcatalog@v5-beta:packages/core/eventcatalog/src/features/mcp/apps/architecture-diagram/node-chat.tsx
/**
 * A small modal shown next to a node clicked in the architecture diagram view, to ask a question
 * about it. Nothing is sent until the user sends their question: it then goes to the conversation
 * in the MCP host with the node it is about, so the model can answer it with the EventCatalog tools.
 */
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { Check, SendHorizontal, X } from 'lucide-react';
import { useNodeAnchor } from '@eventcatalog/visualiser/studio';

export type SelectedNode = {
  /** The node's id in the diagram, to find it on screen */
  nodeId: string;
  type: string;
  id: string;
  name: string;
  version?: string;
  summary?: string;
};

/** How the node is described to the model, so it can look it up in EventCatalog */
export const describeNodeForModel = (node: Pick<SelectedNode, 'type' | 'id' | 'name' | 'version'>) =>
  `the ${node.type.toLowerCase()} "${node.name}" (id: ${node.id}${node.version ? `, version: ${node.version}` : ''})`;

const MODAL_WIDTH = 300;
const EDGE = 8;

type NodeChatProps = {
  node: SelectedNode;
  /** The diagram the node is in, to position the modal next to it */
  containerRef: RefObject<HTMLElement | null>;
  /** Whether the host lets the view send messages to the conversation */
  canSend: boolean;
  onSend: (question: string) => Promise<void>;
  onClose: () => void;
};

export function NodeChat({ node, containerRef, canSend, onSend, onClose }: NodeChatProps) {
  const [question, setQuestion] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const anchor = useNodeAnchor(node.nodeId, containerRef, modalRef);

  useEffect(() => {
    setQuestion('');
    setStatus('idle');
  }, [node.nodeId]);

  // Focus the question once the modal is shown next to the node (it is hidden until then, and
  // can't take focus). Waits a moment so a closing right-click menu doesn't take the focus back.
  const isShown = anchor !== null;
  useEffect(() => {
    if (!isShown) return;
    const timeout = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(timeout);
  }, [isShown, node.nodeId]);

  // Close on Escape, or on a click on the empty diagram (but not when it is dragged to pan)
  useEffect(() => {
    let pressedAt: { x: number; y: number } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      pressedAt = (event.target as Element).closest?.('.react-flow__pane') ? { x: event.clientX, y: event.clientY } : null;
    };
    const onPointerUp = (event: PointerEvent) => {
      if (pressedAt && Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) < 4) onClose();
      pressedAt = null;
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  // Close shortly after the question is sent, once the user has seen it went
  useEffect(() => {
    if (status !== 'sent') return;
    const timeout = setTimeout(onClose, 1500);
    return () => clearTimeout(timeout);
  }, [status, onClose]);

  const send = async () => {
    if (!question.trim() || status === 'sending' || status === 'sent') return;
    setStatus('sending');
    try {
      await onSend(question.trim());
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    send();
  };

  // Enter sends, Shift+Enter adds a new line
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <div
      ref={modalRef}
      className="ec-mcp-modal"
      data-side={anchor?.side ?? 'right'}
      role="dialog"
      aria-label={`Ask a question about ${node.name}`}
      style={{
        width: MODAL_WIDTH,
        top: anchor?.top ?? EDGE,
        left: anchor?.left ?? EDGE,
        visibility: anchor ? 'visible' : 'hidden',
      }}
    >
      <div className="ec-mcp-modal-header">
        <span className="ec-mcp-type">{node.type}</span>
        <span className="ec-mcp-name">{node.name}</span>
        {node.version && <span className="ec-mcp-version">v{node.version}</span>}
        <button type="button" className="ec-mcp-modal-close" aria-label="Close" onClick={onClose}>
          <X aria-hidden />
        </button>
      </div>
      {node.summary && <p className="ec-mcp-modal-summary">{node.summary}</p>}

      {status === 'sent' ? (
        <p className="ec-mcp-modal-sent">
          <Check aria-hidden />
          Sent to the chat
        </p>
      ) : canSend ? (
        <form className="ec-mcp-modal-form" onSubmit={handleSubmit}>
          <label htmlFor="ec-mcp-question">Ask a question</label>
          <div className="ec-mcp-composer">
            <textarea
              id="ec-mcp-question"
              ref={inputRef}
              rows={2}
              value={question}
              placeholder={`Ask about ${node.name}…`}
              disabled={status === 'sending'}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="ec-mcp-composer-footer">
              <span className="ec-mcp-composer-hint">Enter to send</span>
              <button
                type="submit"
                className="ec-mcp-composer-send"
                aria-label={status === 'sending' ? 'Sending' : 'Send to chat'}
                title="Send to chat"
                disabled={!question.trim() || status === 'sending'}
              >
                <SendHorizontal aria-hidden />
              </button>
            </div>
          </div>
          {status === 'failed' && <p className="ec-mcp-modal-error">Couldn't send this to the chat. Try again.</p>}
        </form>
      ) : (
        <p className="ec-mcp-modal-hint">This app can't send questions here. Ask about {node.name} in the chat.</p>
      )}
    </div>
  );
}
