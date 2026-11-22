#!/usr/bin/env bash
# Full check entrypoint: locked dependency and browser setup, syntax checks, and all tests.
set -euo pipefail
cd "$(dirname "$0")/.."

npm ci
# Browser install: prefer system-dependency setup (needs sudo); fall back to a
# plain browser install when the environment cannot elevate (deps already present).
npx playwright install --with-deps chromium || npx playwright install chromium

# Syntax-check every application, server, and test JavaScript file.
find public scripts test tests -name '*.mjs' -o -name '*.js' -type f | while IFS= read -r file; do
	node --check "$file"
done

npm test
