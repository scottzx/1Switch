# Design System Usage Guide

## Quick Start

1. Copy `assets/tokens/` to your project:
   ```
   your-project/
   ├── styles/
   │   └── variables.css    ← copy here
   ├── tailwind.config.js   ← merge with existing
   └── src/
       └── index.css        ← add @import
   ```

2. In your main CSS:
   ```css
   @import "../../styles/variables.css";  /* adjust path */
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

3. In `tailwind.config.js`, merge the design tokens or use as standalone

4. For dark mode, toggle `.dark` class on `<html>` element

## Color Usage

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `bg-surface-app` | `#F5F5F3` | `#141414` | Page background |
| `bg-surface-card` | `#FFFFFF` | `#222222` | Card/panel background |
| `text-content-primary` | `#1A1A1A` | `#ECECEC` | Primary text |
| `text-content-secondary` | `#6B6B6B` | `#8A8A8A` | Secondary text |
| `text-content-tertiary` | `#9B9B9B` | `#5A5A5A` | Tertiary/muted text |
| `edge` | `#D8D8D5` | `#333333` | Borders/dividers |
| `accent` | `#B8956E` | `#C4A872` | Interactive elements, highlights |

## Typography Scale

```
4xl: 2.5rem / 2.5 line-height  - Page titles
3xl: 2rem / 1.2                - Section headings
2xl: 1.5rem / 1.3              - Card titles
xl:  1.125rem / 1.4            - Subheadings
base: 0.875rem / 1.6           - Body text
sm:  0.8125rem / 1.5           - Small text, captions
xs:  0.75rem / 1.4             - Labels
2xs: 0.625rem                  - Badges, meta
```

## Grid System

- **Gap**: 16px
- **Max width**: 1200px
- **Columns**: 12 (use `grid-cols-12` or `grid-cols-{n}`)
- **Responsive breakpoints**:
  - `sm`: 640px
  - `lg`: 1024px
  - `xl`: 1280px

## Card Component Pattern

```tsx
<div className="
  bg-surface-card border border-edge rounded px-5 py-5
  hover:shadow-card-hover
">
  <h3 className="text-sm font-medium uppercase tracking-wide">
    Module Name
  </h3>
  <p className="text-xs text-content-secondary mt-2">
    Description text
  </p>
</div>
```

## Dark Mode Toggle

```tsx
const [isDark, setIsDark] = useState(() => {
  const stored = localStorage.getItem('theme');
  if (stored) return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
});

useEffect(() => {
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', isDark);
}, [isDark]);
```

## Available Tailwind Classes

**Colors**: `bg-neutral-*`, `text-neutral-*`, `border-neutral-*`, `bg-surface-*`, `text-content-*`, `border-edge`, `bg-accent`

**Shadows**: `shadow-card`, `shadow-card-hover`, `shadow-elevated`

**Radius**: `rounded-none`, `rounded-sm`, `rounded`, `rounded-md`, `rounded-lg`

**Animations**: `animate-fade-in`, `animate-slide-up`
