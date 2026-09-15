import { useEffect, useRef, useState } from 'react';
import {
  MATTERPORT_SDK_KEY,
  MATTERPORT_SDK_SRC,
  SKU_PATTERN,
} from '../constants';

/** Loads the Showcase SDK script once per page and resolves window.MP_SDK. */
const loadSdkScript = (src) => {
  if (window.MP_SDK) return Promise.resolve(window.MP_SDK);

  const existing = document.querySelector(`script[data-showroom-sdk="${src}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(window.MP_SDK));
      existing.addEventListener('error', () =>
        reject(new Error('Không tải được Matterport SDK')),
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.showroomSdk = src;
    script.onload = () => resolve(window.MP_SDK);
    script.onerror = () => reject(new Error('Không tải được Matterport SDK'));
    document.body.appendChild(script);
  });
};

/**
 * Picks the tag namespace for whichever SDK version is actually serving.
 *
 * Matterport renamed `Mattertag` to `Tag` around SDK 3.1.70 and kept the older
 * namespace around for a while. Rather than pin to one spelling, resolve it at
 * runtime - the exact SDK version behind an SDK Key is not knowable from here.
 */
const resolveTagNamespace = (sdk) => {
  if (sdk?.Tag?.Event) return { ns: sdk.Tag, name: 'Tag' };
  if (sdk?.Mattertag?.Event) return { ns: sdk.Mattertag, name: 'Mattertag' };
  return { ns: null, name: null };
};

export const extractSku = (tag) => {
  if (!tag) return null;
  const haystack = [tag.label, tag.description, tag.name]
    .filter((v) => typeof v === 'string')
    .join('\n');
  const match = haystack.match(SKU_PATTERN);
  return match ? match[1] : null;
};

/**
 * Connects to the Matterport showcase in `iframeRef` and reports the SKU of any
 * tag the visitor clicks.
 *
 * Two independent click paths are wired up because which one fires depends on
 * the SDK version and on whether the tag is in a docked/selected state:
 *   1. the CLICK event via sdk.on(...)
 *   2. the `openTags` observable's `selected` set
 * Both funnel through one handler, and repeat notifications for the same tag
 * are ignored, so a version firing both does not double-open the sidebar.
 */
export const useMatterportSdk = ({ iframeRef, enabled = true, onTagSku }) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const onTagSkuRef = useRef(onTagSku);
  const tagCacheRef = useRef(new Map());

  // Keep the callback fresh without re-running the connect effect.
  useEffect(() => {
    onTagSkuRef.current = onTagSku;
  }, [onTagSku]);

  useEffect(() => {
    if (!enabled) return undefined;

    const iframe = iframeRef.current;
    if (!iframe) return undefined;

    let cancelled = false;
    let sdk = null;
    const disposers = [];
    let lastTagId = null;

    const emit = (tagId) => {
      if (tagId == null || tagId === lastTagId) return;
      lastTagId = tagId;
      // Allow the same tag to re-open later once the sidebar has been closed.
      setTimeout(() => {
        if (lastTagId === tagId) lastTagId = null;
      }, 400);

      const tag = tagCacheRef.current.get(tagId);
      const sku = extractSku(tag);
      onTagSkuRef.current?.({ tagId, sku, tag: tag ?? null });
    };

    const indexTag = (id, tag) => tagCacheRef.current.set(id, tag);

    const subscribeToTagData = (ns) => {
      // SDK >= 3.1.70 exposes an observable collection.
      if (ns.data?.subscribe) {
        const sub = ns.data.subscribe({
          onAdded: (id, tag) => indexTag(id, tag),
          onUpdated: (id, tag) => indexTag(id, tag),
          onRemoved: (id) => tagCacheRef.current.delete(id),
        });
        if (sub?.cancel) disposers.push(() => sub.cancel());
        return;
      }

      // Older SDKs: one-shot fetch of the tag list.
      if (typeof ns.getData === 'function') {
        ns.getData()
          .then((tags) => {
            if (cancelled) return;
            (tags ?? []).forEach((tag) => indexTag(tag.sid ?? tag.id, tag));
          })
          .catch(() => {
            /* tag labels stay unresolved; click still reports its id */
          });
      }
    };

    const subscribeToClicks = (ns) => {
      if (ns.Event?.CLICK && typeof sdk.on === 'function') {
        const handler = (tagId) => emit(tagId);
        sdk.on(ns.Event.CLICK, handler);
        disposers.push(() => sdk.off?.(ns.Event.CLICK, handler));
      }

      if (ns.openTags?.subscribe) {
        const sub = ns.openTags.subscribe({
          onChanged: (openTags) => {
            const selected = openTags?.selected;
            const first = selected?.values?.().next?.().value;
            if (first != null) emit(first);
          },
        });
        if (sub?.cancel) disposers.push(() => sub.cancel());
      }
    };

    const connect = async () => {
      try {
        setStatus('loading');
        const MP_SDK = await loadSdkScript(MATTERPORT_SDK_SRC);
        if (cancelled) return;
        if (!MP_SDK?.connect) throw new Error('Matterport SDK không khả dụng');

        setStatus('connecting');
        sdk = await MP_SDK.connect(iframe, MATTERPORT_SDK_KEY, '');
        if (cancelled) return;

        const { ns, name } = resolveTagNamespace(sdk);
        if (!ns) {
          throw new Error(
            'SDK đã kết nối nhưng không thấy namespace Tag/Mattertag. ' +
              'Kiểm tra gói Matterport có bật Developer Tools/SDK Key chưa.',
          );
        }

        subscribeToTagData(ns);
        subscribeToClicks(ns);
        setStatus('ready');
        if (import.meta.env?.DEV) {
          // eslint-disable-next-line no-console
          console.info(`[showroom-3d] connected, tag namespace: ${name}`);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setStatus('error');
      }
    };

    connect();

    return () => {
      cancelled = true;
      disposers.forEach((dispose) => {
        try {
          dispose();
        } catch {
          /* SDK already torn down with the iframe */
        }
      });
      tagCacheRef.current.clear();
    };
  }, [enabled, iframeRef]);

  return { status, error };
};

export default useMatterportSdk;
