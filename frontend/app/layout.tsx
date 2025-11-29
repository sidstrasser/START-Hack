import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Negotiation Briefing Assistant",
  description: "AI-powered negotiation briefing generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-3">
            <Link href="/" className="text-xl font-bold text-blue-600">
              Negotiation Assistant
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
