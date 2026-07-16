import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { APP_CONFIG } from "@/lib/config";
import "./globals.css";
export const metadata: Metadata = {
  title: `${APP_CONFIG.name} – ${APP_CONFIG.tagline}`,
  description: `${APP_CONFIG.tagline}. Det danske quizspil til venner, familie og fest.`,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/brand/kvizy-icon-192.png",
    apple: "/brand/kvizy-apple-touch.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_CONFIG.name,
  },
};
export const viewport: Viewport = {
  themeColor: "#121214",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
