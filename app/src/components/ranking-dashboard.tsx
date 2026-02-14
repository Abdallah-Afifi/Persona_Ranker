"use client";

import { useState, useCallback } from "react";
import { ResultsTable } from "./results-table";
import { Download, Play, Loader2, Database, Upload } from "lucide-react";

interface RankingRun {
  id: string;
  status: string;
  total_leads: number;
  processed_leads: number;
  total_tokens: number;
  total_cost: number;
  created_at: string;
  completed_at: string | null;
}

interface RankingResult {
  id: string;
  lead_id: string;
  rank: number | null;
  relevance_score: number;
  is_relevant: boolean;
  reasoning: string;
  department_fit: string;
  seniority_fit: string;
  lead: {
    id: string;
    account_name: string;
    lead_first_name: string;
    lead_last_name: string;
    lead_job_title: string;
    account_domain: string;
    account_employee_range: string;
    account_industry: string;
  };
}

export function RankingDashboard() {
  const [results, setResults] = useState<RankingResult[]>([]);
  const [currentRun, setCurrentRun] = useState<RankingRun | null>(null);
  const [isRanking, setIsRanking] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [topN, setTopN] = useState(3);

  const loadResults = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/results");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data.results || []);
      setCurrentRun(data.run || null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    setStatusMessage("Loading leads into database...");
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatusMessage(data.message);
    } catch (err) {
      setError((err as Error).message);
      setStatusMessage("");
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSeeding(true);
    setError(null);
    setStatusMessage("Uploading CSV and loading leads...");
    try {
      const text = await file.text();
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatusMessage(data.message);
    } catch (err) {
      setError((err as Error).message);
      setStatusMessage("");
    } finally {
      setIsSeeding(false);
      e.target.value = "";
    }
  };

  const handleRank = async () => {
    setIsRanking(true);
    setError(null);
    setStatusMessage("Running AI ranking process... This may take a few minutes.");
    try {
      const res = await fetch("/api/rank", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStatusMessage(
        `Ranking complete! Processed ${data.total_processed} leads using ${data.total_tokens.toLocaleString()} tokens.`
      );
      await loadResults();
    } catch (err) {
      setError((err as Error).message);
      setStatusMessage("");
    } finally {
      setIsRanking(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/export?top_n=${topN}`, "_blank");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            onClick={handleSeed}
            disabled={isSeeding || isRanking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSeeding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Load Default CSV
          </button>

          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors border border-gray-300">
            <Upload className="w-4 h-4" />
            Upload CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
              disabled={isSeeding || isRanking}
            />
          </label>

          <button
            onClick={handleRank}
            disabled={isRanking || isSeeding}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRanking ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRanking ? "Ranking..." : "Run AI Ranking"}
          </button>

          <button
            onClick={loadResults}
            disabled={isLoading || isRanking}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Database className="w-4 h-4" />
            )}
            Load Results
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-600">Top N per company:</label>
            <input
              type="number"
              min={1}
              max={50}
              value={topN}
              onChange={(e) => setTopN(parseInt(e.target.value) || 3)}
              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <button
              onClick={handleExport}
              disabled={results.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {statusMessage && (
          <div className="mt-3 p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
            {statusMessage}
          </div>
        )}
        {error && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Run Stats */}
      {currentRun && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Ranking Run Stats
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-semibold capitalize">
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 ${
                    currentRun.status === "completed"
                      ? "bg-green-500"
                      : currentRun.status === "running"
                      ? "bg-yellow-500"
                      : "bg-gray-400"
                  }`}
                />
                {currentRun.status}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Leads Processed</p>
              <p className="font-semibold">
                {currentRun.processed_leads} / {currentRun.total_leads}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tokens</p>
              <p className="font-semibold">
                {currentRun.total_tokens.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Relevant Leads</p>
              <p className="font-semibold">
                {results.filter((r) => r.is_relevant).length} / {results.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="font-semibold text-sm">
                {currentRun.completed_at
                  ? new Date(currentRun.completed_at).toLocaleString()
                  : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && <ResultsTable results={results} />}

      {/* Empty State */}
      {!isLoading && !isRanking && results.length === 0 && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No ranking results yet
          </h3>
          <p className="text-gray-500 max-w-md mx-auto">
            Start by loading leads into the database, then run the AI ranking
            process to qualify and rank leads against the persona spec.
          </p>
        </div>
      )}
    </div>
  );
}
