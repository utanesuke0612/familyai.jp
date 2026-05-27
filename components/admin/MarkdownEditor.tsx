'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown } from '@codemirror/lang-markdown';
import { EditorView, type ViewUpdate } from '@codemirror/view';
import {
  AlertTriangle,
  Bold,
  Code2,
  GitBranch,
  Heading2,
  Heading3,
  Link,
  List,
  MessageSquare,
  Table2,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  placeholder?: string;
  ariaLabel?: string;
  onScrollRatioChange?: (ratio: number) => void;
  showToolbar?: boolean;
}

export interface MarkdownEditorHandle {
  focusLine: (lineNumber: number) => void;
  applyEdit: (kind: ToolbarAction) => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(function MarkdownEditor({
  value,
  onChange,
  height = '520px',
  placeholder = '## 見出し\n\n本文を Markdown で書いてください…',
  ariaLabel = '本文（Markdown 入力）',
  onScrollRatioChange,
  showToolbar = true,
}, ref) {
  const editorRef = useRef<EditorView | null>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);
  const extensions = useMemo(
    () => [
      markdown(),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': {
          height: '100%',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#fff',
          fontSize: '13px',
        },
        '.cm-scroller': {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          lineHeight: '1.7',
        },
        '.cm-content': {
          padding: '12px 0',
        },
        '.cm-line': {
          padding: '0 14px',
        },
        '.cm-gutters': {
          backgroundColor: '#F9FAFB',
          borderRight: '1px solid #E5E7EB',
          color: '#9CA3AF',
        },
        '.cm-activeLine': {
          backgroundColor: '#FFF7ED',
        },
        '.cm-activeLineGutter': {
          backgroundColor: '#FFF7ED',
          color: '#B45309',
        },
        '&.cm-focused': {
          outline: '2px solid var(--shu)',
          outlineOffset: '2px',
        },
      }),
    ],
    [height],
  );

  useEffect(() => {
    return () => scrollCleanupRef.current?.();
  }, []);

  useImperativeHandle(ref, () => ({
    focusLine(lineNumber: number) {
      const view = editorRef.current;
      if (!view) return;
      const line = view.state.doc.line(Math.max(1, Math.min(lineNumber, view.state.doc.lines)));
      view.dispatch({
        selection: { anchor: line.from },
        effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
      });
      view.focus();
    },
    applyEdit(kind: ToolbarAction) {
      const view = editorRef.current;
      if (!view) return;
      const selection = view.state.selection.main;
      const selected = view.state.sliceDoc(selection.from, selection.to);
      const insert = buildInsert(kind, selected);
      view.dispatch({
        changes: { from: selection.from, to: selection.to, insert: insert.text },
        selection: { anchor: selection.from + insert.cursorOffset },
      });
      view.focus();
    },
  }), []);

  function applyEdit(kind: ToolbarAction): void {
    const view = editorRef.current;
    if (!view) return;

    const selection = view.state.selection.main;
    const selected = view.state.sliceDoc(selection.from, selection.to);
    const insert = buildInsert(kind, selected);
    const anchor = selection.from + insert.cursorOffset;

    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: insert.text },
      selection: { anchor },
    });
    view.focus();
  }

  return (
    <div style={{ height, display: 'flex', flexDirection: 'column' }}>
      {(showToolbar ?? true) && (
      <div
        aria-label="Markdown ツールバー"
        role="toolbar"
        style={{
          display:      'flex',
          flexWrap:    'wrap',
          gap:         '6px',
          marginBottom: '8px',
          flexShrink:   0,
        }}
      >
        {TOOLBAR_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.kind}
              type="button"
              onClick={() => applyEdit(action.kind)}
              aria-label={action.label}
              title={action.label}
              style={{
                width:          '34px',
                height:         '34px',
                display:        'inline-flex',
                alignItems:     'center',
                justifyContent: 'center',
                border:         '1px solid #D1D5DB',
                borderRadius:   '6px',
                background:     'white',
                color:          '#374151',
                cursor:         'pointer',
              }}
            >
              <Icon size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      )}

      <CodeMirror
        value={value}
        height="100%"
        style={{ flex: 1, minHeight: 0 }}
        placeholder={placeholder}
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={(view) => {
          editorRef.current = view;
          scrollCleanupRef.current?.();
          const handleScroll = () => {
            if (!onScrollRatioChange) return;
            const { scrollTop, scrollHeight, clientHeight } = view.scrollDOM;
            const max = scrollHeight - clientHeight;
            onScrollRatioChange(max > 0 ? scrollTop / max : 0);
          };
          view.scrollDOM.addEventListener('scroll', handleScroll, { passive: true });
          scrollCleanupRef.current = () => view.scrollDOM.removeEventListener('scroll', handleScroll);
        }}
        onUpdate={(update: ViewUpdate) => {
          if (update.view !== editorRef.current) editorRef.current = update.view;
        }}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          searchKeymap: true,
          defaultKeymap: true,
          history: true,
        }}
        aria-label={ariaLabel}
      />
    </div>
  );
});

export type ToolbarAction =
  | 'h2'
  | 'h3'
  | 'bold'
  | 'link'
  | 'list'
  | 'code'
  | 'mermaid'
  | 'message'
  | 'alert'
  | 'table';

export const TOOLBAR_ACTIONS: Array<{
  kind: ToolbarAction;
  label: string;
  icon: typeof Bold;
}> = [
  { kind: 'h2', label: 'H2 見出し', icon: Heading2 },
  { kind: 'h3', label: 'H3 見出し', icon: Heading3 },
  { kind: 'bold', label: '太字', icon: Bold },
  { kind: 'link', label: 'リンク', icon: Link },
  { kind: 'list', label: '箇条書き', icon: List },
  { kind: 'code', label: 'コードブロック', icon: Code2 },
  { kind: 'mermaid', label: 'Mermaid 図', icon: GitBranch },
  { kind: 'message', label: 'メッセージ枠', icon: MessageSquare },
  { kind: 'alert', label: '警告メッセージ枠', icon: AlertTriangle },
  { kind: 'table', label: '表', icon: Table2 },
];

function buildInsert(kind: ToolbarAction, selected: string): { text: string; cursorOffset: number } {
  const text = selected || defaultText(kind);

  switch (kind) {
    case 'h2':
      return linePrefix('## ', text);
    case 'h3':
      return linePrefix('### ', text);
    case 'bold':
      return wrap('**', '**', text);
    case 'link':
      return selected
        ? { text: `[${selected}](https://example.com)`, cursorOffset: selected.length + 3 }
        : { text: '[リンクテキスト](https://example.com)', cursorOffset: 1 };
    case 'list':
      return {
        text: text
          .split('\n')
          .map((line) => line.trim() ? `- ${line}` : '- ')
          .join('\n'),
        cursorOffset: 2,
      };
    case 'code':
      return fenced('ts', text);
    case 'mermaid':
      return fenced('mermaid', buildMermaidSnippet(text));
    case 'message':
      return block(':::message', text);
    case 'alert':
      return block(':::message alert', text);
    case 'table':
      return {
        text: '| 項目 | 内容 |\n|---|---|\n| 例 | 説明 |\n',
        cursorOffset: 2,
      };
  }
}

function defaultText(kind: ToolbarAction): string {
  if (kind === 'h2' || kind === 'h3') return '見出し';
  if (kind === 'bold') return '太字';
  if (kind === 'list') return '項目';
  if (kind === 'message' || kind === 'alert') return 'ここに本文を書きます';
  return '';
}

function linePrefix(prefix: string, text: string): { text: string; cursorOffset: number } {
  const value = text
    .split('\n')
    .map((line) => `${prefix}${line.replace(/^#{1,6}\s*/, '')}`)
    .join('\n');
  return { text: value, cursorOffset: value.length };
}

function wrap(before: string, after: string, text: string): { text: string; cursorOffset: number } {
  return {
    text: `${before}${text}${after}`,
    cursorOffset: before.length + text.length,
  };
}

function fenced(language: string, text: string): { text: string; cursorOffset: number } {
  const value = `\`\`\`${language}\n${text}\n\`\`\`\n`;
  return { text: value, cursorOffset: language.length + 4 + text.length };
}

function block(start: string, text: string): { text: string; cursorOffset: number } {
  const value = `${start}\n${text}\n:::\n`;
  return { text: value, cursorOffset: start.length + 1 + text.length };
}

function buildMermaidSnippet(selected: string): string {
  const label = selected.trim();
  if (/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/.test(label)) {
    return label;
  }
  const safeLabel = label || '記事を書く';
  return `flowchart TD\n  A["${escapeMermaidLabel(safeLabel)}"] --> B["保存する"]`;
}

function escapeMermaidLabel(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, ' ');
}
