---
name: Heritage Gold
colors:
  surface: '#fff8f4'
  surface-dim: '#f2d5ba'
  surface-bright: '#fff8f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e6'
  surface-container: '#ffead8'
  surface-container-high: '#ffe4c9'
  surface-container-highest: '#fadec2'
  on-surface: '#271908'
  on-surface-variant: '#4f4541'
  inverse-surface: '#3e2d1a'
  inverse-on-surface: '#ffeedf'
  outline: '#817570'
  outline-variant: '#d2c3be'
  surface-tint: '#6d5a53'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#261813'
  on-primary-container: '#947f78'
  inverse-primary: '#dac1b8'
  secondary: '#7b5800'
  on-secondary: '#ffffff'
  secondary-container: '#fdca68'
  on-secondary-container: '#765400'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#261909'
  on-tertiary-container: '#95806b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#f7ddd4'
  primary-fixed-dim: '#dac1b8'
  on-primary-fixed: '#261813'
  on-primary-fixed-variant: '#54433c'
  secondary-fixed: '#ffdea6'
  secondary-fixed-dim: '#f1bf5e'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5d4200'
  tertiary-fixed: '#f8dec5'
  tertiary-fixed-dim: '#dbc2aa'
  on-tertiary-fixed: '#261909'
  on-tertiary-fixed-variant: '#544431'
  background: '#fff8f4'
  on-background: '#271908'
  surface-variant: '#fadec2'
  paper-white: '#FFFFFF'
  roast-black: '#0D0705'
  sand-muted: '#D9C1AA'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-lg: 80px
  stack-md: 48px
  stack-sm: 24px
---

## Brand & Style

This design system embodies the narrative of "Modern Egyptian Heritage." It is a premium, editorial-focused aesthetic that balances the warmth of Cairo’s traditional coffee houses with the refined minimalism of global luxury. The target audience is discerning coffee enthusiasts who value craftsmanship, origin stories, and a sophisticated sensory experience.

The visual style is **Corporate / Modern** with a **Tactile** edge. It utilizes generous whitespace, characteristic of high-end editorial layouts, paired with rich, earthy textures. Subtle vintage Egyptian patterns (geometric and botanical) serve as low-opacity accents to ground the modern UI in historical context. The overall emotional response should be one of "Affluent Nostalgia"—a reliable, premium service that feels both timeless and innovative.

## Colors

The palette is rooted in the "Dark Coffee" primary, which provides the weight and authority required for a luxury brand. The "Warm Cream" background acts as a tactile "paper" base, moving away from sterile whites to create an inviting, organic atmosphere. 

- **Primary (Dark Coffee):** Used for typography, navigation icons, and high-impact background sections (e.g., footers).
- **Secondary (Gold/Bronze):** Used for primary calls-to-action, key accents, and signifying quality (ratings, badges).
- **Tertiary (Soft Sand):** Used for subtle dividers, secondary containers, and hovering states.
- **Neutral (Warm Cream):** The global canvas. This color should be used for the page body to reduce eye strain and enhance the "vintage" feel.

## Typography

The typography strategy pairs the characterful, rounded geometry of **Plus Jakarta Sans** (serving as a more modern, premium alternative to Baloo) with the utilitarian precision of **Inter**.

Headlines should be set with tight line-spacing to create a "locked" editorial look. Display sizes utilize negative letter spacing to feel more cohesive and impactful. Body text remains spacious with a 1.6 line height to ensure readability across long-form heritage stories. Labels and utility text (price, categories) should often be set in uppercase with slight tracking to provide a rhythmic contrast to the fluid headlines.

## Layout & Spacing

This design system uses a **Fixed Grid** for desktop and a **Fluid Grid** for mobile. The layout is inspired by luxury editorial magazines, utilizing asymmetrical placements and generous vertical "stacking" space to let product photography breathe.

- **Desktop:** 12-column grid with 24px gutters and 64px outside margins. Content is centered within a 1280px container.
- **Tablet:** 8-column grid with 20px gutters and 40px margins.
- **Mobile:** 4-column grid with 16px gutters and 20px margins.

Spacing follows a strict base-8 rhythm, but "Stack" variables are used to separate major sections (80px+) to ensure the UI never feels cluttered. Product cards should use a "masonry-lite" approach where imagery varies slightly in aspect ratio to maintain a handcrafted, non-mechanical feel.

## Elevation & Depth

To maintain a "Modern Luxury" feel, the system avoids heavy, dark shadows. Instead, it uses **Ambient Shadows** and **Tonal Layers** to create depth.

1.  **Low Elevation (Cards):** Use a very soft, diffused shadow: `0px 4px 20px rgba(26, 14, 9, 0.05)`. This makes elements appear to float slightly above the "Warm Cream" surface without breaking the minimalist aesthetic.
2.  **High Elevation (Modals/Dropdowns):** Use a slightly more defined shadow with a hint of the primary color: `0px 12px 40px rgba(26, 14, 9, 0.12)`.
3.  **Tonal Depth:** Use the "Soft Sand" color to create nested containers. For example, a product detail section might sit on a Soft Sand background to distinguish it from the main page flow.
4.  **Glassmorphism:** Reserved strictly for navigation bars. A 20px backdrop blur with 80% opacity on the Warm Cream background allows content to scroll underneath while maintaining legibility.

## Shapes

The shape language is defined by significant roundedness to evoke a sense of "soft luxury" and "organic form," mirroring the curves of coffee beans and ceramic cups.

- **Primary Radius:** 24px for all standard containers, cards, and buttons.
- **Large Radius:** 32px for main hero sections or image containers.
- **Inner Radius:** When nesting elements (e.g., an image inside a card), the inner radius should be 8px smaller than the outer radius (16px) to maintain visual harmony.
- **Decorative Elements:** Use perfectly circular shapes for category icons and floating action buttons.

## Components

### Buttons
- **Primary:** Background in "Gold/Bronze," text in "Dark Coffee." 24px border radius. High-emphasis.
- **Secondary:** Bordered in "Dark Coffee" (1.5px), no fill. Used for "Explore" or "Learn More."
- **Ghost:** No border or fill, primary color text with a 12px icon. Used for low-priority actions like "View All."

### Cards
Product cards must feature a full-bleed image at the top with a 24px top-radius. The bottom section (content) should have a padding of 24px. Prices are always set in "Dark Coffee" with `label-md` styling.

### Input Fields
Inputs use a "Soft Sand" background with no border. On focus, a 1.5px "Gold/Bronze" border appears. Label text sits above the field in `label-sm`.

### Heritage Accents
A specialized component: a "Pattern Divider." This is a thin (48px height) horizontal strip featuring a low-opacity Egyptian geometric pattern in "Sand-muted," used to separate major storytelling sections.

### Chips/Tags
Used for "Origin" (e.g., Ethiopia, Brazil) or "Roast Level." Pill-shaped with "Soft Sand" backgrounds and "Dark Coffee" `label-sm` text.