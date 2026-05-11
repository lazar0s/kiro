import { useState } from 'preact/hooks';
import {
  CleaningType,
  CLEANING_TYPE_LABELS,
  Fulfillment,
  ProcessingSpeed,
  type CreateOrderInput,
} from '@laundry/shared';

interface Props {
  apiUrl: string;
  /** Optional default processing location id (UUID). Admin can wire this per-embed. */
  locationId?: string;
}

interface CreateOrderResponse {
  id: string;
  trackingCode: string;
  status: string;
  expressSurcharge: number;
  trackingUrl: string;
}

/**
 * Widget order form.
 *
 * Phase 3 wires up real submission to POST /api/orders. The form still uses a
 * plain text input for the delivery address — Phase 9 swaps that for the
 * Google Maps Places Autocomplete / map picker.
 *
 * Success screen shows the tracking code + a link to the tracking page so
 * the customer can follow along without waiting for WhatsApp.
 */
export function OrderForm({ apiUrl, locationId }: Props): preact.ComponentChild {
  const [speed, setSpeed] = useState<ProcessingSpeed>(ProcessingSpeed.Standard);
  const [fulfillment, setFulfillment] = useState<Fulfillment>(Fulfillment.Pickup);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<CreateOrderResponse | null>(null);

  if (success) {
    return (
      <div class="lw-card lw-success">
        <h2 class="lw-heading">Thanks — we got your order</h2>
        <p>Your tracking code:</p>
        <div class="lw-tracking-code">{success.trackingCode}</div>
        <p>
          <a class="lw-link" href={success.trackingUrl} target="_top">
            View status page →
          </a>
        </p>
        {success.expressSurcharge > 0 && (
          <p class="lw-footnote">
            Express processing surcharge: {success.expressSurcharge.toFixed(2)}
          </p>
        )}
        <button
          class="lw-link"
          onClick={() => {
            setSuccess(null);
            setError(null);
          }}
        >
          Place another order
        </button>
      </div>
    );
  }

  return (
    <form
      class="lw-card"
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting) return;

        const form = new FormData(e.currentTarget as HTMLFormElement);
        const customerName = String(form.get('customerName') ?? '').trim();
        const customerPhone = String(form.get('customerPhone') ?? '').trim();
        const cleaningType = form.get('cleaningType') as CleaningType;
        const notes = String(form.get('notes') ?? '').trim() || undefined;

        if (!locationId) {
          setError(
            'Widget is not configured with a processing location. Ask the site owner to set location-id on <laundry-widget>.',
          );
          return;
        }

        const body: CreateOrderInput = {
          customerName,
          customerPhone,
          cleaningType,
          processingSpeed: speed,
          fulfillment,
          locationId,
          ...(notes ? { notes } : {}),
        };

        if (fulfillment === Fulfillment.Pickup) {
          // For the widget, pickup = same as processing location.
          // Staff can change the pickup location later from the dashboard.
          body.pickupLocationId = locationId;
        } else {
          const deliveryAddress = String(form.get('deliveryAddress') ?? '').trim();
          if (!deliveryAddress) {
            setError('Please enter a delivery address');
            return;
          }
          body.deliveryAddress = deliveryAddress;
          // Placeholder coords — the Google Maps picker in Phase 9 replaces these.
          body.deliveryLat = 0;
          body.deliveryLng = 0;
        }

        setSubmitting(true);
        setError(null);
        try {
          const res = await fetch(`${apiUrl}/api/orders`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!res.ok) {
            const text = await res.text();
            setError(`Could not submit (${res.status}): ${text.slice(0, 200)}`);
            return;
          }
          const data = (await res.json()) as CreateOrderResponse;
          setSuccess(data);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setSubmitting(false);
        }
      }}
    >
      <h2 class="lw-heading">Book a laundry pickup</h2>

      <label class="lw-field">
        <span>Your name</span>
        <input name="customerName" type="text" required placeholder="Jane Doe" />
      </label>

      <label class="lw-field">
        <span>Phone (for WhatsApp updates)</span>
        <input name="customerPhone" type="tel" required placeholder="+30 ..." />
      </label>

      <label class="lw-field">
        <span>Cleaning type</span>
        <select name="cleaningType" required>
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
          <input
            type="radio"
            name="speed"
            value={ProcessingSpeed.Standard}
            checked={speed === ProcessingSpeed.Standard}
            onChange={() => setSpeed(ProcessingSpeed.Standard)}
          />
          <span>Standard</span>
        </label>
        <label class="lw-radio">
          <input
            type="radio"
            name="speed"
            value={ProcessingSpeed.Express}
            checked={speed === ProcessingSpeed.Express}
            onChange={() => setSpeed(ProcessingSpeed.Express)}
          />
          <span>Express (surcharge applies)</span>
        </label>
      </fieldset>

      <fieldset class="lw-fieldset">
        <legend>How would you like it returned?</legend>
        <label class="lw-radio">
          <input
            type="radio"
            name="fulfillment"
            value={Fulfillment.Pickup}
            checked={fulfillment === Fulfillment.Pickup}
            onChange={() => setFulfillment(Fulfillment.Pickup)}
          />
          <span>Pick up from the store</span>
        </label>
        <label class="lw-radio">
          <input
            type="radio"
            name="fulfillment"
            value={Fulfillment.Delivery}
            checked={fulfillment === Fulfillment.Delivery}
            onChange={() => setFulfillment(Fulfillment.Delivery)}
          />
          <span>Deliver to my address</span>
        </label>
      </fieldset>

      {fulfillment === Fulfillment.Delivery && (
        <label class="lw-field">
          <span>Delivery address (Google Maps picker in Phase 9)</span>
          <input
            name="deliveryAddress"
            type="text"
            required
            placeholder="Street, number, city"
          />
        </label>
      )}

      <label class="lw-field">
        <span>Notes (optional)</span>
        <input name="notes" type="text" placeholder="Anything we should know" />
      </label>

      {error && <div class="lw-error">{error}</div>}

      <button type="submit" class="lw-submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Place order'}
      </button>
    </form>
  );
}
