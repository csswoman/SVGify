import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SVGcraft — Free SVG Vectorizer",
  description:
    "Convert raster images to SVG, edit colors, and label paths. 100% client-side — your images never leave your device.",
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
        {/* CSP: no inline scripts, no eval; wasm-unsafe-eval for the Web Worker only */}
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; worker-src blob:"
        />
      </head>
      <body className="min-h-full flex flex-col bg-gray-100 text-gray-900">
        <header className="bg-white border-b border-gray-200 py-4 px-6 shrink-0">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div>
              <span className="text-xl font-bold tracking-tight">SVGcraft</span>
              <span className="ml-3 text-xs text-gray-400 hidden sm:inline">
                Free · Open Source · 100% client-side
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
          {children}
        </main>

        <footer className="shrink-0 border-t border-gray-200 bg-white py-5 px-6 text-center text-xs text-gray-400">
          <p>
            SVGcraft — MIT License · Your images never leave your device ·{" "}
            <a
              href="https://github.com"
              className="underline hover:text-gray-600"
              rel="noopener noreferrer"
              target="_blank"
            >
              Source on GitHub
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
