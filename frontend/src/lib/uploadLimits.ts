/**
 * Upload limits, mirrored from the backend.
 *
 * These are not a second source of truth -- the API rejects anything outside
 * them no matter what the browser thinks (see
 * backend/app/routers/citizen_report.py). They are here so a refused file is
 * reported the moment it is picked, instead of after a round trip that comes
 * back as a 400.
 *
 * One limit is deliberately NOT mirrored here: nginx's client_max_body_size
 * for /api/. The backend caps each file, but only the proxy caps the whole
 * request -- and a request over that is refused by nginx with an HTML error
 * page, not the API's JSON message, so it surfaces in the UI as a confusing
 * failure rather than "foto terlalu besar". MAX_PHOTOS x MAX_PHOTO_BYTES has
 * to stay inside that proxy limit; raising one means raising the other (see
 * the reverse-proxy config).
 */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTOS = 5;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;

/**
 * How long to wait for an upload before giving up and saying so.
 *
 * A 15 MB photo over a weak mobile uplink is legitimately slow, and nginx is
 * configured to allow a slow upload (verified: 12.9 MB at 200 KB/s, 66 seconds,
 * succeeds). So this is not a size limit in disguise -- it exists so that a
 * request which is never going to finish ends with a message instead of an
 * indefinitely spinning "Mengirim...". That spin is worse than an error: it
 * looks like the app is working, so the person waits instead of retrying, and
 * nothing is recorded on the server to explain it afterwards.
 */
export const UPLOAD_TIMEOUT_MS = 90_000;

export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

/**
 * Bytes as whole megabytes, so a message can never promise a size the check
 * does not actually enforce (an MB here is 1024^2, same as the limits above).
 */
export function mb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
