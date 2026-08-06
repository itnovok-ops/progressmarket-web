#!/usr/bin/env bash
# Сжимает hero-видео для веба: 3 мин, 720p, ~5 МБ.
# Требуется: ffmpeg (brew install ffmpeg)

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/assets/video/hero-wb-fbs-source.mp4"
OUT="$ROOT/assets/video/hero-wb-fbs.mp4"
LANDING_OUT="$ROOT/landing/assets/video/hero-wb-fbs.mp4"

if [[ ! -f "$SRC" ]]; then
  if [[ -f "$OUT" ]]; then
    cp "$OUT" "$SRC"
    echo "Создан бэкап из текущего файла: $SRC"
  else
    echo "Положите исходник в $SRC" >&2
    exit 1
  fi
fi

ffmpeg -y -i "$SRC" -t 180 \
  -vf "scale=1280:-2:flags=lanczos" \
  -c:v libx264 -profile:v main -level 3.1 -pix_fmt yuv420p -crf 28 -preset fast -movflags +faststart \
  -c:a aac -profile:a aac_low -b:a 96k -ac 2 \
  "$OUT"

cp "$OUT" "$LANDING_OUT"
MOBILE_OUT="$ROOT/assets/video/hero-wb-fbs-mobile.mp4"
MOBILE_LANDING="$ROOT/landing/assets/video/hero-wb-fbs-mobile.mp4"
ffmpeg -y -i "$SRC" -t 180 \
  -vf "scale=854:-2:flags=lanczos" \
  -c:v libx264 -profile:v main -level 3.1 -pix_fmt yuv420p -crf 30 -preset fast -movflags +faststart \
  -c:a aac -b:a 64k -ac 2 \
  "$MOBILE_OUT"
cp "$MOBILE_OUT" "$MOBILE_LANDING"
ls -lh "$OUT" "$LANDING_OUT" "$MOBILE_OUT" "$MOBILE_LANDING"
echo "Готово. Залейте assets/video/hero-wb-fbs.mp4 на хостинг."
