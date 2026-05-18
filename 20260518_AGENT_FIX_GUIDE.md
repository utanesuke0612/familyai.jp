# familyai.jp — Agent Fix Guide

> **Generated**: 2026-05-18  
> **Based on**: Comprehensive 75-point review (12 categories A–L)  
> **Score**: 8.5 / 10  
> **Purpose**: This file provides actionable, self-contained instructions for another agent to implement fixes.  
> **Stack**: Next.js 14 App Router · Drizzle ORM + Neon Postgres · NextAuth v5 beta · Upstash Redis · Tailwind v3  

---

## How to use this guide

1. Read the entire file before touching any code.  
2. Fix items in **Sprint 1 → Sprint 2 → Sprint 3** order.  
3. Each task contains: the exact file path, the problem description, the exact old code, and the exact replacement.  
4. After each fix, run `pnpm typecheck` and `pnpm lint` to verify no regressions.  
5. Items marked ✅ ALREADY FIXED are for reference only — do **not** modify them.

---

## Sprint 1 — Critical Fixes (must fix before next deploy)

---

### C1 · Auth form labels not linked to inputs (Accessibility)

**Severity**: Critical — WCAG 2.1 AA violation. Screen readers cannot associate labels with inputs.

**Files**:
- `app/(site)/auth/signin/SignInForm.tsx` — Lines 138–155, 158–177
- `app/(site)/auth/register/page.tsx` — Lines 134–151, 154–173, 176–195, 219–237

**Fix**: Add matching `id` to every `<input>` and `htmlFor` to every `<label>`.

#### SignInForm.tsx — email label+input

```tsx
// BEFORE (line ~138):
<label className="text-xs font-medium" style={{ color: 'var(--sumi)' }}>
  メールアドレス
</label>
<input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="mail@example.com"
  required
  autoComplete="email"
  className="border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow]"
  style={{
    borderColor:  'var(--line)',
    color:        'var(--sumi)',
    background:   'var(--washi-light)',
    borderRadius: '4px',
  }}
/>

// AFTER:
<label htmlFor="signin-email" className="text-xs font-medium" style={{ color: 'var(--sumi)' }}>
  メールアドレス
</label>
<input
  id="signin-email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="mail@example.com"
  required
  autoComplete="email"
  className="border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow]"
  style={{
    borderColor:  'var(--line)',
    color:        'var(--sumi)',
    background:   'var(--washi-light)',
    borderRadius: '4px',
  }}
/>
```

#### SignInForm.tsx — password label+input

```tsx
// BEFORE (line ~159):
<label className="text-xs font-medium" style={{ color: 'var(--sumi)' }}>
  パスワード
</label>
<input
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="8文字以上"
  required
  autoComplete="current-password"
  className="border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow]"
  style={{
    borderColor:  'var(--line)',
    color:        'var(--sumi)',
    background:   'var(--washi-light)',
    borderRadius: '4px',
  }}
/>

// AFTER:
<label htmlFor="signin-password" className="text-xs font-medium" style={{ color: 'var(--sumi)' }}>
  パスワード
</label>
<input
  id="signin-password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  placeholder="8文字以上"
  required
  autoComplete="current-password"
  className="border px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow]"
  style={{
    borderColor:  'var(--line)',
    color:        'var(--sumi)',
    background:   'var(--washi-light)',
    borderRadius: '4px',
  }}
/>
```

#### register/page.tsx — apply the same pattern to all 4 fields

Apply `htmlFor` + `id` to:
| Field | id value |
|-------|----------|
| お名前 | `register-name` |
| メールアドレス | `register-email` |
| パスワード | `register-password` |
| パスワード確認 | `register-confirm` |

Pattern for each (example with name field):
```tsx
// BEFORE:
<label className="text-xs font-medium" style={{ color: 'var(--sumi)' }}>
  お名前 <span style={{ color: 'var(--sumi-light)' }}>(任意)</span>
</label>
<input
  type="text"
  value={name}
  ...
/>

// AFTER:
<label htmlFor="register-name" className="text-xs font-medium" style={{ color: 'var(--sumi)' }}>
  お名前 <span style={{ color: 'var(--sumi-light)' }}>(任意)</span>
</label>
<input
  id="register-name"
  type="text"
  value={name}
  ...
/>
```

---

### C2 · `user3dBookmarks` table is orphaned — no API or UI

**Severity**: Critical (DB/Architecture) — Table exists in schema and migrations but has zero API routes and zero UI. This is dead code in the DB layer.

**File**: `lib/db/schema.ts` — `user3dBookmarks` table (search for `user3dBookmarks`)

**Decision required** (choose one option):

**Option A — Remove the table** (recommended if the feature is genuinely not planned):
1. Create new migration: `drizzle/0021_drop_user3d_bookmarks.sql`
   ```sql
   DROP TABLE IF EXISTS "user_3d_bookmarks";
   ```
2. Remove the `user3dBookmarks` export from `lib/db/schema.ts`.
3. Remove any re-exports of `user3dBookmarks` from `lib/db/index.ts`.
4. Run `pnpm db:push` or `pnpm db:migrate`.

**Option B — Implement the feature** (if 3D bookmarks are planned soon):
1. Create `app/api/user/3d-bookmarks/route.ts` following the same pattern as `app/api/user/vocab-bookmarks/route.ts`.
2. Add a repository at `lib/db/repositories/user3dBookmarkRepository.ts`.
3. Wire UI in the tutor 3D model page.

The schema comment already says `// 接続未完了` — remove that comment once the option is implemented.

---

### C3 · Admin AI-config endpoints have rate limiting explicitly disabled

**Severity**: Critical (Security) — A brute-force loop could spam expensive AI config changes.

**File**: `app/api/admin/ai-config/route.ts` — Lines 93 and 113

```ts
// BEFORE (line 93):
}, { errorBuilder: aiConfigErrorBuilder, rateLimit: false });

// BEFORE (line 113):
}, { errorBuilder: aiConfigErrorBuilder, rateLimit: false });
```

**Fix**: Remove `rateLimit: false` from both PUT and DELETE handlers.

```ts
// AFTER (line 93):
}, { errorBuilder: aiConfigErrorBuilder });

// AFTER (line 113):
}, { errorBuilder: aiConfigErrorBuilder });
```

**Note**: `protectAdminRoute` already enforces session auth. The rate-limit should default to enabled so that Upstash Redis limits repeated PUT/DELETE attempts. Verify that the default behaviour of `protectAdminRoute` applies a per-IP or per-admin-email limit when `rateLimit` is not set to `false`. If it does not, add explicit rate limiting using `getRateLimiter('ratelimit:admin-ai-config', ...)` inside the handler body.

---

### C4 · Admin identity relies on a single `ADMIN_EMAIL` env var (no DB role)

**Severity**: Critical (Security) — If the env var is misconfigured or the email changes, access silently breaks or is silently granted.

**File**: `lib/admin-auth.ts`

**Current behaviour** (from review):
```ts
export function isAdmin(email: string | null | undefined): boolean {
  return !!ADMIN_EMAIL && email === ADMIN_EMAIL;
}
```

**Recommended fix** (minimal-risk approach — does not require DB migration):
Add a **comma-separated allowlist** and normalise to lowercase to prevent case-sensitivity bypass:

```ts
// lib/admin-auth.ts

const ADMIN_EMAILS: Set<string> = new Set(
  (process.env.ADMIN_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.has(email.toLowerCase());
}
```

This is backward-compatible (single email in `.env.local` still works), and adds:
- Case-insensitive comparison
- Multi-admin support via comma-separated values
- Explicit empty-string guard

---

## Sprint 2 — Medium Priority Fixes

---

### M1 · Dead role-related tokens in Tailwind config

**Severity**: Medium (Maintenance) — Causes confusion; these role colours were removed in migration 0001.

**File**: `tailwind.config.ts`

Search for and remove colour token groups named: `papa`, `mama`, `kids`, `senior`, `common`  
Also remove any comments that reference these role names.

---

### M2 · Sitemap missing SSG-generated tool pages

**Severity**: Medium (SEO) — `/tools/voaenglish/[course]/[lesson]` and `/tools/ai-kyoshitsu/[slug]` are statically generated via `generateStaticParams()` but absent from `app/sitemap.ts`.

**File**: `app/sitemap.ts`

**Fix**: Add DB queries to fetch VOA lesson routes and AI-kyoshitsu article slugs, then append them to the sitemap array.

Skeleton for VOA (adapt to actual DB table/repository):
```ts
// Inside sitemap() function, before the return statement:

// ── VOA English レッスンページ ──────────────────────────────
let voaPages: MetadataRoute.Sitemap = [];
try {
  // Replace with actual repository call
  const voaRows = await getPublishedVoaLessons(); // returns { course, slug, updatedAt }[]
  voaPages = voaRows.map((row) => ({
    url:             `${baseUrl}/tools/voaenglish/${row.course}/${row.slug}`,
    lastModified:    row.updatedAt?.toISOString() ?? now,
    changeFrequency: 'monthly' as const,
    priority:        0.6,
  }));
} catch {
  console.warn('[sitemap] VOA pages skipped');
}

// ── AI-kyoshitsu ページ ─────────────────────────────────────
let aiKyoshitsuPages: MetadataRoute.Sitemap = [];
try {
  const kyoshitsuRows = await getPublishedAiKyoshitsuSlugs();
  aiKyoshitsuPages = kyoshitsuRows.map((row) => ({
    url:             `${baseUrl}/tools/ai-kyoshitsu/${row.slug}`,
    lastModified:    row.updatedAt?.toISOString() ?? now,
    changeFrequency: 'weekly' as const,
    priority:        0.65,
  }));
} catch {
  console.warn('[sitemap] AI-kyoshitsu pages skipped');
}

return [...staticPages, ...articlePages, ...voaPages, ...aiKyoshitsuPages];
```

---

### M3 · Vocab and sentence bookmarks bypass the Repository pattern

**Severity**: Medium (Architecture) — These two routes use inline Drizzle queries, unlike every other feature which uses `lib/db/repositories/`.

**Files**:
- `app/api/user/vocab-bookmarks/route.ts`
- `app/api/user/sentence-bookmarks/route.ts`

**Fix**: Extract DB logic into dedicated repository files:
- `lib/db/repositories/userVocabBookmarkRepository.ts`
- `lib/db/repositories/userSentenceBookmarkRepository.ts`

Each should export: `getBookmarks(userId)`, `addBookmark(userId, data)`, `removeBookmark(userId, id)`.  
Then replace inline queries in the route files with repository calls.  
Follow the exact pattern of `lib/db/repositories/userAiMemoRepository.ts` (if it exists) or any other established repository.

---

### M4 · Password policy not enforced on registration

**Severity**: Medium (Security) — The strength bar is purely visual; no server-side rejection of weak passwords.

**File**: `app/api/auth/register/route.ts` (the POST handler for registration)

**Fix**: Add Zod refinement to the body schema:
```ts
const registerSchema = z.object({
  name:     z.string().max(100).optional(),
  email:    z.string().email(),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上にしてください')
    .regex(/[A-Za-z]/, 'パスワードには英字を含めてください')
    .regex(/[0-9]/, 'パスワードには数字を含めてください'),
});
```

---

### M6 · Register endpoint missing rate limiting

**Severity**: Medium (Security) — The login endpoint is rate-limited; registration should be too to prevent account-creation spam.

**File**: `app/api/auth/register/route.ts`

**Fix**: Add rate limiting at the top of the POST handler, following the same pattern as `app/api/tts/route.ts`:
```ts
const limiter = getRateLimiter('ratelimit:register', 5, '10 m'); // 5 registrations per 10 min per IP
if (limiter) {
  const { success } = await limiter.limit(getClientIp(req));
  if (!success) {
    return errorResponse('RATE_LIMITED', '登録リクエストが多すぎます。しばらくしてから再試行してください。', 429);
  }
}
```

---

### M7 · Content-Security-Policy header is missing

**Severity**: Medium (Security) — XSS second-layer defence is absent. `X-Frame-Options: DENY` and `X-Content-Type-Options` exist but CSP does not.

**File**: `next.config.mjs`

**Fix**: Add a `Content-Security-Policy` header in the `headers()` function.  
Start with a **report-only** policy to avoid breaking changes, then tighten over time:

```js
// next.config.mjs — inside the existing headers() array
{
  key: 'Content-Security-Policy-Report-Only',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // tighten after audit
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://api.openrouter.ai https://*.neon.tech",
    "frame-src https://www.youtube.com https://player.vimeo.com",
    "report-uri /api/csp-report",    // optional: add a report endpoint later
  ].join('; '),
},
```

Upgrade to `Content-Security-Policy` (enforcement) after verifying no violations in staging.

---

### M8 · `!Backup` folder should not be in the repository

**Severity**: Medium (Operations/Security) — Contains old design docs, coding-agent prompts, and possibly partial credential references. Increases repo size and leaks internal architecture.

**Action**:
1. Verify `.gitignore` includes `!Backup/` or `\!Backup/` (the `!` prefix requires escaping in `.gitignore`).
2. If already committed, run:
   ```bash
   git rm -r --cached "\!Backup"
   echo '!Backup/' >> .gitignore   # Note: gitignore needs no escaping for literal !Backup
   ```
   Actually for a folder literally named `!Backup`, add this to `.gitignore`:
   ```
   \!Backup/
   ```
3. Confirm with `git status` that the folder is untracked.

---

## Sprint 3 — Minor / Low Priority

---

### L1 · `TtsPreviewPlayer.tsx` is an orphan component

**Severity**: Low (Maintenance)

**File**: `components/article/TtsPreviewPlayer.tsx`

**Action**: Either:
- Wire it into `ArticleBody.tsx` or the article detail page, OR
- Delete the file and its associated types/utilities.

Also: the `extractEnglishScript` function naively includes any line with 12+ Latin characters, which causes Japanese text containing "AI" or "ChatGPT" to be included in the TTS script. Fix the extraction logic if keeping the component:
```ts
// More precise: require majority-Latin content (>50% ASCII)
function isMostlyLatin(line: string): boolean {
  const latin = (line.match(/[A-Za-z0-9\s.,!?'"]/g) ?? []).length;
  return latin / line.length > 0.5;
}
```

---

### L2 · `nav` active-link state inconsistency

**Severity**: Low (UX) — Some nav items highlight the active route, others do not. Verify all top-level nav links use `usePathname()` to apply an active style.

**Files**: Check `components/layout/Header.tsx` or equivalent nav component.

---

### L3 · `next-auth` v5 beta dependency risk

**Severity**: Low (Operations) — `next-auth@5.0.0-beta.*` is used. Beta packages can have breaking changes between patch versions.

**Action**: Pin the exact version in `package.json` to avoid accidental upgrades:
```json
"next-auth": "5.0.0-beta.25"   // replace with your current exact version
```
And add a comment:
```json
// next-auth v5 beta — do not upgrade without testing; breaking changes likely
```

---

## Items already fixed (for reference)

These were flagged in earlier review passes but have since been corrected in the codebase:

| ID | Description | Fix confirmed in |
|----|-------------|-----------------|
| ~~C5~~ | seed.ts used wrong categories | `lib/db/seed.ts` now uses `['education']` ✅ |
| ~~M5~~ | rehype-highlight bundled all 200+ languages | `ArticleBody.tsx:47–65` uses `highlightLanguages` allowlist ✅ |
| ~~M8~~ | JSON-LD `</script>` escape vulnerability | `learn/[slug]/page.tsx:140` uses `.replace(/</g, '\\u003c')` ✅ |
| ~~Old~~ | apps/bookmarks tables still in schema | Dropped via migrations 0002/0005 ✅ |
| ~~Old~~ | GIN index missing on `articles.categories` | Added in migration 0003 ✅ |
| ~~Old~~ | audio_play_logs table / audio_* columns | Dropped via migration 0006 ✅ |
| ~~Old~~ | Mobile API key dead code in csrf.ts | Removed; csrf.ts is now clean ✅ |
| ~~Old~~ | TTS endpoint has no rate limiting | `app/api/tts/route.ts:55` uses `getRateLimiter` ✅ |

---

## Architecture Reference (for context)

```
familyai.jp/
├── app/
│   ├── (site)/          # Public pages (Server Components)
│   │   ├── auth/        # signin, register
│   │   ├── learn/       # article list + [slug] detail
│   │   └── tools/       # voaenglish, ai-kyoshitsu, etc.
│   ├── api/
│   │   ├── admin/       # ai-config (protected by protectAdminRoute)
│   │   ├── auth/        # register, nextauth
│   │   ├── tts/         # OpenRouter TTS
│   │   ├── user/        # bookmarks, memos, lessons-progress
│   │   └── ...          # 28 routes total
│   └── sitemap.ts
├── lib/
│   ├── db/
│   │   ├── schema.ts    # 12 tables, Drizzle ORM
│   │   ├── seed.ts
│   │   └── repositories/   # Repository pattern (except vocab/sentence bookmarks)
│   ├── ai/providers/    # OpenRouter, TTS
│   ├── admin-auth.ts    # isAdmin() — single email check (C4)
│   ├── csrf.ts          # Origin/Host check
│   └── ratelimit.ts     # Upstash Redis wrappers
├── shared/              # Pure TS — iOS portable layer
│   └── constants.ts     # ContentCategory enum, MODEL_ROUTER, RATE_LIMIT
├── components/
│   └── article/
│       ├── ArticleBody.tsx       # rehype-sanitize + rehype-highlight
│       └── TtsPreviewPlayer.tsx  # ORPHAN — not imported anywhere (L1)
├── drizzle/             # 21 migrations (0000–0020)
└── tailwind.config.ts   # Dead role tokens (M1)
```

**ContentCategory enum** (the only valid values for `articles.categories`):
```ts
'image-gen' | 'voice' | 'education' | 'housework'
```

**Key env vars** (never commit these):
- `DATABASE_URL` — Neon Postgres connection string
- `ADMIN_EMAIL` — comma-separated admin emails (after C4 fix)
- `OPENROUTER_API_KEY`
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

---

*End of fix guide. Total actionable items: 4 Critical + 6 Medium + 3 Low.*
