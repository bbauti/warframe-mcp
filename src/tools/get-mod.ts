import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchMods } from "../lib/api/wfcd";
import { type WfcdMod } from "../types/api-responses";

export const schema = {
  name: z
    .string()
    .describe("Mod name to search for (e.g. 'Serration', 'Split Chamber', 'Vital Sense')"),
};

export const metadata: ToolMetadata = {
  name: "get_mod",
  description:
    "Get detailed information about a Warframe mod including stats at each rank, drain, polarity, rarity, compatible equipment type, and what it does. Use this to check exact mod values for build calculations.",
  annotations: {
    title: "Get Mod",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickBestModMatch(query: string, candidates: WfcdMod[]): WfcdMod | null {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedQuery = normalize(query);

  const exactMatch = candidates.find((candidate) => normalize(candidate.name) === normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = candidates.find((candidate) => normalize(candidate.name).startsWith(normalizedQuery));
  if (prefixMatch) {
    return prefixMatch;
  }

  const partialMatch = candidates.find((candidate) => normalize(candidate.name).includes(normalizedQuery));
  if (partialMatch) {
    return partialMatch;
  }

  return candidates[0];
}

function formatDrain(baseDrain: number | undefined, fusionLimit: number | undefined): string {
  if (typeof baseDrain !== "number") {
    return "N/A";
  }

  if (typeof fusionLimit !== "number") {
    return `${baseDrain}`;
  }

  return `${baseDrain} (max rank drain: ${baseDrain + fusionLimit})`;
}

export default async function getMod({ name }: InferSchema<typeof schema>): Promise<string> {
  const results = await searchMods(name);
  const mod = pickBestModMatch(name, results);

  if (!mod) {
    return `No mods found matching "${name}". Try a different name or check spelling.`;
  }

  const lines: string[] = [];

  lines.push(`Mod: ${mod.name}`);
  lines.push(`Type: ${mod.type ?? "Unknown"}`);
  lines.push(`Compatible With: ${mod.compatName ?? "Unknown"}`);
  lines.push(`Rarity: ${mod.rarity ?? "Unknown"}`);
  lines.push(`Polarity: ${mod.polarity ?? "Unknown"}`);
  lines.push(`Drain: ${formatDrain(mod.baseDrain, mod.fusionLimit)}`);

  if (typeof mod.description === "string" && mod.description.trim().length > 0) {
    lines.push(`Description: ${mod.description.trim()}`);
  }

  if (Array.isArray(mod.stats) && mod.stats.length > 0) {
    lines.push(`Base Stats: ${mod.stats.join(" | ")}`);
  }

  if (Array.isArray(mod.levelStats) && mod.levelStats.length > 0) {
    lines.push("Rank Stats:");

    for (const [index, level] of mod.levelStats.entries()) {
      const stats = Array.isArray(level.stats) && level.stats.length > 0 ? level.stats.join(" | ") : "No stats listed";
      lines.push(`Rank ${index}: ${stats}`);
    }
  } else {
    lines.push("Rank Stats: No rank-by-rank stats available.");
  }

  return lines.join("\n");
}
