import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accordia - AI Negotiation Assistant",
  description: "Where AI meets negotiation. Prepare faster. Negotiate sharper. Close smarter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
