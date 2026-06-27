#!/usr/bin/env bash
#
# 子集化 Material Symbols Outlined 字体，只保留项目实际使用的图标。
#
# 完整字体 ~1.1MB（6560 glyph / 4250 ligature），项目仅用 51 个图标，
# 子集化后可降至 ~50-80KB，且保留全部可变字体轴（FILL/wght/GRAD/opsz）。
#
# 用法: bash scripts/subset-material-symbols.sh
#
# 新增/移除图标时：编辑 scripts/icon-glyphs.txt，重跑本脚本即可。
# 本脚本只负责准备 Python 环境（fonttools），核心逻辑见 subset_material_symbols.py。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/.venv-fonttools"

# 1) 准备临时 venv（不污染系统 Python）。首次创建后复用。
if [ ! -d "$VENV_DIR" ]; then
  echo "→ 创建临时 venv: $VENV_DIR"
  python3 -m venv "$VENV_DIR"
fi

echo "→ 安装/更新 fonttools[woff]（含 brotli，woff2 压缩必需）"
"$VENV_DIR/bin/python" -m pip install --quiet --disable-pip-version-check --upgrade pip
"$VENV_DIR/bin/python" -m pip install --quiet --disable-pip-version-check 'fonttools[woff]'

# 2) 运行子集化（含 ligature 完整性校验、体积对比、覆盖原字体）。
"$VENV_DIR/bin/python" "$SCRIPT_DIR/subset_material_symbols.py"
