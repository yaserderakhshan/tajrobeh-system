# Tajrobeh — Design System

Mental-health platform, Iran. Persian/RTL. `tajrobeh.life`
Source of truth: Figma file **Tajrobeh Main** `cKwW8vojmxtzPfXWSBc0wF`, extracted 2026-08-26.

Everything under **Extracted** is read from the live Figma file — do not invent alternatives.
Everything under **Proposed** does not exist in Figma yet and is a considered default — use it, and say so if you deviate.

---

## 0. Non-negotiables

- **RTL Persian.** `dir="rtl"`, `lang="fa"`. Logical properties only (`margin-inline-start`, `padding-inline-end`, `inset-inline-*`) — never `left`/`right`.
- **Mobile-only product.** 97% of users are on mobile and the desktop version was deliberately dropped. Design user-side and therapist-side screens at **390×852** or **393×852**. The single exception: the **reception / finance / admin dashboard**, which is desktop at **1512×981**.
- **Numbers are Persian digits** in UI copy (۱۲۳۴), Latin digits in code and tokens.
- **Currency:** Iranian users see **تومان**; international users see **€**. Never mix in one view.
- **Brand name is `Tajrobeh`, never `ELC`.** ELC is the previous generation and still appears in old files — do not copy it forward.
- **No cute vector mascot.** The default illustration language is a **hand-drawn strawberry** metaphor: black hand-drawn linework, red `#c83f49` strawberry, green leaf, white ground, no shadow, no gradient. "Tooti" is the one character and has its own spec.
- **Privacy:** client names never appear in dashboards, reports, or any aggregate view. Therapist names are fine.

---

## 1. Color — Extracted

Nine ramps, 10 steps each (`50`→`900`). `500` is the base step of every ramp.

**Primary** — the brand red, "Strawberry Red".
`50 #faeced` · `100 #eec3c7` · `200 #e6a7ab` · `300 #da7e85` · `400 #d3656d` · **`500 #c83f49`** · `600 #b63942` · `700 #8e2d34` · `800 #6e2328` · `900 #541a1f`

**Accent** — near-black neutrals. **This ramp carries text**, not Nutral.
`50 #e9e9e9` · `100 #bababa` · `200 #999999` · ⚠️ *`300` missing* · `400 #4e4e4e` · **`500 #222222`** · `600 #1f1f1f` · `700 #181818` · `800 #131313` · `900 #0e0e0e`

**Nutral** *(sic — misspelling is in the file)* — surfaces and hairlines only.
`50 #fefefe` · `100 #fcfcfd` · `200 #fafafc` · `300 #f8f8fa` · `400 #f7f7f9` · `500 #f5f5f8` · `600 #dfdfe2` · `700 #aeaeb0` · `800 #878788` · `900 #676768`

**Green** (success) `500 #67aa82` — `#f0f7f3` → `#2b4737`
**Blue** (info) `500 #3aabc4` — `#ebf7f9` → `#184852`
**Red** (error) `500 #e06b75` — `#fcf0f1` → `#5e2d31`
**Yellow** (warning) `500 #f7b32b` — `#fef7ea` → `#684b12`
**Lime** `500 #84cc16` and **Sky_Blue** `500 #0ea5e9` — ⚠️ these two are unmodified default Tailwind palettes that leaked in. **Do not use them.** If you need a ninth hue, derive it from the brand.

**White** `#fefefe` — never pure `#ffffff`. **Black** `#222222` — never pure `#000000`.

Special fills: **AI Gradient** = radial `#c83f49 → #eec3c7` (reserve for AI-generated surfaces only). **Diversity** = linear `#5f9bdd → #c83f49` (reserve for diversity/inclusion badges only).

### Semantic mapping (Extracted, `shadcn/ui` collection)

| token | value | note |
|---|---|---|
| `background`, `card`, `popover` | `#fefefe` | white |
| `foreground`, `card-foreground` | `#0e0e0e` | accent-900 |
| `popover-foreground` | `#131313` | accent-800 |
| `primary` / `primary-foreground` | `#222222` / `#fefefe` | ⚠️ shadcn `primary` is **black, not brand red** |
| `secondary` / `secondary-foreground` | `#fcfcfd` / `#0e0e0e` | |
| `muted` / `muted-foreground` | `#f5f5f8` / `#676768` | |
| `accent` / `accent-foreground` | `#f5f5f8` / `#0e0e0e` | |
| `destructive` | `#b63942` | primary-600 |
| `border` | `#dfdfe2` @ 50% | |
| `input` | `#e9e9e9` | |
| `ring` | `#676768` | |
| `sidebar` + 6 derived | nutral/accent | desktop dashboard only |
| `chart-1…5` | all blue | ⚠️ `chart-1` and `chart-3` are identical — recolor before charting |

> The trap: `--primary` in the shadcn layer is **black**. The brand red lives at `--color-primary-500`. A "primary button" in this product is **black**, and red is reserved for the accents listed in §5.

### Color rules

- Text on white: `accent-900` for primary, `accent-500` for strong, `nutral-900` for muted. **Never `nutral-700` or lighter for text** — 2.1:1, fails contrast.
- White on `primary-500` = 4.93:1 → passes AA for body size. Fine for buttons and badges.
- Semantic hues (green/blue/red/yellow) carry **state only** — never decoration, never as a brand accent.
- Surfaces step `nutral-50 → 100 → 200`; hairlines are `nutral-600`.

---

## 2. Typography

**Extracted:** one family for the whole system — **Anjoman Max**. Weight names inside the font are `Thin · ExLight · Light · Regular · Medium · SemiBold · Bold · ExBold · Black` (no spaces — `SemiBold`, not `Semi Bold`).

Scale (`text-{size}/font-{weight}`), line-height = **1.5 × size** throughout:

| token | size | line-height |
|---|---|---|
| `text-xs` | 12 | 18 |
| `text-sm` | 14 | 21 |
| `text-base` | 16 | 24 |
| `text-lg` | 18 | 27 |
| `text-xl` | 20 | 30 |
| `text-2xl` | 24 | 36 |
| `text-3xl` | 30 | 45 |
| `text-4xl` | 36 | 54 |
| `text-5xl` | 48 | 72 |
| `text-6xl` | 60 | 90 |

Weights: `thin 100 · extralight 200 · light 300 · normal 400 · medium 500 · semibold 600 · bold 700 · extrabold 800 · black 900`

> ⚠️ Five styles in Figma break the 1.5 rule (`text-base/normal` = 27, `text-lg/normal` = 32, `text-lg/bold` = 23, `text-5xl/normal` and `text-5xl/extrabold` = 62). **Use the table above, not the Figma values** — the table is the intended rule.

### Font loading — solved, but read this

Anjoman Max is **not on Google Fonts**. It is therefore **embedded directly in `tajrobeh.css`** as a base64 `@font-face` (WOFF, 46 KB). Drop that one file into the page and the brand font renders — no build step, no network, no CDN.

> ⚠️ **Only weight 400 (Regular) is embedded.** The other weights of the family were not available. Weights 500–900 are currently **synthesized by the browser** — acceptable, but not the real thing on a connected script. Two consequences:
> - Prefer **size and color** for hierarchy over weight. A heading at `text-3xl` in `accent-900` outranks body text without needing 700.
> - When the `Medium` / `SemiBold` / `Bold` files arrive, run `references/embed-fonts.py` over the folder and regenerate — it is one command, and nothing else in the system changes.

Fallback stack is already declared, so a Persian face is always present even if the embed is stripped:

```css
--font-sans: 'Anjoman Max', 'Vazirmatn', system-ui, sans-serif;
```

Never fall back to a Latin-only face (Inter, Roboto) — Persian would render in an unpredictable system default and the design collapses.

### Persian typography rules

- Persian has **no uppercase** — never `text-transform: uppercase` on Persian text. For Latin labels it is fine.
- Do not letter-space Persian text; it breaks the joins. `letter-spacing: 0` on all Persian.
- Line-height 1.5 is a floor, not a ceiling — Persian ascenders/descenders need it. For long body copy go to 1.75.
- Half-space (ZWNJ, `‌`) matters: «می‌شود» not «می شود». Preserve it in copy.
- Measure: 45–65 characters for Persian body text.

---

## 3. Spacing, radius, elevation — Proposed

**None of this exists in Figma.** Everything is currently hard-coded there. These are the defaults to design against; they are the same 4px scale the codebase's Tailwind already implies.

**Spacing** (4px base): `0 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96`
- Screen gutter (mobile): **16**
- Gap between cards in a list: **12**
- Card inner padding: **16** (compact) / **20** (comfortable)
- Section spacing on a screen: **32**

**Radius:** `sm 6 · md 10 · lg 14 · xl 20 · full 999`
- Buttons and inputs → `md`
- Cards, sheets, tiles → `lg`
- Bottom sheets → `xl` on the top two corners only
- Avatars, tags, status pills → `full`

**Elevation** — this product is nearly flat; use borders before shadows.
- `--shadow-sm: 0 1px 2px rgba(34,34,34,.06)`
- `--shadow-md: 0 2px 8px -2px rgba(34,34,34,.10)`
- `--shadow-sheet: 0 -8px 32px -12px rgba(34,34,34,.18)` (bottom sheets only)

**Touch targets:** minimum 44×44. Bottom tabbar height 64 + safe area.

---

## 4. Dark mode — Proposed

Figma has **no dark mode** — all four variable collections are single-mode. This mapping is derived; treat it as a starting point, not extracted truth.

| token | light | dark |
|---|---|---|
| `background` | `#fefefe` | `#131313` |
| `card`, `popover` | `#fefefe` | `#1f1f1f` |
| `foreground` | `#0e0e0e` | `#fafafc` |
| `muted` | `#f5f5f8` | `#222222` |
| `muted-foreground` | `#676768` | `#aeaeb0` |
| `border` | `#dfdfe2` 50% | `#4e4e4e` 60% |
| brand accent (text/icon) | `#c83f49` | `#da7e85` (primary-300) |
| brand accent (filled) | `#c83f49` | `#c83f49` |

Semantic hues shift one step lighter on dark: green `#85bb9b`, blue `#61bcd0`, red `#e68991`, yellow `#f9c255`.

---

## 5. Components

### What already exists

The library publishes **121 components / 252 variants**, but they are all *product-specific*: status badges, service icons, steppers, therapy cards, chat bubbles, empty states, calendar cards, matchmaking tags, the logo set.

**There are no base components in the Tajrobeh library** — no Button, Input, Select, Checkbox, Modal, Toast. Those come from the linked `@Tajrobeh shadcn/ui` library. So:

> **Base UI = shadcn/ui conventions. Product UI = the Tajrobeh library.**

Full list with node ids and Figma links: `references/component-inventory.csv`.

### Base component specs — Proposed

**Button** — height `44` (md) / `36` (sm) / `52` (lg), radius `md`, padding-inline `20`, `text-base/font-medium`.
- `primary`: bg `#222222`, text `#fefefe` — the default action
- `brand`: bg `#c83f49`, text `#fefefe` — reserved for the single most important conversion on a screen (book a session, pay)
- `secondary`: bg `#fcfcfd`, border `#dfdfe2`, text `#0e0e0e`
- `ghost`: transparent, text `#222222`, hover bg `#f5f5f8`
- `destructive`: bg `#b63942`, text `#fefefe`
- disabled: 40% opacity, no color change

**Input** — height `48`, radius `md`, border `#e9e9e9` 1px, bg `#fefefe`, `text-base/font-normal`, placeholder `#aeaeb0`.
- focus: border `#c83f49`, ring `2px` `#c83f49` at 18%
- error: border `#e06b75`, message `text-sm` in `#cc616a` below
- required marker uses `#d8777e` (the `Requiered` variable)
- Label sits above, `text-sm/font-medium`, `#676768`

**Card** — bg `#fefefe`, border `#dfdfe2` 1px, radius `lg`, padding `16`, shadow none by default.

**Bottom sheet** — radius `xl` top corners, grab handle `36×4` `#dfdfe2` centered, backdrop `#222222` at 30% (the `background-color` variable), content padding `20`, safe-area bottom padding.

**Tabbar** — 64 high, `#fefefe`, top border `#dfdfe2`, 4–5 items, active item `#c83f49`, inactive `#878788`, label `text-xs/font-medium`.

**Status badge** — radius `full`, height `24`, padding-inline `10`, `text-xs/font-medium`, tinted `50` background with `700` text of the matching semantic ramp.

### Icons

**Lucide**, stroke width **1.333** (the `Icons-Storke` variable — the misspelling is in the file). Sizes `16 · 20 · 24`. Icons take the text color of their context, never a decorative hue.

---

## 6. Voice

Two registers, and the split is a decided rule:

- **System messages → formal.** «[نام] عزیز، سلام. درخواست شما بررسی شد…»
- **Tooti messages → warm and informal.** «تو برداشتیش» · «من برات اعتبار جور کردم»

Never mix them in one surface. Buttons say exactly what happens («رزرو جلسه», then a toast «جلسه رزرو شد»). Errors say what went wrong and what to do — no apologies.

---

## 7. Screens that already exist

Before designing a new screen, check whether it exists. Key flows in the Figma file: onboarding, intake form, therapist matchmaking (`Client Journey V 1.1` — the reference version), therapist profile, session booking, payment and wallet, chat, therapist dashboard, reception console (desktop), B2B/organization, school.

New designs go on the **`Playground`** page (`16135:10623`) first — never straight into a production page.

---

## 8. Known defects — do not reproduce

- Misspellings baked into token names: `Nutral`, `Whithe`/`Withe`, `Requiered`, `Inner Shdaow`, `Icons-Storke`, page `Paymenrt`, `Matchmakign`. **Keep them when referring to Figma; do not carry them into new code or new layer names.**
- `accent-300` does not exist.
- `Nutral` steps 50–500 are visually indistinguishable (all between `#fefefe` and `#f5f5f8`).
- `Lime` and `Sky_Blue` are foreign Tailwind palettes.
- `chart-1` = `chart-3`.

---

## Files

| file | what |
|---|---|
| **`tajrobeh.css`** | ⭐ **the drop-in.** Embedded font + every token + dark mode + RTL rules. One file, no build. Use this in Claude Design and in any artifact. |
| `references/tokens.css` | tokens only, no font — for a codebase that loads fonts its own way |
| `references/anjoman-max.css` | the embedded `@font-face` alone |
| `references/tokens.dtcg.json` | DTCG tokens, for Style Dictionary |
| `references/component-inventory.csv` | 121 components, node ids, Figma deep links |
| `references/embed-fonts.py` | regenerate the font CSS when more weights arrive |
| `references/fonts.md` | font details and the weight situation |

### How the CSS is structured — important

Every token is declared in **`:root`**, so it works in a plain page with no build step. A mirrored **`@theme`** block at the end of the file carries the same values for Tailwind v4 projects; a browser ignores it. If you are not using Tailwind, ignore it too.

This matters: an earlier version put the tokens *only* inside `@theme`, and every `var(--color-*)` silently resolved to nothing in a plain page. If you ever see unstyled swatches, that is the cause.
