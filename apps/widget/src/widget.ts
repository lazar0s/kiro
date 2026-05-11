import { h, render } from 'preact';
import { OrderForm } from './OrderForm';
import styles from './widget.css?raw';

/**
 * <laundry-widget> web component.
 *
 * Usage (on the store's website):
 *   <script src="https://app.store.com/widget/laundry-widget.js"></script>
 *   <laundry-widget api-url="https://app.store.com" theme-color="#2563eb"></laundry-widget>
 *
 * Attributes (all optional):
 *   - api-url:     base URL of the backend API (default: same origin)
 *   - theme-color: primary button/accent color (default: #2563eb)
 */
class LaundryWidget extends HTMLElement {
  private unmount: (() => void) | null = null;

  connectedCallback(): void {
    const shadow = this.attachShadow({ mode: 'open' });

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    shadow.appendChild(styleEl);

    const mount = document.createElement('div');
    mount.className = 'lw-root';
    shadow.appendChild(mount);

    const apiUrl = this.getAttribute('api-url') ?? '';
    const themeColor = this.getAttribute('theme-color') ?? '#2563eb';
    const locationId = this.getAttribute('location-id') ?? undefined;

    // Expose the theme color via a CSS custom property on the mount element.
    mount.style.setProperty('--lw-accent', themeColor);

    render(h(OrderForm, { apiUrl, locationId }), mount);
    this.unmount = () => render(null, mount);
  }

  disconnectedCallback(): void {
    this.unmount?.();
    this.unmount = null;
  }
}

if (!customElements.get('laundry-widget')) {
  customElements.define('laundry-widget', LaundryWidget);
}
