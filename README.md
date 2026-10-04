# AgroClimatic

Nursery research app for forest-seedling production: greenhouse climate, seed lots, sowing
batches, germination, growth, treatments, mortality and trial design. React + TypeScript +
Vite, packaged for Android with Capacitor.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Type-check and production build (`dist/`) |
| `npm run build:artifact` | Single-file demo build (`artifact/agroclimatic.html`) |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |

## Data

All records go through one validated, offline-first data layer in `src/data/`.

```
Species ─< SeedLot ─< Batch ─< germination counts, growth measurements,
                              fertigation, pest observations, pre-sowing
                              treatments, mortality, leachate tests
Greenhouse ─< bench placements ─> Batch
```

- **Schema** (`schema.ts`): zod schemas with units and valid ranges for every collection.
  Every save is validated; errors are shown on the form.
- **Storage**: with Firebase configured, records live at `users/{uid}/{collection}` in
  Firestore with the offline cache (writes apply locally and sync later). Without Firebase
  keys the app runs in demo mode and keeps records in browser storage.
- **Security** (`firestore.rules`): a user can only read and write their own records.
- **Upgrade from earlier versions** (`migrateLegacy.ts`): records saved by the old
  per-tool storage are moved once. Free-text batch labels are linked to matching batches
  or to placeholder batches flagged "needs review". Original data is never deleted, and
  records with out-of-range values are kept aside rather than dropped.

## Configuration

Copy `.env.example` to `.env` and fill in the Firebase web-app keys. Leave them unset for
demo mode.
