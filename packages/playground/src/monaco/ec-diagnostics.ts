import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type { FileOffsets } from '../hooks/useDslParser';

export interface DslError {
  message: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export function getErrorsForFile(
  errors: DslError[],
  activeFile: string,
  fileOffsets: FileOffsets,
): DslError[] {
  const offset = fileOffsets[activeFile];
  if (!offset) return [];

  const { startLine, lineCount } = offset;
  const endLine = startLine + lineCount - 1;

  return errors
    .filter((err) => err.line >= startLine && err.line <= endLine)
    .map((err) => ({
      ...err,
      line: err.line - startLine + 1,
      endLine: err.endLine != null ? err.endLine - startLine + 1 : undefined,
    }));
}

export function setDiagnostics(
  monaco: Monaco,
  model: editor.ITextModel,
  errors: DslError[],
) {
  const markers: editor.IMarkerData[] = errors.map((err) => ({
    severity: monaco.MarkerSeverity.Error,
    message: err.message,
    startLineNumber: err.line,
    startColumn: err.column,
    endLineNumber: err.endLine ?? err.line,
    endColumn: err.endColumn ?? err.column + 1,
  }));

  monaco.editor.setModelMarkers(model, 'ec', markers);
}
