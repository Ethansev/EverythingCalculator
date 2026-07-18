# ExactSplit — Product & V1 Design

**Date:** 2026-07-17
**Status:** Approved pending user review
**Home:** This spec starts life in the everythingcalculator repo and moves into
the new product repo once it is scaffolded. The everythingcalculator app
remains as-is; `/meal` and the new product diverge from here.

## Vision

A standalone product that replaces Splitwise for the moments it handles worst:
the bill hitting the table, and the trip that needs settling. The entire
journey — scan, split, share, settle, remember — should be *enjoyable*, built
around the receipt-paper brand: things print, tear, stamp, and slide.

**Positioning against Splitwise:** experience-first, not ledger-first. No
account or app install required to participate; itemizing is a 10-second scan,
not data entry; reminders come from friends, not robots; the artifact you keep
is a beautiful receipt, not a red number.

**Journey beats (all four define the product):**
1. **The table** — scan → tap-split → share link in under a minute.
2. **Settle** — per-person Venmo deep links + PAID stamps on the shared receipt.
3. **The trip** — a tab of checks with a simplified-settlement finale.
4. **The archive** — saved history, tasteful charts, exports.

## Design principles

- **Mobile-web-first.** Designed at 390px; thumb-zone primary actions;
  bottom sheets over modals; a native app may come later, web ships now.
- **Minimal UI.** One primary action per screen. Nothing on Home but
  "Start a check" and your recent receipts.
- **Animation as language, not decoration.** Print, tear, stamp, slide —
  every animation marks a state change, runs under ~600ms, and is
  interruptible. Signature move: the receipt *printing* when a check is
  shared. Totals tick like a register; PAID and ALL-ASSIGNED are rubber
  stamps with spring physics.
- **Charts as garnish.** Visuals where numbers need shape (trip finale,
  archive digest) — never dashboards.
- **The math is the trust.** Every shared receipt shows the penny-exact
  breakdown behind every number.

## Decisions (settled during brainstorm)

| Question | Decision |
| --- | --- |
| Feature vs product | Standalone product, new repo `exactsplit` — name FINAL: ExactSplit (vetted 2026-07-18: no competitors; exactsplit.com/.app/.co all available at decision time) |
| Sharing mechanism | Native share sheet + link; the app never sends texts/emails in V1 |
| Recipient experience V1 | Read-only themed receipt; live claiming is a later sub-project |
| Accounts | Optional in V1: guest mode is the default path; Google sign-in unlocks cross-device history and claims guest checks |
| Stack | Next.js 16 + Railway Postgres + Prisma; app hosted on Railway (one project, private networking) |
| Name rationale | Keyword "split" for store search + the penny-exact promise; the Splitwise formula without the crowd |
| Old repo | everythingcalculator untouched; separate "maybe" todo for local persistence there |

## V1 scope (sub-project 1: the table, the share, the settle)

### Screens

1. **Home (`/`)** — hero "Start a check"; recent checks as receipt stubs
   (merged view: account checks when signed in + device-local guest checks).
   Quiet sign-in affordance; never a gate.
2. **Check flow (`/new`)** — the ported wizard (scan-or-scratch, people,
   items+charges incl. targeted charges, split, summary), re-laid-out for
   phones: condensed step header, bottom-pinned action bar, receipt theme
   throughout.
3. **Share moment** — completing the summary triggers the print animation;
   "Share the check" persists the check server-side and opens the native
   share sheet with `/c/[shareId]`. Optional field: creator's Venmo handle.
4. **Shared receipt (`/c/[shareId]`)** — the themed receipt; a
   "which one are you?" chip row (client-side highlight only, no identity);
   the selected person's items and total front and center, full math below;
   per-person settle row (Venmo deep link with prefilled amount + note when
   the creator provided a handle; copy-amount button always); "mark paid"
   slams a PAID stamp — any link-holder can stamp/unstamp (friends-trust
   model; the creator's view can correct).

### Editing after sharing

The creator holds `editToken` (in localStorage, and implicitly via account
ownership once signed in). Reopening a shared check re-enters the wizard;
saving PATCHes the server copy; the shared page always shows the latest.

### Auth (optional, V1)

- Auth.js (NextAuth v5) + Prisma adapter; Google OAuth provider to start.
- Guest mode is the default: create/share/edit with zero login.
- Signing in: `POST /api/checks/[shareId]/claim` with the device's
  editTokens attaches `ownerId` to guest checks; `/` then shows account
  history across devices.

## Data model (Prisma)

Auth.js standard models (`User`, `Account`, `Session`, `VerificationToken`)
plus:

```prisma
model Check {
  id            String   @id @default(cuid())
  shareId       String   @unique   // short, unguessable; lives in URLs
  editToken     String              // secret; creator's device/account holds it
  title         String
  data          Json                // items, charges, people — engine types verbatim
  paidPersonIds String[]
  venmoHandle   String?
  owner         User?    @relation(fields: [ownerId], references: [id])
  ownerId       String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

The check body is one JSON document — the money engine's types are the
contract. Items normalize into rows only when live claiming (SP4) needs
concurrent per-item writes.

## API surface

| Route | Auth | Purpose |
| --- | --- | --- |
| `POST /api/checks` | none | Create; returns `{ shareId, editToken }`; payload size cap + per-IP rate limit |
| `GET /api/checks/[shareId]` | link | Read the check (shared page + reopen) |
| `PATCH /api/checks/[shareId]` | editToken OR session where `session.user.id === ownerId` | Update title/data/venmoHandle |
| `POST /api/checks/[shareId]/paid` | link | Toggle a personId in `paidPersonIds` |
| `POST /api/checks/[shareId]/claim` | session + editToken | Attach ownerId |
| `GET /api/me/checks` | session | Account history |
| `POST /api/scan-receipt` | none (rate-limited) | Ported Claude Haiku scanner, unchanged |

## What ports from everythingcalculator

Verbatim (with their tests, 40 total): `splitCalculations.ts`,
`receiptScan.ts`, the scan API route, the receipt-theme CSS utilities,
`ReceiptSurface`. Reused-but-relaid-out: wizard step components (chips,
exact-amount editor, charges editor with who-pays, drag/tap splitter,
summary mini-receipts). New: routes/navigation, Home, share moment,
shared-receipt page, auth, persistence.

## Deployment

One Railway project: Next.js service + Postgres. `prisma migrate deploy` on
release. Env: `DATABASE_URL`, `ANTHROPIC_API_KEY`, `AUTH_SECRET`,
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Error handling

- Share-link 404s render a friendly "this receipt has faded" page.
- PATCH/claim with a wrong editToken → 403; stamping requires only the link.
- Scan failures keep the existing retry / manual-entry escape hatches.
- Guest data loss (cleared localStorage) loses edit access but never the
  shared receipt itself; sign-in exists precisely to make history durable.

## Testing

- Ported engine/parsing suites stay green in the new repo.
- New unit tests: token/permission checks (PATCH/claim/paid), guest-claim
  merge logic.
- API routes exercised against a local Postgres during development.
- Playwright journey: create → share → open link → mark paid.

## Roadmap (each a future spec)

- **SP2 — Archive:** `/checks` history with the first charts (monthly
  dining, fronted-vs-recovered); works for guests (local) and accounts.
- **SP3 — Trips:** a tab groups checks; simplified-settlement finale
  rendered as the vacation receipt.
- **SP4 — Network layer:** live claiming at the table, friend-sent nudge
  composer, monthly digest, CSV/YNAB export.

## Out of scope (V1)

App-sent texts/emails; money movement of any kind; live claiming;
multi-currency; recurring/household expenses (deliberately ceded to
Splitwise); native mobile apps; the final product name.
