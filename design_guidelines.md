# Achievement Gallery Design Guidelines

## Design Approach: Gaming-Focused Achievement System

**Selected Approach:** Reference-based, drawing inspiration from Steam Achievements, PlayStation Trophy systems, and modern mobile game reward galleries.

**Core Principle:** Create an engaging, game-like experience with clear visual feedback for achievement progression and satisfying unlock moments.

## Color Palette

### Dark Mode Primary (Gaming Aesthetic)
- **Background:** 220 25% 10% (deep navy-gray, gaming console inspired)
- **Surface:** 220 20% 16% (elevated cards/containers)
- **Surface Elevated:** 220 18% 22% (badge containers)

### Accent Colors
- **Primary (Unlock Gold):** 45 95% 55% (vibrant gold for unlocked states)
- **Locked State:** 220 10% 35% (desaturated gray-blue)
- **Success Glow:** 45 100% 65% (bright gold glow for unlock animation)

### Text & Icons
- **Primary Text:** 0 0% 95% (near white)
- **Secondary Text:** 220 10% 65% (muted gray)
- **Lock Icon:** 220 5% 45% (subdued gray for locked state)

## Typography

**Font Stack:** 
- Primary: 'Inter' or 'Roboto' from Google Fonts (clean, modern gaming UI)
- Display: 'Orbitron' or 'Exo 2' for achievement titles (tech/gaming feel)

**Hierarchy:**
- Page Title: text-4xl md:text-5xl font-bold tracking-tight
- Badge Names: text-lg font-semibold
- Badge Descriptions: text-sm text-gray-400
- Stats/Counter: text-2xl font-bold

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-6 to p-8
- Grid gaps: gap-6 md:gap-8
- Section spacing: py-12 md:py-20

**Container Structure:**
- Max width: max-w-7xl mx-auto
- Responsive padding: px-4 md:px-8

## Component Library

### Achievement Gallery Grid
- **Layout:** Responsive grid (grid-cols-2 md:grid-cols-3 lg:grid-cols-4)
- **Badge Cards:** Square aspect ratio (aspect-square), rounded-2xl
- **Hover State:** Subtle lift (hover:scale-105) with smooth transition
- **Active State:** Click feedback (active:scale-95)

### Badge States

**Locked State:**
- Grayscale filter (filter grayscale)
- Reduced opacity (opacity-40)
- Lock icon overlay (absolute centered, text-4xl)
- Subtle border: border-2 border-gray-700

**Unlocked State:**
- Full color, no filter
- Opacity 100%
- No lock icon
- Gold accent border: border-2 border-amber-500
- Subtle glow effect: shadow-lg shadow-amber-500/20

### Unlock Animation
- **Duration:** 500ms ease-out
- **Sequence:**
  1. Scale pulse (scale-110 → scale-100)
  2. Remove grayscale filter
  3. Fade in gold border
  4. Particle/sparkle effect around badge (CSS animation or confetti library)
  5. Brief glow pulse

### Progress Tracking Component
- **Position:** Top of gallery
- **Display:** "X of 12 Unlocked" with progress bar
- **Progress Bar:** h-2 rounded-full with gold fill (bg-amber-500)
- **Background:** bg-gray-700

### Badge Detail Modal/Tooltip (Optional Enhancement)
- Shows achievement name and description
- Unlock date/time for unlocked badges
- "Locked" message with hint for locked badges

## Interaction Patterns

### Click-to-Unlock
- **Cursor:** cursor-pointer on locked badges
- **Feedback:** Immediate visual response (scale animation)
- **Sound:** Consider subtle unlock sound effect (optional)
- **Persistence:** LocalStorage to save unlock states

### Visual Feedback
- Locked badges: Slight hover brightness increase
- Unlocked badges: Gentle glow pulse on hover
- Recent unlocks: Optional "NEW" badge indicator

## Responsive Behavior

**Mobile (< 768px):**
- 2 columns grid
- Larger touch targets (min-h-32)
- Full-width progress bar

**Tablet (768px - 1024px):**
- 3 columns grid
- Balanced spacing

**Desktop (> 1024px):**
- 4 columns grid
- Enhanced hover effects
- Larger badge displays

## Animations

**Use Sparingly:**
- Unlock animation only (primary moment of delight)
- Subtle hover scale transitions (duration-200)
- Progress bar fill animation when badge unlocks
- NO continuous/looping animations
- NO auto-playing background effects

## Additional Elements

### Page Header
- Achievement system title with gaming font
- Unlock counter prominently displayed
- Optional "Reset All" button (destructive action, secondary position)

### Empty State Enhancement
- Motivational message when no badges unlocked
- Visual indicator showing locked badge pattern

### Accessibility
- Focus states for keyboard navigation (ring-2 ring-amber-500)
- Aria labels for lock/unlock states
- Screen reader announcements for unlock events
- High contrast between locked/unlocked states

## Technical Notes

**LocalStorage Schema:**
```
{
  "unlockedBadges": [1, 3, 5], // Array of unlocked badge IDs
  "lastUnlocked": timestamp
}
```

**Badge Image Integration:**
- Place 12 badge images in `/public/badges/` directory
- Name: badge-1.avif through badge-12.avif
- Locked state: Apply grayscale + opacity via CSS
- Unlocked state: Full image opacity with gold border overlay