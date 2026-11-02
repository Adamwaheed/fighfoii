import Image from "next/image";

/**
 * Article thumbnail. Falls back to the template's bordered paper block —
 * the design treats a missing photo as a deliberate empty frame, not an error.
 */
export function Thumb({
  src,
  alt,
  className = "",
  sizes = "(max-width: 768px) 100vw, 400px",
  priority = false,
  bordered = true,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Off when the thumb sits flush inside a card that draws its own edge. */
  bordered?: boolean;
}) {
  return (
    <div
      className={`bg-paper-3 relative overflow-hidden ${bordered ? "border-rule border" : ""} ${className}`}
    >
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <span className="text-faint-ink absolute inset-0 grid place-items-center text-[13px]">
          ފޮޓޯ
        </span>
      )}
    </div>
  );
}
