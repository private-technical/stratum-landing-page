"use client";

/* ------------------------------------------------------------------ */
/*  Image loading: fast delivery + an intentional reveal               */
/*  - cld() (shared/cloudinary.ts) asks Cloudinary for a right-sized,  */
/*    auto-format/quality asset instead of shipping the full-res PNG   */
/*    to everyone.                                                     */
/*  - RevealImage fades/lifts each image in once it's actually         */
/*    decoded, so loading reads as a deliberate motion instead of a    */
/*    pop-in. Above-the-fold images are marked priority so they start  */
/*    fetching immediately at high priority; everything else loads     */
/*    lazily as it nears view.                                         */
/* ------------------------------------------------------------------ */
import { useEffect, useRef, useState } from "react";
import { cld } from "./cloudinary";

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
  const [errored, setErrored] = useState(false);

  // If the browser already has this image cached, the load event may
  // fire before we attach the listener — check on mount so it doesn't
  // get stuck invisible.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  // A failed request (bad URL, network hiccup, Cloudinary hiccup) should
  // never leave this card permanently invisible — reveal it and swap to
  // a plain broken-alt render instead of hanging at opacity: 0 forever.
  if (errored) {
    return (
      <span
        role="img"
        aria-label={alt}
        className={className}
        style={{ ...style, width, height, display: "inline-block" }}
      />
    );
  }

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
      onError={() => setErrored(true)}
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