/**
 * What to tell someone when an upload did not go through.
 *
 * Two failure modes reach the browser with nothing usable in them:
 *
 *   - fetch() reports essentially every network-level failure as a bare
 *     TypeError("Failed to fetch") -- English, and it names neither the cause
 *     nor anything the person can do about it.
 *   - nginx answers an upload it gave up on with an HTML error page, so the
 *     JSON parse fails and the status code is all there is. A 408 means the
 *     body never finished arriving, which for a photo upload is almost always
 *     the connection rather than the file.
 *
 * Anything else already carries a sentence from the API (the backend's
 * `detail`, in Indonesian) and is passed through untouched.
 */

/** Statuses a proxy can return that the API's own messages never cover. */
export function uploadStatusMessage(status: number): string | null {
  if (status === 408) {
    return "Server berhenti menunggu unggahan selesai. Jaringan kemungkinan terputus saat mengunggah foto -- coba lagi, atau kirim dengan foto yang lebih sedikit.";
  }
  if (status === 413) {
    return "Unggahan melebihi batas server. Kurangi jumlah atau ukuran fotonya.";
  }
  if (status === 502 || status === 503 || status === 504) {
    return "Server sedang tidak bisa dihubungi. Coba lagi sebentar lagi.";
  }
  return null;
}

export function uploadErrorMessage(err: unknown, subject = "laporan"): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return `Unggahan ${subject} terlalu lama lalu dihentikan. Coba lagi dengan jaringan yang lebih stabil, atau kirim dulu tanpa foto.`;
  }
  if (err instanceof TypeError) {
    return `Koneksi ke server gagal saat mengirim ${subject}. Periksa jaringan lalu coba lagi -- bila fotonya besar, coba satu foto lebih dulu.`;
  }
  if (err instanceof Error && err.message) return err.message;
  return `Gagal mengirim ${subject}. Coba lagi.`;
}
