import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hotel Cost Splitter",
  description:
    "Split hotel costs with variable occupancy per night. Perfect for group trips where people have different check-in and check-out dates.",
  keywords: [
    "hotel cost splitter",
    "accommodation splitter",
    "group travel calculator",
    "hotel expense calculator",
    "variable occupancy calculator",
  ],
  openGraph: {
    title: "Hotel Cost Splitter | The Everything Calculator",
    description:
      "Split hotel costs with variable occupancy. Perfect for group trips with different check-in/out dates.",
    url: "https://calculator.ethanwin.com/hotel",
    images: [
      {
        url: "/og-hotel-splitter.png",
        width: 1200,
        height: 630,
        alt: "Hotel Cost Splitter Preview",
      },
    ],
  },
};

export default function HotelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
