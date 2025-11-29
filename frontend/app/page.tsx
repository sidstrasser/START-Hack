import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold mb-8">START-Hack</h1>
      <nav className="flex flex-col gap-2">
        <Link href="/document-upload" className="text-blue-600 hover:underline">
          Document Upload
        </Link>
        <Link href="/negotiation-input" className="text-blue-600 hover:underline">
          Negotiation Input
        </Link>
        <Link href="/briefing" className="text-blue-600 hover:underline">
          Briefing
        </Link>
        <Link href="/live-call" className="text-blue-600 hover:underline">
          Live Call
        </Link>
        <Link href="/summary" className="text-blue-600 hover:underline">
          Summary
        </Link>
      </nav>
    </main>
  );
}

