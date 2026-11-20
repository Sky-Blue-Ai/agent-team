---
name: Syntropic Workbench
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#464555'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#00524b'
  on-tertiary: '#ffffff'
  tertiary-container: '#006c63'
  on-tertiary-container: '#81eddf'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
  code-num-lg:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 28px
  code-num-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  code-num-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2rem
  space-2xs: 0.125rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-base: 1rem
  space-lg: 1.25rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

The design system establishes a high-performance, executive-grade workspace for product creators, managers, and system architects orchestrating end-to-end product lifecycles. It merges precision SaaS ergonomics with high-density architectural clarity, delivering an interface that feels quiet, surgical, and responsive.

### Visual Style
- **Modern High-Density SaaS:** Clean structural boundaries, meticulous micro-spacing, and clear visual hierarchy.
- **Architectural Bento-Grid Composition:** Information organized into distinct, modular functional surfaces using subtle perimeter borders and light structural layering.
- **Subdued Chromatic Foundation:** Neutral slate surfaces (`#F8FAFC`, `#FFFFFF`) allow pipeline stages and vital metrics to command focus without visual fatigue.

## Colors

The palette uses a crisp, authoritative slate base accented by vibrant stage indicators.

### Core Canvas & Structure
- **Canvas Base:** `#F8FAFC`
- **Surface Elevation 0 (Cards, Panels):** `#FFFFFF`
- **Surface Elevated Sub-Layer (Hover, Insets):** `#F1F5F9`
- **Border Default:** `#E2E8F0`
- **Border Subtle:** `#F1F5F9`
- **Border Focus/Active:** `#4F46E5`

### Typographic Hierarchy
- **Text Dominant:** `#0F172A` (Headlines, primary metrics, high-emphasis values)
- **Text Standard:** `#334155` (Body copy, table data, active tab labels)
- **Text Secondary:** `#64748B` (Secondary metadata, column headers, timestamps)
- **Text Muted:** `#94A3B8` (Placeholders, inactive cues, structural icons)

### Pipeline Stage Status Accents
The 9 lifecycle stages use dedicated semantic pairs composed of a vibrant solid token (600 level) for glyphs, indicators, and border highlights, alongside an ultra-soft tinted surface token (10% tint on white) for badge surfaces:

1. **Inspiration:** `#8B5CF6` (Surface: `#F5F3FF`)
2. **Planning:** `#0284C7` (Surface: `#F0F9FF`)
3. **Strategy:** `#D97706` (Surface: `#FFFBEB`)
4. **Design:** `#E11D48` (Surface: `#FFF1F2`)
5. **Dev:** `#059669` (Surface: `#ECFDF5`)
6. **Delivery:** `#0D9488` (Surface: `#F0FDFA`)
7. **Launch:** `#4F46E5` (Surface: `#EEF2FF`)
8. **Growth/Marketing:** `#EA580C` (Surface: `#FFF7ED`)
9. **Strategy Optimization:** `#0891B2` (Surface: `#ECFEFF`)

## Typography

The type system is tuned for analytical scanning, dense tables, status tags, and operational logs.

- **Primary Typeface (Inter):** Applied across all interface chrome, navigational markers, contextual menus, narrative inputs, and system headers.
- **Metric Typeface (JetBrains Mono):** Enforces horizontal consistency across counters, pipeline velocity indexes, financial values, latency tracking, and operational timestamps.
- **Letter Spacing:** All uppercase label tiers (`label-sm`, `label-md`) use `letter-spacing: 0.04em`. Dense numerical displays in `JetBrains Mono` use tabular lining figures (`font-variant-numeric: tabular-nums`).

## Layout & Spacing

The layout is built around a structured Bento Grid model using a 12-column responsive fluid framework.

### Breakpoints & Layout Adaptations
- **Desktop (>= 1280px):** 12-column dynamic grid, fixed 64px collapsed icon rail / 240px expanded navigation sidebar, `margin-lg` canvas padding, and `gutter-lg` module separations. Multi-column Bento distribution accommodates simultaneous tracking of the 9 stages.
- **Tablet (768px - 1279px):** 8-column layout, dynamic collapsible drawer, `margin-md` canvas padding, and `gutter` module gaps. Bento panels collapse into paired 4-column blocks.
- **Mobile (< 768px):** 4-column single-stream stack, top/bottom utility bars, `margin` boundary margins, and `space-md` gaps. Bento panels collapse into full-width stacked views.

### Spacing Rules
Component interiors use strict base-4 micro-increments. High-density containers (compact data tables, pipeline boards) prioritize vertical efficiency with `space-sm` (8px) internal padding, whereas analytic summaries utilize `space-base` (16px) or `space-xl` (24px) for readability.

## Elevation & Depth

Visual hierarchy is maintained through subtle border definitions and crisp, micro-diffused ambient shadows, avoiding heavy drops or dark ambient occlusions.

### Depth Levels
- **Layer 0 (Canvas):** Flat `#F8FAFC` background.
- **Layer 1 (Bento Grid Tiles & Cards):** Flat `#FFFFFF` surface bounded by a crisp 1px solid `#E2E8F0` border. Shadow: `0 1px 2px 0 rgba(15, 23, 42, 0.04)`.
- **Layer 2 (Hover States, Interactive Cards, Floating Panels):** `#FFFFFF` surface. Shadow: `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.03)`. Border transitions to `#CBD5E1`.
- **Layer 3 (Modals, Slide-over Drawers, Popovers):** `#FFFFFF` with border `#E2E8F0`. Shadow: `0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Layer 4 (Command Palette):** `#FFFFFF` with a 1px border of `#CBD5E1`. Shadow: `0 25px 50px -12px rgba(15, 23, 42, 0.15)`.

Glass elements are reserved exclusively for fixed headers and control bars (`rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(8px)` and a bottom border of `#E2E8F0`).

## Shapes

The interface balances sharp precision with subtle softness through controlled corner radii.

- **Standard Containers & Cards:** `0.5rem` (`rounded-md` / level 2 base), ensuring tight alignments across dense Bento layouts.
- **Nested Inner Surfaces & List Items:** `0.375rem` (6px) to maintain balanced nesting within 8px outer boundaries.
- **Form Controls & Action Buttons:** `0.375rem` to `0.5rem` for geometric clarity and tactile familiarity.
- **Status Tags, Metrics Badges, and Micro Avatars:** Pill radius (`9999px`) to distinguish categorical items from active rectangular click surfaces.

## Components

### Buttons
- **Primary:** Solid `#4F46E5` background, `#FFFFFF` text, `font-weight: 500`. Hover: `#4338CA`. Active: `#3730A3`. Focus ring: 2px offset with `rgba(79, 70, 229, 0.35)`.
- **Secondary:** Solid `#FFFFFF`, 1px border `#E2E8F0`, `#334155` text. Hover: `#F8FAFC` background, `#0F172A` text, border `#CBD5E1`.
- **Ghost/Tertiary:** Transparent background, `#64748B` text. Hover: `#F1F5F9`, `#0F172A` text.
- **Sizes:** Small (28px height, `space-sm` padding, `body-sm`), Medium (36px height, `space-base` padding, `body-md`), Large (42px height, `space-xl` padding, `headline-sm`).

### Chips & Stage Badges
- **Pipeline Stage Badges:** Pill-shaped, `label-sm` (11px, semi-bold). 1px solid stroke matching the stage color at 20% opacity, surface background matching the stage tint (e.g., `#EEF2FF` for Launch), text rendered in the solid stage tone (`#4F46E5`). Includes a leading 6px circular indicator dot.
- **Metric Badges:** `JetBrains Mono` at `code-num-sm`, surface `#F1F5F9`, text `#475569`, border `#E2E8F0`.

### Cards & Bento Surfaces
- **Bento Modules:** `#FFFFFF` background, 1px border `#E2E8F0`, `0.5rem` corner radius, interior padding `1.25rem`. 
- **Card Headers:** Flex row container, 14px semi-bold title, right-aligned status indicator or action menu, separated by a 1px border bottom `#F1F5F9` when enclosing high-density tables.

### Input Fields & Controls
- **Text Inputs:** Height 36px, background `#FFFFFF`, border 1px solid `#CBD5E1`, text `#0F172A`, placeholder `#94A3B8`, border-radius `0.375rem`. Focus: border `#4F46E5`, box-shadow `0 0 0 3px rgba(79, 70, 229, 0.12)`.
- **Checkboxes & Radios:** 16px square/circle, border `#CBD5E1`, checked background `#4F46E5`. Subtle transition on state change.

### Data Tables & Lists
- **Rows:** Border-bottom 1px solid `#F1F5F9`. Alternating row striping is omitted in favor of hover highlighting via `#F8FAFC`.
- **Header Cells:** `11px`, `font-weight: 600`, text `#64748B`, uppercase, `letter-spacing: 0.05em`, background `#F8FAFC`.

### Specialized Workbench Components
- **Pipeline Progression Ribbon:** A horizontal or stepped 9-stage sequence tracker. Each stage segment features a hairline connector (`#E2E8F0`), an active stage node colored in its designated functional accent, and a trailing completion fill.
- **Metric Delta Readouts:** Monospace numerical tiles (`code-num-lg`) coupled with micro delta indicators (`+12.4%` in Emerald `#059669`, `-2.1%` in Rose `#E11D48`).