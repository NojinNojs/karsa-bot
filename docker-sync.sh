#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ☕ KARSA Discord Bot — One-Command Docker Portable Sync (Backup & Restore)
# ==============================================================================
# Usage:
#   ./docker-sync.sh up                    -> Build & start Karsa in Docker (24/7)
#   ./docker-sync.sh reset                 -> Wipe all user stats to 0 & restart
#   ./docker-sync.sh backup                -> Create portable VPS bundle (.tar.gz)
#   ./docker-sync.sh restore <file.tar.gz> -> Restore bundle & start on new VPS
# ==============================================================================

PROJ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJ_DIR"

CMD="${1:-help}"

case "$CMD" in
  up|start)
    echo "🐳 [KARSA Docker] Building & starting karsa-bot container..."
    docker compose up -d --build
    docker compose ps
    ;;

  logs)
    docker compose logs -f --tail=50
    ;;

  reset)
    echo "🧹 [KARSA Docker] Resetting all user & server stats to zero..."
    docker compose stop karsa-bot || true
    rm -f "$PROJ_DIR/data/"*.sqlite*
    docker compose up -d
    echo "✅ Database wiped clean! Container restarted fresh."
    ;;

  backup)
    OUT_DIR="${2:-/home/nojin/Documents/00_Obsidian_HQ/06_Infra_&_Backup}"
    mkdir -p "$OUT_DIR"
    STAMP="$(date +%Y%m%d-%H%M%S)"
    ARCHIVE="$OUT_DIR/karsa-bot-docker-$STAMP.tar.gz"
    LATEST="$OUT_DIR/karsa-bot-docker-latest.tar.gz"

    echo "📦 [KARSA Docker] Creating portable VPS bundle (code + .env + SQLite volume)..."
    tar --exclude='node_modules' \
        --exclude='.git' \
        -czf "$ARCHIVE" \
        -C "$(dirname "$PROJ_DIR")" "$(basename "$PROJ_DIR")"
    cp -f "$ARCHIVE" "$LATEST"
    echo "✅ Saved portable bundle:"
    echo "   • $ARCHIVE"
    echo "   • $LATEST"
    echo ""
    echo "🚀 Cara pindah ke VPS baru:"
    echo "   1. scp $LATEST user@vps-ip:~/"
    echo "   2. ssh user@vps-ip 'tar -xzf karsa-bot-docker-latest.tar.gz && cd kota-mandiri-bot && docker compose up -d --build'"
    ;;

  restore)
    BUNDLE="${2:-}"
    if [[ -z "$BUNDLE" || ! -f "$BUNDLE" ]]; then
      echo "❌ Usage: ./docker-sync.sh restore <path-to-karsa-bot-docker.tar.gz>"
      exit 1
    fi
    echo "🔄 [KARSA Docker] Restoring from $BUNDLE..."
    tar -xzf "$BUNDLE" -C "$(dirname "$PROJ_DIR")"
    docker compose up -d --build
    echo "✅ Restore selesai & Karsa Bot sudah jalan di Docker!"
    ;;

  *)
    echo "Usage: ./docker-sync.sh {up|logs|reset|backup|restore <tar.gz>}"
    ;;
esac
