import Link from "next/link";
import Image from "next/image";

// Mock data for past negotiations
const pastNegotiations = [
  { id: 1, name: "SAP License Renewal", date: "Nov 28, 2025" },
  { id: 2, name: "Cloud Infrastructure Deal", date: "Nov 25, 2025" },
  { id: 3, name: "Office Equipment Contract", date: "Nov 20, 2025" },
  { id: 4, name: "Marketing Services RFP", date: "Nov 15, 2025" },
  { id: 5, name: "IT Support Agreement", date: "Nov 10, 2025" },
];

// Mock user data
const currentUser = {
  name: "Sarah Chen",
  email: "s.chen@company.com",
  avatar: null,
};

export default function Home() {
  return (
    <main className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-80 bg-ds-bg flex flex-col border-r border-ds-accent-1/10">
        {/* Logo */}
        <div className="p-6">
          <Image
            src="/icon-logo.png"
            alt="Accordia"
            width={52}
            height={48}
            className="h-12 w-auto object-contain"
            unoptimized
          />
        </div>

        {/* Past Negotiations */}
        <div className="flex-1 px-4 overflow-y-auto">
          <h3 className="text-xs font-semibold text-ds-text-muted uppercase tracking-wider px-2 mb-3">
            Recent Negotiations
          </h3>
          <div className="bg-white/20 backdrop-blur-sm rounded-ds-lg p-2 border border-white/50">
            <nav className="space-y-1">
              {pastNegotiations.map((negotiation) => (
                <Link
                  key={negotiation.id}
                  href="#"
                  className="group flex flex-col px-3 py-2.5 rounded-ds-md hover:bg-white/60 transition-colors"
                >
                  <span className="text-sm font-medium text-ds-text group-hover:text-ds-accent-1 transition-colors truncate">
                    {negotiation.name}
                  </span>
                  <span className="text-xs text-ds-text-light">
                    {negotiation.date}
                  </span>
                </Link>
              ))}
            </nav>
                </div>
              </div>

        {/* Bottom Actions */}
        <div className="px-4 pb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-ds-lg p-2 space-y-1 border border-white/50">
            <button className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-ds-text-muted hover:text-ds-text hover:bg-white/60 rounded-ds-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
            <button className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-ds-text-muted hover:text-ds-text hover:bg-white/60 rounded-ds-md transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Support
            </button>
                </div>
              </div>

        {/* User Profile */}
        <div className="p-4 border-t border-ds-accent-1/10">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-gradient-accent flex items-center justify-center text-white font-semibold text-sm shadow-ds-accent">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
                </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ds-text truncate">
                {currentUser.name}
              </p>
              <p className="text-xs text-ds-text-light truncate">
                {currentUser.email}
                </p>
            </div>
            <button className="p-1.5 text-ds-text-light hover:text-ds-text transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 bg-[#0F1A3D] relative overflow-hidden flex flex-col items-center justify-center">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-ds-accent-1/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -left-40 w-[500px] h-[500px] bg-ds-accent-2/15 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-ds-accent-1/20 rounded-full blur-2xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center px-8 text-center">
          {/* White Logo - Big */}
          <div className="mb-12">
            <Image
              src="/logo-white.png"
              alt="Accordia"
              width={700}
              height={230}
              className="h-auto w-[340px] md:w-[420px] lg:w-[520px] xl:w-[620px] object-contain"
              priority
            />
          </div>

          {/* Slogan */}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-white/90 tracking-tight leading-relaxed mb-16">
            Prepare faster. Negotiate sharper. Close smarter.
          </h1>

          {/* CTA Button */}
          <Link
            href="/document-upload"
            className="cta-negotiate group inline-flex items-center gap-4 px-12 py-6 text-xl font-semibold text-[#0F1A3D] bg-white rounded-ds-xl hover:-translate-y-1 transition-transform duration-300"
          >
            Let&apos;s Negotiate
            <svg className="arrow-icon w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Subtle tagline at bottom */}
        <p className="absolute bottom-8 text-white/40 text-sm">
          Where AI meets negotiation
        </p>
      </div>
    </main>
  );
}
