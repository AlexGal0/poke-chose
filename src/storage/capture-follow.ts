export function loadCaptureFollow(key: string): boolean {
  try { return localStorage.getItem(key) === 'true' } catch { return false }
}
