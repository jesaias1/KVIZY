import Image from "next/image";
import { APP_CONFIG } from "@/lib/config";

export function LoadingScreen({ overlay = false }: { overlay?: boolean }) {
  return (
    <div
      className={`brand-loading-screen ${overlay ? "brand-loading-overlay" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="KVIZY indlæses"
    >
      <div className="brand-loading-stage" aria-hidden="true">
        <div className="brand-loading-glow" />
        <div className="brand-loading-ring brand-loading-ring-outer" />
        <div className="brand-loading-ring brand-loading-ring-inner" />
        <div className="brand-loading-sparks">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <Image
          src="/brand/kvizy-mark.png"
          alt=""
          width={220}
          height={220}
          className="brand-loading-mark"
          priority
        />
      </div>
      <Image
        src="/brand/kvizy-wordmark.png"
        alt=""
        width={1012}
        height={294}
        className="brand-loading-wordmark"
        priority
      />
      <span>{APP_CONFIG.tagline}</span>
      <div className="brand-loading-meter" aria-hidden="true" />
      <div className="brand-loading-dots" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <span className="sr-only">Spillet gøres klar</span>
    </div>
  );
}
