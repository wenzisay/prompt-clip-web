#!/usr/bin/env python3
"""子集化 Material Symbols Outlined 字体，仅保留项目实际使用的图标。

完整字体含 6560 个 glyph / 4250 条 ligature（~1.1MB）。本脚本自动扫描 src 下
所有 .tsx 提取实际使用的图标名，子集化后可降至 ~12KB，且保留全部可变字体轴。

图标清单由脚本扫描源码自动得出（权威），并刷新写入 icon-glyphs.txt 作为人类
可读文档。无需手工维护清单 —— 新增图标只需在组件里照常使用，重跑本脚本即可。

为什么需要 Python 编排（而非纯 pyftsubset 命令行）：
Material Symbols 所有图标名都由 a-z + _ 组成。若仅用 --text 传入图标名，
pyftsubset 会保留这些字母 glyph，进而经 GSUB ligature closure 把全部图标
glyph 重新拉回（实测仅减少 13%）。因此这里先从字体 GSUB 表查出每个图标
ligature 真正指向的 glyph 名，用 --glyphs-file 显式指定，并配合
--no-layout-closure 禁止把其它图标 glyph 拉入保留集。
"""

import re
import subprocess
import sys
from pathlib import Path

from fontTools.ttLib import TTFont

SCRIPT_DIR = Path(__file__).resolve().parent
ROOT_DIR = SCRIPT_DIR.parent
SRC_DIR = ROOT_DIR / "src"
FONT_PATH = ROOT_DIR / "public" / "fonts" / "material-symbols-outlined.woff2"
GLYPHS_TXT = SCRIPT_DIR / "icon-glyphs.txt"  # 脚本生成，作为文档 + 校验输入
GLYPH_NAMES_TMP = SCRIPT_DIR / ".icon-glyph-names.txt"  # 临时，子集化后删除
SUBSET_TMP = ROOT_DIR / "public" / "fonts" / "material-symbols-outlined.subset.woff2"
VERIFY_PY = SCRIPT_DIR / "verify-subset.py"

# 合法 Material Symbol 图标名：小写字母开头，含字母/数字/下划线
_ICON_NAME = r"[a-z][a-z0-9_]*"

# 扫描规则：覆盖项目中所有图标的引用方式
_SCAN_PATTERNS = [
    # <span ...material-symbols-outlined...>  图标名  </span>（含多行写法）
    # 排除含 { 的动态表达式（如 {icon}），其值由下方 icon: 字段规则覆盖
    re.compile(
        r"<span[^>]*material-symbols-outlined[^>]*>\s*(" + _ICON_NAME + r")\s*</span>",
        re.DOTALL,
    ),
    # icon="..." / icon='...'（组件 prop）
    re.compile(r'\bicon=["\'](' + _ICON_NAME + r')["\']'),
    # icon: '...' / icon: "..."（对象数组字段，如菜单项、欢迎页特性）
    re.compile(r'\bicon:\s*["\'](' + _ICON_NAME + r')["\']'),
]


def scan_source_icons(src_dir):
    """扫描 src 下所有 .tsx，提取全部静态引用的图标名。"""
    icons = set()
    for path in sorted(src_dir.rglob("*.tsx")):
        text = path.read_text(encoding="utf-8")
        for pattern in _SCAN_PATTERNS:
            icons.update(pattern.findall(text))
        # 三元条件图标：cond ? 'a' : 'b' —— 两边都提取
        for match in re.finditer(
            r"\?\s*['\"](" + _ICON_NAME + r")['\"]\s*:\s*['\"](" + _ICON_NAME + r")['\"]",
            text,
        ):
            icons.update(match.groups())
    return sorted(icons)


def collect_ligatures(font):
    """返回 {ligature 文本字符串: 输出 glyph 名}。"""
    glyph_to_char = {name: chr(codepoint) for codepoint, name in font.getBestCmap().items()}
    ligatures = {}

    def walk(subtable):
        if hasattr(subtable, "ligatures"):
            for first_glyph, ligature_set in subtable.ligatures.items():
                for ligature in ligature_set:
                    chars = glyph_to_char.get(first_glyph, "")
                    chars += "".join(glyph_to_char.get(c, "") for c in ligature.Component)
                    ligatures[chars] = ligature.LigGlyph
        elif hasattr(subtable, "ExtSubTable"):
            walk(subtable.ExtSubTable)

    for lookup in font["GSUB"].table.LookupList.Lookup:
        for subtable in lookup.SubTable:
            walk(subtable)
    return ligatures


def main():
    if not FONT_PATH.exists():
        sys.exit(f"ERROR: 源字体不存在: {FONT_PATH}")
    if not SRC_DIR.exists():
        sys.exit(f"ERROR: 源码目录不存在: {SRC_DIR}")

    # 1) 扫描源码，得到图标候选清单。
    candidates = scan_source_icons(SRC_DIR)
    if not candidates:
        sys.exit("FAIL: 未能从 src 扫描到任何图标，请检查正则")

    font = TTFont(FONT_PATH)
    ligature_map = collect_ligatures(font)

    # 用源字体 ligature 过滤：扫描到的候选若在字体里无对应 ligature，多为被正则
    # 误捕的非图标数据（如 FilterTabs 的 'all'/'recent'），也可能是指望图标却拼错。
    # 两者在源字体里都不存在 ligature —— 原本就无法渲染，跳过不引入新的失效。
    icons = [icon for icon in candidates if icon in ligature_map]
    skipped = [icon for icon in candidates if icon not in ligature_map]
    if skipped:
        print(
            f"⚠ 跳过 {len(skipped)}/{len(candidates)} 个候选（源字体无对应 ligature，"
            f"多为非图标数据字段或拼写错误）: {', '.join(skipped)}",
            file=sys.stderr,
        )
    if not icons:
        sys.exit("FAIL: 扫描到的候选均无对应 ligature，请检查正则或源字体")
    print(f"→ 有效图标 {len(icons)} 个: {', '.join(icons)}")
    GLYPHS_TXT.write_text("\n".join(icons) + "\n", encoding="utf-8")

    # 2) 查出每个图标 ligature 指向的真实 glyph 名（去重）。
    #    个别图标的 glyph 名与 ligature 文本不同，例如 auto_fix_high -> auto_fix。
    target_glyphs = sorted({ligature_map[icon] for icon in icons})
    GLYPH_NAMES_TMP.write_text("\n".join(target_glyphs), encoding="utf-8")
    print(f"→ 目标 glyph {len(target_glyphs)} 个（覆盖 {len(icons)} 个图标 ligature）")

    # 3) 子集化。
    #    --glyphs-file   显式保留图标 glyph（ligature 输出），避免被全部拉回
    #    --text-file     保留图标名字母 glyph（ligature 输入，浏览器匹配需要）
    #    --no-layout-closure  禁止 closure 把未引用的图标 glyph 拉入保留集
    #    --layout-features=*  保留全部 feature（图标 ligature 在 rlig 而非 liga）；
    #                          glyph 集已受限，故仅目标 ligature 存活；fvar/gvar 保留 -> 可变轴不丢
    before_bytes = FONT_PATH.stat().st_size
    args = [
        sys.executable, "-m", "fontTools.subset", str(FONT_PATH),
        f"--output-file={SUBSET_TMP}",
        "--flavor=woff2",
        f"--text-file={GLYPHS_TXT}",
        f"--glyphs-file={GLYPH_NAMES_TMP}",
        "--no-layout-closure",
        "--layout-features=*",
        "--no-hinting",
        "--desubroutinize",
        "--name-IDs=*",
        "--drop-tables+=DSIG,vhea,vmtx",
        "--recalc-bounds",
        "--recalc-timestamp",
    ]
    print("→ 子集化中...")
    subprocess.run(args, check=True)
    GLYPH_NAMES_TMP.unlink(missing_ok=True)

    # 4) 强制校验：所有图标 ligature 必须完整，否则不覆盖原字体。
    print("→ 校验 ligature 完整性")
    subprocess.run([sys.executable, str(VERIFY_PY), str(SUBSET_TMP), str(GLYPHS_TXT)], check=True)

    # 5) 校验通过，覆盖原字体。
    after_bytes = SUBSET_TMP.stat().st_size
    SUBSET_TMP.replace(FONT_PATH)

    reduction = (before_bytes - after_bytes) * 100 // before_bytes
    print(
        f"\n✓ 子集化完成: {before_bytes // 1024}KB → {after_bytes // 1024}KB "
        f"(减少 {reduction}%)"
    )
    print(f"  输出: {FONT_PATH}")


if __name__ == "__main__":
    main()
