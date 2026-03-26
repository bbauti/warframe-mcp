import { get, set } from "../cache";
import { type RedditPost } from "../../types/api-responses";

const REDDIT_BASE_URL = "https://www.reddit.com/r/Warframe";
const REDDIT_TTL_MS = 5 * 60 * 1000;
const REDDIT_USER_AGENT = "WarframeMCP/1.0 (Warframe Knowledge Bot)";

type RedditSort = "relevance" | "new" | "top" | "comments";
type RedditTimeFilter = "hour" | "day" | "week" | "month" | "year" | "all";

interface RedditListingResponse {
  data?: {
    children?: unknown;
  };
}

export interface SearchPostsOptions {
  sort?: RedditSort;
  timeFilter?: RedditTimeFilter;
  limit?: number;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).replace(/\s+$/, "")}...`;
}

function parseRedditPost(raw: unknown): RedditPost | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  const id = asString(candidate.id);
  const title = asString(candidate.title);
  const url = asString(candidate.url);
  const permalink = asString(candidate.permalink);

  if (!id || !title || !url || !permalink) {
    return null;
  }

  const selftextRaw = asString(candidate.selftext) ?? "";
  const selftext = truncateText(selftextRaw, 500);

  const flairText = candidate.link_flair_text;

  return {
    id,
    title,
    selftext,
    url,
    permalink,
    author: asString(candidate.author) ?? "[deleted]",
    score: asNumber(candidate.score) ?? 0,
    upvote_ratio: asNumber(candidate.upvote_ratio) ?? 0,
    num_comments: asNumber(candidate.num_comments) ?? 0,
    created_utc: asNumber(candidate.created_utc) ?? 0,
    link_flair_text: typeof flairText === "string" ? flairText : null,
  };
}

function parseListingResponse(data: RedditListingResponse): RedditPost[] {
  const children = Array.isArray(data.data?.children) ? data.data.children : [];

  return children
    .map((child) => {
      if (!child || typeof child !== "object") {
        return null;
      }

      const childData = (child as { data?: unknown }).data;
      return parseRedditPost(childData);
    })
    .filter((post): post is RedditPost => post !== null);
}

async function requestReddit<T>(path: string, params: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(path, REDDIT_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        "User-Agent": REDDIT_USER_AGENT,
      },
    });
  } catch (error) {
    throw new Error(`Failed to reach Reddit API: ${getErrorMessage(error)}`);
  }

  if (response.status === 429) {
    throw new Error("Reddit is rate limited, try again shortly.");
  }

  if (!response.ok) {
    throw new Error(`Reddit API request failed: ${response.status} ${response.statusText}`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("Reddit API returned invalid JSON");
  }
}

export async function searchPosts(query: string, options?: SearchPostsOptions): Promise<RedditPost[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const sort: RedditSort = options?.sort ?? "relevance";
  const timeFilter: RedditTimeFilter = options?.timeFilter ?? "year";
  const limit = Math.min(25, Math.max(1, Math.floor(options?.limit ?? 10)));

  const cacheKey = `reddit:search:${trimmedQuery.toLowerCase()}:${sort}:${timeFilter}:${limit}`;
  const cached = get<RedditPost[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await requestReddit<RedditListingResponse>("/search.json", {
      q: trimmedQuery,
      restrict_sr: 1,
      sort,
      t: timeFilter,
      limit,
    });

    const posts = parseListingResponse(response);
    set(cacheKey, posts, REDDIT_TTL_MS);
    return posts;
  } catch (error) {
    throw new Error(`Unable to search r/Warframe posts: ${getErrorMessage(error)}`);
  }
}

export async function getHotPosts(limit = 10): Promise<RedditPost[]> {
  const normalizedLimit = Math.min(25, Math.max(1, Math.floor(limit)));
  const cacheKey = `reddit:hot:${normalizedLimit}`;

  const cached = get<RedditPost[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await requestReddit<RedditListingResponse>("/hot.json", {
      limit: normalizedLimit,
    });

    const posts = parseListingResponse(response);
    set(cacheKey, posts, REDDIT_TTL_MS);
    return posts;
  } catch (error) {
    throw new Error(`Unable to fetch hot r/Warframe posts: ${getErrorMessage(error)}`);
  }
}
