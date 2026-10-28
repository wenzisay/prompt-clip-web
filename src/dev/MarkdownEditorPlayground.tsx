import { useState } from 'react';
import { MarkdownLiveEditor } from '@/components/markdown';

/** Dev-only page for manual markdown editor QA (`/test-editor`). */
export function MarkdownEditorPlayground() {
  const [value, setValue] = useState('---\nname: demo\n---\n\nHello world');
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
      </div>
      <MarkdownLiveEditor
        value={value}
        onChange={setValue}
        mode={mode}
        protectFrontmatter
        ariaLabel="Playground"
        className="min-h-0 flex-1"
      />
      <pre className="max-h-32 overflow-auto rounded border border-border p-2 text-xs">{value}</pre>
    </div>
  );
}
