import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchWarframes } from "../lib/api/wfcd";
import { type WfcdWarframe } from "../types/api-responses";

export const schema = {
  name: z.string().describe("Warframe name to look up (e.g. 'Mesa Prime', 'Saryn', 'Wisp')"),
};

export const metadata: ToolMetadata = {
  name: "get_warframe",
  description:
    "Get detailed stats for a Warframe including health, shields, armor, energy, sprint speed, abilities with descriptions, passive, aura polarity, and mod polarities. Use this to understand a frame's capabilities for build planning.",
  annotations: {
    title: "Get Warframe",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickBestWarframeMatch(query: string, candidates: WfcdWarframe[]): WfcdWarframe | null {
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

function formatNumber(value: number | undefined, digits = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function getPassiveDescription(passive: WfcdWarframe["passive"]): string {
  if (typeof passive === "string") {
    return passive.trim() || "No passive listed.";
  }

  if (passive && typeof passive === "object" && typeof passive.description === "string") {
    return passive.description.trim() || "No passive listed.";
  }

  return "No passive listed.";
}

export default async function getWarframe({ name }: InferSchema<typeof schema>): Promise<string> {
  const results = await searchWarframes(name);
  const warframe = pickBestWarframeMatch(name, results);

  if (!warframe) {
    return `No warframes found matching "${name}". Try a different name or check spelling.`;
  }

  const lines: string[] = [];

  lines.push(`Warframe: ${warframe.name}`);
  lines.push(`Health: ${formatNumber(warframe.health, 0)}`);
  lines.push(`Shields: ${formatNumber(warframe.shield, 0)}`);
  lines.push(`Armor: ${formatNumber(warframe.armor, 0)}`);
  lines.push(`Energy: ${formatNumber(warframe.power, 0)}`);
  lines.push(`Sprint Speed: ${formatNumber(warframe.sprintSpeed)}`);
  lines.push(`Aura Polarity: ${warframe.aura ?? warframe.auraPolarity ?? "Unknown"}`);
  lines.push(
    `Mod Polarities: ${Array.isArray(warframe.polarities) && warframe.polarities.length > 0 ? warframe.polarities.join(", ") : "None"}`,
  );
  lines.push(`Passive: ${getPassiveDescription(warframe.passive)}`);

  if (Array.isArray(warframe.abilities) && warframe.abilities.length > 0) {
    lines.push("Abilities:");

    for (const [index, ability] of warframe.abilities.entries()) {
      const abilityName = ability.name?.trim() || `Ability ${index + 1}`;
      const abilityDescription = ability.description?.trim() || "No description available.";
      lines.push(`${index + 1}. ${abilityName}: ${abilityDescription}`);
    }
  } else {
    lines.push("Abilities: No ability data available.");
  }

  if (typeof warframe.description === "string" && warframe.description.trim().length > 0) {
    lines.push(`Description: ${warframe.description.trim()}`);
  }

  return lines.join("\n");
}
