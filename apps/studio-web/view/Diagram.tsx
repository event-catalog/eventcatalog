/**
 * The architecture diagram: the EventCatalog visualiser with its levels (overview, services, messages), built in
 * the browser from the model. Used by both entries: inside MCP hosts (main.tsx McpApp) and in the browser (WebPage).
 * Adapted from event-catalog/eventcatalog@v5-beta:packages/core/eventcatalog/src/features/mcp/apps/architecture-diagram/view.tsx
 * and apps/canvas/view.tsx (model context).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ToolbarButton } from '@eventcatalog/visualiser';
import {
  ArrowRight,
  BookOpen,
  Download,
  ExternalLink,
  FolderOpen,
  ImageDown,
  LayoutDashboard,
  Maximize2,
  Monitor,
  Moon,
  Presentation,
  Share2,
  StickyNote,
  Sun,
} from 'lucide-react';
import type { App, McpUiHostContext } from '@modelcontextprotocol/ext-apps';
import { loadLocalCanvas, saveLocalCanvas, type LocalPayload } from './local-canvas';
import { ConfirmDialog } from './ConfirmDialog';
import { JoinDialog } from './collab/JoinDialog';
import { ProfileMenu } from './collab/ProfileMenu';
import { hasJoinedRoom, isRoomStarter, markRoomJoined, markRoomStarted, myIdentity, newRoom, roomFragment, RoomConnection, setMyIdentity, type Editing, type Moving, type Peer, type RoomLink, type RoomStatus } from './collab/room';
import type * as Y from 'yjs';
import type { Node } from '@xyflow/react';
import { MESSAGE_TYPES, type ArchitecturePayload, type Level, type Model, type Note, type Resource, type Scene } from '@eventcatalog/visualiser/model';
import { buildArchitectureGraph, type ArchitectureGraph } from '../src/model/to-graph';
import { summarise } from '../src/model/to-text';
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
import { EmptyCanvas } from '@eventcatalog/visualiser/studio';
import { ConnectAgentDialog } from './ConnectAgentDialog';
import { StudioCanvas, type CanvasSnapshot, type StudioCanvasHandle } from './studio/StudioCanvas';
import type { MenuQuestion } from '@eventcatalog/visualiser/studio';
import { canvasToModel, modelToCanvas, type ModelCanvasContent as CanvasContent } from '@eventcatalog/visualiser/studio';
import { CommandPalette, type Command } from './CommandPalette';
import { ShortcutsDialog } from './ShortcutsDialog';
import { RESOURCE_LOOK, TypeIcon } from './resource-types';
import { viewLink } from '../src/lib/encode';
import { INLINE_HEIGHT } from './diagram-styles';
import { BuildStage } from './build/BuildStage';
import { TourStage } from './build/TourStage';
import { toStage, type StageState } from './build/choreography';
import { bump, configureAnalytics, durationBucket, modelMix, modelStats as diagramStats, notePeople, sizeBucket, tourStats, track } from './analytics';


const LEVEL_NUMBERS = { overview: 1, services: 2, messages: 3 } as const;

/** An http(s) link (what's safe to open from a diagram) */
const isWebLink = (url: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(url, location.href).protocol);
  } catch {
    return false;
  }
};

/** The graph the diagram opens at (the build is played on it): the level asked for, if the diagram has it */
const openingGraph = (graph: ArchitectureGraph, level: Level) =>
  level === 'overview' && graph.overview ? graph.overview : level === 'services' ? graph.hiddenMessages : graph;

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
      return `Walk me through ${subject}: who sends it, who receives it, which channels it goes through, and what happens next. Use the code to check, and walk me through it on the diagram.`;
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
  /** A payload laid out again as soon as it's open (a link opened: where it had things may be out of date) */
  reorderWhenOpened?: ArchitecturePayload;
  /** A live room this canvas is shared in (in the browser): its id and key, from the link */
  room?: RoomLink;
};

/**
 * The canvas (EventCatalog Studio's, see studio/StudioCanvas.tsx) with the diagram around it: the agent building it
 * up and walking through it, each node's page, asking the agent, files, sharing and exporting. What's on the
 * canvas is the model: it starts from the agent's (or the link's, or a file's), and what people change there goes back
 * into it, for links, files, exports and the agent.
 */
export function Diagram({ payload: incomingPayload, app, hostContext, fullPage, animate = false, reorderWhenOpened, room }: DiagramProps) {
  // The diagram from the agent (or the link), until a file is opened in its place
  const [toolPayload, setToolPayload] = useState(incomingPayload);
  useEffect(() => setToolPayload(incomingPayload), [incomingPayload]);
  // A link just opened: laid out with the visualiser's layout once it's on the canvas (and measured), as Reorder does
  const reorderOpened = useRef(reorderWhenOpened);
  reorderOpened.current = reorderWhenOpened;
  // An opened file is shown as it is, not built up
  const openedPayload = useRef<ArchitecturePayload>(undefined);
  // Diagrams from the agent are built up in front of the user; a walkthrough from the agent goes straight to it
  const animateNext = useRef(animate && !toolPayload.tour);
  const [touring, setTouring] = useState<Scene[] | null>(null);
  const [tourScene, setTourScene] = useState<number | null>(null);
  // How far into a walkthrough they got (for analytics: do people watch them to the end)
  const tourReached = useRef(0);
  const onTourScene = useCallback((scene: number | null) => {
    setTourScene(scene);
    if (scene !== null) tourReached.current = Math.max(tourReached.current, scene + 1);
  }, []);
  useEffect(() => {
    if (!touring) return;
    tourReached.current = 0;
    track('walkthrough_started', { scenes: touring.length, ...tourStats(touring) });
  }, [touring]);
  const pendingTour = useRef<Scene[] | undefined>(toolPayload.tour);

  // What the canvas starts from (the model, as Studio's canvas), and the model as it is on the canvas now
  const [content, setContent] = useState<CanvasContent | null>(null);
  const [canvasModel, setCanvasModel] = useState<Model | null>(null);
  const rootModel = canvasModel ?? toolPayload.model;
  const model = rootModel;
  const focus = toolPayload.focus;
  const notes = rootModel.notes ?? [];

  // The diagram as the visualiser lays it out: the agent's build and walkthroughs play on it
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
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
  const savedFile = useRef<SavedFileHandle>(undefined);
  // A short message at the top (a file that couldn't be opened or saved)
  const [notice, setNotice] = useState<string>();
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(undefined), 6000);
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
  const lastBuilt = useRef<StageState | undefined>(undefined);

  // A new diagram (from the agent, a link or a file): laid out, built up in front of the user, and put on the canvas
  useEffect(() => {
    let cancelled = false;
    const next = toolPayload.model;
    animateNext.current = animate && !toolPayload.tour && toolPayload !== openedPayload.current;
    pendingTour.current = toolPayload.tour;
    if (toolPayload !== openedPayload.current) savedFile.current = undefined;
    setTouring(null);
    setSelected(null);
    setCanvasModel(null);
    setGraph(null);
    setError(null);
    // Nothing to lay out: only its notes, text, comments and hotspots (if it has none, the canvas welcomes them)
    // A live room's copy kept in this browser: its document, as it was (see local-canvas.ts)
    const kept = (toolPayload as LocalPayload).doc;
    if (next.resources.length || next.notes?.length || next.comments?.length || next.hotspots?.length) {
      // Where it came from: a file opened, the agent (in a chat), a link opened, a live room, or kept in this browser
      const via = toolPayload === openedPayload.current ? 'file' : app ? 'agent' : reorderOpened.current === toolPayload ? 'link' : room ? 'room' : 'restored';
      track('diagram_loaded', { via, level: toolPayload.level ?? 'messages', has_tour: !!toolPayload.tour?.length, has_focus: !!focus, ...diagramStats(next), ...modelMix(next) });
    }
    if (!next.resources.length) {
      void modelToCanvas(next).then((canvas) => !cancelled && setContent(kept ? { ...canvas, doc: kept } : canvas));
      return () => {
        cancelled = true;
      };
    }
    const level = toolPayload.level ?? 'messages';
    buildArchitectureGraph(next, focus)
      .then(async (built) => {
        if (cancelled) return;
        // Arranged before (it has a layout): as it was; else where the diagram puts things, so the build ends there
        const canvas = await modelToCanvas(next, next.layout?.messages ? undefined : built);
        if (cancelled) return;
        const to = toStage(openingGraph(built, level));
        const fromAgent = animateNext.current;
        const playing = fromAgent && !next.layout?.messages && to.nodes.size <= MAX_ANIMATED_NODES && !prefersReducedMotion();
        if (playing) {
          setBuilding({ from: lastBuilt.current, to });
          track('build_played', { nodes: sizeBucket(to.nodes.size), changed: !!lastBuilt.current });
        }
        if (fromAgent) lastBuilt.current = to;
        animateNext.current = false;
        setGraph(built);
        setContent(kept ? { ...canvas, doc: kept } : canvas);
        // Tidied once it's on the canvas (the visualiser's layout, as Reorder does): a link someone opened, and what
        // the agent drew (not one it sent back with the layout people gave it). After the build, if one plays
        const tidy = reorderOpened.current === toolPayload || (fromAgent && !next.layout?.messages);
        if (tidy && playing) reorderAfterBuild.current = true;
        else if (tidy) setTimeout(() => !cancelled && canvasRef.current?.tidy(), 400);
        // The agent's walkthrough plays once the diagram's ready
        if (pendingTour.current) {
          setTouring(pendingTour.current);
          pendingTour.current = undefined;
        }
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
    (snapshot: CanvasSnapshot) => setCanvasModel(canvasToModel(snapshot.nodes, snapshot.edges, snapshot.levelLayouts, toolPayload.model, snapshot.threads, snapshot.hotspots)),
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
          void sendToChat(promptFor(kind, resource, model)).catch(() => setNotice("Couldn't send that to the chat."));
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
    [model, canSend, sendToChat]
  );

  /** A sticky note: beside a resource, or (the note tool) where the canvas is clicked next */
  const openNotes = useCallback((resource?: string) => {
    setSelected(null);
    if (resource) canvasRef.current?.addNote({ nodeId: resource });
    else canvasRef.current?.pickNoteTool();
  }, []);
  /** A note the agent wrote in its walkthrough, kept on the canvas */
  const keepNote = useCallback((note: Note) => canvasRef.current?.addNote({ nodeId: note.resource, text: note.text, author: note.author }), []);

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
  const diagramLink = useMemo(() => (app && baseUrl ? viewLink(baseUrl, rootModel, { focus, from: 'agent' }) : undefined), [app, baseUrl, rootModel, focus]);
  const selectedResource = selected ? model.resources.find((r) => r.id === selected.resourceId) : undefined;
  const selectedForChat: SelectedNode | undefined = selectedResource && {
    nodeId: selected!.nodeId,
    type: typeLabel(selectedResource),
    id: selectedResource.id,
    name: selectedResource.name,
    version: selectedResource.version,
    summary: selectedResource.summary,
  };

  // Model context (replaced on each update), as the canvas app does: what's open and the notes, as
  // background context the user doesn't see, and the selected node as an attachment they can see, titled with its name
  useEffect(() => {
    if (!app?.getHostCapabilities()?.updateModelContext) return;
    const focused = focus && model.resources.find((r) => r.id === focus);
    const name = (id?: string) => (id ? (rootModel.resources.find((r) => r.id === id)?.name ?? id) : 'the whole diagram');
    const lines = [
      `The user has the EventCatalog diagram "${rootModel.title}" open in EventCatalog Studio (${model.resources.length} resources, ${model.relations.length} relations${
        focused ? `, focused on the ${focused.type} "${focused.name}"` : ''
      }). It shows the model you passed to render_architecture, as they've changed it on the canvas: call it again with the model from the link below to change or expand it (keep their notes and layout in it).`,
      notes.length ? `Their notes:\n${notes.map((note) => `- On ${name(note.resource)} (${note.author ?? 'Agent'}): ${note.text}`).join('\n')}` : '',
      // Open comment threads (Studio's comments), as conversations to answer or act on
      (rootModel.comments ?? []).some((thread) => !thread.resolved)
        ? `Open comments on the canvas:\n${(rootModel.comments ?? [])
            .filter((thread) => !thread.resolved)
            .map((thread) => `- On ${thread.nodeId ? name(thread.nodeId) : 'the canvas'}: ${thread.messages.map((message) => `${message.author.name}: ${message.text}`).join(' / ')}`)
            .join('\n')}`
        : '',
      // What's flagged on it: what matters most to them about this architecture
      rootModel.hotspots?.length
        ? `Hotspots flagged on the diagram (most important first):\n${summarise(rootModel, []).hotspots?.map((line) => `- ${line}`).join('\n')}`
        : '',
      touring && tourScene !== null
        ? `They're watching your walkthrough: scene ${tourScene + 1} of ${touring.length}${touring[tourScene]?.caption ? ` ("${touring[tourScene].caption}")` : ''}.`
        : '',
      // The diagram as it is now (with their changes): what to pass to show_on_diagram or build on
      diagramLink ? `The diagram's link, to pass to show_on_diagram as diagram: ${diagramLink}` : '',
    ].filter(Boolean);
    const background = { type: 'text' as const, text: lines.join('\n\n'), annotations: { audience: ['assistant' as const] } };
    const attachment = selectedForChat
      ? [{ type: 'text' as const, text: `Selected in the diagram: ${describeNodeForModel(selectedForChat)}`, _meta: { 'openai/title': selectedForChat.name } }]
      : [];
    app.updateModelContext({ content: [background, ...attachment] }).catch(() => {});
  }, [app, model, focus, selected, rootModel.title, notes, touring, tourScene, diagramLink]);

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
        setNotice(`Saved to ${saved.name}`);
        track('file_saved', { method: 'picker', again: !!handle, ok: true });
      } catch {
        track('file_saved', { method: 'picker', again: !!handle, ok: false });
        savedFile.current = undefined;
        setNotice("Couldn't save the file there: try somewhere else.");
      }
    },
    [diagramFileText, rootModel.title]
  );
  const saveToFile = useCallback(() => (canPickWhereToSave() ? saveToPicked() : setSavingAs(true)), [saveToPicked]);
  const saveAgain = useCallback(() => (savedFile.current ? saveToPicked(savedFile.current) : saveToFile()), [saveToPicked, saveToFile]);
  const downloadAs = useCallback(
    async (name: string) => {
      setSavingAs(false);
      const saved = await saveFile({ name: cleanFileName(name, DIAGRAM_FILE_EXTENSION), mimeType: 'application/json', text: diagramFileText() }, app);
      track('file_saved', { method: 'download', ok: !!saved });
      if (!saved) setNotice("This chat couldn't save the file: open the diagram in your browser and save it from there.");
    },
    [diagramFileText, app]
  );

  // Open: a .eventcatalog file in place of this diagram (picked, or dropped on the canvas)
  const openFile = useCallback(
    async (file: File, via: 'picker' | 'drop') => {
      const opened = await readDiagramFile(file);
      track('file_opened', { via, ok: !('error' in opened) });
      if ('error' in opened) return setNotice(opened.error);
      const next: ArchitecturePayload = { ...opened, viewUrl: toolPayload.viewUrl };
      openedPayload.current = next;
      savedFile.current = undefined;
      setToolPayload(next);
      setNotice(undefined);
      // In the browser, the tab is named after it (and it's kept in this browser, as the canvas changes)
      if (!app) document.title = `${next.model.title} · EventCatalog Studio`;
    },
    [toolPayload.viewUrl, app]
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
      style={{ height: fullPage || isFullscreen ? '100vh' : INLINE_HEIGHT }}
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
      {notice && (
        <div
          role="status"
          className="absolute left-1/2 top-[64px] z-30 max-w-[min(480px,calc(100%-120px))] -translate-x-1/2 rounded-lg border border-[rgb(var(--ec-page-border))] bg-[rgb(var(--ec-card-bg))] px-3 py-2 text-sm text-[rgb(var(--ec-page-text))] shadow-lg"
        >
          {notice}
        </div>
      )}
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
          barExtras={
            toolPayload.tour ? (
              <ToolbarButton
                label="Replay walkthrough"
                hint={`Watch ${agentName} walk you through it again`}
                onClick={() => {
                  track('walkthrough_replayed');
                  setTouring(toolPayload.tour!);
                }}
              >
                <Presentation className="h-4 w-4" />
              </ToolbarButton>
            ) : undefined
          }
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

          {/* The agent building the diagram up, and walking through it: over the canvas while they play */}
          {building && (
            <div className="absolute inset-0 z-20 bg-[rgb(var(--ec-page-bg))]">
              <BuildStage from={building.from} to={building.to} agentName={agentName} onDone={buildDone} />
            </div>
          )}
          {!building && touring && graph && (
            <div className="ec-tour-stage absolute inset-0 z-20 bg-[rgb(var(--ec-page-bg))]">
              <TourStage
                graph={graph}
                model={rootModel}
                tour={touring}
                agentName={agentName}
                onExit={() => {
                  track('walkthrough_ended', { scenes: touring.length, reached: tourReached.current, completed: tourReached.current >= touring.length });
                  setTouring(null);
                  setTourScene(null);
                }}
                onKeepNote={keepNote}
                onScene={onTourScene}
              />
            </div>
          )}

          {/* Top left, as drawing tools have it: the menu (actions, export, links, theme) */}
          <div className="ec-topbar">
            <AppMenu
              onConnectAgent={!app && baseUrl ? () => openConnect('menu') : undefined}
              onLiveCollaboration={app ? undefined : () => openShare('menu')}
              onOpenFile={openFromDisk}
              onSaveFile={saveToFile}
              onExportImage={exportImage}
              onExport={() => openExport('menu')}
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
      <SaveFileDialog open={savingAs} defaultName={defaultFileName} onSave={downloadAs} onClose={() => setSavingAs(false)} />
      {baseUrl && <ConnectAgentDialog open={connecting} mcpUrl={`${baseUrl}/mcp`} onClose={() => setConnecting(false)} />}
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
