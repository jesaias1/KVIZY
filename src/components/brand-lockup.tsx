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
        <Image
          src="/brand/kvizy-wordmark.png"
          alt={APP_CONFIG.name}
          width={1012}
          height={294}
          className="brand-wordmark"
          priority
        />
        <small>{APP_CONFIG.tagline}</small>
      </span>
    </span>
  );
}
