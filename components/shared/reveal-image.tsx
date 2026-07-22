"use client";

/* ------------------------------------------------------------------ */
/*  Image loading: fast delivery + an intentional reveal               */
/*  - cld() asks Cloudinary for a right-sized, auto-format/quality     */
/*    asset instead of shipping the full-resolution PNG to everyone.   */
/*  - RevealImage fades/lifts each image in once it's actually         */
/*    decoded, so loading reads as a deliberate motion instead of a    */
/*    pop-in. Above-the-fold images are marked priority so they start  */
/*    fetching immediately at high priority; everything else loads     */
/*    lazily as it nears view.                                         */
/* ------------------------------------------------------------------ */
import { useEffect, useRef, useState } from "react";

export function cld(url: string, width: number) {
  const w = Math.max(1, Math.round(width));
  // f_auto: serve AVIF/WebP where supported. q_auto: Cloudinary's
  // perceptual quality tuning. dpr_auto + w_: fetch exactly the pixels
  // the layout needs for the viewer's screen, nothing more.
  return url.replace(
    "/upload/",
    `/upload/f_auto,q_auto,dpr_auto,w_${w},c_limit/`
  );
}

export type RevealImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
  delay?: number;
  "aria-hidden"?: boolean;
};

export function RevealImage({
  src,
  alt,
  width,
  height,
  className,
  style,
  priority = false,
  delay = 0,
  ...rest
}: RevealImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // If the browser already has this image cached, the load event may
  // fire before we attach the listener — check on mount so it doesn't
  // get stuck invisible.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <img
      ref={imgRef}
      src={cld(src, width)}
      alt={alt}
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      onLoad={() => setLoaded(true)}
      className={className}
      style={{
        ...style,
        width,
        height,
        opacity: loaded ? 1 : 0,
        transform: loaded ? "translateY(0)" : "translateY(10px)",
        transition:
          "opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)",
        transitionDelay: `${delay}ms`,
      }}
      {...rest}
    />
  );
}