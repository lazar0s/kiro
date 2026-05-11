import { useState } from 'preact/hooks';
import {
  CleaningType,
  CLEANING_TYPE_LABELS,
  Fulfillment,
  ProcessingSpeed,
} from '@laundry/shared';

interface Props {
  apiUrl: string;
}

/**
 * Phase 1 placeholder form. Fields match CreateOrderInput shape from @laundry/shared,
 * but submission is stubbed (console.log) — Phase 9 wires up POST /api/orders,
 * Google Maps address picker, and the success screen with a real tracking code.
 */
export function OrderForm({ apiUrl }: Props): preact.ComponentChild {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div class="lw-card lw-success">
        <h2 class="lw-heading">Thanks — we got your order.</h2>
        <p>We'll send you a tracking link on WhatsApp shortly.</p>
        <button class="lw-link" onClick={() => setSubmitted(false)}>
          Place another order
        </button>
      </div>
    );
  }

  return (
    <form
      class="lw-card"
      onSubmit={(e) => {
        e.preventDefault();
        // Phase 9 replaces this with a real fetch to `${apiUrl}/api/orders`.
        // eslint-disable-next-line no-console
        console.log('OrderForm submit (stub)', { apiUrl });
        setSubmitted(true);
      }}
    >
      <h2 class="lw-heading">Book a laundry pickup</h2>

      <label class="lw-field">
        <span>Your name</span>
        <input type="text" required placeholder="Jane Doe" />
      </label>

      <label class="lw-field">
        <span>Phone (for WhatsApp updates)</span>
        <input type="tel" required placeholder="+30 ..." />
      </label>

      <label class="lw-field">
        <span>Cleaning type</span>
        <select>
          {Object.values(CleaningType).map((value) => (
            <option key={value} value={value}>
              {CLEANING_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <fieldset class="lw-fieldset">
        <legend>Processing speed</legend>
        <label class="lw-radio">
          <input type="radio" name="speed" value={ProcessingSpeed.Standard} defaultChecked />
          <span>Standard</span>
        </label>
        <label class="lw-radio">
          <input type="radio" name="speed" value={ProcessingSpeed.Express} />
          <span>Express (surcharge applies)</span>
        </label>
      </fieldset>

      <fieldset class="lw-fieldset">
        <legend>How would you like it returned?</legend>
        <label class="lw-radio">
          <input type="radio" name="fulfillment" value={Fulfillment.Pickup} defaultChecked />
          <span>Pick up from the store</span>
        </label>
        <label class="lw-radio">
          <input type="radio" name="fulfillment" value={Fulfillment.Delivery} />
          <span>Deliver to my address (map picker coming in Phase 9)</span>
        </label>
      </fieldset>

      <button type="submit" class="lw-submit">
        Place order
      </button>

      <p class="lw-footnote">
        Phase 1 placeholder — the real form with Google Maps address picker
        and pickup location select lands in Phase 9.
      </p>
    </form>
  );
}
