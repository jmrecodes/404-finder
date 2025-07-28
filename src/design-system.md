# 404 Finder: Auto-Search Redirector Extension Design System

## Color Palette

Based on the extension's logo, our color scheme combines professional deep navy with energetic accents inspired by the rocket and magnifying glass elements.

### Primary Colors
```css
--primary-color: #001F3F;     /* Deep navy from 404 text */
--primary-hover: #001830;     /* Darker navy for hover states */
```

### Accent Colors
```css
--accent-color: #FF4136;      /* Orange/red from rocket - represents action/energy */
--secondary-color: #39CCCC;   /* Blue/teal from magnifying glass - represents search/discovery */
```

### Semantic Colors
```css
--success-color: #39CCCC;     /* Teal for positive actions */
--warning-color: #FF4136;     /* Orange for warnings/attention */
--danger-color: #FF4136;      /* Orange/red for errors */
```

### Text Colors
```css
--text-primary: #001F3F;      /* Main text - deep navy */
--text-secondary: #5f6368;    /* Secondary text - gray */
--text-tertiary: #80868b;     /* Disabled/tertiary text */
```

### Surface Colors
```css
--background: #F4F4F4;        /* Light gray background */
--surface: #ffffff;           /* White surface for cards/panels */
--surface-hover: #f8f9fa;     /* Subtle hover state */
--border: #e0e0e0;           /* Light gray borders */
```

### Effects
```css
--shadow: rgba(0, 31, 63, 0.08);       /* Subtle shadow using primary color */
--shadow-hover: rgba(0, 31, 63, 0.15); /* Stronger shadow for hover */
```

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

### Font Sizes
- **Heading 1**: 28px (options page)
- **Heading 2**: 20px (section titles)
- **Heading 3**: 18px (subsections)
- **Body**: 14px (default)
- **Small**: 13px (help text)
- **Tiny**: 12px (status indicators)

### Font Weights
- **Bold**: 600 (headings, important labels)
- **Medium**: 500 (buttons, labels)
- **Regular**: 400 (body text)

## Spacing System

Following an 8px grid system for consistency:

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
```

## Border Radius

Consistent rounded corners for a friendly, modern appearance:

```css
--radius-sm: 4px;    /* Buttons, inputs */
--radius-md: 8px;    /* Cards, containers */
--radius-lg: 12px;   /* Pills, badges */
```

## Component Patterns

### Buttons

#### Primary Button
- Background: `var(--primary-color)`
- Text: White
- Hover: `var(--primary-hover)` with subtle lift effect
- Active: Scale down slightly (0.98)

#### Secondary Button
- Background: `var(--secondary-color)`
- Text: White
- Hover: Slightly darker with lift effect

#### Danger Button
- Background: `var(--danger-color)`
- Text: White
- Used for destructive actions

### Form Elements

#### Text Inputs
- Border: 1px solid `var(--border)`
- Focus: Border changes to `var(--secondary-color)` with glow
- Padding: `var(--spacing-sm)` vertical, `var(--spacing-md)` horizontal

#### Toggle Switches
- Off state: `var(--text-tertiary)`
- On state: `var(--primary-color)`
- Smooth transition between states

### Cards & Containers
- Background: `var(--surface)`
- Border-radius: `var(--radius-md)`
- Shadow: `var(--shadow)`
- Hover shadow: `var(--shadow-hover)`

## Animation & Transitions

### Standard Transition
```css
--transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

### Common Animations
- **Pulse**: Status indicator breathing effect
- **Slide In**: Notification entrance
- **Spin**: Loading indicator
- **Scale**: Button press feedback

## Accessibility

### Color Contrast
- All text meets WCAG AA standards (4.5:1 for normal text)
- Interactive elements have clear hover/focus states
- Focus indicators use 2px outline with offset

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Clear focus indicators
- Logical tab order

## Chrome Extension Specific

### Popup Constraints
- Fixed width: 350px
- Min height: 500px
- Max recommended: 800x600px

### Badge Colors
- Error count: `#FF4136` (orange/red from rocket)
- Text: White

### Notifications
- Primary background: `var(--primary-color)`
- Accent border: `var(--secondary-color)`
- Clean, minimal design to match OS native notifications

## Design Principles

1. **Clarity**: Clear visual hierarchy with the navy/teal/orange palette
2. **Consistency**: Unified design language across all components
3. **Accessibility**: High contrast, clear focus states
4. **Friendliness**: Rounded corners, playful colors from the logo
5. **Professionalism**: Clean layout, organized information
6. **Chrome Integration**: Respects browser UI patterns and constraints

## Dark Mode (Future Enhancement)

Prepared for dark mode support with inverted color values while maintaining the brand identity through accent colors.
