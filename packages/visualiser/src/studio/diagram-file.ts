/**
 * "Save to file" and "Open": a diagram as a .eventcatalog file (JSON: the model, with its notes, comments and
 * hotspots, and where it was focused), as drawing tools save theirs. The same file in Studio on the web and in
 * EventCatalog's Studio, so a diagram moves between them.
 */
import {
  LEVELS,
  Model,
  validateModel,
  type ArchitecturePayload,
  type Level,
} from "../model";

export const DIAGRAM_FILE_EXTENSION = ".eventcatalog";
const FILE_TYPE = "eventcatalog-diagram";
const FILE_VERSION = 1;
// Big enough for any diagram the server accepts (its requests are limited to 1MB)
const MAX_FILE_SIZE = 2 * 1024 * 1024;

type DiagramFile = {
  type: typeof FILE_TYPE;
  version: number;
  source: string;
  model: Model;
  focus?: string;
  level?: Level;
};

export const fileNameFor = (title: string, extension: string) =>
  `${
    title
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase() || "diagram"
  }${extension}`;

export function toDiagramFile(
  model: Model,
  { focus, level }: { focus?: string; level?: Level } = {},
): string {
  const file: DiagramFile = {
    type: FILE_TYPE,
    version: FILE_VERSION,
    source: "https://www.eventcatalog.dev",
    model,
    focus,
    level,
  };
  return JSON.stringify(file, null, 2);
}

/** The diagram in a .eventcatalog file (or a bare model, as the agent writes them), or why it can't be opened */
export async function readDiagramFile(
  file: File,
): Promise<
  Pick<ArchitecturePayload, "model" | "focus" | "level"> | { error: string }
> {
  if (file.size > MAX_FILE_SIZE)
    return { error: `${file.name} is too big to be a diagram.` };
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    return {
      error: `${file.name} isn't a diagram file: save one with "Save to file".`,
    };
  }
  const saved =
    json &&
    typeof json === "object" &&
    (json as { type?: unknown }).type === FILE_TYPE
      ? (json as Partial<DiagramFile>)
      : undefined;
  if (saved && (saved.version ?? 0) > FILE_VERSION)
    return {
      error: `${file.name} was saved by a newer version: open it at eventcatalog.dev.`,
    };
  const parsed = Model.safeParse(saved ? saved.model : json);
  if (!parsed.success)
    return {
      error: `${file.name} isn't a diagram file: save one with "Save to file".`,
    };
  const { errors } = validateModel(parsed.data);
  if (errors.length)
    return { error: `${file.name} can't be drawn: ${errors[0]}` };
  const focus =
    saved?.focus && parsed.data.resources.some((r) => r.id === saved.focus)
      ? saved.focus
      : undefined;
  const level =
    saved?.level && LEVELS.includes(saved.level) ? saved.level : undefined;
  return { model: parsed.data, focus, level };
}

/** Downloads a file (text, or base64 for binary files such as images) */
export function downloadFile({
  name,
  mimeType,
  text,
  base64,
}: {
  name: string;
  mimeType: string;
  text?: string;
  base64?: string;
}) {
  const href =
    base64 !== undefined
      ? `data:${mimeType};base64,${base64}`
      : URL.createObjectURL(new Blob([text ?? ""], { type: mimeType }));
  const link = document.createElement("a");
  link.href = href;
  link.download = name;
  link.click();
  if (href.startsWith("blob:"))
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  return true;
}

/** A name typed for the file, made safe to save, with the extension on the end */
export function cleanFileName(name: string, extension: string) {
  // No path characters, and no leading dots (hidden files)
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "")
    .trim()
    .replace(/^\.+/, "");
  const base = cleaned.toLowerCase().endsWith(extension)
    ? cleaned.slice(0, -extension.length).trim()
    : cleaned;
  return `${base || "diagram"}${extension}`;
}

// The browser's save dialog (File System Access API: Chromium browsers, and not in frames such as chats)
type WritableFile = {
  createWritable: () => Promise<{
    write: (data: string) => Promise<void>;
    close: () => Promise<void>;
  }>;
  name: string;
};
type SaveFilePicker = (options: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<WritableFile>;
export type SavedFileHandle = WritableFile;

export const canPickWhereToSave = () => {
  try {
    return (
      typeof (window as unknown as { showSaveFilePicker?: unknown })
        .showSaveFilePicker === "function" && window.self === window.top
    );
  } catch {
    return false;
  }
};

/** Writes to a file picked (or picked before): the handle, undefined when they cancelled */
export async function saveToPickedFile(
  text: string,
  {
    suggestedName,
    handle,
  }: { suggestedName: string; handle?: SavedFileHandle },
) {
  const picker = (window as unknown as { showSaveFilePicker: SaveFilePicker })
    .showSaveFilePicker;
  let file = handle;
  if (!file) {
    try {
      file = await picker({
        suggestedName,
        types: [
          {
            description: "EventCatalog diagram",
            accept: { "application/json": [DIAGRAM_FILE_EXTENSION] },
          },
        ],
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return undefined;
      throw error;
    }
  }
  const writable = await file.createWritable();
  await writable.write(text);
  await writable.close();
  return file;
}

/** Asks for a .eventcatalog file to open */
export function pickDiagramFile(): Promise<File | undefined> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `${DIAGRAM_FILE_EXTENSION},application/json,.json`;
    input.onchange = () => resolve(input.files?.[0]);
    input.oncancel = () => resolve(undefined);
    input.click();
  });
}
