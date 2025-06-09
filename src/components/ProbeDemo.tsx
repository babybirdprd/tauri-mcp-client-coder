import React, { useState } from 'react';
import { tauriApi } from '../utils/tauriApi';
import type { ProbeSearchResult, ProbeCodeBlock } from '../types';

const ProbeDemo: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProbeSearchResult[]>([]);
  const [codeBlocks, setCodeBlocks] = useState<ProbeCodeBlock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await tauriApi.probeSearchCode(query);
      setSearchResults(results);
      setCodeBlocks([]);
    } catch (err) {
      setError(`Error searching code: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await tauriApi.probeExecuteQuery(query);
      setCodeBlocks(results);
      setSearchResults([]);
    } catch (err) {
      setError(`Error executing query: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleExtract = async () => {
    if (!query.trim()) {
      setError('Please enter a file path');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await tauriApi.probeExtractFromFile(query);
      setCodeBlocks(results);
      setSearchResults([]);
    } catch (err) {
      setError(`Error extracting from file: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Probe Code Analysis Demo</h2>
      
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query, structured query, or file path"
          className="w-full p-2 border rounded"
        />
      </div>
      
      <div className="flex space-x-2 mb-4">
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Search Code
        </button>
        <button
          onClick={handleQuery}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Execute Query
        </button>
        <button
          onClick={handleExtract}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Extract From File
        </button>
      </div>
      
      {isLoading && <div className="my-4">Loading...</div>}
      
      {error && (
        <div className="my-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {searchResults.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Search Results ({searchResults.length})</h3>
          {searchResults.map((result, index) => (
            <div key={index} className="mb-4 p-3 border rounded">
              <div className="flex justify-between mb-2">
                <span className="font-medium">{result.filePath}:{result.lineNumber}</span>
                <span className="text-sm text-gray-500">Score: {result.score.toFixed(2)}</span>
              </div>
              <div className="bg-gray-100 p-2 rounded">
                {result.contextBefore.map((line, i) => (
                  <pre key={`before-${i}`} className="text-gray-500 text-sm">{line}</pre>
                ))}
                <pre className="font-bold bg-yellow-100 p-1">{result.codeSnippet}</pre>
                {result.contextAfter.map((line, i) => (
                  <pre key={`after-${i}`} className="text-gray-500 text-sm">{line}</pre>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {codeBlocks.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Code Blocks ({codeBlocks.length})</h3>
          {codeBlocks.map((block, index) => (
            <div key={index} className="mb-4 p-3 border rounded">
              <div className="flex justify-between mb-2">
                <span className="font-medium">
                  {block.filePath} (lines {block.startLine}-{block.endLine})
                </span>
                <span className="text-sm text-gray-500">{block.language}</span>
              </div>
              {block.docComments && (
                <div className="bg-blue-50 p-2 mb-2 rounded text-sm">
                  {block.docComments}
                </div>
              )}
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">{block.code}</pre>
              {block.symbols.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {block.symbols.map((symbol, i) => (
                    <span key={i} className="bg-gray-200 px-2 py-1 rounded text-xs">
                      {symbol}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProbeDemo;