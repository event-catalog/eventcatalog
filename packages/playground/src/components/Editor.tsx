import { useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';
import MonacoEditor, { type OnMount, type BeforeMount, type Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { registerEcLanguage } from '../monaco/ec-language';
import { registerEcCompletion, setAllFilesSources } from '../monaco/ec-completion';
import { setDiagnostics, type DslError } from '../monaco/ec-diagnostics';

export interface EditorHandle {
  revealLine: (line: number) => void;
}

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  errors: DslError[];
  allFiles: Record<string, string>;
  onFormat?: () => void;
  onCommandPalette?: () => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor({ value, onChange, errors, allFiles, onFormat, onCommandPalette }, ref) {
  useEffect(() => {
    setAllFilesSources(allFiles);
  }, [allFiles]);
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const onFormatRef = useRef(onFormat);
  onFormatRef.current = onFormat;
  const onCommandPaletteRef = useRef(onCommandPalette);
  onCommandPaletteRef.current = onCommandPalette;

  useImperativeHandle(ref, () => ({
    revealLine(line: number) {
      const ed = editorRef.current;
      if (!ed) return;
      ed.revealLineInCenter(line);
      ed.setPosition({ lineNumber: line, column: 1 });
      ed.focus();
    },
  }));

  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    registerEcLanguage(monaco);
    registerEcCompletion(monaco);
  }, []);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, 'ec');
    }

    editor.addAction({
      id: 'ec-format',
      label: 'Format EC Document',
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      run: () => {
        onFormatRef.current?.();
      },
    });

    editor.addAction({
      id: 'ec-command-palette',
      label: 'Open Command Palette',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
      ],
      run: () => {
        onCommandPaletteRef.current?.();
      },
    });
  }, []);

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    handleMount(editor, monaco);

    const model = editor.getModel();
    if (model) {
      setDiagnostics(monaco, model, errors);
    }
  }, [handleMount, errors]);

  if (monacoRef.current && editorRef.current) {
    const model = editorRef.current.getModel();
    if (model) {
      setDiagnostics(monacoRef.current, model, errors);
    }
  }

  return (
    <div style={{ height: '100%' }} onKeyDown={(e) => e.stopPropagation()}>
    <MonacoEditor
      height="100%"
      defaultLanguage="ec"
      theme="ec-dark"
      value={value}
      onChange={(val) => onChange(val ?? '')}
      beforeMount={handleBeforeMount}
      onMount={handleEditorDidMount}
      options={{
        fontSize: 14,
        lineHeight: 22,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12 },
        automaticLayout: true,
        tabSize: 2,
        renderWhitespace: 'none',
        bracketPairColorization: { enabled: true },
        acceptSuggestionOnCommitCharacter: false,
        acceptSuggestionOnEnter: 'on',
        suggest: {
          showKeywords: false,
          showSnippets: true,
          showWords: false,
        },
      }}
    />
    </div>
  );
});
