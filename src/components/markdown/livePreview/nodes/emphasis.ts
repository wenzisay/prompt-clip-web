import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration } from "@codemirror/view";

import type { DecorationContext } from "../livePreviewPlugin";

const boldMark = Decoration.mark({ class: "cm-md-bold" });
const italicMark = Decoration.mark({ class: "cm-md-italic" });
const replaceDeco = Decoration.replace({});

/**
 * Common shape for both Strong (`**x**`) and Emphasis (`*x*` / `_x_`). The
 * inner range gets styled with the matching class; on non-active lines, the
 * surrounding `EmphasisMark` children are hidden.
 */
function decorateEmphasisLike(
  node: SyntaxNodeRef,
  ctx: DecorationContext,
  mark: Decoration,
): void {
  const { state, activeLines, ranges } = ctx;
  const line = state.doc.lineAt(node.from);
  const isActive = activeLines.has(line.number);

  const first = node.node.firstChild;
  const last = node.node.lastChild;
  if (!first || !last) return;
  if (first.name !== "EmphasisMark" || last.name !== "EmphasisMark") return;

  // Style the content between the markers.
  if (first.to < last.from) {
    ranges.push(mark.range(first.to, last.from));
  }

  if (isActive) return;

  ranges.push(replaceDeco.range(first.from, first.to));
  ranges.push(replaceDeco.range(last.from, last.to));
}

export function decorateStrong(node: SyntaxNodeRef, ctx: DecorationContext): void {
  decorateEmphasisLike(node, ctx, boldMark);
}

export function decorateEmphasis(node: SyntaxNodeRef, ctx: DecorationContext): void {
  decorateEmphasisLike(node, ctx, italicMark);
}
