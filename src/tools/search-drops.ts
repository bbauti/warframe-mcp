import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchDrops } from "../lib/api/wfcd";

export const schema = {
  query: z
    .string()
    .describe(
      "Item name to find drop sources for (e.g. 'Ash Prime Neuroptics', 'Condition Overload', 'Argon Crystal')",
    ),
};

export const metadata: ToolMetadata = {
  name: "search_drops",
  description:
    "Find where an item drops in Warframe — which enemies, missions, relics, or activities drop it and at what rates. Use this when a user asks how to get/farm a specific item.",
  annotations: {
    title: "Search Drops",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  const normalizedValue = value <= 1 ? value * 100 : value;
  return `${normalizedValue.toFixed(2).replace(/\.?0+$/, "")}%`;
}

export default async function searchDropsTool({ query }: InferSchema<typeof schema>): Promise<string> {
  const drops = await searchDrops(query);

  if (drops.length === 0) {
    return `No drop sources found matching "${query}". Try a different name or check spelling.`;
  }

  const sortedDrops = [...drops].sort((a, b) => {
    const aChance = typeof a.chance === "number" ? a.chance : -1;
    const bChance = typeof b.chance === "number" ? b.chance : -1;
    return bChance - aChance;
  });

  const lines: string[] = [];
  const topDrops = sortedDrops.slice(0, 25);

  lines.push(`Drop sources for "${query}" (highest chance first):`);
  lines.push("");

  for (const [index, drop] of topDrops.entries()) {
    lines.push(
      `${index + 1}. ${drop.place || "Unknown location"} | ${drop.rarity || "Unknown rarity"} | ${formatPercent(drop.chance)} | Item: ${drop.item || "Unknown item"}`,
    );
  }

  return lines.join("\n");
}
