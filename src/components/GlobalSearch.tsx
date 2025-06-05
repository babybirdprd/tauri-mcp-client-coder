import React, { useState } from "react";
import { tauriApi, TantivySearchResultItem } from "../utils/tauriApi";

const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TantivySearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const searchResults = await tauriApi.searchProjectGlobally(
        query,
        undefined,
        10,
      );
      setResults(searchResults);
    } catch (err: any) {
      setError(err.message || "Search failed");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg shadow mt-6">
      <h3 className="text-xl font-medium text-gray-200 mb-3">
        Global Project Search (Tantivy)
      </h3>
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search codebase, docs, specs..."
          className="flex-grow p-2 rounded bg-gray-700 text-white border border-gray-600"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          {isLoading ? "Searching..." : "Search"}
        </button>
      </form>
      {error && <p className="text-red-400">{error}</p>}
      {results.length > 0 && (
        <ul className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((item) => (
            <li
              key={item.relative_path + item.title}
              className="p-3 bg-gray-700 rounded"
            >
              <p className="font-semibold text-purple-400">
                {item.title}{" "}
                <span className="text-xs text-gray-500">
                  ({item.doc_type}, Score: {item.score.toFixed(2)})
                </span>
              </p>
              <p className="text-sm text-gray-300">{item.relative_path}</p>
              {item.snippet_html && (
                <div
                  className="text-xs text-gray-400 mt-1"
                  dangerouslySetInnerHTML={{ __html: item.snippet_html }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GlobalSearch;
