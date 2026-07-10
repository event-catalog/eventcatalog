---
sidebar_position: 6
keywords:
  - EventCatalog themes
  - dark mode
  - light mode
  - customization
  - custom theme
sidebar_label: Themes
title: Themes
description: Customize the look and feel of your catalog with built-in themes, dark/light mode, and custom themes
---

import PlanBanner from '@site/src/components/MDX/PlanBanner';

EventCatalog comes with a selection of built-in themes and supports both light and dark modes out of the box.

## Choosing a theme

To set a theme, add the `theme` property to your `eventcatalog.config.js` file:

```js title="eventcatalog.config.js"
export default {
  // ... other config
  theme: 'sapphire',
};
```

### Available themes

EventCatalog includes the following built-in themes:

| Theme | Description |
|-------|-------------|
| `default` | Purple accent - the original EventCatalog look |
| `ocean` | Teal accent - calm and professional |
| `sapphire` | Blue accent - premium enterprise feel |
| `sunset` | Orange accent - warm and energetic |
| `forest` | Dark green accent - natural and grounded |


## Light and dark mode

EventCatalog supports both light and dark modes. Users can toggle between modes using the theme switcher in the header.

### How it works

- The theme toggle appears in the header navigation
- **System preference by default**: New visitors see light or dark mode based on their operating system preference
- **Remembers user choice**: Once a user manually toggles the theme, their preference is saved and used on future visits
- **Syncs across tabs**: Theme changes sync across browser tabs
- **Responds to system changes**: If no manual preference is set, the theme automatically updates when the user changes their OS dark mode setting

### Theme persistence

When a user manually selects light or dark mode, their preference is stored in `localStorage` under the key `eventcatalog-theme`. This ensures their choice persists across page reloads and browser sessions.

If no preference is stored, EventCatalog automatically follows the user's system preference using the `prefers-color-scheme` media query.

---

## Creating custom themes

<PlanBanner plan="Scale" />

Custom themes allow you to fully brand EventCatalog with your organization's colors. You define your theme in `eventcatalog.styles.css` using CSS variables.

### Step 1: Create your theme CSS

Add your custom theme to `eventcatalog.styles.css` in your project root. Your theme needs to define CSS variables for both light and dark modes.

```css title="eventcatalog.styles.css"
/**
 * Custom "ruby" theme - Red accent colors
 */

/* Light Mode */
:root[data-catalog-theme="ruby"],
:root[data-catalog-theme="ruby"][data-theme="light"] {
  /* Accent colors */
  --ec-accent: 220 38 38;           /* red-600 */
  --ec-accent-hover: 185 28 28;     /* red-700 */
  --ec-accent-subtle: 254 226 226;  /* red-100 */
  --ec-accent-text: 153 27 27;      /* red-800 */

  /* Buttons */
  --ec-button-bg: 185 28 28;        /* red-700 */
  --ec-button-bg-hover: 153 27 27;  /* red-800 */
  --ec-button-text: 255 255 255;

  /* Sidebar */
  --ec-sidebar-active-bg: 185 28 28;
  --ec-sidebar-active-text: 255 255 255;
  --ec-sidebar-hover-bg: 185 28 28;

  /* You can override any CSS variable here */
}

/* Dark Mode */
:root[data-catalog-theme="ruby"][data-theme="dark"] {
  /* Accent colors - use lighter shades for dark mode */
  --ec-accent: 248 113 113;         /* red-400 */
  --ec-accent-hover: 239 68 68;     /* red-500 */
  --ec-accent-subtle: 127 29 29 / 0.3;
  --ec-accent-text: 252 165 165;    /* red-300 */

  /* Buttons */
  --ec-button-bg: 220 38 38;        /* red-600 */
  --ec-button-bg-hover: 239 68 68;  /* red-500 */
  --ec-button-text: 255 255 255;

  /* Sidebar */
  --ec-sidebar-active-bg: 220 38 38;
  --ec-sidebar-active-text: 255 255 255;
}
```

### Step 2: Set the theme in config

Reference your custom theme name in `eventcatalog.config.js`:

```js title="eventcatalog.config.js"
export default {
  // ... other config
  theme: 'ruby',  // Matches data-catalog-theme="ruby" in your CSS
};
```

### Step 3: Test both modes

Start your catalog and test both light and dark modes to ensure all colors look correct:

```bash
npm run dev
```

Toggle between light and dark mode using the theme switcher in the header.

:::tip Tailwind Color Reference
Use [Tailwind CSS colors](https://tailwindcss.com/docs/customizing-colors) as a reference for your RGB values. For example, `red-600` is `220 38 38`.
:::

:::caution RGB Format Required
CSS variables must use space-separated RGB values (e.g., `220 38 38`) **without** the `rgb()` wrapper. This allows EventCatalog to apply opacity modifiers like `rgb(var(--ec-accent) / 0.5)`.
:::

---

## Full CSS variable reference

Here are all available CSS variables you can customize:

### Core colors

| Variable | Description |
|----------|-------------|
| `--ec-accent` | Primary accent color for highlights and interactive elements |
| `--ec-accent-hover` | Accent color on hover |
| `--ec-accent-subtle` | Light accent background (badges, highlights) |
| `--ec-accent-text` | Text color on accent backgrounds |
| `--ec-accent-gradient-from` | Gradient start color |
| `--ec-accent-gradient-to` | Gradient end color |

### Header

| Variable | Description |
|----------|-------------|
| `--ec-header-bg` | Header background |
| `--ec-header-text` | Header text color |
| `--ec-header-border` | Header border color |

### Sidebar

| Variable | Description |
|----------|-------------|
| `--ec-sidebar-bg` | Sidebar background |
| `--ec-sidebar-bg-gradient` | Sidebar gradient end color |
| `--ec-sidebar-border` | Sidebar border |
| `--ec-sidebar-text` | Sidebar text color |
| `--ec-sidebar-active-bg` | Active item background |
| `--ec-sidebar-active-text` | Active item text |
| `--ec-sidebar-hover-bg` | Hover item background |

### Rail

| Variable | Description |
|----------|-------------|
| `--ec-rail-bg` | Inset panel/navigation rail background, sits slightly off the page background |
| `--ec-rail-active-bg` | Active item background within a rail |

### Content area

| Variable | Description |
|----------|-------------|
| `--ec-content-bg` | Nested sidebar content background |
| `--ec-content-text` | Content text |
| `--ec-content-text-muted` | Muted text |
| `--ec-content-text-secondary` | Secondary text |
| `--ec-content-border` | Content borders |
| `--ec-content-hover` | Hover background |
| `--ec-content-active` | Active item background |

### Page

| Variable | Description |
|----------|-------------|
| `--ec-page-bg` | Main page background |
| `--ec-page-text` | Page text color |
| `--ec-page-text-muted` | Muted/secondary text |
| `--ec-page-border` | Page borders |

### Buttons

| Variable | Description |
|----------|-------------|
| `--ec-button-bg` | Button background |
| `--ec-button-bg-hover` | Button hover background |
| `--ec-button-text` | Button text color |

### Form inputs

| Variable | Description |
|----------|-------------|
| `--ec-input-bg` | Input field background |
| `--ec-input-border` | Input field border |
| `--ec-input-text` | Input field text |
| `--ec-input-placeholder` | Placeholder text color |

### Dropdowns

| Variable | Description |
|----------|-------------|
| `--ec-dropdown-bg` | Dropdown background |
| `--ec-dropdown-text` | Dropdown text |
| `--ec-dropdown-hover` | Dropdown hover background |
| `--ec-dropdown-border` | Dropdown border |

### Icons

| Variable | Description |
|----------|-------------|
| `--ec-icon-color` | Default icon color |
| `--ec-icon-hover` | Icon hover color |

### Other

| Variable | Description |
|----------|-------------|
| `--ec-card-bg` | Card/elevated surface background |
| `--ec-code-bg` | Code block background |
| `--ec-group-icon-bg` | Group header icon background |
| `--ec-group-icon-text` | Group header icon text |

---

## Dark mode prose overrides

For custom themes, you may want to customize how markdown content (prose) appears in dark mode:

```css title="eventcatalog.styles.css"
:root[data-catalog-theme="ruby"][data-theme="dark"] .prose {
  --tw-prose-body: rgb(163 163 163);
  --tw-prose-headings: rgb(245 245 245);
  --tw-prose-links: rgb(248 113 113);  /* Match your accent */
  --tw-prose-bold: rgb(245 245 245);
  --tw-prose-code: rgb(245 245 245);
  --tw-prose-pre-bg: rgb(23 23 23);
}

:root[data-catalog-theme="ruby"][data-theme="dark"] .prose a {
  color: rgb(248 113 113);
}

:root[data-catalog-theme="ruby"][data-theme="dark"] .prose a:hover {
  color: rgb(252 165 165);
}
```

---

## Example: Complete custom theme

Here's a complete example of a custom "ruby" red theme you can use as a starting point:

<details>
<summary>View full ruby theme CSS</summary>

```css title="eventcatalog.styles.css"
/**
 * Ruby Theme - Custom Red Theme
 */

/* Ruby Light Mode */
:root[data-catalog-theme="ruby"],
:root[data-catalog-theme="ruby"][data-theme="light"] {
  --ec-header-bg: 255 255 255;
  --ec-header-text: 23 23 23;
  --ec-header-border: 229 229 229;

  --ec-primary: 220 38 38;
  --ec-primary-hover: 185 28 28;

  --ec-accent: 220 38 38;
  --ec-accent-hover: 185 28 28;
  --ec-accent-subtle: 254 226 226;
  --ec-accent-text: 153 27 27;
  --ec-accent-gradient-from: 239 68 68;
  --ec-accent-gradient-to: 185 28 28;

  --ec-button-bg: 185 28 28;
  --ec-button-bg-hover: 153 27 27;
  --ec-button-text: 255 255 255;

  --ec-dropdown-bg: 255 255 255;
  --ec-dropdown-text: 64 64 64;
  --ec-dropdown-hover: 254 242 242;
  --ec-dropdown-border: 229 229 229;

  --ec-icon-color: 82 82 82;
  --ec-icon-hover: 185 28 28;

  --ec-sidebar-bg: 255 255 255;
  --ec-sidebar-bg-gradient: 254 242 242;
  --ec-sidebar-border: 229 229 229;
  --ec-sidebar-text: 82 82 82;
  --ec-sidebar-active-bg: 185 28 28;
  --ec-sidebar-active-text: 255 255 255;
  --ec-sidebar-hover-bg: 185 28 28;

  --ec-content-bg: 255 255 255;
  --ec-content-text: 23 23 23;
  --ec-content-text-muted: 82 82 82;
  --ec-content-text-secondary: 115 115 115;
  --ec-content-border: 229 229 229;
  --ec-content-hover: 250 250 250;
  --ec-content-active: 254 226 226;

  --ec-input-bg: 255 255 255;
  --ec-input-border: 212 212 212;
  --ec-input-text: 23 23 23;
  --ec-input-placeholder: 163 163 163;

  --ec-group-icon-bg: 254 226 226;
  --ec-group-icon-text: 153 27 27;

  --ec-page-bg: 255 255 255;
  --ec-page-text: 23 23 23;
  --ec-page-text-muted: 82 82 82;
  --ec-page-border: 229 229 229;

  --ec-card-bg: 255 255 255;
  --ec-code-bg: 250 250 250;
}

/* Ruby Dark Mode */
:root[data-catalog-theme="ruby"][data-theme="dark"] {
  --ec-header-bg: 23 23 23;
  --ec-header-text: 245 245 245;
  --ec-header-border: 38 38 38;

  --ec-accent: 248 113 113;
  --ec-accent-hover: 239 68 68;
  --ec-accent-subtle: 127 29 29 / 0.3;
  --ec-accent-text: 252 165 165;
  --ec-accent-gradient-from: 248 113 113;
  --ec-accent-gradient-to: 239 68 68;

  --ec-button-bg: 220 38 38;
  --ec-button-bg-hover: 239 68 68;
  --ec-button-text: 255 255 255;

  --ec-dropdown-bg: 23 23 23;
  --ec-dropdown-text: 212 212 212;
  --ec-dropdown-hover: 38 38 38;
  --ec-dropdown-border: 64 64 64;

  --ec-icon-color: 163 163 163;
  --ec-icon-hover: 252 165 165;

  --ec-sidebar-bg: 10 10 10;
  --ec-sidebar-bg-gradient: 10 10 10;
  --ec-sidebar-border: 38 38 38;
  --ec-sidebar-text: 163 163 163;
  --ec-sidebar-active-bg: 220 38 38;
  --ec-sidebar-active-text: 255 255 255;
  --ec-sidebar-hover-bg: 38 38 38;

  --ec-content-bg: 10 10 10;
  --ec-content-text: 245 245 245;
  --ec-content-text-muted: 163 163 163;
  --ec-content-text-secondary: 163 163 163;
  --ec-content-border: 38 38 38;
  --ec-content-hover: 23 23 23;
  --ec-content-active: 38 38 38;

  --ec-input-bg: 23 23 23;
  --ec-input-border: 64 64 64;
  --ec-input-text: 245 245 245;
  --ec-input-placeholder: 115 115 115;

  --ec-group-icon-bg: 38 38 38;
  --ec-group-icon-text: 252 165 165;

  --ec-page-bg: 10 10 10;
  --ec-page-text: 245 245 245;
  --ec-page-text-muted: 163 163 163;
  --ec-page-border: 38 38 38;

  --ec-card-bg: 10 10 10;
  --ec-code-bg: 23 23 23;
}

/* Ruby theme prose overrides */
:root[data-catalog-theme="ruby"][data-theme="dark"] .prose {
  --tw-prose-body: rgb(163 163 163);
  --tw-prose-headings: rgb(245 245 245);
  --tw-prose-links: rgb(248 113 113);
  --tw-prose-bold: rgb(245 245 245);
}

:root[data-catalog-theme="ruby"][data-theme="dark"] .prose a {
  color: rgb(248 113 113);
}

:root[data-catalog-theme="ruby"][data-theme="dark"] .prose a:hover {
  color: rgb(252 165 165);
}
```

</details>
