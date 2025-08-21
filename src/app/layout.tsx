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
  metadataBase: new URL("https://calculator.ethanwin.com"),
  title: {
    default: "The Everything Calculator - Financial Tools & Calculators",
    template: "%s | The Everything Calculator",
  },
  description:
    "Your all-in-one calculator hub for life's financial decisions. Split bills, calculate auto loans, and manage group expenses with beautiful visualizations.",
  keywords: [
    "calculator",
    "auto loan calculator",
    "bill splitter",
    "expense splitter",
    "financial calculator",
    "loan calculator",
    "restaurant bill splitter",
    "group expenses",
  ],
  authors: [{ name: "Ethan Nguyen", url: "https://ethanwin.com" }],
  creator: "Ethan Nguyen",
  publisher: "Ethan Nguyen",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://calculator.ethanwin.com",
    title: "The Everything Calculator",
    description:
      "Your all-in-one calculator hub for life's financial decisions. Split bills, calculate auto loans, and manage group expenses.",
    siteName: "The Everything Calculator",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "The Everything Calculator - Financial Tools & Calculators",
      },
    ],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
