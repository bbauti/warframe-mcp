import { get, set } from "../cache";
import { type WikiSearchResult } from "../../types/api-responses";

const WIKI_BASE_URL = "https://warframe.fandom.com/api.php";
const WIKI_TTL_MS = 30 * 60 * 1000;

interface WikiSearchResponse {
  query?: {
    search?: Array<{
      title?: string;
      pageid?: number;
      snippet?: string;
    }>;
  };
}

interface WikiExtractResponse {
  query?: {
    pages?: Record<string, { extract?: string }>;
  };
}

async function requestWiki<T>(params: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(WIKI_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Warframe Wiki API request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function getFirstPageExtract(data: WikiExtractResponse): string {
  const pages = data.query?.pages;
  if (!pages) {
    return "";
  }

  const firstPage = Object.values(pages)[0];
  if (!firstPage || typeof firstPage.extract !== "string") {
    return "";
  }

  return firstPage.extract.trim();
}

export async function searchArticles(query: string, limit = 5): Promise<WikiSearchResult[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const normalizedLimit = Math.min(10, Math.max(1, Math.floor(limit)));
  const cacheKey = `wiki:search:${trimmedQuery.toLowerCase()}:${normalizedLimit}`;

  const cached = get<WikiSearchResult[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await requestWiki<WikiSearchResponse>({
      action: "query",
      list: "search",
      srsearch: trimmedQuery,
      format: "json",
      srlimit: normalizedLimit,
    });

    const results = (data.query?.search ?? [])
      .filter((entry) => typeof entry.title === "string" && typeof entry.pageid === "number")
      .map((entry) => ({
        title: entry.title as string,
        pageid: entry.pageid as number,
        snippet: typeof entry.snippet === "string" ? entry.snippet : "",
      }));

    set(cacheKey, results, WIKI_TTL_MS);
    return results;
  } catch {
    return [];
  }
}

export async function getArticleSummary(title: string): Promise<string> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return "";
  }

  const cacheKey = `wiki:summary:${trimmedTitle.toLowerCase()}`;
  const cached = get<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const data = await requestWiki<WikiExtractResponse>({
      action: "query",
      titles: trimmedTitle,
      prop: "extracts",
      exintro: true,
      format: "json",
      explaintext: true,
    });

    const summary = getFirstPageExtract(data);
    set(cacheKey, summary, WIKI_TTL_MS);
    return summary;
  } catch {
    return "";
  }
}

export async function getArticleContent(title: string): Promise<string> {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return "";
  }

  const cacheKey = `wiki:content:${trimmedTitle.toLowerCase()}`;
  const cached = get<string>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const data = await requestWiki<WikiExtractResponse>({
      action: "query",
      titles: trimmedTitle,
      prop: "extracts",
      format: "json",
      explaintext: true,
    });

    const content = getFirstPageExtract(data);
    set(cacheKey, content, WIKI_TTL_MS);
    return content;
  } catch {
    return "";
  }
}
