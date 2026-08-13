# Circles — Rebrand + Personal-as-Continuous

Two changes, shipped together because they touch the same surfaces.

## 1. Rename "Self Maximizer" → "Circles"

Every user-facing string, meta tag, and doc updates. Internal filenames (`selfmaxizer-icon.svg`, etc.) stay as-is to avoid breaking imports — only the _displayed_ brand changes. A follow-up pass can rename assets once we lock the final logo.

**Tagline:** "Your circles, mapped and executable." (replaces "Your Self inside, Maximized outside.")

**Touched:**

- Landing (`src/routes/index.tsx`) — hero, nav, footer, compare table
- Auth pages (`auth.tsx`, `reset-password.tsx`)
- `AppHeader.tsx`, all `_authenticated/*` routes
- `__root.tsx` head/meta, `public/manifest.webmanifest`, `public/sw.js`, `public/favicon.svg` title
- `docs/play-store-listing.md`
- Chrome extension (`extension/manifest.json`, `popup.html`, `background.js`)
- Server-side prompt strings in `ai-gateway.server.ts`, `elicit.functions.ts`, `templates.functions.ts` that mention the brand
- Compare page (`compare.tsx`) reframed as "Circles vs. Orbismo / notes / MCP-only"

## 2. Personal-as-continuous lifecycle

**Rule:** Personal memories never trigger the "no activity → archive" flow. Only _work_ projects do. Personal is your continuous life record; work projects are ephemeral engagements.

**Changes:**

- `getLifecycleSummary` in `projects.functions.ts` → filter `kind = 'work'` before returning stale projects.
- Projects UI (`_authenticated/projects.tsx`) — add a "Personal is continuous — never archived automatically" note under the Personal column; hide the archive button on personal projects (manual archive still available via a menu if needed, but not the default).
- Landing page copy — one line under the "How it works" section explaining personal ≠ triaged.
- No schema change needed; the `kind` column already exists.

## 3. Pricing: $9.95/mo + free tier

Current: $19.95/mo, 3-day trial, free tier capped at 2 projects.

New:

- **Free:** 2 active projects, 50 AI sorts/mo, personal memories unlimited (since personal never expires, capping it feels punitive). Export enabled.
- **Pro — $9.95/mo:** Unlimited projects, 1000 AI sorts/mo, templates, extension priority.
- 3-day trial stays.

**Changes:**

- Create new Paddle price `pro_monthly_995` at 995 cents/month via `payments--create_price` (leave old price in place; new checkouts use new price).
- Update `paddle.ts` price ID reference.
- Landing pricing card: $9.95, new feature bullets.
- `settings.functions.ts` — bump free sort cap if it's currently different from 50; confirm `projectCap` still returns 2.
- Compare page pricing row.

## Out of scope (this batch)

- Calendar/timeline view (#3)
- Save-as-identity flow (#4)
- Read-only MCP export (#5)
- Renaming asset files or generating a new Circles logo — reuse current mark until you approve a new one.

## Technical notes

- Paddle prices are created in test and auto-sync to live on publish; don't create in live.
- The rename is text-only in this pass; no route paths change, so no redirects needed.
- Personal-as-continuous is a filter change, not a schema migration — reversible.

## Order of operations

1. Create new Paddle price
2. Global find/replace for brand strings (batched file writes)
3. Lifecycle filter + Projects UI note
4. Pricing card + compare page numbers
5. Verify build, spot-check landing + dashboard + projects page
