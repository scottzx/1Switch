---
name: design-system
description: "iClaw Design System for consistent frontend development. Use when building new frontend projects, redesigning UI, creating React/Vite apps, or applying design tokens. Triggers on: new frontend project, new React app, redesign UI, apply design system, frontend consistency, color palette, token files, Dieter Rams style."
---

# iClaw Design System

Dieter Rams inspired neutral palette design system for iClaw frontend projects.

## Quick Start

Copy `assets/tokens/` to your project:
- `styles/variables.css` → project's styles directory
- `tailwind.config.js` → project root (merge with existing)
- `base.css` → optional base CSS entry point

## Token Files

| File | Purpose |
|------|---------|
| `assets/tokens/variables.css` | CSS custom properties (colors, shadows, grid) |
| `assets/tokens/tailwind.config.js` | Tailwind theme extension |
| `assets/tokens/base.css` | Base CSS entry point |

## Core Principles

- **Neutral palette**: Warm/cool neutrals only, no bright colors
- **Single accent**: Warm brass `#B8956E` (Braun reference)
- **Grid system**: 16px base, 12-column, 1200px max-width
- **Minimal shadows**: Functional only, no decorative glows
- **Transitions**: 150-200ms, subtle ease

See [references/principles.md](references/principles.md) for Dieter Rams 10 principles.

## Usage

See [references/usage.md](references/usage.md) for:
- CSS variable reference (light/dark modes)
- Typography scale
- Grid system details
- Card component pattern
- Dark mode toggle code

## Color Palette

```
Light Mode:
- Background: #F5F5F3 (warm) / #FFFFFF (card)
- Text: #1A1A1A (primary) / #6B6B6B (secondary) / #9B9B9B (tertiary)
- Border: #D8D8D5
- Accent: #B8956E (brass)

Dark Mode:
- Background: #141414 (cool) / #222222 (card)
- Text: #ECECEC (primary) / #8A8A8A (secondary) / #5A5A5A (tertiary)
- Border: #333333
- Accent: #C4A872 (lighter brass)
```

## Applying to New Projects

1. Copy `variables.css` to project `styles/`
2. Add `@import "./styles/variables.css";` before Tailwind directives
3. Merge `tailwind.config.js` tokens into project's config
4. Add dark mode toggle (see usage.md)
5. Replace hardcoded colors with design token classes (`bg-surface-card`, `text-content-primary`, etc.)
