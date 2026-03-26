import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { getArticleSummary, searchArticles } from "../lib/api/wiki";

export const schema = {
  query: z.string().describe("Search query for the Warframe Wiki"),
  limit: z.number().optional().describe("Max results to return (default 5, max 10)"),
};

export const metadata: ToolMetadata = {
  name: "search_wiki",
  description:
    "Search the Warframe Wiki for articles about any Warframe topic — weapons, warframes, mechanics, lore, quests, resources, enemies, etc. Returns article titles and summaries. Use this when you need detailed game information beyond basic stats.",
  annotations: {
    title: "Search Warframe Wiki",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

function stripMarkup(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).replace(/\s+$/, "")}...`;
}

export default async function searchWiki({ query, limit }: InferSchema<typeof schema>): Promise<string> {
  const normalizedLimit = Math.min(10, Math.max(1, Math.floor(limit ?? 5)));
  const results = await searchArticles(query, normalizedLimit);

  if (results.length === 0) {
    return `No Warframe Wiki articles found for "${query}". Try a different query or check spelling.`;
  }

  const resultsWithSummary = await Promise.all(
    results.map(async (result) => {
      const summary = await getArticleSummary(result.title);
      return {
        ...result,
        summary,
      };
    }),
  );

  const lines: string[] = [];
  lines.push(`Warframe Wiki results for "${query}":`);
  lines.push("");

  for (const [index, result] of resultsWithSummary.entries()) {
    const summaryText = result.summary || stripMarkup(result.snippet) || "No summary available.";

    lines.push(`${index + 1}. ${result.title}`);
    lines.push(`Summary: ${truncate(summaryText, 550)}`);
    lines.push(`Page ID: ${result.pageid}`);
    lines.push("");
  }

  return lines.join("\n").trim();
}
