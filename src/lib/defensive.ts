// Defensive runtime parsing, safe storage access, and default fallback utilities.

/**
 * Safely parses a JSON string with a strongly typed fallback value if parsing fails or input is empty.
 */
export function safeParseJSON<T>(jsonString: string | null | undefined, fallback: T): T {
  if (!jsonString || typeof jsonString !== "string") {
    return fallback;
  }
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Safely reads a value from localStorage with fallback defaults and optional validation parsing.
 */
export function safeGetLocalStorage<T>(
  key: string,
  fallback: T,
  validator?: (value: unknown) => T,
): T {
  if (typeof window === "undefined" || !window.localStorage) {
    return fallback;
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = safeParseJSON<unknown>(raw, null);
    if (parsed === null) return fallback;
    if (validator) {
      try {
        return validator(parsed);
      } catch {
        return fallback;
      }
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely writes a value to localStorage without throwing runtime quota errors.
 */
export function safeSetLocalStorage(key: string, value: unknown): boolean {
  if (typeof window === "undefined" || !window.localStorage) {
    return false;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures an input value is returned as a non-null Array, or returns a fallback empty/provided array.
 */
export function safeArray<T>(data: unknown, fallback: T[] = []): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  return fallback;
}

/**
 * Ensures an input is a valid record/object with non-null structure, or returns a fallback default object.
 */
export function safeObject<T extends object>(data: unknown, fallback: T): T {
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    return { ...fallback, ...data };
  }
  return fallback;
}

/**
 * Safely returns a string value or a default fallback string.
 */
export function safeString(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return fallback;
}

/**
 * Safely returns a number value or a default fallback number.
 */
export function safeNumber(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const num = Number(val);
    if (!isNaN(num)) return num;
  }
  return fallback;
}

/**
 * Safely returns a boolean value or a default fallback boolean.
 */
export function safeBoolean(val: unknown, fallback = false): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1) return true;
  if (val === "false" || val === 0) return false;
  return fallback;
}
