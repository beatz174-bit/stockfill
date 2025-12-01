#!/usr/bin/env bash
set -euo pipefail

echo "=== Codex setup starting (Node/npm + Playwright Chromium) ==="
pwd
ls -la

# ----------------------------
# 1) Install Node deps
# ----------------------------
if [ -f package.json ]; then
  echo "-> Installing npm dependencies..."
  node --version || true
  npm --version || true

  # Prefer clean, reproducible installs when lockfile exists
  if [ -f package-lock.json ]; then
    npm ci
  else
    npm install
  fi
else
  echo "-> No package.json found; skipping npm install."
fi

# ----------------------------
# 2) Install Playwright Chromium
# ----------------------------
if [ -f package.json ]; then
  # Only run if Playwright is actually in deps
  if npm ls playwright @playwright/test >/dev/null 2>&1; then
    echo "-> Installing Playwright Chromium + OS deps..."
    # --with-deps installs system libraries required by browsers in CI-like envs
    # chromium limits download to what you need
    npx playwright install --with-deps chromium
  else
    echo "-> Playwright not detected in npm deps; skipping browser install."
  fi
fi

# ----------------------------
# 3) Python deps (optional, for pytest)
# ----------------------------
if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  echo "-> Installing Python deps for pytest..."
  python3 --version || true

  if [ ! -d .venv ]; then
    python3 -m venv .venv
  fi
  # shellcheck disable=SC1091
  source .venv/bin/activate

  python -m pip install --upgrade pip wheel setuptools

  if [ -f requirements.txt ]; then
    pip install -r requirements.txt
  fi

  if [ -f pyproject.toml ]; then
    pip install -e . || pip install .
  fi
else
  echo "-> No Python project files found; skipping pytest deps."
fi

echo "=== Codex setup complete ==="
