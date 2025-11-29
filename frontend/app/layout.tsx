import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "START-Hack",
  description: "START-Hack Application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

