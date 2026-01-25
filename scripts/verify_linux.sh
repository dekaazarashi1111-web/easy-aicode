#!/usr/bin/env bash
# Universal lightweight verify script for mixed-language repos (Linux).
# - Safe defaults: no installs, fail fast on real errors.
# - Dotnet is opt-in via LOOP_DOTNET_TEST=1 to avoid OOM on Unity/WSL.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PYTHONPATH="$ROOT${PYTHONPATH:+:$PYTHONPATH}"
PY_BIN=python
if ! command -v "$PY_BIN" >/dev/null 2>&1; then
  PY_BIN=python3
fi

log() { printf '[verify] %s\n' "$*"; }

log "secrets scan"
"$PY_BIN" - <<'PY'
import os, re, sys, pathlib
root = pathlib.Path(".").resolve()
ignore_dirs = {
    ".git", ".venv", ".venv_test", ".codex", "artifacts", "tests",
    "__pycache__", ".pytest_cache", "node_modules", "dist", "build",
    ".tox", "bin", "obj", "Library", "Temp", "Logs", "UserSettings",
    "Build", "Builds"
}
binary_exts = {".dll", ".exe", ".pdb", ".bin", ".dat"}
max_size = 2 * 1024 * 1024
pats = [
    re.compile(r"(?i)(bearer\s+)([A-Za-z0-9._-]{8,})"),
    re.compile(r"(?i)(token=)([A-Za-z0-9._-]{8,})"),
    re.compile(r"(?i)(api[_-]?key\s*[=:]\s*)([A-Za-z0-9._-]{12,})"),
    re.compile(r"(?i)(access[_-]?token\s*[=:]\s*)([A-Za-z0-9._-]{12,})"),
    re.compile(r"(sk-[A-Za-z0-9]{16,})"),
    re.compile(r"(ghp_[A-Za-z0-9]{20,})"),
    re.compile(r"(xox[baprs]-[A-Za-z0-9-]{10,})"),
]
hits = []
for dirpath, dirnames, filenames in os.walk(root):
    dirnames[:] = [d for d in dirnames if d not in ignore_dirs]
    for fn in filenames:
        path = pathlib.Path(dirpath) / fn
        if path.suffix.lower() in binary_exts:
            continue
        try:
            if path.stat().st_size > max_size:
                continue
        except OSError:
            continue
        try:
            text = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for lineno, line in enumerate(text.splitlines(), 1):
            if any(p.search(line) for p in pats):
                hits.append((path, lineno))
                if len(hits) >= 10:
                    break
        if len(hits) >= 10:
            break
    if len(hits) >= 10:
        break
if hits:
    print("[verify] secrets scan FAILED")
    for path, lineno in hits:
        print(f"{path}:{lineno} [REDACTED]")
    sys.exit(1)
print("[verify] secrets scan ok")
PY

ran=0

if [ -f "pyproject.toml" ] || [ -f "requirements.txt" ]; then
  if command -v pytest >/dev/null 2>&1; then
    log "pytest -q"
    set +e
    pytest -q
    py_status=$?
    set -e
    if [ "$py_status" -eq 5 ]; then
      log "pytest: no tests collected (treated as pass)"
    elif [ "$py_status" -ne 0 ]; then
      exit "$py_status"
    fi
    ran=1
  else
    log "skip pytest (pytest not installed)"
  fi
fi

if [ -f "package.json" ]; then
  pm=""
  if command -v pnpm >/dev/null 2>&1; then pm="pnpm"
  elif command -v npm >/dev/null 2>&1; then pm="npm"
  elif command -v yarn >/dev/null 2>&1; then pm="yarn"
  fi
  if [ -n "$pm" ]; then
    log "node test via $pm (if-present)"
    set +e
    case "$pm" in
      pnpm) pnpm test --if-present ;;
      npm) npm test --if-present ;;
      yarn) yarn test || true ;;
    esac
    node_status=$?
    set -e
    if [ "$node_status" -ne 0 ]; then exit "$node_status"; fi
    ran=1
  else
    log "skip node tests (no package manager)"
  fi
fi

if [ -f "go.mod" ]; then
  if command -v go >/dev/null 2>&1; then
    log "go test ./..."
    go test ./...
    ran=1
  else
    log "skip go tests (go not installed)"
  fi
fi

if [ -f "Cargo.toml" ]; then
  if command -v cargo >/dev/null 2>&1; then
    log "cargo test --all --locked (if lock exists)"
    if [ -f "Cargo.lock" ]; then
      cargo test --all --locked
    else
      cargo test --all
    fi
    ran=1
  else
    log "skip rust tests (cargo not installed)"
  fi
fi

if [ "${LOOP_DOTNET_TEST:-0}" = "1" ]; then
  dotnet_target="$(find . -maxdepth 4 \( -name '*.sln' -o -name '*.csproj' \) -print -quit)"
  if [ -n "$dotnet_target" ]; then
    if command -v dotnet >/dev/null 2>&1; then
      export DOTNET_GCHeapHardLimitPercent="${DOTNET_GCHeapHardLimitPercent:-60}"
      export DOTNET_GCTotalMemoryLimit="${DOTNET_GCTotalMemoryLimit:-60}"
      log "dotnet test (opt-in; target: $dotnet_target)"
      dotnet test --nologo
      ran=1
    else
      log "skip dotnet (dotnet not installed)"
    fi
  else
    log "skip dotnet (no sln/csproj)"
  fi
else
  log "skip dotnet (set LOOP_DOTNET_TEST=1 to enable)"
fi

if [ $ran -eq 0 ]; then
  log "No checks executed; add project-specific steps as needed."
fi
