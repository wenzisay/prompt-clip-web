import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration } from "@codemirror/view";

import type { DecorationsContext } from "../livePreviewPlugin";

const listMarkerMark = Decoration.mark({ class: "cm-md-list-marker" });
const listItemLine = Decoration.line({ class: "cm-md-list-item-line" });

/**
 * `- item` / `1. item` / `* item`.
 * Keep the raw list marker (Obsidian does too) but mute its color so the line
 * reads closer to rendered prose. Task lines skip the marker mark — the task
 * decorator hides the dash and injects a checkbox instead.
 */
export function decorateListItem(node: SyntaxNodeRef, ctx: DecorationsContext): void {
  const { state, ranges } = ctx;
  const first = node.node.firstChild;
  if (!first || first.name !== "ListMark") return;

  const line = state.doc.lineAt(node.from);
  ranges.push(listItemLine.range(line.from));

  const second = first.nextSibling;
  if (second?.name === "Task") return;

  ranges.push(listMarkerMark.range(first.from, first.to));
}
