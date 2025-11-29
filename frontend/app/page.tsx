import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Negotiation Briefing Assistant
          </h1>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            Upload procurement offers and get AI-powered negotiation briefings in minutes.
            Our multi-agent system analyzes your documents, researches partners, and creates
            comprehensive negotiation strategies.
          </p>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-12">
            <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div>
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <span className="text-blue-600 font-bold text-lg">1</span>
                </div>
                <h3 className="font-semibold mb-2">Upload Document</h3>
                <p className="text-gray-600 text-sm">
                  Upload your PDF offer or enter details manually
                </p>
              </div>
              <div>
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <span className="text-blue-600 font-bold text-lg">2</span>
                </div>
                <h3 className="font-semibold mb-2">AI Analysis</h3>
                <p className="text-gray-600 text-sm">
                  5 specialized agents analyze and research your case
                </p>
              </div>
              <div>
                <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-3 mx-auto md:mx-0">
                  <span className="text-blue-600 font-bold text-lg">3</span>
                </div>
                <h3 className="font-semibold mb-2">Get Briefing</h3>
                <p className="text-gray-600 text-sm">
                  Receive comprehensive negotiation strategy
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/document-upload"
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started
          </Link>
        </div>
      </div>
    </main>
  );
}
