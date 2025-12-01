#!/usr/bin/env bash
set -euo pipefail

echo "=== Codex maintenance starting ==="
pwd

# ----------------------------
# 1) Refresh Node deps if needed
# ----------------------------
if [ -f package.json ]; then
  echo "-> Checking npm dependencies..."

  # If node_modules missing (rare in cache) just install.
  if [ ! -d node_modules ]; then
    echo "node_modules missing; installing fresh..."
    if [ -f package-lock.json ]; then
      npm ci
    else
      npm install
    fi
  else
    # If lockfile exists and differs from what node_modules was built with,
    # npm ci will reconcile. We do a cheap check by comparing mtime.
    if [ -f package-lock.json ]; then
      if [ package-lock.json -nt node_modules ]; then
        echo "package-lock.json newer than node_modules; running npm install & npm prune..."
        npm install
        npm prune
      else
        echo "npm deps look current; skipping install."
      fi
    else
      echo "No lockfile; skipping npm install unless missing."
    fi
  fi
else
  echo "-> No package.json; skipping Node maintenance."
fi

npx npm-check-updates -u

# ----------------------------
# 2) Refresh Playwright Chromium if Playwright version changed
# ----------------------------
if [ -f package.json ] && npm ls playwright @playwright/test >/dev/null 2>&1; then
  echo "-> Ensuring Playwright Chromium is installed..."

  # Store current playwright version in a small stamp file.
  PW_VERSION="$(node -p "require('./node_modules/playwright/package.json').version" 2>/dev/null || \
               node -p "require('./node_modules/@playwright/test/package.json').version" 2>/dev/null || echo '')"

  STAMP=".codex_playwright_version"
  PREV_VERSION="$(cat "$STAMP" 2>/dev/null || echo '')"

  if [ -z "$PW_VERSION" ]; then
    echo "Could not detect Playwright version; running install anyway..."
    npx playwright install --with-deps chromium
    echo "$PW_VERSION" > "$STAMP" || true
  elif [ "$PW_VERSION" != "$PREV_VERSION" ]; then
    echo "Playwright version changed ($PREV_VERSION -> $PW_VERSION); reinstalling Chromium..."
    npx playwright install --with-deps chromium
    echo "$PW_VERSION" > "$STAMP"
  else
    echo "Playwright version unchanged ($PW_VERSION); skipping browser install."
  fi
fi

# ----------------------------
# 3) (Optional) keep Python deps in sync for pytest
# ----------------------------
if [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  echo "-> Checking Python deps..."

  if [ -d .venv ]; then
    # shellcheck disable=SC1091
    source .venv/bin/activate
  else
    python3 -m venv .venv
    # shellcheck disable=SC1091
    source .venv/bin/activate
    python -m pip install --upgrade pip wheel setuptools
  fi

  # If requirements.txt changed since venv, re-install
  if [ -f requirements.txt ] && [ requirements.txt -nt .venv ]; then
    pip install -r requirements.txt
  fi

  if [ -f pyproject.toml ] && [ pyproject.toml -nt .venv ]; then
    pip install -e . || pip install .
  fi
fi

# ----------------------------
# 4) Small cleanups (safe)
# ----------------------------
echo "-> Cleaning lightweight caches..."
rm -rf /tmp/playwright* ~/.cache/ms-playwright 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

echo "=== Codex maintenance complete ==="
