/**
 * Showroom 3D configuration.
 *
 * This app is built with Vite, not Next.js, so client env vars must be prefixed
 * VITE_ - `NEXT_PUBLIC_*` names are not exposed to the browser by Vite and
 * would read as undefined. See INTEGRATION.md for the mapping.
 */
const env = import.meta.env ?? {};

export const MATTERPORT_MODEL_SID = env.VITE_MATTERPORT_MODEL_SID ?? '';
export const MATTERPORT_SDK_KEY = env.VITE_MATTERPORT_SDK_KEY ?? '';

/** Backend origin. The rest of the app hardcodes http://localhost:3000. */
export const SHOWROOM_API_BASE =
  env.VITE_SHOWROOM_API_BASE ?? 'http://localhost:3000';

/**
 * Where the Showcase SDK comes from.
 *
 * Default is Matterport's hosted embed SDK, which needs no self-hosting. If MTM
 * self-hosts the SDK Bundle instead, point VITE_MATTERPORT_BUNDLE_PATH at the
 * unzipped bundle (e.g. "/matterport-bundle") and the viewer will iframe
 * `<path>/showcase.html` instead of my.matterport.com.
 */
export const MATTERPORT_SDK_SRC =
  env.VITE_MATTERPORT_SDK_SRC ??
  'https://static.matterport.com/showcase-sdk/latest.js';

export const MATTERPORT_BUNDLE_PATH = env.VITE_MATTERPORT_BUNDLE_PATH ?? '';

/** Matches `SKU:<code>` anywhere in a tag's label or description. */
export const SKU_PATTERN = /SKU\s*[:=]\s*([A-Za-z0-9._/-]+)/i;

export const ORDER_POLL_INTERVAL_MS = 3000;
export const ORDER_POLL_TIMEOUT_MS = 10 * 60 * 1000;

export const PAYMENT_METHODS = [
  { value: 'vnpay', label: 'VNPay' },
  { value: 'momo', label: 'Momo' },
  { value: 'zalopay', label: 'ZaloPay' },
];

export const formatVnd = (value) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

/**
 * Local class-name joiner. The app has a `cn()` helper in src/utils, but this
 * folder must not import from the rest of the app, so it is duplicated here.
 */
export const cx = (...parts) => parts.filter(Boolean).join(' ');
