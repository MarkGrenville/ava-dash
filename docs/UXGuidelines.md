# Ava Dashboard — UX Guidelines

## Design Philosophy
Minimalistic, dark-mode-first, mobile-focused. The dashboard is a monitoring tool — clarity and scanability over decoration.

## Design Tokens

All tokens defined in `src/app.css` using Tailwind v4's `@theme {}` block.

### Color System (Dark Theme)
| Token | Value | Usage |
|-------|-------|-------|
| `surface-50` | `#0a0a0f` | Page background |
| `surface-100` | `#111118` | Card backgrounds |
| `surface-200` | `#1a1a24` | Input backgrounds |
| `surface-300` | `#232330` | Borders |
| `surface-400` | `#2e2e3d` | Hover borders, dividers |
| `surface-500` | `#3a3a4a` | Disabled states |
| `accent-400` | `#818cf8` | Accent light (active nav) |
| `accent-500` | `#6366f1` | Primary accent (buttons, links) |
| `accent-600` | `#4f46e5` | Accent hover |
| `status-success` | `#22c55e` | Completed, active |
| `status-warning` | `#f59e0b` | In progress, paused |
| `status-error` | `#ef4444` | Failed, blocked |
| `status-info` | `#3b82f6` | Planning |
| `text-primary` | `#f1f5f9` | Main text |
| `text-secondary` | `#94a3b8` | Secondary text |
| `text-muted` | `#64748b` | Muted text, labels |

### Typography
- **Font:** Inter (Google Fonts, weights 300-700)
- **Icons:** Material Symbols Outlined (weight 300, no fill)
- **Display:** `text-2xl font-bold tracking-tight`
- **Labels:** `text-[10px] font-semibold uppercase tracking-widest`
- **Body:** `text-sm text-text-primary`

## Component Inventory

| Component | File | Usage |
|-----------|------|-------|
| `TopBar` | `src/lib/components/TopBar.svelte` | Sticky top bar with AVA branding, nav links, settings, avatar |
| `BottomNav` | `src/lib/components/BottomNav.svelte` | Mobile bottom navigation (md:hidden) |
| `Card` | `src/lib/components/Card.svelte` | Surface container with border, optional href for click-through |
| `StatusBadge` | `src/lib/components/StatusBadge.svelte` | Color-coded status pill (sm/md sizes) |
| `PageHeader` | `src/lib/components/PageHeader.svelte` | Page title with optional subtitle |

## Layout Patterns
- Max content width: `max-w-5xl mx-auto`
- Page padding: `px-4 pt-4`
- Card spacing: `space-y-2` for lists, `gap-3` for grids
- Bottom nav padding: `pb-20 md:pb-6`

## Accessibility Standards
- All interactive elements have focus indicators (`focus:ring-2 focus:ring-accent-500`)
- Color is never the sole indicator of state — always paired with text or icons
- `prefers-reduced-motion` respected via CSS media query
- Minimum touch target: 44x44px on mobile
- Icons always paired with text labels in navigation
- `safe-area-bottom` on bottom nav for notched devices

## Motion Guidelines
- Transitions: `transition-colors` on hover states (default duration)
- Progress bars: `transition-all duration-500`
- Loading: `animate-pulse` for skeleton states
- Active task indicator: pulsing play icon

## Responsive Strategy
- Mobile-first layout
- Desktop nav in `TopBar` (`hidden md:flex`)
- Mobile nav in `BottomNav` (`md:hidden`)
- Grid columns: `grid-cols-2 md:grid-cols-4` for stat cards
- Card layouts: single column on mobile, `sm:grid-cols-2` for admin grid
