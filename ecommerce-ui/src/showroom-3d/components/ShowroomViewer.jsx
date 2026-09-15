import { forwardRef } from 'react';
import {
  MATTERPORT_BUNDLE_PATH,
  MATTERPORT_MODEL_SID,
  MATTERPORT_SDK_KEY,
  cx,
} from '../constants';

/**
 * Builds the showcase URL.
 *
 * `applicationKey` is what authorises the SDK connection. `qs=1` keeps the
 * quickstart view, `play=1` autostarts, and `hl=vi` matches the site language.
 */
const buildShowcaseUrl = () => {
  const params = new URLSearchParams({
    m: MATTERPORT_MODEL_SID,
    play: '1',
    qs: '1',
    hl: 'vi',
  });

  if (MATTERPORT_SDK_KEY) params.set('applicationKey', MATTERPORT_SDK_KEY);

  const base = MATTERPORT_BUNDLE_PATH
    ? `${MATTERPORT_BUNDLE_PATH.replace(/\/$/, '')}/showcase.html`
    : 'https://my.matterport.com/show';

  return `${base}?${params.toString()}`;
};

const StatusBadge = ({ status, error }) => {
  if (status === 'ready') return null;

  const label =
    status === 'error'
      ? (error?.message ?? 'Không kết nối được không gian 3D')
      : 'Đang tải không gian 3D…';

  return (
    <div
      className={cx(
        'pointer-events-none absolute left-4 top-4 z-10 max-w-sm rounded-lg px-3 py-2 text-sm shadow-lg',
        status === 'error'
          ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
          : 'bg-white/90 text-gray-700 ring-1 ring-gray-200',
      )}
      role={status === 'error' ? 'alert' : 'status'}
    >
      {label}
    </div>
  );
};

/**
 * The 3D space. Fills its container and stays full-size when the sidebar opens -
 * the sidebar overlays it rather than resizing it, so the visitor never loses
 * their place in the room.
 */
const ShowroomViewer = forwardRef(function ShowroomViewer(
  { status, error },
  ref,
) {
  if (!MATTERPORT_MODEL_SID) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-900 p-6">
        <div className="max-w-md rounded-xl bg-white p-6 text-center shadow-xl">
          <h2 className="text-lg font-semibold text-gray-900">
            Chưa cấu hình không gian 3D
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Thiếu biến môi trường{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
              VITE_MATTERPORT_MODEL_SID
            </code>
            . Xem INTEGRATION.md để biết danh sách biến cần thêm vào{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">.env</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-gray-900">
      <StatusBadge status={status} error={error} />
      <iframe
        ref={ref}
        title="Showroom 3D"
        src={buildShowcaseUrl()}
        className="h-full w-full border-0"
        allow="xr-spatial-tracking; fullscreen; vr"
        allowFullScreen
      />
    </div>
  );
});

export default ShowroomViewer;
