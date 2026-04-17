# iClaw Responsive Design Guidelines

## Overview

This document outlines the responsive design patterns and best practices for the iClaw frontend application.

## Breakpoints

| Name | Min Width | Typical Devices |
|------|-----------|----------------|
| xs   | 480px     | Large phones (landscape) |
| sm   | 640px     | Small tablets |
| md   | 768px     | Tablets, laptops |
| lg   | 1024px    | Desktops |
| xl   | 1280px    | Large desktops |
| 2xl  | 1536px    | Wide screens |

### Tailwind Classes

Use responsive prefixes: `xs:`, `sm:`, `md:`, `lg:`, `xl:`, `2xl:`

```jsx
// Example
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
```

## Touch Targets

Per Apple Human Interface Guidelines, all interactive elements must have a minimum touch target size of **44x44px**.

| Element Type | Minimum Size |
|--------------|-------------|
| Default buttons | 44x44px |
| Navigation items | 48px height |
| Icon buttons | 44x44px |
| Form inputs | 44px height |

### CSS Classes

```css
/* Minimum touch target (44x44px) */
.touch-target

/* Navigation items (48px) */
.nav-target
```

## Responsive Components

### ResponsiveGrid

Use for card grids that should adapt columns based on screen size.

```jsx
import { ResponsiveGrid } from './components/Layout/ResponsiveGrid';

// Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols
<ResponsiveGrid cols={3} gap="md">
  {children}
</ResponsiveGrid>
```

### CardGrid

Use for auto-fitting grids with minimum card width.

```jsx
import { CardGrid } from './components/Layout/ResponsiveGrid';

<CardGrid minCardWidth={280} gap="md">
  {children}
</CardGrid>
```

### ResponsiveModal

Automatically adapts to bottom sheet on mobile, centered modal on desktop.

```jsx
import { ResponsiveModal } from './components/Layout/ResponsiveModal';

<ResponsiveModal
  isOpen={isOpen}
  onClose={onClose}
  title="Settings"
  size="md"
>
  {content}
</ResponsiveModal>
```

### ResponsiveCard

Card with responsive padding (smaller on mobile).

```jsx
import { ResponsiveCard } from './components/Layout/ResponsiveCard';

<ResponsiveCard padding="md" responsivePadding hoverable>
  {content}
</ResponsiveCard>
```

### ResponsiveButton

Buttons with consistent touch targets across all sizes.

```jsx
import { ResponsiveButton } from './components/Layout/ResponsiveForm';

<ResponsiveButton variant="primary" size="md" loading={false}>
  Submit
</ResponsiveButton>
```

### ResponsiveInput / ResponsiveSelect

Form inputs with proper touch targets.

```jsx
import { ResponsiveInput, ResponsiveSelect } from './components/Layout/ResponsiveForm';

<ResponsiveInput
  label="Email"
  placeholder="Enter email"
  error={errors.email}
/>

<ResponsiveSelect
  label="Country"
  options={[{ value: 'us', label: 'United States' }]}
/>
```

### ListItem / NavList

Touch-friendly list components with 48px minimum height.

```jsx
import { ListItem, NavList } from './components/Layout/ResponsiveList';

<ListItem
  leadingIcon={<Icon />}
  trailingIcon={<ChevronRight />}
  description="Optional description"
>
  Item Title
</ListItem>

<NavList
  items={[{ id: '1', label: 'Dashboard', icon: <Home /> }]}
  activeId="1"
  onSelect={(id) => handleSelect(id)}
/>
```

## Responsive Hooks

Use the responsive hooks for conditional rendering or logic.

```typescript
import { useIsMobile, useIsTablet, useIsDesktop, useBreakpoint } from '../hooks/useResponsive';

// Simple boolean checks
const isMobile = useIsMobile();
const isTablet = useIsTablet();
const isDesktop = useIsDesktop();

// Get current breakpoint name
const breakpoint = useBreakpoint(); // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
```

## iOS Safe Areas

For notched devices (iPhone X and later), use safe area utilities.

```jsx
// Bottom safe area padding
<div className="pb-safe">
  {content}
</div>

// Full safe area
<div className="p-safe">
  {content}
</div>
```

## Grid Systems

### Quick Actions Grid
```
Mobile: 2 columns
Desktop: 4 columns
```
```jsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```

### Settings Cards Grid
```
Mobile: 1 column
Tablet+: 2 columns
```
```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

### Master-Detail Layout
```
Mobile: stacked
Desktop: 1/3 + 2/3 columns
```
```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
```

### Stat Metrics Grid
```
Mobile: 2 columns
Desktop: 4 columns
```
```jsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```

## Spacing Scale

| Name | Value | Use Case |
|------|-------|----------|
| xs   | 4px   | Tight spacing within components |
| sm   | 8px   | Compact element gaps |
| md   | 16px  | Default spacing between elements |
| lg   | 24px  | Section spacing |
| xl   | 32px  | Large gaps between sections |
| 2xl  | 48px+ | Page section separation |

## Animation Guidelines

| Animation Type | Duration | Easing |
|----------------|----------|--------|
| Page transitions | 200-300ms | ease-out |
| Micro-interactions | 100-150ms | ease-out |
| Modal/Drawer | 300ms | spring (stiffness: 300, damping: 30) |
| Hover effects | 150ms | ease |

### GPU Acceleration

For smooth animations, use the `gpu-accelerated` class:

```jsx
<motion.div className="gpu-accelerated">
  {content}
</motion.div>
```

## Utility Classes

### Display
```css
.hide-on-mobile    /* Hidden on mobile, visible from md+ */
.hide-on-desktop   /* Visible on mobile, hidden from md+ */
```

### Scrolling
```css
.scroll-touch      /* iOS momentum scrolling */
.no-scrollbar      /* Hide scrollbar */
```

### Touch
```css
.touch-target       /* 44x44px minimum */
.nav-target         /* 48px minimum */
.no-tap-highlight   /* Remove iOS tap highlight */
```

### Layout
```css
.responsive-container  /* Max-width container with responsive padding */
.auto-grid             /* Auto-fill grid with 280px min column */
.mobile-stack          /* Stack flex children on mobile */
.mobile-full-width     /* Full width on mobile */
```

## Testing Checklist

### Viewport Testing
- [ ] iPhone SE (375px width)
- [ ] iPhone 14/15 (390-393px width)
- [ ] iPad (768px width)
- [ ] iPad Pro (1024px width)
- [ ] Desktop (1280px+ width)

### Device Testing
- [ ] iOS Safari (notch, safe areas)
- [ ] Android Chrome (navigation bar)
- [ ] Touch vs mouse interaction

### Orientation Testing
- [ ] Portrait mode
- [ ] Landscape mode

### Functional Testing
- [ ] All buttons/links are tappable
- [ ] Forms are usable on mobile
- [ ] Modals/drawers work correctly
- [ ] Scrolling is smooth
- [ ] No horizontal overflow
