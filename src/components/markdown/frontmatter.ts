/**
 * Line numbers (1-indexed) that belong to a leading YAML frontmatter block.
 */
export function getFrontmatterProtectedLineNumbers(doc: string): Set<number> {
  const normalized = doc.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return new Set();
  }

  const block = match[0];
  const lineCount = block.split(/\r?\n/).length;
  const lines = new Set<number>();
  for (let line = 1; line <= lineCount; line += 1) {
    lines.add(line);
  }
  return lines;
}
