# Enchanted Knowledge Realm – UI & Aesthetic Implementation Guide

This document serves as the single source of truth for the visual redesign of the study application on the `ui-polish` branch. Apply these design tokens and principles consistently across all components, pages, and modals without altering core domain logic or Dexie persistence layers.

---

## 1. Core Color Palette & Design Tokens

Update your Tailwind configuration and CSS variables to use these exact color values. Do not introduce unapproved colors.

### Backgrounds & Surfaces
* **Primary App Background:** `#091928` (Deep midnight blue)
* **Primary Cards & Containers:** `#164C45` (Rich emerald teal)
* **Secondary / Nested Surfaces:** `#22766B` (Hover states, selected elements, subtle glow containers)
* **Alternative Surface:** `#186A8F` (Used selectively for visual depth and variety)

### Accent & Gaming Colors
* **Arcane Cyan (`#12F3FF`):** **Primary interactive accent.** Use for primary buttons, active navigation, focus rings, progress bars, and selected quiz answers.
* **Mystic Violet (`#6D1ABD`):** Secondary magical accent for special features, rare rewards, and magical badges.
* **Enchanted Gold (`#E7DE95`):** Reserved strictly for XP highlights, achievements, milestone celebrations, and badges.
* **Arcane Burgundy (`#711F47`):** Used sparingly for special challenges or warnings.

### Typography & Feedback
* **Primary Text:** `#FFFFFF` (Headings, titles, important labels)
* **Secondary Text:** `#A7CCE4` (Pale sky gray for body text, descriptions, and helper labels)
* **Success / Correct:** `#93D41E` (Green feedback, correct answers, success toasts)
* **Error / Incorrect:** `#F6853D` (Orange/coral feedback, warning states, failure toasts)

---

## 2. Tailwind Configuration (`tailwind.config.js`)

Configure your theme tokens to support the fantasy gaming aesthetic:

```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        realm: {
          bg: '#091928',
          surface: '#164C45',
          teal: '#22766B',
          alt: '#186A8F',
          cyan: '#12F3FF',
          violet: '#6D1ABD',
          gold: '#E7DE95',
          burgundy: '#711F47',
          success: '#93D41E',
          error: '#F6853D',
          text: {
            primary: '#FFFFFF',
            secondary: '#A7CCE4',
          }
        }
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      borderRadius: {
        'realm': '18px',
        'realm-btn': '12px',
      },
      boxShadow: {
        'cyan-glow': '0 0 12px rgba(18, 243, 255, 0.25)',
        'violet-glow': '0 0 14px rgba(109, 26, 189, 0.3)',
        'gold-glow': '0 0 12px rgba(231, 222, 149, 0.25)',
      }
    },
  },
  plugins: [],
}
```

---

## 3. Global Styling Guidelines & Component Rules

### Cards & Panels (`bg-realm-surface`)
* Rounded corners (`rounded-[18px]` or `rounded-2xl`).
* Subtle translucent border (`border border-[#A7CCE4]/15`).
* Soft shadow (`shadow-lg`).
* Hover states for interactive cards: slight upward translation (`-translate-y-1`) with soft cyan or teal glow.

### Glassmorphism (Modals & Overlays)
* Use selectively for floating navigation, modals, and headers:
  ```css
  background: rgba(22, 76, 69, 0.82);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(167, 204, 228, 0.15);
  ```

### Buttons
* **Primary Button (`bg-realm-cyan text-realm-bg font-bold rounded-xl`):** Features cyan glow on hover and smooth elevation transition (`transition-all duration-200 hover:shadow-cyan-glow hover:-translate-y-0.5`).
* **Secondary Button (`bg-realm-teal text-white border border-[#A7CCE4]/20 hover:bg-realm-teal/80`):** Standard container actions.

### Quiz Answer & Feedback States
* **Default:** `#22766B` background with white text and a subtle border.
* **Selected:** Arcane cyan border with subtle cyan glow.
* **Correct:** `#93D41E` success tint with clear check icon and success glow.
* **Incorrect:** `#F6853D` error tint with cross icon. *Never rely on color alone; always pair with icons/text for accessibility.*

---

## 4. Implementation Constraints for Cursor
1. **Preserve Functionality:** Do not alter existing domain logic (`src/domain/`), Dexie hooks/repositories (`src/db/`), or routing when applying Tailwind classes.
2. **Readability First:** Ensure sufficient contrast between text (`#A7CCE4` / `#FFFFFF`) and dark teal/midnight backgrounds. Avoid overusing heavy blurs or neon saturation.
3. **Responsive Design:** Verify that layouts scale correctly across mobile, tablet, and desktop viewports without horizontal scrolling.