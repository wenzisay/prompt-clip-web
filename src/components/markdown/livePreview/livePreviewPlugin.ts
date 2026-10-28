import { syntaxTree } from "@codemirror/language";
import type { EditorState, Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";

import { decorateEmphasis, decorateStrong } from "./nodes/emphasis";
import { decorateFencedCode, decorateInlineCode } from "./nodes/code";
import { decorateHeading } from "./nodes/heading";
import { decorateImage, decorateLink } from "./nodes/link";
import { decorateListItem } from "./nodes/list";
import { getFrontmatterProtectedLineNumbers } from "../frontmatter";

/**
 * Per-plugin options. Tests and consumers can pass these to `livePreviewPlugin()`.
 */
export interface LivePreviewOptions {
  /** See `MarkdownEditorProps.imageResolver`. */
  imageResolver?: (src: string) => string | null | undefined;
  /** Lines that always show raw markdown (e.g. YAML frontmatter). 1-indexed. */
  protectedLines?: Set<number>;
  /** When true, leading `---` YAML blocks stay in source form. */
  protectFrontmatter?: boolean;
}

/**
 * Shared mutable state passed to each node decorator. Keeps the recursion
 * single-pass and avoids a per-node function return contract — each decorator
 * pushes any number of ranges into `ranges`.
 */
export interface DecorationContext {
  state: EditorState;
  /**
   * Line numbers (1-indexed, CM6 convention) that the selection currently
   * touches. Decorators check this to decide whether to *hide* syntax tokens
   * via `Decoration.replace`, or leave them visible so the user can edit.
   *
   * A range selection across multiple lines marks all of them active. A
   * collapsed caret on one line marks just that one.
   */
  activeLines: Set<number>;
  ranges: Range<Decoration>[];
  options: LivePreviewOptions;
}

function activeLineSet(state: EditorState, protectedLines?: Set<number>): Set<number> {
  const lines = new Set<number>(protectedLines ?? []);
  for (const range of state.selection.ranges) {
    const fromLine = state.doc.lineAt(range.from).number;
    const toLine = state.doc.lineAt(range.to).number;
    for (let n = fromLine; n <= toLine; n++) lines.add(n);
  }
  return lines;
}

/**
 * Build the decoration set for the visible ranges of the editor. Exported so
 * tests can call it directly on an `EditorView` without mounting React.
 */
export function buildDecorations(
  view: EditorView,
  options: LivePreviewOptions = {},
): DecorationSet {
  const protectedLines = new Set(options.protectedLines ?? []);
  if (options.protectFrontmatter) {
    for (const line of getFrontmatterProtectedLineNumbers(view.state.doc.toString())) {
      protectedLines.add(line);
    }
  }

  const ctx: DecorationContext = {
    state: view.state,
    activeLines: activeLineSet(view.state, protectedLines),
    ranges: [],
    options,
  };

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        switch (node.name) {
          case "ATXHeading1":
          case "ATXHeading2":
          case "ATXHeading3":
          case "ATXHeading4":
          case "ATXHeading5":
          case "ATXHeading6":
            decorateHeading(node, ctx);
            return;
          case "StrongEmphasis":
            decorateStrong(node, ctx);
            return;
          case "Emphasis":
            decorateEmphasis(node, ctx);
            return;
          case "InlineCode":
            decorateInlineCode(node, ctx);
            return;
          case "FencedCode":
            decorateFencedCode(node, ctx);
            return;
          case "Link":
            decorateLink(node, ctx);
            return;
          case "Image":
            decorateImage(node, ctx);
            return;
          case "ListItem":
            decorateListItem(node, ctx);
            return;
        }
      },
    });
  }

  // Sort by from-then-to. CM6's RangeSet builder will re-sort defensively, but
  // pre-sorting keeps the cost predictable and surfaces ordering bugs early.
  ctx.ranges.sort((a, b) => a.from - b.from || a.to - b.to);
  return Decoration.set(ctx.ranges, true);
}

/**
 * CodeMirror 6 ViewPlugin that decorates the visible markdown source so syntax
 * tokens are hidden on non-active lines and reappear when the cursor lands on
 * them. This is the Obsidian Live Preview pattern in ~50 lines of orchestration
 * plus per-node functions under `./nodes/`.
 *
 * Rebuilds the decoration set on every doc change, viewport change, or
 * selection change. Lezer is incremental so this is cheap even on large docs.
 */
export function livePreviewPlugin(options: LivePreviewOptions = {}) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;
      constructor(view: EditorView) {
        this.decorations = buildDecorations(view, options);
      }
      update(u: ViewUpdate) {
        if (u.docChanged || u.viewportChanged || u.selectionSet) {
          this.decorations = buildDecorations(u.view, options);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}
