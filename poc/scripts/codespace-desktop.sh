#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
POC_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
DISPLAY="${DISPLAY:-:99}"
export DISPLAY
export LIBGL_ALWAYS_SOFTWARE=1

for command_name in Xvfb openbox x11vnc websockify dbus-run-session xdpyinfo; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    printf 'Missing display dependency: %s. Rebuild the Codespace container and try again.\n' "$command_name" >&2
    exit 1
  fi
done

if [[ ! -f "$POC_DIR/artifacts/language-server-all.jar" ]]; then
  printf 'Language-server JAR is missing. Run `bash poc/scripts/codespace-setup.sh` from the repository root.\n' >&2
  exit 1
fi

node "$POC_DIR/scripts/verify-artifacts.mjs" --id nextflow-language-server

runtime_dir="${XDG_RUNTIME_DIR:-/tmp/nf-gui-runtime-$UID}"
mkdir -p "$runtime_dir"
chmod 700 "$runtime_dir"
export XDG_RUNTIME_DIR="$runtime_dir"

Xvfb "$DISPLAY" -screen 0 1440x900x24 -nolisten tcp &
xvfb_pid=$!
openbox_pid=""
x11vnc_pid=""
websockify_pid=""

stop_processes() {
  for process_pid in "$websockify_pid" "$x11vnc_pid" "$openbox_pid" "$xvfb_pid"; do
    if [[ -n "$process_pid" ]]; then
      kill "$process_pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
}
trap stop_processes EXIT INT TERM

for attempt in {1..50}; do
  if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
    break
  fi
  if (( attempt == 50 )); then
    printf 'Virtual display %s did not become ready.\n' "$DISPLAY" >&2
    exit 1
  fi
  sleep 0.1
done

if ! xdpyinfo -display "$DISPLAY" -queryExtensions | awk '$1 == "DRI3" { found = 1 } END { exit !found }'; then
  printf 'Note: Xvfb does not advertise DRI3; rendering will use Mesa software rendering (no GPU passthrough).\n'
fi

openbox --display "$DISPLAY" &
openbox_pid=$!
x11vnc -display "$DISPLAY" -rfbport 5900 -localhost -forever -shared -nopw &
x11vnc_pid=$!
websockify --web=/usr/share/novnc 6080 127.0.0.1:5900 &
websockify_pid=$!

cd "$POC_DIR"
printf 'Tauri is starting. Open the private forwarded port 6080 and choose the noVNC launch page.\n'
dbus-run-session -- npm run tauri dev
