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

## Deploy to GitHub Pages

### Option A: Automatic (recommended)

1. Create a new repo on GitHub (e.g. `holdem-coach`)
2. Push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/holdem-coach.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages**
4. Under "Build and deployment", set **Source** to **GitHub Actions**
5. The included workflow (`.github/workflows/deploy.yml`) will run on every push to `main` and deploy automatically
6. After the first run completes (~1 min), your site will be live at:
   `https://YOUR_USERNAME.github.io/holdem-coach/`

### Option B: Manual via gh-pages

```bash
npm install
npm run deploy
```

Then enable Pages in repo settings and point it to the `gh-pages` branch.

## Tech

- React 18
- Vite
- No external dependencies beyond React — all card evaluation, Monte Carlo simulation, and UI are vanilla JS
