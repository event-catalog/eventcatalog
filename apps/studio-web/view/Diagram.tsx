/**
 * The architecture diagram: the EventCatalog visualiser with its levels (overview, services, messages), built in
 * the browser from the model. Used by both entries: inside MCP hosts (main.tsx McpApp) and in the browser (WebPage).
 * Adapted from event-catalog/eventcatalog@v5-beta:packages/core/eventcatalog/src/features/mcp/apps/architecture-diagram/view.tsx
 * and apps/canvas/view.tsx (model context).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Braces,
  Download,
  ExternalLink,
  FolderOpen,
  ImageDown,
  LayoutDashboard,
  Maximize2,
  Monitor,
  Moon,
  Share2,
  StickyNote,
  Sun,
} from 'lucide-react';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { hasContent, loadLocalCanvas, saveChatView, saveLocalCanvas, type LocalPayload } from './local-canvas';
import { ConfirmDialog } from './ConfirmDialog';
import { JoinDialog } from './collab/JoinDialog';
import { ProfileMenu } from './collab/ProfileMenu';
import { hasJoinedRoom, isRoomStarter, markRoomJoined, markRoomStarted, myIdentity, newRoom, roomFragment, RoomConnection, setMyIdentity, type Editing, type Moving, type Peer, type RoomLink, type RoomStatus } from './collab/room';
import type * as Y from 'yjs';
import type { Node } from '@xyflow/react';
import { MESSAGE_TYPES, type ArchitecturePayload, type Model, type Resource } from '@eventcatalog/visualiser/model';
import { buildOpeningGraphs } from '../src/model/to-graph';
import { summarise } from '../src/model/to-text';
import { outlineText } from '../src/model/outline';
import { applyChanges, type Changes } from '../src/model/changes';
import { serveDiagram, type DiagramBridgeHandlers } from './diagram-bridge';
import { agentCanvasFor } from './studio/apply-agent-canvas';
import { NodeChat, describeNodeForModel, type SelectedNode } from './ported/node-chat';
import { resourceForNode } from './focus';
import { DocumentModal } from './DocumentModal';
import { AppMenu, type Theme } from './AppMenu';
import { ShareDialog } from './ShareDialog';
import { NodeInfo } from './NodeInfo';
import { exportDiagramImage } from './export-image';
import {
  DIAGRAM_FILE_EXTENSION,
  canPickWhereToSave,
  cleanFileName,
  fileNameFor,
  pickDiagramFile,
  readDiagramFile,
  saveToPickedFile,
  toDiagramFile,
  type SavedFileHandle,
} from '@eventcatalog/visualiser/studio';
import { saveFile } from './diagram-file';
import { SaveFileDialog } from './SaveFileDialog';
import { ExportDialog } from './ExportDialog';
import { Toast, type Notice } from './Toast';
import { copyToClipboard } from './ported/clipboard';
import { EmptyCanvas } from '@eventcatalog/visualiser/studio';
import { ConnectAgentDialog } from './ConnectAgentDialog';
import { isWebMcpPolyfillOn, turnOnWebMcpPolyfill, useWebMcp, type WebMcpCanvas } from './webmcp';
import { StudioCanvas, type CanvasSnapshot, type StudioCanvasHandle } from './studio/StudioCanvas';
import type { MenuQuestion } from '@eventcatalog/visualiser/studio';
import { canvasToModel, modelToCanvas, type ModelCanvasContent as CanvasContent } from '@eventcatalog/visualiser/studio';
import { CommandPalette, type Command } from './CommandPalette';
import { ShortcutsDialog } from './ShortcutsDialog';
import { RESOURCE_LOOK, TypeIcon } from './resource-types';
import { viewLink } from '../src/lib/encode';
import { INLINE_HEIGHT } from './diagram-styles';
import { fullscreenStyle } from './ported/app-view';
import { BuildStage } from './build/BuildStage';
import { toStage, type StageState } from './build/choreography';
import { bump, configureAnalytics, durationBucket, modelMix, modelStats as diagramStats, notePeople, sizeBucket, track } from './analytics';


const LEVEL_NUMBERS = { overview: 1, services: 2, messages: 3 } as const;
// How long an agent's edit waits for a diagram still being laid out (under the server's wait for its answer)
const CANVAS_READY_MS = 6000;
/** Waits (a tenth of a second at a time) until `ready`, or `ms` go by; whether it got there */
async function waitUntil(ready: () => boolean, ms: number) {
  for (const until = Date.now() + ms; !ready(); ) {
    if (Date.now() > until) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return true;
}
const FULL_PAGE = { height: '100vh' };
const INLINE = { height: INLINE_HEIGHT };

/** An http(s) link (what's safe to open from a diagram) */
const isWebLink = (url: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(url, location.href).protocol);
  } catch {
    return false;
  }
};

// Too much to watch being built one node at a time: shown straight away
const MAX_ANIMATED_NODES = 120;
const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

// Questions for the agent about a node, in its right-click menu (when the chat takes them)
type PromptKind = 'explain' | 'flow' | 'dependencies' | 'code';

/** What a right-click prompt asks the agent */
function promptFor(kind: PromptKind, resource: Resource, model: Model) {
  const subject = `the ${resource.type} "${resource.name}" (id: ${resource.id})`;
  switch (kind) {
    case 'explain':
      return `Explain ${subject} in the "${model.title}" architecture: what it does, and how it connects to the rest.`;
    case 'flow':
      return `Walk me through ${subject}: who sends it, who receives it, which channels it goes through, and what happens next. Use the code to check.`;
    case 'dependencies':
      return `What does ${subject} depend on, and what depends on it? Look at the code for anything missing from the diagram.`;
    case 'code':
      return `Show me the code for ${subject} (${resource.evidence}) and explain it.`;
  }
}

const typeLabel = (resource: Resource) => RESOURCE_LOOK[resource.type].label;

type DiagramProps = {
  payload: ArchitecturePayload;
  /** In an MCP host: asks questions about nodes, opens links and full screen through it */
  app?: App | null;
  hostContext?: McpUiHostContext;
  /** In the browser: full page height */
  fullPage?: boolean;
  /** Build diagrams up in front of the user (results from the agent), rather than showing them (shared links) */
  animate?: boolean;
  /** In a chat: the diagram's id, for the agent to change and read it here (edit_diagram, read_diagram) */
  diagramId?: string;
  /** What's already been built in front of the user (the agent's draft, as it wrote it): the build carries on from it */
  builtBefore?: StageState;
  /** A payload laid out again as soon as it's open (a link opened: where it had things may be out of date) */
  reorderWhenOpened?: ArchitecturePayload;
  /** A live room this canvas is shared in (in the browser): its id and key, from the link */
  room?: RoomLink;
};

/**
 * The canvas (EventCatalog Studio's, see studio/StudioCanvas.tsx) with the diagram around it: the agent building it
 * up, each node's page, asking the agent, files, sharing and exporting. What's on the
 * canvas is the model: it starts from the agent's (or the link's, or a file's), and what people change there goes back
 * into it, for links, files, exports and the agent.
 */
export function Diagram({
  payload: incomingPayload,
  app,
  hostContext,
  fullPage,
  animate = false,
  diagramId,
  builtBefore,
  reorderWhenOpened,
  room,
}: DiagramProps) {
  // The diagram from the agent (or the link), until a file is opened in its place
  const [toolPayload, setToolPayload] = useState(incomingPayload);
  useEffect(() => setToolPayload(incomingPayload), [incomingPayload]);
  // A link just opened: laid out with the visualiser's layout once it's on the canvas (and measured), as Reorder does
  const reorderOpened = useRef(reorderWhenOpened);
  reorderOpened.current = reorderWhenOpened;
  // An opened file is shown as it is, not built up
  const openedPayload = useRef<ArchitecturePayload>(undefined);
  // A diagram from the agent in this browser (WebMCP): built up in front of the user, as the agent's in a chat are
  const agentPayload = useRef<ArchitecturePayload>(undefined);
  // Diagrams from the agent are built up in front of the user
  const animateNext = useRef(animate);

  // What the canvas starts from (the model, as Studio's canvas), and the model as it is on the canvas now
  const [content, setContent] = useState<CanvasContent | null>(null);
  const [canvasModel, setCanvasModel] = useState<Model | null>(null);
  const rootModel = canvasModel ?? toolPayload.model;
  const model = rootModel;
  const focus = toolPayload.focus;
  const notes = rootModel.notes ?? [];

  const [error, setError] = useState<string | null>(null);
  // A clicked node shows what it is; "Ask a question about this" (right-click) asks the agent
  const [selected, setSelected] = useState<{ nodeId: string; resourceId: string; asking?: boolean } | null>(null);
  const canvasRef = useRef<StudioCanvasHandle>(null);
  const graphRef = useRef<HTMLDivElement | null>(null);
  const [graphElement, setGraphElement] = useState<HTMLDivElement | null>(null);
  const [isDocumenting, setIsDocumenting] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showingHelp, setShowingHelp] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // A note or text about to be put on the canvas: the welcome makes way for it
  const [placing, setPlacing] = useState(false);
  // A level picked from the welcome: they're after the canvas, so the welcome makes way for good
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [choosing, setChoosing] = useState(false);
  // The canvas locked: a node's details are read, not edited
  const [locked, setLocked] = useState(false);
  // Save to file: naming it (where the browser can't ask), and the file saved to (to save to again)
  const [savingAs, setSavingAs] = useState(false);
  const [exporting, setExporting] = useState(false);
  const savedFile = useRef<SavedFileHandle>(undefined);
  // A toast at the bottom: what just happened (copied, saved), or what went wrong (a file that couldn't be opened or saved)
  // Each one stamped when it's shown, so the same message again (copying twice) shows again
  const [notice, setNotice] = useState<Notice & { at: number }>();
  const succeeded = useCallback((text: string) => setNotice({ text, tone: 'success', at: Date.now() }), []);
  const failed = useCallback((text: string) => setNotice({ text, tone: 'error', at: Date.now() }), []);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(undefined), notice.tone === 'success' ? 3000 : 6000);
    return () => clearTimeout(timeout);
  }, [notice]);
  const [sharing, setSharing] = useState<'share' | 'open' | null>(null);
  // The build being played (see build/choreography.ts), and what the agent's last diagram looked like when done
  const [building, setBuilding] = useState<{ from?: StageState; to: StageState } | null>(null);
  // What the agent drew is tidied once its build has played
  const reorderAfterBuild = useRef(false);
  const buildDone = useCallback(() => {
    setBuilding(null);
    if (!reorderAfterBuild.current) return;
    reorderAfterBuild.current = false;
    setTimeout(() => canvasRef.current?.tidy(), 150);
  }, []);
  const lastBuilt = useRef<StageState | undefined>(builtBefore);

  // A new diagram (from the agent, a link or a file): laid out, built up in front of the user, and put on the canvas
  // The title the agent gave it since (edit_diagram's set_title: the canvas doesn't hold the title)
  const titleSet = useRef<string>(undefined);
  useEffect(() => {
    let cancelled = false;
    // A title the agent gave the last diagram isn't this one's
    titleSet.current = undefined;
    const next = toolPayload.model;
    animateNext.current = (animate || toolPayload === agentPayload.current) && toolPayload !== openedPayload.current;
    if (toolPayload !== openedPayload.current) savedFile.current = undefined;
    setSelected(null);
    setCanvasModel(null);
    setError(null);
    // Nothing to lay out: only its notes, text, comments and hotspots (if it has none, the canvas welcomes them)
    // A live room's copy kept in this browser: its document, as it was (see local-canvas.ts)
    const kept = (toolPayload as LocalPayload).doc;
    if (next.resources.length || next.notes?.length || next.comments?.length || next.hotspots?.length) {
      // Where it came from: a file opened, the agent (in a chat), a link opened, a live room, or kept in this browser
      const via = toolPayload === openedPayload.current ? 'file' : toolPayload === agentPayload.current ? 'webmcp' : app ? 'agent' : reorderOpened.current === toolPayload ? 'link' : room ? 'room' : 'restored';
      track('diagram_loaded', { via, level: toolPayload.level ?? 'messages', has_focus: !!focus, ...diagramStats(next), ...modelMix(next) });
    }
    if (!next.resources.length) {
      void modelToCanvas(next).then((canvas) => !cancelled && setContent(kept ? { ...canvas, doc: kept } : canvas));
      return () => {
        cancelled = true;
      };
    }
    const level = toolPayload.level ?? 'messages';
    // Browser tests can hold the layout up (window.__studioTest.layoutDelayMs, only when they set it up), to send
    // the agent's edits while a diagram is still opening
    const testDelay = (window as { __studioTest?: { layoutDelayMs?: number } }).__studioTest?.layoutDelayMs ?? 0;
    new Promise((resolve) => setTimeout(resolve, testDelay))
      .then(() => buildOpeningGraphs(next, focus, level))
      .then(async ({ canvas: built, opening }) => {
        if (cancelled) return;
        // Arranged before (it has a layout): as it was; else where the diagram puts things, so the build ends there
        const canvas = await modelToCanvas(next, next.layout?.messages ? undefined : built);
        if (cancelled) return;
        const to = toStage(opening);
        const fromAgent = animateNext.current;
        const playing = fromAgent && !next.layout?.messages && to.nodes.size <= MAX_ANIMATED_NODES && !prefersReducedMotion();
        if (playing) {
          setBuilding({ from: lastBuilt.current, to });
          // From the agent's draft (built as it wrote it), or changed from its last diagram
          const fromDraft = !!builtBefore && lastBuilt.current === builtBefore;
          track('build_played', { nodes: sizeBucket(to.nodes.size), changed: !!lastBuilt.current && !fromDraft, from_draft: fromDraft });
        }
        if (fromAgent) lastBuilt.current = to;
        animateNext.current = false;
        setContent(kept ? { ...canvas, doc: kept } : canvas);
        // Tidied once it's on the canvas (the visualiser's layout, as Reorder does): a link someone opened, and what
        // the agent drew (not one it sent back with the layout people gave it). After the build, if one plays
        const tidy = reorderOpened.current === toolPayload || (fromAgent && !next.layout?.messages);
        if (tidy && playing) reorderAfterBuild.current = true;
        else if (tidy) setTimeout(() => !cancelled && canvasRef.current?.tidy(), 400);
      })
      .catch((buildError) => {
        if (cancelled) return;
        setError(String(buildError?.message ?? buildError));
        track('diagram_failed', { resources: sizeBucket(next.resources.length) });
      });
    return () => {
      cancelled = true;
    };
  }, [toolPayload]);

  // What's changed on the canvas goes into the model (for links, files, exports and the agent)
  const onCanvasChange = useCallback(
    (snapshot: CanvasSnapshot) => {
      const base = titleSet.current ? { ...toolPayload.model, title: titleSet.current } : toolPayload.model;
      setCanvasModel(canvasToModel(snapshot.nodes, snapshot.edges, snapshot.levelLayouts, base, snapshot.threads, snapshot.hotspots));
    },
    [toolPayload]
  );
  // The agent's focus: centred once it's on the canvas
  useEffect(() => {
    if (!content || !focus) return;
    const timeout = setTimeout(() => canvasRef.current?.centreOn(focus), 500);
    return () => clearTimeout(timeout);
  }, [content]);

  const canSend = !!app?.getHostCapabilities()?.message;

  const sendToChat = useCallback(
    async (text: string) => {
      if (!app) return;
      const result = await app.sendMessage({ role: 'user', content: [{ type: 'text', text }] });
      if (result.isError) throw new Error('The host did not accept the message');
    },
    [app]
  );

  // Each node's questions for the agent, in its right-click menu
  const questionsFor = useCallback(
    (node: { id: string }): MenuQuestion[] => {
      const resource = model.resources.find((r) => r.id === node.id);
      if (!resource || !canSend) return [];
      const prompt = (kind: PromptKind, label: string) => ({
        label,
        onSelect: () => {
          track('node_question_sent', { kind, resource_type: resource.type });
          void sendToChat(promptFor(kind, resource, model)).catch(() => failed("Couldn't send that to the chat."));
        },
      });
      return [
        { label: 'Ask a question about this', onSelect: () => setSelected({ nodeId: node.id, resourceId: resource.id, asking: true }) },
        prompt('explain', `Explain this ${typeLabel(resource).toLowerCase()}`),
        ...(MESSAGE_TYPES.has(resource.type) ? [prompt('flow', 'Walk me through this flow')] : []),
        ...(resource.type === 'service' ? [prompt('dependencies', 'What does it depend on?')] : []),
        ...(resource.evidence ? [prompt('code', 'Show me the code')] : []),
      ];
    },
    [model, canSend, sendToChat, failed]
  );

  /** A sticky note: beside a resource, or (the note tool) where the canvas is clicked next */
  const openNotes = useCallback((resource?: string) => {
    setSelected(null);
    if (resource) canvasRef.current?.addNote({ nodeId: resource });
    else canvasRef.current?.pickNoteTool();
  }, []);

  // Nothing in the diagram links anywhere real (there's no catalog behind it), and changing the page's hash would
  // lose the model in the browser view: links in it are kept from navigating
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.('.react-flow a[href]');
      if (anchor) event.preventDefault();
    };
    document.addEventListener('click', onClick, true);
    // Domain and system cards navigate with this; there's nowhere to go
    const bridge = window as unknown as { __ecNavigate?: (url: string) => void };
    bridge.__ecNavigate = () => {};
    return () => {
      document.removeEventListener('click', onClick, true);
      delete bridge.__ecNavigate;
    };
  }, []);

  const baseUrl = toolPayload.viewUrl ? new URL(toolPayload.viewUrl).origin : !app ? window.location.origin : undefined;
  // Analytics: in the browser or a chat (which), and whether this is our server or someone's local one
  useEffect(() => configureAnalytics({ host: app ? (app.getHostVersion()?.name ?? 'chat') : undefined, serverOrigin: baseUrl }), [app, baseUrl]);
  // (only in a chat, for the agent: it compresses the whole model, on every change)
  const selectedResource = selected ? model.resources.find((r) => r.id === selected.resourceId) : undefined;
  const selectedForChat: SelectedNode | undefined = selectedResource && {
    nodeId: selected!.nodeId,
    type: typeLabel(selectedResource),
    id: selectedResource.id,
    name: selectedResource.name,
    version: selectedResource.version,
    summary: selectedResource.summary,
  };

  // Model context (replaced on each update, a hint: hosts may drop it or send it late): which diagram is open, a
  // compact outline of what's on it (never where things are), their notes, open comments and hotspots, as background
  // the user doesn't see; and the selected node as an attachment they can see, titled with its name
  useEffect(() => {
    if (!app?.getHostCapabilities()?.updateModelContext) return;
    const focused = focus && rootModel.resources.find((r) => r.id === focus);
    const name = (id?: string) => (id ? (rootModel.resources.find((r) => r.id === id)?.name ?? id) : 'the whole diagram');
    const notes = rootModel.notes ?? [];
    const openThreads = (rootModel.comments ?? []).filter((thread) => !thread.resolved);
    const lines = [
      `The user has the EventCatalog diagram "${rootModel.title}" open (${rootModel.resources.length} resources, ${rootModel.relations.length} relations${
        focused ? `, focused on the ${focused.type} "${focused.name}"` : ''
      }), as they've changed it.${
        diagramId ? ` To change it, call edit_diagram with diagramId ${diagramId} and only what changes; read_diagram with that diagramId gives you all of it.` : ''
      }`,
      `On it:\n${outlineText(rootModel, 4000)}`,
      notes.length ? `Their notes:\n${notes.map((note) => `- On ${name(note.resource)} (${note.author ?? 'Agent'}): ${note.text}`).join('\n')}` : '',
      // Open comment threads (Studio's comments), as conversations to answer or act on
      openThreads.length
        ? `Open comments:\n${openThreads.map((thread) => `- On ${thread.nodeId ? name(thread.nodeId) : 'the canvas'}: ${thread.messages.map((message) => `${message.author.name}: ${message.text}`).join(' / ')}`).join('\n')}`
        : '',
      // What's flagged on it: what matters most to them about this architecture
      rootModel.hotspots?.length ? `Hotspots (most important first):\n${summarise(rootModel, []).hotspots?.map((line) => `- ${line}`).join('\n')}` : '',
    ].filter(Boolean);
    const background = { type: 'text' as const, text: lines.join('\n\n'), annotations: { audience: ['assistant' as const] } };
    const attachment = selectedForChat
      ? [{ type: 'text' as const, text: `Selected in the diagram: ${describeNodeForModel(selectedForChat)}`, _meta: { 'openai/title': selectedForChat.name } }]
      : [];
    // A moment after the last change, not on each one
    const timer = setTimeout(() => app.updateModelContext({ content: [background, ...attachment] }).catch(() => {}), 300);
    return () => clearTimeout(timer);
  }, [app, rootModel, focus, selected, diagramId]);

  const isFullscreen = hostContext?.displayMode === 'fullscreen';
  const canGoFullscreen = hostContext?.availableDisplayModes?.includes('fullscreen');

  const agentName = useMemo(() => {
    const host = app?.getHostVersion()?.name?.replace(/[-_].*$/, '');
    return host ? host.replace(/^\w/, (letter) => letter.toUpperCase()) : 'Agent';
  }, [app]);
  const closeSelected = useCallback(() => setSelected(null), []);
  // Going to a resource (from the command palette, or a node's page): it's centred, not too close, and its page opens
  const goToResource = useCallback((resource: Resource) => {
    bump('went_to_resource');
    canvasRef.current?.centreOn(resource.id);
    setSelected({ nodeId: resource.id, resourceId: resource.id });
  }, []);
  // Its page opens (each node on the canvas has its resource's id: one just added is in the model a moment later)
  const handleNodeClick = useCallback(
    (node: Node) => {
      const resource = resourceForNode(node.id, model);
      // Which kinds of node people open (one just added may not be in the model yet: its node's type, then)
      track('node_opened', { resource_type: resource?.type, node_type: resource ? undefined : node.type, locked });
      setSelected({ nodeId: node.id, resourceId: resource?.id ?? node.id });
    },
    [model, locked]
  );
  // Which fields people change on which kinds of node: once per node and field a visit (it's saved as it's typed)
  const editedFields = useRef(new Set<string>());
  const trackEdit = useCallback((resource: Resource, fields: Record<string, unknown>) => {
    for (const field of Object.keys(fields)) {
      const key = `${resource.id}\u0000${field}`;
      if (editedFields.current.has(key)) continue;
      editedFields.current.add(key);
      track('node_edited', { resource_type: resource.type, field });
    }
  }, []);
  const askAboutNode = useCallback(
    (question: string) => (
      track('node_question_sent', { kind: 'custom', resource_type: selectedResource?.type }),
      sendToChat(
        `${question}\n\n(About ${describeNodeForModel(selectedForChat!)} in the EventCatalog architecture diagram "${rootModel.title}". Look at the code and specs again if you need to, and update the diagram with render_architecture if it changes.)`
      )
    ),
    [sendToChat, selectedForChat, rootModel.title, selectedResource?.type]
  );

  /** Opens a link in the browser; false when it couldn't (hosts may not support it, or refuse) */
  const openLink = useCallback(
    async (url: string) => {
      // Only web links: links come from diagrams anyone can send, and a javascript: one would run on this page
      if (!isWebLink(url)) return false;
      if (app) {
        try {
          return !(await app.openLink({ url })).isError;
        } catch {
          return false;
        }
      }
      const opened = window.open(url, '_blank');
      if (opened) opened.opener = null;
      return !!opened;
    },
    [app]
  );

  // Save to file: the whole diagram, with its notes and layout, as a .eventcatalog file to open again later. They
  // pick its name (and, where the browser can ask, where it goes); saving again (Cmd/Ctrl + S) writes to that file
  const diagramFileText = useCallback(() => toDiagramFile(rootModel, { focus, level: toolPayload.level }), [rootModel, focus, toolPayload.level]);
  const defaultFileName = fileNameFor(rootModel.title, '');
  const saveToPicked = useCallback(
    async (handle?: SavedFileHandle) => {
      try {
        const saved = await saveToPickedFile(diagramFileText(), { suggestedName: fileNameFor(rootModel.title, DIAGRAM_FILE_EXTENSION), handle });
        if (!saved) return;
        savedFile.current = saved;
        succeeded(`Saved to ${saved.name}`);
        track('file_saved', { method: 'picker', again: !!handle, ok: true });
      } catch {
        track('file_saved', { method: 'picker', again: !!handle, ok: false });
        savedFile.current = undefined;
        failed("Couldn't save the file there: try somewhere else.");
      }
    },
    [diagramFileText, rootModel.title, succeeded, failed]
  );
  const saveToFile = useCallback(() => (canPickWhereToSave() ? saveToPicked() : setSavingAs(true)), [saveToPicked]);
  const saveAgain = useCallback(() => (savedFile.current ? saveToPicked(savedFile.current) : saveToFile()), [saveToPicked, saveToFile]);
  const downloadAs = useCallback(
    async (name: string) => {
      setSavingAs(false);
      const saved = await saveFile({ name: cleanFileName(name, DIAGRAM_FILE_EXTENSION), mimeType: 'application/json', text: diagramFileText() }, app);
      track('file_saved', { method: 'download', ok: !!saved });
      if (!saved) failed("This chat couldn't save the file: open the diagram in your browser and save it from there.");
    },
    [diagramFileText, app, failed]
  );

  // Open: a .eventcatalog file in place of this diagram (picked, or dropped on the canvas)
  const openFile = useCallback(
    async (file: File, via: 'picker' | 'drop') => {
      const opened = await readDiagramFile(file);
      track('file_opened', { via, ok: !('error' in opened) });
      if ('error' in opened) return failed(opened.error);
      const next: ArchitecturePayload = { ...opened, viewUrl: toolPayload.viewUrl };
      openedPayload.current = next;
      savedFile.current = undefined;
      setToolPayload(next);
      setNotice(undefined);
      // In the browser, the tab is named after it (and it's kept in this browser, as the canvas changes)
      if (!app) document.title = `${next.model.title} · EventCatalog Studio`;
    },
    [toolPayload.viewUrl, app, failed]
  );
  const openFromDisk = useCallback(async () => {
    const file = await pickDiagramFile();
    if (file) openFile(file, 'picker');
  }, [openFile]);

  // In the browser, the canvas is kept in this browser as it changes (not in the address bar: links are made when
  // it's shared), saved a moment after the last change and when the page is left. In chats, the agent has it.
  // In a live room, its document is kept with it (what's opened again merges with the room's, see local-canvas.ts)
  const [canvasDoc, setCanvasDoc] = useState<Y.Doc | null>(null);
  const pendingSave = useRef<Model | null>(null);
  const storageFailed = useRef(false);
  const saveNow = useCallback(() => {
    if (!pendingSave.current) return;
    const saved = saveLocalCanvas(pendingSave.current, toolPayload.level, room?.id, canvasDoc ?? undefined);
    if (!saved && !storageFailed.current) {
      storageFailed.current = true;
      track('storage_unavailable');
    }
    pendingSave.current = null;
  }, [toolPayload.level, room?.id, canvasDoc]);
  useEffect(() => {
    if (app) return;
    pendingSave.current = rootModel;
    const timer = setTimeout(saveNow, 300);
    return () => clearTimeout(timer);
  }, [app, rootModel, saveNow]);
  useEffect(() => {
    if (app) return;
    window.addEventListener('pagehide', saveNow);
    return () => window.removeEventListener('pagehide', saveNow);
  }, [app, saveNow]);
  // In a chat, the diagram as it is now is kept under its id, so it opens as it was left. Only once they've used it
  // (clicked or typed in it) or the agent changed it: the canvas also changes as it's loaded, built up and tidied
  const used = useRef(false);
  useEffect(() => {
    if (!app || !diagramId) return;
    const use = () => (used.current = true);
    document.addEventListener('pointerdown', use, true);
    document.addEventListener('keydown', use, true);
    return () => {
      document.removeEventListener('pointerdown', use, true);
      document.removeEventListener('keydown', use, true);
    };
  }, [app, diagramId]);
  // A moment after the last change, and straight away when the page goes (closed, reloaded) or the view's taken away
  const pendingChatSave = useRef<() => void>(undefined);
  useEffect(() => {
    if (!app || !diagramId || !canvasModel || !used.current) return;
    const save = () => {
      pendingChatSave.current = undefined;
      saveChatView(diagramId, canvasModel);
    };
    pendingChatSave.current = save;
    const timer = setTimeout(save, 500);
    return () => clearTimeout(timer);
  }, [app, diagramId, canvasModel]);
  useEffect(() => {
    const flush = () => pendingChatSave.current?.();
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);

  // ---- A live room: this canvas's document, shared with the people in it (see collab/room.ts) ----
  const [peers, setPeers] = useState<Peer[]>([]);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>('connecting');
  // The most people in the room at once (for analytics: do teams use it together, and how many)
  const roomPeak = useRef(1);
  useEffect(() => {
    if (!room) return;
    roomPeak.current = Math.max(roomPeak.current, peers.length + 1);
    notePeople(peers.length + 1);
  }, [room, peers.length]);
  useEffect(() => {
    if (room && roomStatus === 'offline') track('live_connection_lost');
  }, [room, roomStatus]);
  // The session was stopped by whoever started it: this person keeps a copy, or goes back to their own canvas
  const [sessionEndedBy, setSessionEndedBy] = useState<string>();
  const connection = useRef<RoomConnection | null>(null);
  // Where the others' cursors are: read by the canvas outside React (it changes many times a second)
  const [cursors, setCursors] = useState<RoomConnection | null>(null);
  const roomId = room?.id;
  const roomKey = room?.key;
  useEffect(() => {
    if (!canvasDoc || !roomId || !roomKey) return;
    const joined = new RoomConnection(canvasDoc, { id: roomId, key: roomKey }, { peers: setPeers, status: setRoomStatus, ended: setSessionEndedBy });
    connection.current = joined;
    setCursors(joined);
    const role = isRoomStarter(roomId) ? 'starter' : 'guest';
    const enteredAt = Date.now();
    roomPeak.current = 1;
    track('live_session_entered', { role });
    return () => {
      const ms = Date.now() - enteredAt;
      track('live_session_exited', { role, duration_ms: ms, duration_bucket: durationBucket(ms), peak_people: roomPeak.current });
      joined.destroy();
      if (connection.current === joined) connection.current = null;
      setCursors(null);
      setPeers([]);
    };
  }, [canvasDoc, roomId, roomKey]);
  const moveCursor = useCallback((at: { x: number; y: number } | null) => connection.current?.moveCursor(at), []);
  const moveNodes = useCallback((moving: Moving[] | null) => connection.current?.moveNodes(moving), []);
  const editNode = useCallback((editing: Editing | null) => connection.current?.editNode(editing), []);
  // The name they go by in rooms (kept in this browser): changed, the others see it straight away
  const [me, setMe] = useState(() => myIdentity());
  const updateMe = useCallback((change: { name?: string; color?: string }) => {
    const next = setMyIdentity(change);
    setMe(next);
    connection.current?.updateMe(next);
  }, []);
  // Joining a session from its link (not one started here): asked their name and colour, the first time
  const [joining, setJoining] = useState(false);
  // (not whoever started it, nor anyone who's been in it before: this browser has a copy of it then)
  useEffect(
    () => setJoining(!!roomId && !isRoomStarter(roomId) && !hasJoinedRoom(roomId) && !loadLocalCanvas(roomId)),
    [roomId]
  );
  const join = useCallback(
    (picked: { name: string; color: string }) => {
      updateMe(picked);
      track('live_session_joined');
      if (roomId) markRoomJoined(roomId);
      setJoining(false);
    },
    [updateMe, roomId]
  );
  // A room started from this canvas: it's kept as the room's copy here, and the address becomes the room's link
  const startRoom = useCallback(() => {
    const next = newRoom();
    track('live_session_started', diagramStats(rootModel));
    markRoomStarted(next.id);
    saveLocalCanvas(rootModel, toolPayload.level, next.id);
    window.location.hash = roomFragment(next);
  }, [rootModel, toolPayload.level]);
  // Back to this browser's own canvas (its copy of the room stays, for if they come back)
  const leaveRoom = useCallback(() => {
    try {
      window.history.pushState(null, '', '/' + window.location.search);
    } catch {}
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);
  const roomUrl = room ? `${window.location.origin}/${roomFragment(room)}` : undefined;
  // Stopping it (whoever started it): everyone's told and leaves; the canvas carries on as this browser's own
  const stopRoom = useCallback(async () => {
    track('live_session_stopped', { peak_people: roomPeak.current });
    saveLocalCanvas(rootModel, toolPayload.level);
    await connection.current?.end();
    leaveRoom();
  }, [rootModel, toolPayload.level, leaveRoom]);
  // Someone else stopped it: the canvas as it was, opened as this browser's own (asked first if that replaces work)
  const keepCopy = useCallback(() => {
    track('live_session_ended_by_host', { kept_copy: true });
    setSessionEndedBy(undefined);
    const link = baseUrl && viewLink(baseUrl, rootModel);
    if (link) window.location.hash = link.slice(link.indexOf('#'));
    else leaveRoom();
  }, [baseUrl, rootModel, leaveRoom]);

  // ---- Agents in this browser (WebMCP, see webmcp.ts): the MCP server's tools, on this canvas ----
  const latestModel = useRef(rootModel);
  latestModel.current = rootModel;

  // ---- The agent changing and reading this diagram where it's open (edit_diagram, read_diagram: diagram-bridge.ts) ----
  // Its changes go on the model as the canvas has it now (with what people changed), and only what's different is
  // written to the canvas: what's there stays where it is, what's new is placed next to what it connects to
  const bridge = useRef<DiagramBridgeHandlers>(undefined);
  // The model as the agent's last edit left it, until the canvas reports it (as canvasModel): edits that come one
  // after another before the page renders build on it, not on the model from before the last one (whose changes
  // they'd take back), and reads see it
  const editedModel = useRef<Model>(undefined);
  useEffect(() => {
    editedModel.current = undefined;
  }, [canvasModel]);
  const modelNow = () => editedModel.current ?? latestModel.current;
  // An edit can come while the diagram is still being laid out (right after render_architecture): it waits for the
  // canvas to have it, else is turned down (never answered as made when it wasn't)
  const contentRef = useRef(content);
  contentRef.current = content;
  const canvasReady = () => !!canvasRef.current && contentRef.current !== null && canvasRef.current.snapshot().nodes.length > 0;
  // Edits are made one at a time, each on the model the last one left (agents in the browser can send several at once)
  const editing = useRef<Promise<unknown>>(Promise.resolve());
  const makeEdit: DiagramBridgeHandlers['edit'] = async (changes, { reorder } = {}) => {
    if (!(await waitUntil(canvasReady, CANVAS_READY_MS))) return { error: 'The diagram is still opening.' };
    const current = modelNow();
    const { model: next, results } = applyChanges(current, changes);
    const applied = results.filter((result) => result.ok).length;
    if (applied && canvasRef.current) {
      used.current = true;
      const { added } = canvasRef.current.applyAgentCanvas(await agentCanvasFor(current, next));
      editedModel.current = next;
      changes.forEach((change, index) => {
        if (!results[index].ok) return;
        if (change.op === 'add_note') canvasRef.current?.addNote({ nodeId: change.note.resource, text: change.note.text, author: agentName });
        if (change.op === 'set_title') {
          titleSet.current = change.title;
          setCanvasModel((model) => ({ ...(model ?? current), title: change.title }));
        }
      });
      // Laid out again when the agent asks (the end of a round of changes: as Reorder does, the level shown, and the
      // canvas too), else what's new brought into view if it's out of it. Once what's new is drawn and measured
      if (reorder) setTimeout(() => canvasRef.current?.tidy(), 300);
      else if (added.length) setTimeout(() => canvasRef.current?.showNodes(added), 300);
      track('diagram_edited', { changes: sizeBucket(changes.length), applied: sizeBucket(applied) });
    }
    return { results, resources: next.resources.length, relations: next.relations.length, reordered: !!(reorder && applied) };
  };
  bridge.current = {
    read: () => ({ model: modelNow() }),
    edit: (changes, options) => {
      const made = editing.current.then(() => makeEdit(changes, options));
      editing.current = made.catch(() => {});
      return made;
    },
  };
  // Browser tests make edits straight through this (when they've set window.__studioTest up), to send them together
  useEffect(() => {
    const hook = (window as { __studioTest?: Record<string, unknown> }).__studioTest;
    if (hook) hook.edit = (changes: Changes) => bridge.current!.edit(changes);
  }, []);
  useEffect(() => (app && diagramId ? serveDiagram(app, diagramId, () => bridge.current!) : undefined), [app, diagramId]);
  // Its first diagram in place of work on the canvas is asked about first (as a link's is); once allowed, not again
  // while the tab's open, as they work on it together
  const agentAllowed = useRef(false);
  const [agentAsking, setAgentAsking] = useState<string>();
  const answerAgent = useRef<(allowed: boolean) => void>(undefined);
  const drawForAgent = useCallback(async (next: ArchitecturePayload) => {
    if (!agentAllowed.current && hasContent(latestModel.current)) {
      answerAgent.current?.(false);
      const allowed = await new Promise<boolean>((resolve) => {
        answerAgent.current = resolve;
        setAgentAsking(next.model.title);
      });
      track('webmcp_replace_answered', { choice: allowed ? 'draw' : 'keep' });
      if (!allowed) return false;
    }
    agentAllowed.current = true;
    agentPayload.current = next;
    setToolPayload(next);
    return true;
  }, []);
  const answerAgentAsking = useCallback((allowed: boolean) => {
    answerAgent.current?.(allowed);
    answerAgent.current = undefined;
    setAgentAsking(undefined);
  }, []);
  const [webMcpPolyfill, setWebMcpPolyfill] = useState(isWebMcpPolyfillOn);
  const turnOnWebMcp = useCallback(() => {
    track('webmcp_turned_on');
    turnOnWebMcpPolyfill();
    setWebMcpPolyfill(true);
  }, []);
  // An agent in the browser changing the canvas, as one in a chat does (edit_diagram)
  const editForAgent = useCallback(
    (changes: Changes, options?: { reorder?: boolean }) => bridge.current!.edit(changes, options) as ReturnType<WebMcpCanvas['edit']>,
    []
  );
  const webMcp = useWebMcp({
    enabled: !app,
    allowPolyfill: webMcpPolyfill,
    canvas: { model: rootModel, focus, selected: selected?.resourceId, live: !!room, render: drawForAgent, edit: editForAgent },
  });

  // The theme: chosen in the menu (remembered), else the chat's in a chat, and light in the browser
  const [theme, setTheme] = useState<Theme>(() => {
    const fallback: Theme = fullPage ? 'light' : 'system';
    try {
      return (localStorage.getItem('ec-mcp-theme') as Theme) || fallback;
    } catch {
      return fallback;
    }
  });
  const chooseTheme = useCallback((next: Theme) => {
    track('theme_changed', { theme: next });
    setTheme(next);
    try {
      localStorage.setItem('ec-mcp-theme', next);
    } catch {}
  }, []);
  useEffect(() => {
    const system = () => {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    };
    const resolved = theme === 'system' ? (hostContext?.theme ?? system()) : theme;
    document.documentElement.setAttribute('data-theme', resolved);
  }, [theme, hostContext?.theme]);

  // Export image: the whole diagram as a PNG (through the chat, when in one)
  const exportImage = useCallback(async () => {
    if (!graphRef.current) return;
    const exported = await exportDiagramImage(graphRef.current, rootModel.title, app);
    track('image_exported', { ok: exported, ...diagramStats(rootModel) });
    if (!exported) {
      // The chat wouldn't save it: the browser can
      if (app) setSharing('open');
    }
  }, [rootModel, app]);
  // Export model: what Save to file writes (the model, its notes and layout), copied to the clipboard
  const copyModel = useCallback(async () => {
    const copied = await copyToClipboard(diagramFileText());
    track('model_copied', { ok: copied, ...diagramStats(rootModel) });
    if (copied) succeeded('Model copied to your clipboard');
    else failed("Couldn't copy the model: save it to a file instead.");
  }, [diagramFileText, rootModel, succeeded, failed]);
  const openExportDialog = useCallback((from: string) => {
    track('export_opened', { from });
    setExporting(true);
  }, []);
  const exportImageRef = useRef(exportImage);
  exportImageRef.current = exportImage;
  const fileActionsRef = useRef({ save: saveAgain, open: openFromDisk });
  fileActionsRef.current = { save: saveAgain, open: openFromDisk };

  // Find on canvas: the command palette, which finds resources (and actions)
  const findOnCanvas = useCallback(() => {
    bump('command_palette_opened');
    setPaletteOpen(true);
  }, []);
  // The dialogs, opened from the menu, the palette, the welcome or a button (where from: analytics)
  const openHelp = useCallback((from: string) => {
    track('help_opened', { from });
    setShowingHelp(true);
  }, []);
  const openShare = useCallback(
    (from: string) => {
      track('share_opened', { from, in_room: !!roomId });
      setSharing('share');
    },
    [roomId]
  );
  const openConnect = useCallback((from: string) => {
    track('connect_agent_opened', { from });
    setConnecting(true);
  }, []);
  const openExport = useCallback((from: string) => {
    track('export_to_eventcatalog_opened', { from });
    setIsDocumenting(true);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (!app) return;
    track('fullscreen_toggled', { fullscreen: !isFullscreen });
    void app.requestDisplayMode({ mode: isFullscreen ? 'inline' : 'fullscreen' });
  }, [app, isFullscreen]);
  // Shortcuts: N for a note, Cmd/Ctrl + K or F for the command palette, Cmd/Ctrl + Shift + E to export an image,
  // Cmd/Ctrl + S to save to a file, Cmd/Ctrl + O to open one (the canvas has its own: select all, undo, copy...)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest?.('input, textarea, [contenteditable]')) return;
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        exportImageRef.current();
      } else if ((event.metaKey || event.ctrlKey) && !event.shiftKey && ['s', 'o'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        if (event.key.toLowerCase() === 's') fileActionsRef.current.save();
        else fileActionsRef.current.open();
      } else if ((event.metaKey || event.ctrlKey) && ['f', 'k'].includes(event.key.toLowerCase())) {
        event.preventDefault();
        findOnCanvas();
      } else if (event.key === '?') {
        event.preventDefault();
        openHelp('shortcut');
      } else if (event.key === 'n' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        canvasRef.current?.pickNoteTool();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [findOnCanvas, openHelp]);

  const openInBrowser = async () => {
    const url = baseUrl && viewLink(baseUrl, rootModel, { focus, from: 'chat' });
    // Couldn't open it: show the link to copy instead
    const opened = !!url && (await openLink(url));
    track('opened_in_browser', { ok: opened, from: 'menu' });
    if (!opened) setSharing('open');
  };

  // What the command palette finds: actions, the resources (go to one: it's centred and its page opens), theme
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  const mod = isMac ? '⌘' : 'Ctrl+';
  const commands: Command[] = [
    {
      id: 'open',
      group: 'Actions',
      label: 'Open a diagram file',
      icon: <FolderOpen />,
      shortcut: `${mod}O`,
      keywords: 'load import .eventcatalog',
      run: openFromDisk,
    },
    { id: 'save', group: 'Actions', label: 'Save to file', icon: <Download />, shortcut: `${mod}S`, keywords: 'download .eventcatalog', run: saveToFile },
    {
      id: 'export-image',
      group: 'Actions',
      label: 'Export image',
      icon: <ImageDown />,
      shortcut: `${mod}⇧E`,
      keywords: 'png download picture',
      run: exportImage,
    },
    { id: 'copy-model', group: 'Actions', label: 'Export model (copy to clipboard)', icon: <Braces />, keywords: 'json copy clipboard nodes edges', run: copyModel },
    { id: 'share', group: 'Actions', label: 'Share with your team', icon: <Share2 />, keywords: 'link url', run: () => openShare('palette') },
    { id: 'note', group: 'Actions', label: 'Add a sticky note', icon: <StickyNote />, shortcut: 'N', keywords: 'note post-it comment', run: () => openNotes() },
    {
      id: 'relayout',
      group: 'Actions',
      label: 'Auto layout',
      icon: <LayoutDashboard />,
      keywords: 'tidy arrange reset lay out reorder',
      run: () => canvasRef.current?.reorder(),
    },
    ...(app ? [{ id: 'browser', group: 'Actions' as const, label: 'Open in browser', icon: <ExternalLink />, run: openInBrowser }] : []),
    ...(app && canGoFullscreen
      ? [
          {
            id: 'fullscreen',
            group: 'Actions' as const,
            label: isFullscreen ? 'Exit full screen' : 'Full screen',
            icon: <Maximize2 />,
            run: toggleFullscreen,
          },
        ]
      : []),
    {
      id: 'export',
      group: 'Actions',
      label: 'Export to EventCatalog',
      icon: <BookOpen />,
      keywords: 'catalog document prompt',
      run: () => openExport('palette'),
    },
    ...rootModel.resources.map((resource) => ({
      id: `resource-${resource.id}`,
      group: 'Resources' as const,
      label: resource.name,
      hint: typeLabel(resource),
      icon: <TypeIcon type={resource.type} className="ec-type-icon" />,
      keywords: `${resource.id} ${resource.summary ?? ''} ${resource.technology ?? ''}`,
      run: () => goToResource(resource),
    })),
    ...(
      [
        ['light', 'Light', <Sun key="sun" />],
        ['dark', 'Dark', <Moon key="moon" />],
        ['system', 'System', <Monitor key="monitor" />],
      ] as const
    ).map(([value, label, icon]) => ({
      id: `theme-${value}`,
      group: 'Theme' as const,
      label: `${label} theme`,
      icon,
      hint: theme === value ? 'Current' : undefined,
      run: () => chooseTheme(value),
    })),
  ];
  // What's run from the palette (by kind: a resource gone to is just that, never which)
  const trackedCommands = commands.map((command) => ({
    ...command,
    run: () => {
      track('command_used', { command: command.id.startsWith('resource-') ? 'go-to-resource' : command.id });
      return command.run();
    },
  }));

  // At the bottom of the components panel, once there's something to take there: the same element every render, so
  // the panel (memoised) doesn't render again with the diagram
  const exportFooter = useMemo(
    () => (
      <button
        type="button"
        onClick={() => openExport('panel')}
        // Handwritten, as the welcome's line is (Excalifont), and quiet until it's pointed at
        className="group block w-full text-center font-['Excalifont',ui-sans-serif,system-ui] text-[12px] leading-snug text-[rgb(var(--ec-page-text-muted))] transition-colors hover:text-[rgb(var(--ec-page-text))]!"
      >
        Export diagram to EventCatalog
        <ArrowRight aria-hidden className="ml-1 inline h-3.5 w-3.5 align-[-2px] transition-transform group-hover:translate-x-0.5" />
      </button>
    ),
    [openExport]
  );
  // Nothing on the canvas (a blank page, or everything deleted)
  const isEmpty = !model.resources.length && !notes.length && !(model.comments ?? []).length && !(model.hotspots ?? []).length;
  // The welcome is for a canvas nothing has been put on yet: once something has, an emptied canvas stays a canvas
  const hadContent = useRef(!isEmpty);
  if (!isEmpty) hadContent.current = true;
  if (error) return <p className="ec-mcp-message">Couldn't draw this diagram: {error}</p>;
  // The components to add, where there's room for them (not inline in a chat)
  const showPanel = !app || isFullscreen;

  return (
    <div
      className="ec-diagram"
      style={fullPage ? FULL_PAGE : isFullscreen ? fullscreenStyle(hostContext) : INLINE}
      // A .eventcatalog file dropped on the canvas opens
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
      onDrop={(event) => {
        const file = event.dataTransfer.files[0];
        if (!file) return;
        event.preventDefault();
        openFile(file, 'drop');
      }}
    >
      {notice && <Toast key={notice.at} notice={notice} onClose={() => setNotice(undefined)} />}
      <div className="ec-mcp-graph">
        {!content && <p className="ec-mcp-message">Laying out {model.title}…</p>}
        <StudioCanvas
          ref={canvasRef}
          content={content}
          initialLevel={LEVEL_NUMBERS[toolPayload.level ?? 'messages']}
          onChange={onCanvasChange}
          onNodeClick={handleNodeClick}
          onPaneClick={closeSelected}
          questionsFor={questionsFor}
          showPanel={showPanel}
          areaRef={(element) => {
            graphRef.current = element;
            setGraphElement(element);
          }}
          onToolChange={(tool) => setPlacing(tool === 'text' || tool === 'note' || tool === 'comment' || tool === 'hotspot')}
          onLockChange={setLocked}
          onChoosingChange={setChoosing}
          onLevelChange={() => setWelcomeDismissed(true)}
          onDocChange={room ? setCanvasDoc : undefined}
          author={me}
          peers={room ? peers : undefined}
          cursors={room ? (cursors ?? undefined) : undefined}
          onCursorMove={room ? moveCursor : undefined}
          onNodesMove={room ? moveNodes : undefined}
          onEditing={room ? editNode : undefined}
          paletteFooter={isEmpty ? undefined : exportFooter}
        >
          {isEmpty && !hadContent.current && !placing && !choosing && !welcomeDismissed && !room && (
            <EmptyCanvas
              onOpen={openFromDisk}
              onHelp={() => openHelp('welcome')}
              onConnect={baseUrl ? () => openConnect('welcome') : undefined}
              palette={showPanel}
              live={!app}
            />
          )}

          {/* The agent building the diagram up: over the canvas while it plays */}
          {building && (
            <div className="absolute inset-0 z-20 bg-[rgb(var(--ec-page-bg))]">
              <BuildStage from={building.from} to={building.to} agentName={agentName} onDone={buildDone} />
            </div>
          )}

          {/* Top left, as drawing tools have it: the menu (actions, export, links, theme) */}
          <div className="ec-topbar">
            <AppMenu
              onConnectAgent={!app && baseUrl ? () => openConnect('menu') : undefined}
              onLiveCollaboration={app ? undefined : () => openShare('menu')}
              onOpenFile={openFromDisk}
              onSaveFile={saveToFile}
              onExport={() => openExportDialog('menu')}
              onExportToEventCatalog={() => openExport('menu')}
              onOpenInBrowser={app ? openInBrowser : undefined}
              onFind={findOnCanvas}
              onCommandPalette={findOnCanvas}
              onHelp={() => openHelp('menu')}
              fullscreen={app && canGoFullscreen ? { active: isFullscreen, toggle: toggleFullscreen } : undefined}
              theme={theme}
              onTheme={chooseTheme}
              openLink={openLink}
              container={graphElement}
            />
          </div>
          {/* Top right: who else is here in a live room, who they are (their name and colour, on comments and cursors), and sharing */}
          {!app && <ProfileMenu me={me} onChange={updateMe} className="absolute right-[118px] top-3 z-10" />}
          {room && (
            <button
              type="button"
              onClick={() => openShare('live-badge')}
              title={roomStatus === 'connected' ? `Live: ${peers.length + 1} here` : roomStatus === 'offline' ? 'Reconnecting…' : 'Connecting…'}
              className={`absolute right-[164px] top-3 z-10 inline-flex h-[38px] items-center gap-2 rounded-[9px] border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] ${peers.length ? 'pl-2' : 'pl-3'} pr-3 shadow-sm`}
            >
              <span className="flex -space-x-1.5 empty:hidden">
                {peers.slice(0, 5).map((person) => (
                  <span
                    key={person.id}
                    title={person.name}
                    className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[rgb(var(--ec-card-bg))] text-[10px] font-semibold text-white"
                    style={{ background: person.color }}
                  >
                    {person.name.split(' ').map((word) => word[0]).join('')}
                  </span>
                ))}
              </span>
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${roomStatus === 'connected' ? 'bg-emerald-500' : roomStatus === 'offline' ? 'bg-red-500' : 'bg-amber-400'}`}
              />
              <span className="text-sm font-medium">Live</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => openShare('button')}
            className="absolute right-3 top-3 z-10 inline-flex h-[38px] items-center gap-2 rounded-[9px] bg-[rgb(var(--ec-primary-bg))] px-4 text-sm font-semibold text-[rgb(var(--ec-primary-text))] shadow-sm transition-colors hover:bg-[rgb(var(--ec-primary-bg)/0.85)]! [&_svg]:h-4 [&_svg]:w-4"
          >
            <Share2 aria-hidden /> Share
          </button>
          {selected && selectedResource && !selected.asking && (
            <NodeInfo
              key={selected.nodeId}
              nodeId={selected.nodeId}
              resource={selectedResource}
              model={rootModel}
              notes={notes}
              containerRef={graphRef}
              onClose={closeSelected}
              openLink={openLink}
              onAsk={canSend ? () => setSelected({ ...selected, asking: true }) : undefined}
              onEdit={
                locked
                  ? undefined
                  : (fields) => {
                      trackEdit(selectedResource, fields);
                      canvasRef.current?.updateNode(selectedResource.id, fields);
                    }
              }
              onOpenResource={(id) => {
                const resource = model.resources.find((r) => r.id === id);
                if (resource) goToResource(resource);
              }}
            />
          )}
          {selected?.asking && selectedForChat && (
            <NodeChat node={selectedForChat} containerRef={graphRef} canSend={canSend} onSend={askAboutNode} onClose={closeSelected} />
          )}
        </StudioCanvas>
      </div>
      {isDocumenting && (
        <DocumentModal model={rootModel} onClose={() => setIsDocumenting(false)} onSendToChat={canSend ? sendToChat : undefined} />
      )}
      <ExportDialog
        open={exporting}
        onExportImage={() => (setExporting(false), void exportImage())}
        onCopyModel={() => (setExporting(false), void copyModel())}
        onClose={() => setExporting(false)}
      />
      <SaveFileDialog open={savingAs} defaultName={defaultFileName} onSave={downloadAs} onClose={() => setSavingAs(false)} />
      {baseUrl && (
        <ConnectAgentDialog
          open={connecting}
          mcpUrl={`${baseUrl}/mcp`}
          webMcp={app ? undefined : { status: webMcp, onTurnOn: turnOnWebMcp }}
          onClose={() => setConnecting(false)}
        />
      )}
      <ConfirmDialog
        open={!!agentAsking}
        title="Let your agent draw on this canvas?"
        confirmLabel="Let it draw"
        cancelLabel="Keep my canvas"
        danger
        onConfirm={() => answerAgentAsking(true)}
        onCancel={() => answerAgentAsking(false)}
      >
        An AI agent in your browser wants to draw "{agentAsking}" here, in place of what's on your canvas. Save your canvas to a file first if you want
        to keep it. You won't be asked again while this tab is open.
      </ConfirmDialog>
      <ShortcutsDialog open={showingHelp} onClose={() => setShowingHelp(false)} />
      {room && <JoinDialog open={joining} name={me.name} color={me.color} onJoin={join} />}
      <ConfirmDialog
        open={!!sessionEndedBy}
        title="The session has ended"
        confirmLabel="Keep a copy"
        cancelLabel="Leave"
        onConfirm={keepCopy}
        onCancel={() => (track('live_session_ended_by_host', { kept_copy: false }), setSessionEndedBy(undefined), leaveRoom())}
      >
        {sessionEndedBy} stopped the live session. Keep a copy of the canvas to carry on working on it yourself.
      </ConfirmDialog>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={trackedCommands} />
      {sharing && baseUrl && (
        <ShareDialog
          model={rootModel}
          live={
            app || sharing === 'open'
              ? undefined
              : {
                  roomUrl,
                  people: peers.length + 1,
                  everyone: [
                    { id: 'me', name: me.name, color: me.color, you: true },
                    ...peers.map((peer) => ({ id: peer.id, name: peer.name, color: peer.color })),
                  ],
                  onStart: startRoom,
                  onLeave: () => (track('live_session_left'), setSharing(null), leaveRoom()),
                  onStop: room && isRoomStarter(room.id) ? () => (setSharing(null), void stopRoom()) : undefined,
                  onConnectAgent: baseUrl ? () => (setSharing(null), openConnect('share')) : undefined,
                }
          }
          baseUrl={baseUrl}
          focus={focus}
          title={sharing === 'open' ? 'Open in browser' : room ? 'Live session' : 'Share'}
          openLink={openLink}
          onClose={() => setSharing(null)}
        />
      )}
    </div>
  );
}
