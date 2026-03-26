import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchWeapons } from "../lib/api/wfcd";
import { type WfcdWeapon } from "../types/api-responses";

export const schema = {
  name: z
    .string()
    .describe("Weapon name to look up (e.g. 'Braton Prime', 'Soma Prime', 'Rubico Prime')"),
};

export const metadata: ToolMetadata = {
  name: "get_weapon",
  description:
    "Get detailed stats for a Warframe weapon including damage breakdown, critical chance, critical multiplier, status chance, fire rate, magazine size, reload time, multishot, riven disposition, and polarities. Use this to analyze weapons for build planning.",
  annotations: {
    title: "Get Weapon",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

const DAMAGE_PRIORITY = [
  "Impact",
  "Puncture",
  "Slash",
  "Heat",
  "Cold",
  "Electricity",
  "Toxin",
  "Blast",
  "Corrosive",
  "Gas",
  "Magnetic",
  "Radiation",
  "Viral",
  "Void",
  "True",
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickBestWeaponMatch(query: string, candidates: WfcdWeapon[]): WfcdWeapon | null {
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

function formatPercent(value: number | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  const normalizedValue = value <= 1 ? value * 100 : value;
  return `${formatNumber(normalizedValue)}%`;
}

function formatDamageBreakdown(damage: Record<string, number> | undefined): string {
  if (!damage) {
    return "No detailed damage breakdown available.";
  }

  const entries = Object.entries(damage).filter(([, amount]) => typeof amount === "number" && amount > 0);

  if (entries.length === 0) {
    return "No detailed damage breakdown available.";
  }

  entries.sort(([typeA], [typeB]) => {
    const indexA = DAMAGE_PRIORITY.indexOf(typeA);
    const indexB = DAMAGE_PRIORITY.indexOf(typeB);

    if (indexA === -1 && indexB === -1) {
      return typeA.localeCompare(typeB);
    }

    if (indexA === -1) {
      return 1;
    }

    if (indexB === -1) {
      return -1;
    }

    return indexA - indexB;
  });

  return entries.map(([type, amount]) => `${type}: ${formatNumber(amount)}`).join(", ");
}

export default async function getWeapon({ name }: InferSchema<typeof schema>): Promise<string> {
  const results = await searchWeapons(name);
  const weapon = pickBestWeaponMatch(name, results);

  if (!weapon) {
    return `No weapons found matching "${name}". Try a different name or check spelling.`;
  }

  const lines: string[] = [];

  lines.push(`Weapon: ${weapon.name}`);
  lines.push(`Category: ${weapon.category ?? weapon.type ?? "Unknown"}`);
  lines.push(`Mastery Requirement: ${typeof weapon.masteryReq === "number" ? weapon.masteryReq : "N/A"}`);
  lines.push(`Trigger: ${weapon.trigger ?? "Unknown"}`);
  lines.push(`Noise: ${weapon.noise ?? "Unknown"}`);
  lines.push(`Total Damage: ${formatNumber(weapon.totalDamage)}`);
  lines.push(`Damage Breakdown: ${formatDamageBreakdown(weapon.damage)}`);
  lines.push(`Critical Chance: ${formatPercent(weapon.criticalChance)}`);
  lines.push(`Critical Multiplier: ${formatNumber(weapon.criticalMultiplier)}x`);
  lines.push(`Status Chance: ${formatPercent(weapon.statusChance)}`);
  lines.push(`Fire Rate: ${formatNumber(weapon.fireRate)}`);
  lines.push(`Magazine Size: ${formatNumber(weapon.magazineSize, 0)}`);
  lines.push(`Reload Time: ${formatNumber(weapon.reloadTime)}s`);
  lines.push(`Multishot: ${formatNumber(weapon.multishot)}`);
  lines.push(`Riven Disposition: ${formatNumber(weapon.disposition)}`);
  lines.push(
    `Polarities: ${Array.isArray(weapon.polarities) && weapon.polarities.length > 0 ? weapon.polarities.join(", ") : "None"}`,
  );

  if (typeof weapon.description === "string" && weapon.description.trim().length > 0) {
    lines.push(`Description: ${weapon.description.trim()}`);
  }

  return lines.join("\n");
}
