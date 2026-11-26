import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KRI Management System",
  description: "Key Risk Indicator collection, review and reporting portal",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
