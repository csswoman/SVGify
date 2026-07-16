import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/shared/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          // Apply persisted theme before first paint to prevent a flash.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}`,
          }}
        />
      </head>
      <body className="flex h-dvh flex-col overflow-hidden bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
