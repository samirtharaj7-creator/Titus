import type { Metadata } from "next";
import { GlobalFooter, GlobalShell } from "@/components/global-shell";
import { ReadingProgressBar } from "@/components/reading-progress";
import { RouteStyling } from "@/components/route-styling";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";
import "./global-shell.css";
import "./titus-illustrated.css";
import "./background-content.css";
import "./titus-reader.css";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: "Titus Study",
    template: "%s | Titus Study"
  },
  description:
    "Study the Letter to Titus with KJV chapter text, verse commentary, historical context, and practical application.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://titus.mybibleexplorer.com")
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Jost:wght@400;500;600&display=swap"
        />
      </head>
      <body className="mbe-shell-managed" data-titus-route="home">
        <RouteStyling />
        <GlobalShell />
        <ReadingProgressBar />
        <SiteHeader />
        {children}
        <GlobalFooter />
        <Script src="https://mybibleexplorer.com/library.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
