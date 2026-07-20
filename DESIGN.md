# DESIGN.md

Bloom is a minimal habit tracker whose emotional center is a living sakura tree. Consistency is not a percentage on a dashboard — it is how full the tree blooms. Design should always reinforce that metaphor: soft spring light, petal pinks, warm wood, quiet motion.

This document is the visual and interaction source of truth for UI work in this repo.

---

## North star

**Quiet spring garden, not productivity SaaS.**

Bloom should feel like a small personal garden viewed through glass: cream air, rose light, amber warmth, soft blur, and one memorable living object — the sakura. Avoid dark-mode-first chrome, neon glow, purple gradients, dense dashboards, and generic “AI product” layouts.

Signature element: the **3D sakura**. Everything else supports it.

---

## Principles

1. **Metaphor first** — Progress reads as bloom density, streak as growth, calendar as seasonal weather. Prefer nature language over metrics jargon when copy is optional.
2. **One composition** — Primary surfaces (especially Home) should read as a single scene, not a tiled dashboard.
3. **Glass over cards** — Prefer translucent panels, soft borders, and backdrop blur. Nested “card on card” stacks should stay light; use `compact` widget variants inside denser layouts.
4. **Warm restraint** — Rose and amber accents are accents. Most UI is stone text on cream/rose-tinted glass.
5. **Motion with purpose** — Use motion for presence (tree breeze, page fade-up, check confetti, habit slide-away). Do not decorate idle UI with constant noise.
6. **Respect reduced motion** — Habit check confetti/sound already gates on `prefers-reduced-motion`; keep that habit for celebratory effects.

---

## Brand voice (UI copy)

- Sentence case. Short. Plain verbs.
- Prefer “growing”, “bloom”, “garden” over “optimize”, “streak freeze”, “gamify”.
- Empty states invite action (“Add your first habit to start blooming.”).
- Errors are clear, not apologetic theater.
- Status labels are present-tense activities: Focusing, Working, Reading…

---

## Color

### Atmosphere (page washes)

Page backgrounds are layered radial washes, not flat fills:

| Role | Typical Tailwind / values |
| --- | --- |
| Base wash | `#f8f1ea` → `#efe3d8` / `#e7d5cc` |
| Rose bloom light | `rgba(247,196,212,…)` radials |
| Amber warmth | `rgba(255,232,214,…)` radials |
| Soft orbs | `bg-rose-200/25–40`, `bg-amber-100/40` + heavy blur |

Chrome rails (left/right sidebars) use a vertical cream→rose glass gradient with `backdrop-blur-xl` and `border-rose-200/40`.

### Interactive palette

| Token | Usage |
| --- | --- |
| Rose 300–500 | Primary actions, active checks, density “more”, focus accents |
| Amber 200–300 | Secondary warmth in gradients (`from-rose-* to-amber-*`) |
| Stone 400–900 | Body, muted labels, icons at rest |
| White / white-70 | Glass panel fills (`bg-white/55–75`) |
| Emerald 400 | Online status dot (garden rail) |
| Stone 300 | Offline / empty density cells |

### Calendar density scale

From empty → full completion:

`transparent dashed` → `stone-200` → `rose-100` → `rose-200` → `rose-300` → `rose-400` → `rose-500`

### Sakura scene

Petal pinks (approx): `#ffe4ec`, `#f7c4d4`, `#f4a8be`, `#ffd0de`, `#f9b8c9`, `#fff0f5`  
Wood: `#5c4538` → `#8a6b55`  
Lighting: warm key `#fff6ea`, pink fill `#ffc0d4`, cream ground wash.

### Do not

- Default to purple/indigo product themes
- Use harsh black panels or heavy multi-layer drop shadows
- Introduce neon glow or “acid” accents

Semantic CSS variables live in `src/app/globals.css` (`--primary` is a muted rose-brown). Prefer the Tailwind rose/stone/amber language already used in product UI over inventing a parallel palette.

---

## Typography

| Role | Family | CSS |
| --- | --- | --- |
| Display / titles | **Fraunces** | `font-[family-name:var(--font-display)]` |
| Body / UI | **Manrope** | `font-sans` (default on `body`) |

### Scale habits

- Page titles: `text-4xl md:text-5xl`, tracking-tight, stone-900
- Section titles: `text-xl`–`text-2xl` display, normal weight
- Body: `text-sm`–`text-base`, stone-500–800
- Eyebrows / meta: `text-[10px]`–`text-xs`, uppercase, wide tracking (`tracking-[0.12em]`–`0.16em`), stone-400 or rose-500/80
- Streak hero number: large display (`text-3xl` compact / `text-5xl` full)

Do not substitute Inter, Roboto, system UI, or Arial for product surfaces.

---

## Shape & elevation

| Element | Treatment |
| --- | --- |
| Large panels / dialogs | `rounded-3xl`, soft ring `ring-rose-200/60`, shadow `0_20–30px_…_-28–40px_rgba(80,40,40,…)` |
| Widgets | `rounded-3xl` (standalone) or `rounded-2xl` (compact / nested) |
| Controls / inputs | `rounded-xl` |
| Pills / CTAs | `rounded-full` |
| Checkboxes | `rounded-lg` |
| Density cells | `rounded-[3px]`–`rounded-[4px]` |

Borders: thin rose glass — `border-rose-200/50`–`/70`, rarely solid heavy borders.

Elevation is **soft and warm**, not Material-style stacked shadows. Prefer one large soft shadow + blur over multiple sharp layers.

---

## Layout chrome

```
┌──────────┬────────────────────────────┬────────┐
│ Left     │ Main (hidden scrollbar)    │ Right  │
│ nav rail │ page scene / content       │ garden │
│ 4.5rem / │                            │ rail   │
│ 14rem    │                            │ w-14 → │
│          │                            │ hover  │
│          │                            │ w-72   │
└──────────┴────────────────────────────┴────────┘
```

- **Left (`AppSidebar`)** — Navigation, status (opens modal), sign out, minimize to icon rail. Collapsed width persists in `localStorage`.
- **Main (`app-main`)** — Scrollable content; scrollbar is intentionally hidden. Margins clear the fixed rails.
- **Right (`GardenStatusBar`)** — Compact garden presence + invite bell. Expands on hover/focus. Invite popover portals to `document.body` so it is not clipped.

Desktop (Tauri): `html.tauri-desktop` offsets chrome below the custom titlebar; shell uses a 12px rounded window frame.

---

## Surfaces by page

### Home

Full-bleed sakura scene. Side column (desktop right / mobile bottom) holds streak + calendar widgets only — no brand hero stack competing with the tree.

### Habits

List of glass habit rows. Completing the last slot for a period: confetti + success chime → row slides left and fades → bottom pill toast “Cancel last action” with draining border timer (5s).

### Garden

Horizontal person columns: mini sakura, identity, bloom/today stats, compact streak + calendar, habit list. Social, not competitive leaderboard chrome.

### Settings

Stacked glass sections. Status remains editable here and via sidebar modal.

### Auth

Centered glass form on the same atmospheric wash.

---

## Components

### Buttons

- Primary: rose gradient or solid rose, often `rounded-full` for key CTAs
- Ghost / secondary: quiet stone, soft white hover
- Always use pointer cursor on clickable controls
- Icon+label gaps stay modest (`gap-1.5`–`gap-2`)

### Dialogs / modals

Match habit/status dialogs:

- `rounded-3xl`, borderless, cream gradient fill
- Display title + stone description in a light header band
- Soft rose ring + deep warm shadow

### Toasts (Sonner)

Bottom-center. Cream/rose glass, `rounded-2xl`, rose icons. Undo toast is a full pill button with animated border ring (`animate-undo-timer-ring`).

### Widgets

- `StreakWidget` / `CalendarWidget` — full chrome on Home; `compact` inside Garden columns
- Uppercase micro-labels; display numerals for streak

### Habit checkbox

Pointer cursor. On complete: pop scale, multicolor confetti burst, success arpeggio. Checked state: rose gradient + soft rose shadow.

### Sakura (`SakuraCanvas` / `SakuraScene`)

Transparent canvas over page atmosphere. Organic branches, layered canopy pinks, bloom clouds, falling petals, soft lighting. Richness scales with consistency score. Keep performant — Garden mounts multiple canvases.

### Icons

Lucide, 16px (`size-4`) in chrome. Rose for active/brand moments; stone-400 at rest.

---

## Motion

| Name | Use |
| --- | --- |
| `animate-fade-up` (+ delayed / slow) | Page enter |
| `animate-gradient-shift` / `animate-orb` | Ambient background |
| `animate-check-pop` / `animate-check-ring` / `animate-confetti-burst` | Habit complete |
| `animate-habit-flow-out` / `in` | Habit leave / undo restore |
| `animate-undo-timer-ring` | Undo toast lifetime |
| Sakura Float + auto-rotate | Living tree presence |

Prefer `duration-200`–`300` for UI chrome; celebratory moments may run ~0.5–0.7s.

---

## Sound

`playSuccessSound()` — short major arpeggio (Web Audio), no external files. Trigger only on successful habit completion (and respect reduced-motion / user context; never on navigation).

---

## Content density

- Prefer one clear job per section: one title, one short supporting line, then the interaction.
- Avoid pill clusters, stat strips, and badge spam in heroes.
- Stats that remain (bloom %, today, streak) should stay small and secondary to the sakura or the habit list.

---

## Implementation notes

- UI primitives: shadcn/ui on `@base-ui/react` + Tailwind v4 (`src/components/ui/`).
- Alias `@/*` → `src/*`.
- Product styling is mostly utility classes; shared motion lives in `src/app/globals.css`.
- When adding surfaces, copy an existing glass panel (Garden column, widget, settings section) rather than inventing a new elevation system.
- Dark mode tokens exist in CSS but the product experience is **light / spring**. Do not ship a half-converted dark theme without a deliberate pass.

---

## Quick checklist for new UI

- [ ] Does it still feel like sakura / spring glass, not a generic app shell?
- [ ] Fraunces for display, Manrope for body?
- [ ] Rose/amber/stone only (no purple default)?
- [ ] Soft radius + soft warm shadow?
- [ ] Motion intentional, not ornamental noise?
- [ ] Works beside left/right rails without fighting the sakura?
- [ ] Clickable elements show pointer cursor?
