import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchWeapons } from "../lib/api/wfcd";
import { recommendAndCalculate, type BuildRecommendation } from "../lib/damage/calculator";
import { type WfcdWeapon } from "../types/api-responses";

export const schema = {
  weapons: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      "List of 2-4 weapon names to compare (e.g. ['Soma Prime', 'Braton Prime', 'Boltor Prime'])",
    ),
  include_build: z.boolean().optional().describe("Also calculate DPS with optimal builds for each weapon (default: false)"),
};

export const metadata: ToolMetadata = {
  name: "compare_weapons",
  description:
    "Compare 2-4 weapons side by side showing all stats. Optionally includes optimal build DPS calculations. Use when a user is choosing between weapons or asks which weapon is better.",
  annotations: {
    title: "Compare Weapons",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

interface ResolvedWeapon {
  query: string;
  weapon: WfcdWeapon;
}

interface MissingWeapon {
  query: string;
  reason: string;
}

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

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function formatNumber(value: number | undefined, digits = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function normalizePercentValue(value: number | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  if (value <= 1) {
    return value * 100;
  }

  return value;
}

function normalizeChance(value: number | undefined): number {
  const normalized = normalizePercentValue(value);
  if (normalized === null) {
    return 0;
  }

  return Math.max(0, normalized / 100);
}

function formatPercent(value: number | undefined): string {
  const normalized = normalizePercentValue(value);
  if (normalized === null) {
    return "N/A";
  }

  return `${formatNumber(normalized)}%`;
}

function sumDamage(damage: Record<string, number> | undefined): number {
  if (!damage || typeof damage !== "object") {
    return 0;
  }

  return Object.values(damage)
    .filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0)
    .reduce((total, value) => total + value, 0);
}

function getTotalDamage(weapon: WfcdWeapon): number {
  if (typeof weapon.totalDamage === "number" && Number.isFinite(weapon.totalDamage) && weapon.totalDamage > 0) {
    return weapon.totalDamage;
  }

  return sumDamage(weapon.damage);
}

function formatDamageBreakdown(damage: Record<string, number> | undefined): string {
  if (!damage || typeof damage !== "object") {
    return "N/A";
  }

  const entries = Object.entries(damage)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    return "N/A";
  }

  return entries.map(([type, value]) => `${type} ${formatNumber(value)}`).join(", ");
}

function toMetricValue(value: string): string {
  return value.replace(/\|/g, "/");
}

function buildTable(headers: string[], rows: Array<{ metric: string; values: string[] }>): string {
  const headerLine = `| Metric | ${headers.map((header) => toMetricValue(header)).join(" | ")} |`;
  const dividerLine = `| --- | ${headers.map(() => "---").join(" | ")} |`;
  const rowLines = rows.map((row) => {
    const values = row.values.map((value) => toMetricValue(value));
    return `| ${toMetricValue(row.metric)} | ${values.join(" | ")} |`;
  });

  return [headerLine, dividerLine, ...rowLines].join("\n");
}

function calcBurstProxy(weapon: WfcdWeapon): number {
  const totalDamage = getTotalDamage(weapon);
  const fireRate = typeof weapon.fireRate === "number" && weapon.fireRate > 0 ? weapon.fireRate : 1;
  const multishot = typeof weapon.multishot === "number" && weapon.multishot > 0 ? weapon.multishot : 1;
  return totalDamage * fireRate * multishot;
}

function calcStatusThroughput(weapon: WfcdWeapon): number {
  const statusChance = normalizeChance(weapon.statusChance);
  const fireRate = typeof weapon.fireRate === "number" && weapon.fireRate > 0 ? weapon.fireRate : 1;
  const multishot = typeof weapon.multishot === "number" && weapon.multishot > 0 ? weapon.multishot : 1;
  return statusChance * fireRate * multishot;
}

function calcCritScore(weapon: WfcdWeapon): number {
  const critChance = normalizeChance(weapon.criticalChance);
  const critMultiplier =
    typeof weapon.criticalMultiplier === "number" && weapon.criticalMultiplier > 0
      ? weapon.criticalMultiplier
      : 1;
  return critChance * critMultiplier;
}

function getWeaponRole(weapon: WfcdWeapon): string {
  const critChance = normalizeChance(weapon.criticalChance);
  const statusChance = normalizeChance(weapon.statusChance);

  if (critChance >= 0.3 && statusChance >= 0.2) {
    return "strong hybrid crit/status scaling";
  }

  if (critChance >= 0.3) {
    return "crit-focused builds";
  }

  if (statusChance >= 0.3) {
    return "status-focused elemental/proc setups";
  }

  if (calcBurstProxy(weapon) >= 200) {
    return "raw damage throughput";
  }

  return "general-purpose or comfort setups";
}

async function resolveWeapon(query: string): Promise<ResolvedWeapon | MissingWeapon> {
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query,
      reason: "Empty weapon name.",
    };
  }

  try {
    const results = await searchWeapons(trimmed);
    const matched = pickBestWeaponMatch(trimmed, results);

    if (!matched) {
      return {
        query: trimmed,
        reason: "No match found.",
      };
    }

    return {
      query: trimmed,
      weapon: matched,
    };
  } catch (error) {
    return {
      query: trimmed,
      reason: getErrorMessage(error),
    };
  }
}

async function resolveBuild(resolvedWeapon: ResolvedWeapon): Promise<{
  weaponName: string;
  build: BuildRecommendation | null;
  error?: string;
}> {
  try {
    const build = await recommendAndCalculate(resolvedWeapon.weapon.name, "general_dps");

    return {
      weaponName: resolvedWeapon.weapon.name,
      build,
    };
  } catch (error) {
    return {
      weaponName: resolvedWeapon.weapon.name,
      build: null,
      error: getErrorMessage(error),
    };
  }
}

function getBestByScore<T>(entries: T[], scoreFn: (entry: T) => number): T | null {
  if (entries.length === 0) {
    return null;
  }

  let best = entries[0];
  let bestScore = scoreFn(best);

  for (let index = 1; index < entries.length; index += 1) {
    const candidate = entries[index];
    const score = scoreFn(candidate);

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

export default async function compareWeapons({ weapons, include_build }: InferSchema<typeof schema>): Promise<string> {
  const includeBuild = include_build === true;
  const requestedWeapons = weapons.slice(0, 4);

  const resolved = await Promise.all(requestedWeapons.map((weapon) => resolveWeapon(weapon)));
  const foundWeapons: ResolvedWeapon[] = [];
  const missingWeapons: MissingWeapon[] = [];

  for (const entry of resolved) {
    if ("weapon" in entry) {
      foundWeapons.push(entry);
    } else {
      missingWeapons.push(entry);
    }
  }

  if (foundWeapons.length < 2) {
    const lines: string[] = [];
    lines.push("Unable to compare weapons: fewer than 2 valid weapon matches were found.");

    if (missingWeapons.length > 0) {
      lines.push("Missing weapons:");
      for (const missing of missingWeapons) {
        lines.push(`- ${missing.query}: ${missing.reason}`);
      }
    }

    return lines.join("\n");
  }

  const headers = foundWeapons.map((entry) => entry.weapon.name);
  const baseRows: Array<{ metric: string; values: string[] }> = [
    {
      metric: "Total Damage",
      values: foundWeapons.map((entry) => formatNumber(getTotalDamage(entry.weapon))),
    },
    {
      metric: "Damage Types",
      values: foundWeapons.map((entry) => formatDamageBreakdown(entry.weapon.damage)),
    },
    {
      metric: "Crit Chance",
      values: foundWeapons.map((entry) => formatPercent(entry.weapon.criticalChance)),
    },
    {
      metric: "Crit Multiplier",
      values: foundWeapons.map((entry) => `${formatNumber(entry.weapon.criticalMultiplier)}x`),
    },
    {
      metric: "Status Chance",
      values: foundWeapons.map((entry) => formatPercent(entry.weapon.statusChance)),
    },
    {
      metric: "Fire Rate",
      values: foundWeapons.map((entry) => formatNumber(entry.weapon.fireRate)),
    },
    {
      metric: "Magazine",
      values: foundWeapons.map((entry) => formatNumber(entry.weapon.magazineSize, 0)),
    },
    {
      metric: "Reload",
      values: foundWeapons.map((entry) => `${formatNumber(entry.weapon.reloadTime)}s`),
    },
    {
      metric: "Multishot",
      values: foundWeapons.map((entry) => formatNumber(entry.weapon.multishot)),
    },
    {
      metric: "MR Requirement",
      values: foundWeapons.map((entry) => formatNumber(entry.weapon.masteryReq, 0)),
    },
    {
      metric: "Riven Disposition",
      values: foundWeapons.map((entry) => formatNumber(entry.weapon.disposition)),
    },
  ];

  const lines: string[] = [];
  lines.push(`Weapon Comparison (${foundWeapons.length} weapons)`);
  lines.push("");

  if (missingWeapons.length > 0) {
    lines.push("Unmatched Inputs:");
    for (const missing of missingWeapons) {
      lines.push(`- ${missing.query}: ${missing.reason}`);
    }
    lines.push("");
  }

  lines.push("Base Stat Comparison:");
  lines.push(buildTable(headers, baseRows));

  const queryMapLines = foundWeapons
    .filter((entry) => normalize(entry.query) !== normalize(entry.weapon.name))
    .map((entry) => `- ${entry.query} -> ${entry.weapon.name}`);

  if (queryMapLines.length > 0) {
    lines.push("");
    lines.push("Resolved Name Mapping:");
    lines.push(...queryMapLines);
  }

  let buildResults: Array<{ weaponName: string; build: BuildRecommendation | null; error?: string }> = [];

  if (includeBuild) {
    buildResults = await Promise.all(foundWeapons.map((entry) => resolveBuild(entry)));

    const buildByWeapon = new Map<string, { weaponName: string; build: BuildRecommendation | null; error?: string }>();
    for (const result of buildResults) {
      buildByWeapon.set(result.weaponName, result);
    }

    const buildRows: Array<{ metric: string; values: string[] }> = [
      {
        metric: "Recommended Goal",
        values: foundWeapons.map((entry) => buildByWeapon.get(entry.weapon.name)?.build?.goal ?? "N/A"),
      },
      {
        metric: "Damage per Shot",
        values: foundWeapons.map((entry) =>
          formatNumber(buildByWeapon.get(entry.weapon.name)?.build?.result.damagePerShot),
        ),
      },
      {
        metric: "Burst DPS",
        values: foundWeapons.map((entry) => formatNumber(buildByWeapon.get(entry.weapon.name)?.build?.result.burstDps)),
      },
      {
        metric: "Sustained DPS",
        values: foundWeapons.map((entry) =>
          formatNumber(buildByWeapon.get(entry.weapon.name)?.build?.result.sustainedDps),
        ),
      },
      {
        metric: "Effective Crit Chance",
        values: foundWeapons.map((entry) => {
          const value = buildByWeapon.get(entry.weapon.name)?.build?.result.effectiveCritChance;
          return typeof value === "number" ? `${formatNumber(value * 100)}%` : "N/A";
        }),
      },
      {
        metric: "Effective Status Chance",
        values: foundWeapons.map((entry) => {
          const value = buildByWeapon.get(entry.weapon.name)?.build?.result.effectiveStatusChance;
          return typeof value === "number" ? `${formatNumber(value * 100)}%` : "N/A";
        }),
      },
      {
        metric: "Status Procs/s",
        values: foundWeapons.map((entry) =>
          formatNumber(buildByWeapon.get(entry.weapon.name)?.build?.result.statusProcsPerSecond),
        ),
      },
    ];

    lines.push("");
    lines.push("Optimal Build DPS Comparison (general_dps):");
    lines.push(buildTable(headers, buildRows));

    const buildErrors = buildResults.filter((result) => result.build === null);
    if (buildErrors.length > 0) {
      lines.push("");
      lines.push("Build calculation notes:");
      for (const error of buildErrors) {
        lines.push(`- ${error.weaponName}: ${error.error ?? "Unknown error"}`);
      }
    }
  }

  const bestBurst = getBestByScore(foundWeapons, (entry) => calcBurstProxy(entry.weapon));
  const bestCrit = getBestByScore(foundWeapons, (entry) => calcCritScore(entry.weapon));
  const bestStatus = getBestByScore(foundWeapons, (entry) => calcStatusThroughput(entry.weapon));

  lines.push("");
  lines.push("Verdict:");

  if (bestBurst) {
    lines.push(`- ${bestBurst.weapon.name}: strongest raw burst profile.`);
  }

  if (bestCrit) {
    lines.push(`- ${bestCrit.weapon.name}: strongest crit scaling potential.`);
  }

  if (bestStatus) {
    lines.push(`- ${bestStatus.weapon.name}: best status throughput.`);
  }

  if (includeBuild) {
    const buildEntries = buildResults.filter(
      (result): result is { weaponName: string; build: BuildRecommendation } => result.build !== null,
    );

    const bestBuild = getBestByScore(buildEntries, (entry) => entry.build.result.sustainedDps);
    if (bestBuild) {
      lines.push(
        `- ${bestBuild.weaponName}: highest sustained DPS with optimized recommended build (${formatNumber(bestBuild.build.result.sustainedDps)}).`,
      );
    }
  }

  lines.push("");
  lines.push("Weapon Strength Profiles:");
  for (const entry of foundWeapons) {
    lines.push(`- ${entry.weapon.name}: excels at ${getWeaponRole(entry.weapon)}.`);
  }

  return lines.join("\n");
}
