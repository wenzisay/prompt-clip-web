import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration } from "@codemirror/view";

import type { DecorationContext } from "../livePreviewPlugin";

const listMarkerMark = Decoration.mark({ class: "cm-md-list-marker" });

/**
 * `- item` / `1. item` / `* item`. v1 keeps it minimal: the list marker
 * (`-`, `*`, `1.`) stays visible and gets a muted color class. This is
 * deliberately simpler than swapping the marker for a widget bullet:
 *
 *   - Widget bullets break copy-paste of selected text (the bullet copies
 *     as the widget's content, not as the raw marker).
 *   - Editing a widget-replaced marker requires cursor logic that the
 *     transactionFilter (task #6) already handles, but adds surface area.
 *   - Real markdown viewers (Obsidian included) show the marker character;
 *     muting its color is enough to read as "rendered" without losing
 *     fidelity.
 *
 * Active-line behavior: the marker is already visible, so there's no special
 * case — the same decoration applies whether or not the cursor is on the line.
 */
export function decorateListItem(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const first = node.node.firstChild;
  if (!first || first.name !== "ListMark") return;
  ctx.ranges.push(listMarkerMark.range(first.from, first.to));
}
