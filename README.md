# Cabinet Master

Simple software for organizing small-parts hardware in LISTA drawer cabinets with Gridfinity bins.

## Getting Started

The app lives in the `cabinet-planner/` subdirectory. All commands must be run from there.

```bash
cd cabinet-planner
npm install       # install dependencies (required before first run)
npm run dev       # start dev server at http://localhost:5173
```

### Build for production

```bash
cd cabinet-planner
npm run build     # outputs a single self-contained dist/index.html
```

Open `dist/index.html` directly in a browser — no server needed.

## Common Mistakes

- Running `npm run dev` from the repo root (`cabinet_master/`) instead of `cabinet-planner/` → you'll get `ENOENT: package.json not found`
- Running `npm run dev` before `npm install` → you'll get `vite: not found`
