import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration } from "@codemirror/view";

import type { DecorationContext } from "../livePreviewPlugin";

const headingMarks: Record<string, Decoration> = {
  ATXHeading1: Decoration.mark({ class: "cm-md-h1" }),
  ATXHeading2: Decoration.mark({ class: "cm-md-h2" }),
  ATXHeading3: Decoration.mark({ class: "cm-md-h3" }),
  ATXHeading4: Decoration.mark({ class: "cm-md-h4" }),
  ATXHeading5: Decoration.mark({ class: "cm-md-h5" }),
  ATXHeading6: Decoration.mark({ class: "cm-md-h6" }),
};

const replaceDeco = Decoration.replace({});

/**
 * `# Heading` lines. The whole line gets a `cm-md-hN` mark for font sizing;
 * on non-active lines the leading `#`s plus the following whitespace are
 * hidden via `Decoration.replace`, so the rendered view shows just the text.
 */
export function decorateHeading(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const { state, activeLines, ranges } = ctx;
  const line = state.doc.lineAt(node.from);
  const isActive = activeLines.has(line.number);

  const mark = headingMarks[node.name];
  if (mark) ranges.push(mark.range(node.from, node.to));

  if (isActive) return;

  const headerMark = node.node.firstChild;
  if (!headerMark || headerMark.name !== "HeaderMark") return;

  // Skip the whitespace that follows the `#`s — Lezer doesn't include it in
  // HeaderMark, so we walk forward until the first non-space character.
  const tail = state.doc.sliceString(headerMark.to, line.to);
  const wsLen = tail.length - tail.trimStart().length;
  ranges.push(replaceDeco.range(headerMark.from, headerMark.to + wsLen));
}
