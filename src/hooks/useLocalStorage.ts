import { useState, useCallback } from "react";

// In-memory fallback map if localStorage is unavailable
const memoryStorage = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // Fallback to memory
  }
  return memoryStorage.get(key) ?? null;
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // Fallback to memory
  }
  memoryStorage.set(key, value);
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (val: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    const item = safeGet(key);
    if (!item) return initialValue;
    try {
      return JSON.parse(item) as T;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          safeSet(key, JSON.stringify(nextValue));
        } catch {
          // Ignore write errors
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

// 32-bit FNV-1a hash for planId
export function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
