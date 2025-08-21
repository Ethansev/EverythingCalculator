import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Auto Loan Calculator",
  description:
    "Calculate your monthly car payments with our comprehensive auto loan calculator. Compare loan terms, visualize costs, and view detailed amortization schedules.",
  keywords: [
    "auto loan calculator",
    "car loan calculator",
    "vehicle financing",
    "monthly payment calculator",
    "loan comparison",
    "amortization schedule",
  ],
  openGraph: {
    title: "Auto Loan Calculator | The Everything Calculator",
    description:
      "Calculate monthly car payments, compare loan terms, and visualize total costs with our interactive auto loan calculator.",
    url: "https://calculator.ethanwin.com/car",
    images: [
      {
        url: "/og-car-calculator.png",
        width: 1200,
        height: 630,
        alt: "Auto Loan Calculator Preview",
      },
    ],
  },
};

export default function CarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
