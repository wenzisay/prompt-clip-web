import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration } from "@codemirror/view";

import type { DecorationContext } from "../livePreviewPlugin";

const blockquoteLine = Decoration.line({ class: "cm-md-blockquote-line" });
const replaceDeco = Decoration.replace({});

/**
 * `> quoted text` blocks. Non-active lines lose the `>` marker (and the
 * following space) and pick up prose-matching blockquote line styling.
 */
export function decorateBlockquote(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const { state, activeLines, ranges } = ctx;
  const fromLine = state.doc.lineAt(node.from).number;
  const toLine = state.doc.lineAt(node.to).number;

  for (let lineNo = fromLine; lineNo <= toLine; lineNo += 1) {
    ranges.push(blockquoteLine.range(state.doc.line(lineNo).from));
  }

  node.node.cursor().iterate((child) => {
    if (child.name !== "QuoteMark") return;
    const line = state.doc.lineAt(child.from);
    if (activeLines.has(line.number)) return;
    ranges.push(replaceDeco.range(child.from, child.to));
    const tail = state.doc.sliceString(child.to, line.to);
    const wsLen = tail.length - tail.trimStart().length;
    if (wsLen > 0) {
      ranges.push(replaceDeco.range(child.to, child.to + wsLen));
    }
  });
}
