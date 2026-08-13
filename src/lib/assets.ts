// Decoupled asset path resolution & fallback assets.
import logoSquare from "@/assets/selfmaxizer-icon-square.svg";
import logoLockup from "@/assets/selfmaxizer-lockup.svg";
import memoryBucketLogo from "@/assets/memorybucket-logo.png";

export const DEFAULT_SVG_FALLBACK =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%230284c7' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect width='18' height='18' x='3' y='3' rx='2'/><path d='m9 12 2 2 4-4'/></svg>";

export const APP_ASSETS = {
  logoSquare,
  logoLockup,
  memoryBucketLogo,
  fallbackIcon: DEFAULT_SVG_FALLBACK,
} as const;

/**
 * Resolves a media asset URL safely, returning a root-relative path or fallback data URL.
 */
export function resolveAssetPath(
  path: string | undefined | null,
  fallback = DEFAULT_SVG_FALLBACK,
): string {
  if (!path || typeof path !== "string") {
    return fallback;
  }
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
    return path;
  }
  if (path.startsWith("/")) {
    return path;
  }
  return `/${path}`;
}
