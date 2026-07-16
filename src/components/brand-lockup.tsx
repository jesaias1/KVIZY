import Image from "next/image";
import { APP_CONFIG } from "@/lib/config";

export function BrandLockup({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`brand-lockup ${compact ? "brand-lockup-compact" : ""} ${className}`}
      aria-label={`${APP_CONFIG.name} – ${APP_CONFIG.tagline}`}
    >
      <Image
        src="/brand/kvizy-mark.png"
        alt=""
        width={72}
        height={72}
        className="brand-mark"
        priority
      />
      <span className="brand-copy">
        <strong>{APP_CONFIG.name}</strong>
        <small>{APP_CONFIG.tagline}</small>
      </span>
    </span>
  );
}
