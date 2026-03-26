import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchPosts } from "../lib/api/reddit";

export const schema = {
  query: z
    .string()
    .describe(
      "Search query (e.g. 'best Mesa Prime build 2025', 'how to farm Wisp', 'Steel Path tier list')",
    ),
  sort: z.enum(["relevance", "new", "top", "comments"]).optional().describe("Sort order (default: relevance)"),
  time_filter: z.enum(["week", "month", "year", "all"]).optional().describe("Time filter (default: year)"),
  limit: z.number().optional().describe("Max results (default: 8, max: 15)"),
};

export const metadata: ToolMetadata = {
  name: "search_community",
  description:
    "Search r/Warframe Reddit for community discussions, build guides, farming strategies, tier lists, and player opinions. Returns post titles, scores, and snippets. Use this to find community consensus on builds, meta, or game strategies.",
  annotations: {
    title: "Search Community",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function isRateLimitedMessage(message: string): boolean {
  return /rate limited/i.test(message);
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).replace(/\s+$/, "")}...`;
}

function normalizeSnippet(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();

  if (!compact) {
    return "No text snippet available (link/image post).";
  }

  return truncate(compact, 300);
}

function toAbsoluteRedditLink(permalink: string): string {
  if (/^https?:\/\//i.test(permalink)) {
    return permalink;
  }

  return `https://www.reddit.com${permalink}`;
}

export default async function searchCommunity({ query, sort, time_filter, limit }: InferSchema<typeof schema>): Promise<string> {
  const selectedSort = sort ?? "relevance";
  const selectedTimeFilter = time_filter ?? "year";
  const selectedLimit = Math.min(15, Math.max(1, Math.floor(limit ?? 8)));

  try {
    const posts = await searchPosts(query, {
      sort: selectedSort,
      timeFilter: selectedTimeFilter,
      limit: selectedLimit,
    });

    if (posts.length === 0) {
      return `No r/Warframe posts found for "${query}". Try alternate terms like item names, frame names, or add words like "build", "farm", or "steel path".`;
    }

    const lines: string[] = [];

    lines.push(`r/Warframe results for "${query}" (${selectedSort}, ${selectedTimeFilter}, top ${selectedLimit}):`);
    lines.push("");

    for (const [index, post] of posts.entries()) {
      lines.push(`${index + 1}. ${post.title}`);
      lines.push(`Score: ${post.score} | Comments: ${post.num_comments} | Flair: ${post.link_flair_text ?? "None"}`);
      lines.push(`Snippet: ${normalizeSnippet(post.selftext)}`);
      lines.push(`Link: ${toAbsoluteRedditLink(post.permalink)}`);
      lines.push("");
    }

    return lines.join("\n").trim();
  } catch (error) {
    const message = getErrorMessage(error);

    if (isRateLimitedMessage(message)) {
      return "Reddit is rate limited, try again shortly.";
    }

    return `Unable to search community posts for "${query}": ${message}`;
  }
}
