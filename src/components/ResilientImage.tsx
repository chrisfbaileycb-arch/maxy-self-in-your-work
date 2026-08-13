import { useState, type ImgHTMLAttributes } from "react";
import { DEFAULT_SVG_FALLBACK, resolveAssetPath } from "@/lib/assets";

export interface ResilientImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

export function ResilientImage({
  src,
  alt = "",
  fallbackSrc = DEFAULT_SVG_FALLBACK,
  className = "",
  onError,
  ...props
}: ResilientImageProps) {
  const [imgSrc, setImgSrc] = useState<string>(() => resolveAssetPath(src, fallbackSrc));
  const [hasError, setHasError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (!hasError) {
      setHasError(true);
      setImgSrc(fallbackSrc);
    }
    if (onError) {
      onError(e);
    }
  };

  return <img src={imgSrc} alt={alt} className={className} onError={handleError} {...props} />;
}
