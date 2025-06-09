import { invoke } from '@tauri-apps/api/core';

export interface ProbeSearchResult {
  filePath: string;
  lineNumber: number;
  codeSnippet: string;
  contextBefore: string[];
  contextAfter: string[];
  language?: string;
  score: number;
}

export interface ProbeCodeBlock {
  filePath: string;
  code: string;
  language: string;
  startLine: number;
  endLine: number;
  symbols: string[];
  docComments?: string;
}

// Convert snake_case from Rust to camelCase for JavaScript
function convertToCamelCase(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(convertToCamelCase);
  }

  return Object.keys(obj).reduce((result: any, key: string) => {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = convertToCamelCase(obj[key]);
    return result;
  }, {});
}

/**
 * Search code in the project using the probe
 * 
 * @param query The search query
 * @param directory Optional directory to search in (defaults to project root)
 * @param fileExtensions Optional list of file extensions to search in
 * @param maxResults Optional maximum number of results to return
 * @param contextLines Optional number of context lines to include
 * @returns An array of search results
 */
export async function searchCode(
  query: string,
  directory?: string,
  fileExtensions?: string[],
  maxResults?: number,
  contextLines?: number,
): Promise<ProbeSearchResult[]> {
  const results = await invoke<any[]>('probe_search_code', {
    query,
    directory,
    fileExtensions,
    maxResults,
    contextLines,
  });
  
  return convertToCamelCase(results);
}

/**
 * Execute a structured query using probe's query engine
 * 
 * @param query The structured query
 * @param directory Optional directory to search in (defaults to project root)
 * @param language Optional language to search in
 * @returns An array of code blocks
 */
export async function executeQuery(
  query: string,
  directory?: string,
  language?: string,
): Promise<ProbeCodeBlock[]> {
  const results = await invoke<any[]>('probe_execute_query', {
    query,
    directory,
    language,
  });
  
  return convertToCamelCase(results);
}

/**
 * Extract code blocks from a specific file
 * 
 * @param filePath Path to the file
 * @param pattern Optional pattern to match
 * @returns An array of code blocks
 */
export async function extractFromFile(
  filePath: string,
  pattern?: string,
): Promise<ProbeCodeBlock[]> {
  const results = await invoke<any[]>('probe_extract_from_file', {
    filePath,
    pattern,
  });
  
  return convertToCamelCase(results);
}