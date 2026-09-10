const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Citizen report photos/videos and technician repair photos are all served
 * by FastAPI's StaticFiles mount as relative paths ("/uploads/<uuid>.jpg" --
 * see UPLOAD_DIR in backend/app/routers/citizen_report.py), the same way
 * the halte survey media already does (see MediaCarousel/fetchHalteData).
 * Rendered directly as an <img>/<video> src, a relative path resolves
 * against the frontend's own origin instead of the backend's, so the file
 * silently 404s -- this is why report/repair photos never showed up on the
 * dashboard or public map even though the upload itself succeeded. Prefix
 * with the API base the same way every fetch() call already does.
 */
export function resolveUploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (!API_BASE_URL) return null;
  return `${API_BASE_URL}${path}`;
}
