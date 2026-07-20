import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { DesktopShell } from "@/components/desktop/desktop-shell";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bloom",
  description: "A minimal habit tracker with a growing sakura tree",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // src-tauri/src/lib.rs adds the `tauri-desktop` class before hydration,
      // so the <html> class legitimately differs from the server render.
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <DesktopShell>
          {children}
          <Toaster />
        </DesktopShell>
      </body>
    </html>
  );
}
