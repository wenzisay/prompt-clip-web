#!/usr/bin/env python3
"""校验子集化后的 Material Symbols 字体是否完整保留所有图标 ligature。

Material Symbols 通过 ligature（连字）渲染：浏览器把 <span>close</span> 中的
文本 "close" 经 GSUB 的 liga 规则替换为对应图标 glyph。子集化若遗漏某条 ligature，
该图标就会原样显示成文字 —— 这是子集化最致命的回归。本脚本从字体的 GSUB 表提取
全部 ligature 字符串，逐一断言图标清单中的每个图标都存在。

用法: python verify-subset.py <font.woff2> <icon-glyphs.txt>
退出码 0 表示全部通过；非 0 表示有缺失，子集化脚本据此拒绝覆盖原字体。
"""

import sys
from pathlib import Path

from fontTools.ttLib import TTFont


def _collect_ligatures_from_subtable(subtable, glyph_to_char, out):
    """递归提取 ligature，兼容直接 LigatureSubst 与 ExtensionSubst 包装。"""
    if hasattr(subtable, "ligatures"):
        for first_glyph, ligature_set in subtable.ligatures.items():
            for ligature in ligature_set:
                chars = [glyph_to_char.get(first_glyph, "")]
                for component in ligature.Component:
                    chars.append(glyph_to_char.get(component, ""))
                out.add("".join(chars))
    elif hasattr(subtable, "ExtSubTable"):
        _collect_ligatures_from_subtable(subtable.ExtSubTable, glyph_to_char, out)


def collect_ligatures(font):
    """返回字体 GSUB 表中所有 ligature 还原后的字符串集合。"""
    glyph_to_char = {name: chr(codepoint) for codepoint, name in font.getBestCmap().items()}
    ligatures = set()
    gsub_lookups = font["GSUB"].table.LookupList.Lookup
    for lookup in gsub_lookups:
        for subtable in lookup.SubTable:
            _collect_ligatures_from_subtable(subtable, glyph_to_char, ligatures)
    return ligatures


def main():
    if len(sys.argv) != 3:
        print("用法: python verify-subset.py <font.woff2> <icon-glyphs.txt>", file=sys.stderr)
        sys.exit(2)

    font_path = Path(sys.argv[1])
    glyphs_file = Path(sys.argv[2])
    icons = [line.strip() for line in glyphs_file.read_text(encoding="utf-8").splitlines() if line.strip()]

    font = TTFont(font_path)
    ligatures = collect_ligatures(font)

    missing = [icon for icon in icons if icon not in ligatures]
    if missing:
        print(f"FAIL: {len(missing)}/{len(icons)} 个图标 ligature 缺失：", file=sys.stderr)
        for icon in missing:
            print(f"  - {icon}", file=sys.stderr)
        sys.exit(1)

    size_kb = font_path.stat().st_size / 1024
    print(
        f"OK: {len(icons)}/{len(icons)} 个图标 ligature 完整 "
        f"(字体共 {len(ligatures)} 条 ligature，{size_kb:.1f} KB)"
    )


if __name__ == "__main__":
    main()
