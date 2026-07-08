# List available recipes
default:
    @just --list

# Install dependencies (use `npm install` when changing dependencies)
install:
    npm ci

# Run dev server on port 3000
dev:
    npm run dev

# Build production bundle into dist/
build:
    npm run build

# Preview the production build
preview:
    npm run preview

# Format + lint-fix (bundles oxfmt + oxlint --fix)
check:
    npm run check

# Lint only
lint:
    npm run lint

# Run unit tests
test:
    npm run test

# Run slow end-to-end tests
e2e:
    npm run e2e

# Full CI-equivalent gate: lint, test, e2e, build
ci: lint test e2e build

# Remove build output and node_modules
clean:
    rm -rf dist node_modules

# Synthesize reference media clips (separate Kokoro subproject; heavy)
synth-references:
    npm run synth:references
