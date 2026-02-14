import { RankingDashboard } from "@/components/ranking-dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Persona Ranker
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                AI-powered lead qualification &amp; ranking for Throxy
              </p>
            </div>
          </div>
        </div>
      </header>
      <RankingDashboard />
    </main>
  );
}
