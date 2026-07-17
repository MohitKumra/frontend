# Premium Motion Design Guide

This document outlines the premium motion design system implemented in the application, inspired by Linear.app, Arc Browser, Raycast, Apple VisionOS, Stripe Dashboard, Notion, and Framer.

## Philosophy

**Every animation should feel:**
- Intentional
- Premium
- Incredibly smooth
- Expensive
- Purpose-driven (enhancing orientation, not distracting)

**Target:** Consistent 60 FPS on mid-range laptops

## Core Principles

### 1. GPU-Accelerated Properties Only

**Animate ONLY:**
- `transform` (translate, scale, rotate)
- `opacity`
- `filter` (small blur only, max 10px)
- `clip-path` (where appropriate)

**NEVER animate:**
- `width`, `height`
- `top`, `left`, `right`, `bottom`
- `margin`, `padding`
- Layout properties that trigger reflow

### 2. will-change Management

- Use `will-change` **only during animation**
- Remove after animation completes
- Never apply globally

### 3. Reduced Motion Support

All animations respect `prefers-reduced-motion: reduce`

## Animation Timings

| Interaction | Duration | Easing | Use Case |
|------------|----------|--------|----------|
| **Instant** | 100-150ms | ease | Immediate feedback (hover states) |
| **Fast** | 150ms | ease | Hover effects, button press |
| **Dropdown** | 180ms | cubic-bezier(0.22,1,0.36,1) | Dropdown menus |
| **Modal** | 280ms | cubic-bezier(0.22,1,0.36,1) | Modal/popup entry |
| **Page** | 350ms | cubic-bezier(0.22,1,0.36,1) | Page navigation |
| **Theme** | 550ms | cubic-bezier(0.22,1,0.36,1) | Theme switching |
| **Charts** | 700ms | cubic-bezier(0.22,1,0.36,1) | Chart animations |

## Specific Implementations

### Theme Switching Animation

#### Dark Mode (Light → Dark)
- **Origin:** Top Right Corner (100%, 0%)
- **Direction:** Diagonal sweep toward Bottom Left
- **Duration:** 550ms
- **Easing:** cubic-bezier(0.22, 1, 0.36, 1)
- **Effect:** Liquid ink spreading
- **Overlay:** Dark gradient with clip-path circle animation

#### Light Mode (Dark → Light)
- **Origin:** Bottom Left Corner (0%, 100%)
- **Direction:** Diagonal sweep toward Top Right
- **Effect:** Sunlight illuminating the interface
- **Same timing as dark mode**

**Implementation:**
```typescript
// Single optimized overlay with clip-path animation
// No flash, no half-state visibility
// Theme updates immediately before animation starts
```

### Page Navigation

**Old Page (Exit):**
```css
opacity: 1 → 0
scale: 1 → 0.99
translateY: 0 → -8px
filter: blur(0) → blur(4px)
duration: 350ms
```

**New Page (Enter):**
```css
opacity: 0 → 1
scale: 0.985 → 1
translateY: 20px → 0
filter: blur(10px) → blur(0)
duration: 350ms
```

**Key:** Pages never overlap visually; AnimatePresence with mode="wait"

### Modal/Popup Animation

**Background (Backdrop):**
```css
opacity: 0 → 1
backdrop-filter: blur(0) → blur(8px)
duration: 200ms
```

**Modal Content:**
```css
opacity: 0 → 1
scale: 0.94 → 1
translateY: 16px → 0
filter: blur(4px) → blur(0)
duration: 280ms
```

### Dropdown Menus

```css
opacity: 0 → 1
scale: 0.98 → 1
translateY: 8px → 0
duration: 180ms
```

### Sidebar Navigation

**Collapse/Expand:**
```css
width: animates smoothly
duration: 220ms
easing: cubic-bezier(0.22, 1, 0.36, 1)
```

**Nav Items:**
```css
hover: translateX(2px)
background: fades smoothly
active-indicator: scaleY animation (200ms)
```

### Button Interactions

**Hover:**
```css
translateY: 0 → -1px
duration: 150ms
```

**Click (Active):**
```css
scale: 1 → 0.97 → 1
duration: 50ms (press), spring back
```

### Cards

**Hover:**
```css
translateY: 0 → -4px
shadow: expands
border-glow: increases
duration: 180ms
```

**Active:**
```css
translateY: -4px → -2px
scale: 1 → 0.99
duration: 100ms
```

### Input Fields

**Focus:**
```css
border: animates color
glow: appears (150ms)
label: transitions smoothly
validation-icons: animate in
```

**Error State:**
```css
animation: subtle shake
duration: 300ms
```

### Toast Notifications

**Enter:**
```css
opacity: 0 → 1
scale: 0.95 → 1
translate: (12px, -10px) → (0, 0)
duration: 180ms
```

**Exit:**
```css
Reverse of enter
duration: 150ms
```

### Lists (Staggered Animation)

```css
Each item:
  opacity: 0 → 1
  scale: 0.98 → 1
  translateY: 8px → 0
  duration: 200ms
  
Stagger delay: 15-20ms per item
Max items before virtualization: avoid animating hundreds
```

### Charts

```css
Lines: draw progressively
Bars: grow upward
Numbers: count up animation
duration: 600-900ms
```

## CSS Architecture

### Files
1. **globals.css** - Base styles, theme tokens, core animations
2. **premium-motion.css** - Specialized motion design classes
3. **tokens.css** - Design tokens (colors, spacing, etc.)

### Key CSS Classes

```css
/* GPU Acceleration */
.transform-gpu
.will-change-transform
.will-change-opacity

/* Animations */
.animate-modal-enter
.animate-dropdown-enter
.animate-fade-in
.animate-slide-up
.animate-scale-in

/* Interactions */
.card-hover
.card-premium
.sidebar-nav-link

/* Stagger */
.list-item-stagger (with nth-child delays)
```

## Performance Checklist

- ✅ Only animate transform, opacity, filter
- ✅ Use GPU acceleration (`transform: translateZ(0)`)
- ✅ Apply `will-change` only during animation
- ✅ Remove `will-change` after animation
- ✅ Respect `prefers-reduced-motion`
- ✅ Virtualize long lists
- ✅ Single-layer theme transition (no complex multi-layer)
- ✅ Proper z-index management for page transitions
- ✅ No layout thrashing (batch DOM reads/writes)

## Testing

### Manual Testing
1. Toggle theme multiple times rapidly
2. Navigate between pages quickly
3. Open/close modals rapidly
4. Hover multiple elements
5. Check FPS in DevTools Performance tab

### Performance Targets
- **Theme Switch:** Solid 60 FPS, no jank
- **Page Transition:** Smooth, no flashing content
- **Hover Effects:** Instant response (<100ms perceived)
- **Modal Open:** Buttery smooth entrance
- **List Rendering:** No frame drops on scroll

### Browser DevTools
```javascript
// Check animation performance
Performance tab → Record → Perform actions → Look for:
- Green bars (good)
- Red/yellow bars (reflow/repaint issues)
- Consistent 60 FPS (16.67ms per frame)
```

## Common Issues & Solutions

### Issue: Theme switch is laggy
**Solution:**
- Simplified to single overlay layer
- Use clip-path animation only (GPU accelerated)
- Lock transitions during switch
- Apply theme immediately before animation

### Issue: Page content visible before blur
**Solution:**
- Set proper z-index on PageTransition
- Use AnimatePresence with mode="wait"
- Initial state has opacity: 0

### Issue: Hover delays
**Solution:**
- Reduce transition duration to 150ms or less
- Use simple easing (ease or cubic-bezier)
- Avoid complex transforms

### Issue: Mobile performance
**Solution:**
- Reduce blur amounts on mobile
- Simplify animations for touch devices
- Use `@media (hover: none)` for touch-specific styles

## Future Enhancements

1. **View Transitions API**: Use native browser transitions when available
2. **Shared Element Transitions**: Animate elements between routes
3. **Motion Preferences**: User-configurable animation speed
4. **Spring Physics**: Add subtle spring animations for select interactions
5. **Micro-interactions**: Subtle feedback on all interactive elements

## References

- [Framer Motion Docs](https://www.framer.com/motion/)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Linear Design System](https://linear.app/method)
- [Arc Browser Design](https://arc.net/)
- [Web Animation Performance](https://web.dev/animations/)
