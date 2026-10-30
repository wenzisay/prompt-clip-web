import type { SyntaxNodeRef } from "@lezer/common";
import { Decoration, WidgetType } from "@codemirror/view";

import type { DecorationContext } from "../livePreviewPlugin";

const replaceDeco = Decoration.replace({});

class TaskCheckboxWidget extends WidgetType {
  constructor(readonly checked: boolean) {
    super();
  }

  override eq(other: TaskCheckboxWidget): boolean {
    return other.checked === this.checked;
  }

  override toDOM(): HTMLElement {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = true;
    input.checked = this.checked;
    input.className = "cm-md-task-checkbox";
    input.setAttribute("aria-hidden", "true");
    return input;
  }

  override ignoreEvent(): boolean {
    return true;
  }
}

/**
 * GFM task list items (`- [ ]` / `- [x]`). On preview lines the list dash and
 * bracket marker hide and a disabled checkbox widget appears, matching marked
 * preview output.
 */
export function decorateTask(node: SyntaxNodeRef, ctx: DecorationContext): void {
  const { state, activeLines, ranges } = ctx;
  const line = state.doc.lineAt(node.from);
  if (activeLines.has(line.number)) return;

  const taskMarker = node.node.firstChild;
  if (!taskMarker || taskMarker.name !== "TaskMarker") return;

  const checked = state.doc.sliceString(taskMarker.from, taskMarker.to).includes("x");
  const listItem = node.node.parent;
  const listMark = listItem?.firstChild;
  if (listMark?.name === "ListMark") {
    ranges.push(replaceDeco.range(listMark.from, listMark.to));
    const afterListMark = state.doc.sliceString(listMark.to, taskMarker.from);
    const gapLen = afterListMark.length - afterListMark.trimStart().length;
    if (gapLen > 0) {
      ranges.push(replaceDeco.range(listMark.to, listMark.to + gapLen));
    }
  }

  ranges.push(replaceDeco.range(taskMarker.from, taskMarker.to));
  const afterMarker = state.doc.sliceString(taskMarker.to, line.to);
  const wsLen = afterMarker.length - afterMarker.trimStart().length;
  if (wsLen > 0) {
    ranges.push(replaceDeco.range(taskMarker.to, taskMarker.to + wsLen));
  }

  ranges.push(
    Decoration.widget({
      widget: new TaskCheckboxWidget(checked),
      side: 1,
    }).range(taskMarker.to + wsLen),
  );
}
