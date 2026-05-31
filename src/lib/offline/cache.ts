const PREFIX = "mcs_cache_";
const META_KEY = `${PREFIX}meta`;

interface CacheMeta {
  [key: string]: { savedAt: number };
}

export function saveToCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
    const meta: CacheMeta = JSON.parse(localStorage.getItem(META_KEY) ?? "{}");
    meta[key] = { savedAt: Date.now() };
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {}
}

export function loadFromCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function getCacheAge(key: string): number | null {
  try {
    const meta: CacheMeta = JSON.parse(localStorage.getItem(META_KEY) ?? "{}");
    if (!meta[key]) return null;
    return Math.round((Date.now() - meta[key].savedAt) / 60000); // minutes
  } catch {
    return null;
  }
}

export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}
