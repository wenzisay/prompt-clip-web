import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration, WidgetType } from "@codemirror/view";

import type { DecorationContext } from "../livePreviewPlugin";

const inlineCodeMark = Decoration.mark({ class: "cm-md-inline-code" });
const codeBlockMark = Decoration.mark({ class: "cm-md-code-block" });
const fenceHiddenLine = Decoration.line({ class: "cm-md-fence-hidden" });
const fenceCopyAnchorLine = Decoration.line({ class: "cm-md-fence-copy-anchor" });
const replaceDeco = Decoration.replace({});

/**
 * `` `code` `` runs. Inner range gets the `cm-md-inline-code` class (monospace
 * font, subtle background). On non-active lines, the two backtick marks are
 * hidden.
 */
export function decorateInlineCode(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const { state, activeLines, ranges } = ctx;
  const line = state.doc.lineAt(node.from);
  const isActive = activeLines.has(line.number);

  const first = node.node.firstChild;
  const last = node.node.lastChild;
  if (!first || !last) return;
  if (first.name !== "CodeMark" || last.name !== "CodeMark") return;

  if (first.to < last.from) {
    ranges.push(inlineCodeMark.range(first.to, last.from));
  }

  if (isActive) return;

  ranges.push(replaceDeco.range(first.from, first.to));
  ranges.push(replaceDeco.range(last.from, last.to));
}

/**
 * Inline copy-button widget. Lives on the first body line of a fenced code
 * block. CSS positions it absolutely at the block's top-right.
 *
 * `eq` compares the captured code text so CM6 reuses the existing DOM node
 * when the code hasn't changed (avoids tearing the button + losing focus on
 * every doc tick). When the code DOES change, CM6 destroys and recreates the
 * widget — that gives the fresh closure the new `code` string.
 */
class CopyFenceWidget extends WidgetType {
  constructor(readonly code: string) {
    super();
  }
  override eq(other: CopyFenceWidget): boolean {
    return other.code === this.code;
  }
  override toDOM(): HTMLElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cm-md-copy-fence-btn";
    btn.title = "Copy code block";
    btn.setAttribute("aria-label", "Copy code block");
    // Inline SVG copy icon — no external font dependency.
    btn.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
    // Use mousedown so the editor doesn't steal focus + selection before we
    // run; preventDefault keeps the cursor where it was.
    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const onDone = () => {
        btn.classList.add("copied");
        window.setTimeout(() => btn.classList.remove("copied"), 1200);
      };
      navigator.clipboard.writeText(this.code).then(onDone).catch(() => {
        // Older browsers / non-secure context — fall back to a transient
        // textarea selection so the user gets *something* useful.
        const ta = document.createElement("textarea");
        ta.value = this.code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          onDone();
        } finally {
          ta.remove();
        }
      });
    });
    return btn;
  }
  override ignoreEvent(): boolean {
    return false;
  }
}

/**
 * Fenced code blocks: ```` ```lang ... ``` ````.
 *
 * Always: the whole block carries `cm-md-code-block` for monospace + subtle
 * background, and the first body line carries `cm-md-fence-copy-anchor` plus
 * a `CopyFenceWidget` so users can one-click copy the body (everything
 * between the fences).
 *
 * When no line in the block is active: the opening fence line and the closing
 * fence line are line-decorated with `cm-md-fence-hidden`, which CSS
 * collapses via `display: none`. The doc positions stay intact; only the
 * visual line is gone. The moment the cursor moves onto any line of the
 * block, the activeLines check fails and the fences reveal — exactly like
 * Obsidian.
 */
export function decorateFencedCode(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const { state, activeLines, ranges } = ctx;

  ranges.push(codeBlockMark.range(node.from, node.to));

  const fromLineNo = state.doc.lineAt(node.from).number;
  const toLineNo = state.doc.lineAt(node.to).number;
  let anyActive = false;
  for (let n = fromLineNo; n <= toLineNo; n++) {
    if (activeLines.has(n)) {
      anyActive = true;
      break;
    }
  }

  const firstChild = node.node.firstChild;
  const lastChild = node.node.lastChild;
  const hasOpeningFence = firstChild?.name === "CodeMark";
  const hasClosingFence =
    lastChild?.name === "CodeMark" && firstChild && lastChild.from !== firstChild.from;

  // Compute the body line range. The body is everything between the opening
  // fence line and the closing fence line; for an unfinished block (no
  // closing fence), the body extends to the block's last line.
  if (hasOpeningFence && firstChild) {
    const openLineNo = state.doc.lineAt(firstChild.from).number;
    const closeLineNo = hasClosingFence
      ? state.doc.lineAt(lastChild!.from).number
      : toLineNo + 1; // synthetic: include the last block line as body
    const firstBodyLineNo = openLineNo + 1;
    const lastBodyLineNo = closeLineNo - 1;

    if (firstBodyLineNo <= lastBodyLineNo && firstBodyLineNo <= state.doc.lines) {
      const firstBodyLine = state.doc.line(firstBodyLineNo);
      const lastBodyLine = state.doc.line(
        Math.min(lastBodyLineNo, state.doc.lines),
      );
      const codeText = state.doc.sliceString(firstBodyLine.from, lastBodyLine.to);

      ranges.push(fenceCopyAnchorLine.range(firstBodyLine.from));
      // side: -1 places the widget BEFORE the line's text content, so it
      // sits as the first inline child of the .cm-line element. CSS makes
      // it position: absolute so its visual location is the block's top-right
      // regardless of which inline child it is in the line.
      ranges.push(
        Decoration.widget({
          widget: new CopyFenceWidget(codeText),
          side: -1,
        }).range(firstBodyLine.from),
      );
    }
  }

  if (anyActive) return;

  // Fence hiding — keep last so it appears after the copy-button decorations
  // in the range list. Sorting in buildDecorations will normalize.
  if (hasOpeningFence && firstChild) {
    const firstLine = state.doc.lineAt(firstChild.from);
    ranges.push(fenceHiddenLine.range(firstLine.from));
  }
  if (hasClosingFence && lastChild) {
    const lastLine = state.doc.lineAt(lastChild.from);
    ranges.push(fenceHiddenLine.range(lastLine.from));
  }
}
