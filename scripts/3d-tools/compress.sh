#!/usr/bin/env bash
# scripts/3d-tools/compress.sh
# familyai.jp / うごくAI教室 — GLB 一括 Draco 圧縮スクリプト
#
# 使い方:
#   ./compress.sh input/ output/                 # ディレクトリ一括
#   ./compress.sh model.glb output/              # 単体
#   ./compress.sh input/ output/ --level 7       # Draco 圧縮レベル指定（1-10・default 10）
#
# 前提:
#   1. Node.js (v18+) インストール済み
#   2. gltf-pipeline インストール:
#        npm install -g gltf-pipeline
#      (or pnpm/yarn 同等)
#
# 動作:
#   - 入力 .glb / .gltf を Draco mesh 圧縮 + meshopt 最適化
#   - 通常 5-10MB の GLB が 0.5-2MB まで縮む
#   - familyai.jp 推奨: 2MB 以下

set -euo pipefail

# ── 色付け（端末向け） ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── 引数パース ──
if [[ $# -lt 2 ]]; then
  cat <<EOF
${BLUE}使い方:${NC}
  $0 <input.glb | input-dir>  <output-dir>  [--level N]

${BLUE}例:${NC}
  $0 input/ output/
  $0 raw/solar-system.glb output/
  $0 raw/ output/ --level 7

${YELLOW}前提:${NC}
  npm install -g gltf-pipeline
EOF
  exit 1
fi

INPUT="$1"
OUTPUT_DIR="$2"
DRACO_LEVEL=10

# Optional --level
shift 2
while [[ $# -gt 0 ]]; do
  case "$1" in
    --level)
      DRACO_LEVEL="$2"
      shift 2
      ;;
    *)
      echo "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# ── gltf-pipeline チェック ──
if ! command -v gltf-pipeline &> /dev/null; then
  echo "${RED}❌ gltf-pipeline が見つかりません。${NC}"
  echo ""
  echo "次のコマンドでインストールしてください:"
  echo "  ${BLUE}npm install -g gltf-pipeline${NC}"
  echo "  または"
  echo "  ${BLUE}pnpm add -g gltf-pipeline${NC}"
  exit 1
fi

# ── 出力ディレクトリ作成 ──
mkdir -p "$OUTPUT_DIR"

# ── 圧縮処理 ──
compress_file() {
  local in_file="$1"
  local filename
  filename=$(basename "$in_file")
  local out_file="$OUTPUT_DIR/$filename"

  local in_size
  in_size=$(stat -f%z "$in_file" 2>/dev/null || stat -c%s "$in_file" 2>/dev/null)
  local in_mb
  in_mb=$(awk "BEGIN {printf \"%.2f\", $in_size / 1024 / 1024}")

  echo ""
  echo "${BLUE}━━ ${filename} ━━${NC}"
  echo "  入力: ${in_mb} MB"

  # gltf-pipeline で Draco 圧縮
  gltf-pipeline \
    -i "$in_file" \
    -o "$out_file" \
    -d \
    --draco.compressionLevel "$DRACO_LEVEL" \
    --draco.quantizePositionBits 14 \
    --draco.quantizeNormalBits 10 \
    --draco.quantizeTexcoordBits 12 \
    --draco.quantizeColorBits 8 \
    --draco.quantizeGenericBits 12 \
    > /tmp/gltf-pipeline.log 2>&1 || {
      echo "  ${RED}❌ 圧縮失敗${NC}"
      cat /tmp/gltf-pipeline.log
      return 1
    }

  local out_size
  out_size=$(stat -f%z "$out_file" 2>/dev/null || stat -c%s "$out_file" 2>/dev/null)
  local out_mb
  out_mb=$(awk "BEGIN {printf \"%.2f\", $out_size / 1024 / 1024}")
  local ratio
  ratio=$(awk "BEGIN {printf \"%.1f\", (1 - $out_size / $in_size) * 100}")

  # 評価
  local verdict
  if (( $(awk "BEGIN {print ($out_size < 2*1024*1024)}") )); then
    verdict="${GREEN}🟢 最適 (familyai.jp 推奨)${NC}"
  elif (( $(awk "BEGIN {print ($out_size < 5*1024*1024)}") )); then
    verdict="${YELLOW}🟡 やや大きい${NC}"
  else
    verdict="${RED}🔴 まだ大きすぎ・Blender で減面要${NC}"
  fi

  echo "  出力: ${out_mb} MB  (-${ratio}%)"
  echo -e "  判定: ${verdict}"
  echo "  保存: ${out_file}"
}

# ── 単体 or ディレクトリ判定 ──
if [[ -f "$INPUT" ]]; then
  compress_file "$INPUT"
elif [[ -d "$INPUT" ]]; then
  echo "${BLUE}📦 ${INPUT} 内の GLB/GLTF を一括圧縮します${NC}"
  count=0
  for f in "$INPUT"/*.glb "$INPUT"/*.gltf; do
    [[ -e "$f" ]] || continue
    compress_file "$f"
    count=$((count + 1))
  done
  if [[ $count -eq 0 ]]; then
    echo "${YELLOW}⚠️ ${INPUT} に GLB/GLTF が見つかりませんでした${NC}"
  else
    echo ""
    echo "${GREEN}✅ ${count} ファイル圧縮完了 → ${OUTPUT_DIR}${NC}"
  fi
else
  echo "${RED}❌ ${INPUT} が見つかりません${NC}"
  exit 1
fi

echo ""
echo "${BLUE}💡 次のステップ:${NC}"
echo "  1. ${OUTPUT_DIR} の GLB を preview.html で確認"
echo "  2. Mac の場合 Reality Converter で USDZ 版も生成"
echo "  3. Vercel Blob にアップロード（管理画面 or vercel CLI）"
