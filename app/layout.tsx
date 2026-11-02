import type { Metadata } from "next";
import Script from "next/script";
import { fontVariables } from "@/lib/fonts";
import { BOOT_SCRIPT } from "@/lib/prefs";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ފިޤުހު ފޮއި",
    template: "%s — ފިޤުހު ފޮއި",
  },
  description: "ދިވެހި ދީނީ ޢިލްމީ ލިޔުންތައް",
  // Absolute URLs for social previews; relative image paths resolve against it.
  metadataBase: new URL(process.env.SITE_URL || "https://fiqhfoiy.com"),
  openGraph: {
    type: "website",
    siteName: "ފިޤުހު ފޮއި",
    locale: "dv_MV",
    images: ["/logo.png"],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="dv"
      dir="rtl"
      className={`${fontVariables} h-full antialiased`}
      // The boot script writes theme and text size onto this element before
      // React hydrates, so the server HTML and the client differ by design.
      suppressHydrationWarning
    >
      <head>
        {/* Must run before first paint, or a reader on the dark theme sees the
            light palette flash first. */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body className="bg-paper text-ink flex min-h-full flex-col">
        {children}
        {/* Dev-only element picker. Loaded afterInteractive from the body: the
            App Router rejects a beforeInteractive script outside <head>, and a
            manual <head> makes it a raw script tag. */}
        {process.env.NODE_ENV === "development" && (
          <Script
            src="https://unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
