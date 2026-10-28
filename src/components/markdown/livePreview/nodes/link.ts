import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration, WidgetType } from "@codemirror/view";

import type { DecorationContext } from "../livePreviewPlugin";

const linkLabelMark = Decoration.mark({ class: "cm-md-link" });
const replaceDeco = Decoration.replace({});

/**
 * `[label](url)` links.
 *
 * Off-active-line:
 *   - The opening `[` is hidden.
 *   - Everything from the closing `]` through the trailing `)` is hidden in
 *     one replace range (covers `](url)` and any optional `"title"`).
 *   - The label between `[` and `]` is styled as a link.
 *
 * On-active-line: the whole node renders as raw markdown for editing — no
 * replace decorations emitted.
 */
export function decorateLink(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const { state, activeLines, ranges } = ctx;
  const line = state.doc.lineAt(node.from);
  const isActive = activeLines.has(line.number);

  const marks = node.node.getChildren("LinkMark");
  // A well-formed inline link has 4 LinkMarks: "[", "]", "(", ")".
  if (marks.length < 4) return;
  const openBracket = marks[0];
  const closeBracket = marks[1];
  const closeParen = marks[marks.length - 1];

  // Style the label.
  if (openBracket.to < closeBracket.from) {
    ranges.push(linkLabelMark.range(openBracket.to, closeBracket.from));
  }

  if (isActive) return;

  ranges.push(replaceDeco.range(openBracket.from, openBracket.to));
  // One range from "]" through ")" covers the URL and any optional title.
  ranges.push(replaceDeco.range(closeBracket.from, closeParen.to));
}

/**
 * Widget that renders an `<img>` element inline. Stored alt + src are
 * compared in `eq()` so CM6 reuses the widget DOM across decoration rebuilds
 * — the image doesn't re-fetch when the user types in another part of the
 * document.
 */
class ImageWidget extends WidgetType {
  constructor(
    readonly alt: string,
    readonly src: string,
  ) {
    super();
  }
  override eq(other: ImageWidget): boolean {
    return other.alt === this.alt && other.src === this.src;
  }
  override toDOM(): HTMLElement {
    const img = document.createElement("img");
    img.src = this.src;
    img.alt = this.alt;
    img.className = "cm-md-image";
    return img;
  }
  // Let the editor handle clicks on the widget — click-to-edit reveals the
  // raw markdown by moving the cursor onto that line.
  override ignoreEvent(): boolean {
    return false;
  }
}

/**
 * `![alt](url)` images.
 *
 * Off-active-line: the entire node is replaced with an `<img>` widget. If the
 * host supplied an `imageResolver` that returns `null`/`undefined` for this
 * URL, the image falls back to link-style decoration (alt visible, brackets
 * and url hidden) — a safe path for unresolved or denied sources.
 *
 * On-active-line: raw markdown shows for editing.
 */
export function decorateImage(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const { state, activeLines, ranges, options } = ctx;
  const line = state.doc.lineAt(node.from);
  const isActive = activeLines.has(line.number);

  const marks = node.node.getChildren("LinkMark");
  if (marks.length < 4) return;
  const openBracket = marks[0]; // "[" — the "!" precedes it as a literal char
  const closeBracket = marks[1];
  const closeParen = marks[marks.length - 1];

  // Style the alt text so it has the link color even before the widget loads.
  if (openBracket.to < closeBracket.from) {
    ranges.push(linkLabelMark.range(openBracket.to, closeBracket.from));
  }

  if (isActive) return;

  const alt = state.doc.sliceString(openBracket.to, closeBracket.from);
  const urlNode = node.node.getChild("URL");
  const rawSrc = urlNode ? state.doc.sliceString(urlNode.from, urlNode.to) : "";
  const resolved = options.imageResolver ? options.imageResolver(rawSrc) : rawSrc;

  if (resolved) {
    ranges.push(
      Decoration.replace({ widget: new ImageWidget(alt, resolved) }).range(
        node.from,
        node.to,
      ),
    );
    return;
  }

  // Resolver returned null — fall back to link-style hiding so the source
  // stays in the doc but isn't loaded as an image.
  ranges.push(replaceDeco.range(node.from, openBracket.to));
  ranges.push(replaceDeco.range(closeBracket.from, closeParen.to));
}
