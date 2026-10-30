import { useState } from 'react';
import { MarkdownLiveEditor } from '@/components/markdown';
import { MarkdownPreviewEditor } from '@/components/prompt/MarkdownPreviewEditor';

const SAMPLE = [
  '---',
  'title: Demo',
  'tags: [live, preview]',
  '---',
  '',
  '# Heading',
  '',
  'Paragraph with `inline code` and **bold** text.',
  '',
  '> A quiet blockquote line',
  '',
  '- unordered item',
  '- second item',
  '',
  '1. ordered item',
  '2. another',
  '',
  '- [ ] open task',
  '- [x] done task',
  '',
  '```ts',
  'const x = 1;',
  'console.log(x);',
  '```',
  '',
  '| Name | Role |',
  '| --- | --- |',
  '| Ada | Eng |',
].join('\n');

/** Dev-only page for manual markdown editor QA (`/test-editor`). */
export function MarkdownEditorPlayground() {
  const [value, setValue] = useState(SAMPLE);
  const [mode, setMode] = useState<'live' | 'source'>('live');

  return (
    <div className="flex h-screen flex-col gap-3 bg-surface p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded bg-accent px-3 py-1 text-white"
          onClick={() => setMode((m) => (m === 'live' ? 'source' : 'live'))}
        >
          Mode: {mode}
        </button>
        <span className="text-sm text-muted">Left: Live Preview · Right: read-only Preview</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        <MarkdownLiveEditor
          value={value}
          onChange={setValue}
          mode={mode}
          protectFrontmatter
          ariaLabel="Playground live"
          className="min-h-0"
        />
        <MarkdownPreviewEditor
          value={value}
          ariaLabel="Playground preview"
          className="min-h-0 h-full"
        />
      </div>
    </div>
  );
}
