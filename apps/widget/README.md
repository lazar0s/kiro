# @laundry/widget

Embeddable order-submission widget for the store's public website.

Phase 1: scaffold + placeholder form.
Phase 9 (see `.kiro/specs/laundry-app/tasks.md`) fills in:
- Real POST to `/api/orders`
- Google Maps Places Autocomplete + map picker for delivery address
- Pickup location select populated from the API
- Success screen with actual tracking code

## Dev

```bash
pnpm --filter @laundry/widget dev
```

Open [http://localhost:5174/demo.html](http://localhost:5174/demo.html).

## Build

```bash
pnpm --filter @laundry/widget build
```

Output: `dist/laundry-widget.js` — a single IIFE bundle with styles inlined into the shadow DOM.

## Embed on any site

```html
<script src="https://app.yourstore.com/widget/laundry-widget.js"></script>

<laundry-widget
  api-url="https://app.yourstore.com"
  theme-color="#2563eb">
</laundry-widget>
```

## Attributes

| Attribute | Default | Notes |
|---|---|---|
| `api-url` | same origin | Base URL of the backend API |
| `theme-color` | `#2563eb` | Accent color for buttons/focus rings |
