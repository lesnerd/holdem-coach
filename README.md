# Hold'em Coach

Interactive Texas Hold'em trainer with live Monte Carlo equity calculation, an aggressive-style strategy coach, and a 169-hand starting chart.

## Features

- Live win/tie/lose equity recomputed every street
- Fold / Call / Raise decision buttons with coach-suggested action highlighted
- "How?" toggle that explains exactly how the percentage was calculated
- "Show Hand Matrix" — full 13×13 starting hand chart with your current hand highlighted
- Hand history with coach-followed indicator
- Stats tracking: chips, W/L/F record, coach accuracy, streak

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Run with Docker

Production build (multi-stage, served by nginx):

```bash
docker compose up --build
```

Open http://localhost:8080

Or with plain Docker:

```bash
docker build -t holdem-coach .
docker run --rm -p 8080:80 holdem-coach
```

Dev mode with hot reload (mounts source into the container):

```bash
docker compose --profile dev up
```

Open http://localhost:5173

#### Behind a TLS-intercepting corporate proxy (e.g. Zscaler)

If `npm install` inside the build fails with `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`,
export your corporate root CA as PEM and drop it into `certs/` before building:

```bash
mkdir -p certs
# Example: export Zscaler root CAs from the macOS System keychain
security find-certificate -a -c "Zscaler" -p /Library/Keychains/System.keychain \
  > certs/corp-root.crt
docker compose build
```

The `certs/` directory is gitignored; the Dockerfile picks up any `*.crt` files
inside it and adds them to the system trust store + npm CA file. No-op when the
directory is empty.

## Continuous delivery

Two workflows run on every push to `main`:

- **`.github/workflows/deploy.yml`** — builds the Vite app and deploys to
  GitHub Pages. Live at https://lesnerd.github.io/holdem-coach/
- **`.github/workflows/fly-docker.yml`** — on every push to `main` / version tag:
  1. **Tar archive** — builds the app, packages `dist/` as
     `holdem-coach-{version}.tar.gz`, uploads to Fly generic storage, and on
     version tags (`v*.*.*`) distributes it publicly for third-party download.
  2. **Docker image** — still builds, smoke-tests, and pushes
     `easycompany.jfrog.io/docker/holdem-coach:{latest,<sha>,v*.*.*}` (unchanged).

The Pages workflow requires the repo to be **public** (or on a paid plan) and
Pages to be enabled with **Source: GitHub Actions** under Settings → Pages.

## Tech

- React 18
- Vite
- No external dependencies beyond React — all card evaluation, Monte Carlo simulation, and UI are vanilla JS
