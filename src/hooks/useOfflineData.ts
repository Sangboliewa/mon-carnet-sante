"use client";
import { useEffect, useState } from "react";
import { saveToCache, loadFromCache, isOnline } from "@/lib/offline/cache";

/**
 * Synchronise automatiquement `data` dans le cache localStorage.
 * Quand offline, retourne les données en cache si disponibles.
 */
export function useOfflineData<T>(
  cacheKey: string,
  data: T,
  loading = false
): { displayData: T; fromCache: boolean } {
  const [displayData, setDisplayData] = useState<T>(data);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!loading && data !== undefined && data !== null) {
      // En ligne et données fraîches → sauvegarder
      if (isOnline()) {
        saveToCache(cacheKey, data);
        setDisplayData(data);
        setFromCache(false);
      }
    }
  }, [data, loading, cacheKey]);

  useEffect(() => {
    if (!isOnline()) {
      const cached = loadFromCache<T>(cacheKey);
      if (cached !== null) {
        setDisplayData(cached);
        setFromCache(true);
      }
    }
  }, [cacheKey]);

  return { displayData, fromCache };
}
