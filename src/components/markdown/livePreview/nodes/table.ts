import { syntaxTree } from "@codemirror/language";
import { type EditorState, type Range, StateField } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  WidgetType,
} from "@codemirror/view";
import { renderMarkdownSync } from "@/utils/markdown";

import { getFrontmatterProtectedLineNumbers } from "../../frontmatter";
import type { LivePreviewOptions } from "../livePreviewPlugin";

/**
 * GFM table rendered in place of its source. The document stays Markdown;
 * clicking the widget moves the cursor into the source so the block becomes
 * editable text again.
 */
class MarkdownTableWidget extends WidgetType {
  constructor(
    readonly source: string,
    readonly lineStarts: readonly number[],
    readonly html: string,
  ) {
    super();
  }

  override eq(other: MarkdownTableWidget): boolean {
    return other.source === this.source && sameLineStarts(other.lineStarts, this.lineStarts);
  }

  override toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "cm-md-table";
    wrap.innerHTML = this.html;
    const enterSource = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const pos = lineStartForClick(wrap, event, this.lineStarts);
      view.dispatch({
        selection: { anchor: pos },
        scrollIntoView: true,
      });
      view.focus();
    };
    wrap.addEventListener("mousedown", enterSource);
    wrap.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    return wrap;
  }

  override ignoreEvent(): boolean {
    return true;
  }

  override get estimatedHeight(): number {
    return Math.max(48, this.lineStarts.length * 32);
  }
}

function sameLineStarts(left: readonly number[], right: readonly number[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

/**
 * Header is source line 0. The delimiter row is not rendered, so each later
 * rendered row maps to the source line after that delimiter.
 */
function lineStartForClick(
  wrap: HTMLElement,
  event: Event,
  lineStarts: readonly number[],
): number {
  const fallback = lineStarts[0] ?? 0;
  if (!(event.target instanceof Element)) return fallback;
  const row = event.target.closest("tr");
  if (!row || !wrap.contains(row)) return fallback;
  const rows = Array.from(wrap.querySelectorAll("tr"));
  const index = rows.indexOf(row);
  if (index < 0) return fallback;
  const lineIndex = index === 0 ? 0 : index + 1;
  return lineStarts[lineIndex] ?? lineStarts[lineStarts.length - 1] ?? fallback;
}

function activeLineNumbers(state: EditorState, options: LivePreviewOptions): Set<number> {
  const lines = new Set<number>(options.protectedLines ?? []);
  if (options.protectFrontmatter) {
    for (const line of getFrontmatterProtectedLineNumbers(state.doc.toString())) {
      lines.add(line);
    }
  }
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let line = fromLine; line <= toLine; line += 1) lines.add(line);
  }
  return lines;
}

function tableExtent(state: EditorState, from: number, to: number) {
  const start = state.doc.lineAt(from);
  const endProbe = Math.max(from, to - 1);
  const end = state.doc.lineAt(Math.min(endProbe, state.doc.length));
  const endLine = end.number < start.number ? start : end;
  let blockTo = endLine.to;
  if (blockTo < state.doc.length) blockTo += 1;
  return { start, endLine, blockFrom: start.from, blockTo };
}

function buildTableDecorations(state: EditorState, options: LivePreviewOptions): DecorationSet {
  const active = activeLineNumbers(state, options);
  const ranges: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return;

      const extent = tableExtent(state, node.from, node.to);
      for (let line = extent.start.number; line <= extent.endLine.number; line += 1) {
        if (active.has(line)) return false;
      }

      const source = state.doc.sliceString(extent.start.from, extent.endLine.to);
      const html = renderMarkdownSync(source);
      if (!html.includes("<table")) return false;

      const lineStarts: number[] = [];
      for (let line = extent.start.number; line <= extent.endLine.number; line += 1) {
        lineStarts.push(state.doc.line(line).from);
      }
      ranges.push(
        Decoration.replace({
          widget: new MarkdownTableWidget(source, lineStarts, html),
          block: true,
        }).range(extent.blockFrom, extent.blockTo),
      );
      return false;
    },
  });

  return Decoration.set(ranges, true);
}

/**
 * Block widgets cannot be provided by a ViewPlugin, so table rendering lives
 * in a state field. The live-preview plugin still skips table children so
 * inline decorations do not overlap the replaced source.
 */
export function tablePreviewExtension(options: LivePreviewOptions = {}) {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildTableDecorations(state, options);
    },
    update(_decorations, transaction) {
      return buildTableDecorations(transaction.state, options);
    },
    provide: (field) => EditorView.decorations.from(field),
  });
}
