import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shared/AppShell";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://svg-ify.vercel.app/"),
  icons: {
    icon: "/svgify.svg",
  },
  title: {
    default: "SVGify — Free SVG Vectorizer",
    template: "%s — SVGify",
  },
  description:
    "Trace raster images into SVG, refine colors and shapes, and download everything locally in your browser.",
  openGraph: {
    title: "SVGify — Free SVG Vectorizer",
    description:
      "Trace raster images into SVG, refine colors and shapes, and download everything locally in your browser.",
    url: "https://svg-ify.vercel.app/",
    siteName: "SVGify",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SVGify — Free SVG Vectorizer",
    description:
      "Trace raster images into SVG, refine colors and shapes, and download everything locally in your browser.",
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
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        {/* Theme-flash prevention: hardcoded literal script, no user input. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden bg-bg text-ink dark:bg-dark-bg dark:text-dark-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
