import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "General Expense Splitter",
  description:
    "Split any group expense with flexible options. Choose equal splits, percentages, or custom amounts for activities, transport, groceries, and more.",
  keywords: [
    "expense splitter",
    "group expense calculator",
    "split costs",
    "expense sharing",
    "group payment calculator",
    "activity splitter",
  ],
  openGraph: {
    title: "General Expense Splitter | The Everything Calculator",
    description:
      "Split any group expense with flexible options - equal splits, percentages, or custom amounts.",
    url: "https://calculator.ethanwin.com/general",
    images: [
      {
        url: "/og-general-splitter.png",
        width: 1200,
        height: 630,
        alt: "General Expense Splitter Preview",
      },
    ],
  },
};

export default function GeneralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
