import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Restaurant Bill Splitter",
  description:
    "Split restaurant bills easily with our smart bill splitter. Upload receipts, drag-and-drop to assign items, and calculate everyone's share including tax and tip.",
  keywords: [
    "restaurant bill splitter",
    "meal expense splitter",
    "split the check",
    "bill calculator",
    "tip calculator",
    "group dining calculator",
  ],
  openGraph: {
    title: "Restaurant Bill Splitter | The Everything Calculator",
    description:
      "Split restaurant bills easily. Upload receipts, assign items, and calculate everyone's share.",
    url: "https://calculator.ethanwin.com/meal",
    images: [
      {
        url: "/og-meal-splitter.png",
        width: 1200,
        height: 630,
        alt: "Restaurant Bill Splitter Preview",
      },
    ],
  },
};

export default function MealLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
