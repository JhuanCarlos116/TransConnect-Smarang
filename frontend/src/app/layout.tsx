import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Inter (UI/reading) + JetBrains Mono (metadata, coordinates, AI-detected
// attribute labels) — per the "CivicSense Transit" design system, see the
// --font-sans/--font-mono tokens in globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TransConnect Semarang",
  description: "WebGIS Decision Support System untuk halte Trans Semarang di Kecamatan Tembalang",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- the rule
            targets the pages/ router, where a font link outside _document.js
            loads for one page only. This is the App Router root layout, so it
            already applies to every page. Not routed through next/font because
            Material Symbols is a variable icon font whose axes (wght, FILL) we
            set from CSS. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
