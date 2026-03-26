import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchDrops } from "../lib/api/wfcd";
import { findItemSlug, getStatistics } from "../lib/api/market";
import { type StatEntry, type WfcdDrop } from "../types/api-responses";

export const schema = {
  item: z
    .string()
    .describe("Item to farm (e.g. 'Ash Prime', 'Condition Overload', 'Argon Crystal', 'Neural Sensors')"),
};

export const metadata: ToolMetadata = {
  name: "farm_guide",
  description:
    "Get a comprehensive farming guide for any Warframe item. Shows all drop sources ranked by efficiency, drop rates, recommended farming frames/strategies, and a buy-vs-farm comparison using warframe.market prices. Use when a user asks how to get or farm something.",
  annotations: {
    title: "Farm Guide",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

type SourceType = "Relic" | "Enemy Drop" | "Mission Reward" | "Bounty" | "Resource" | "Other";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function isRateLimitedMessage(message: string): boolean {
  return /rate limited/i.test(message);
}

function formatNumber(value: number | undefined, digits = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function toPercent(value: number | undefined): number | null {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return value <= 1 ? value * 100 : value;
}

function formatPercent(value: number | undefined): string {
  const percent = toPercent(value);

  if (percent === null) {
    return "N/A";
  }

  return `${formatNumber(percent)}%`;
}

function normalize(text: string): string {
  return text.toLowerCase();
}

function looksLikeResource(text: string): boolean {
  return /argon|neural|sensor|cell|ferrite|alloy|plastid|oxium|cryotic|polymer|nano spores|tellurium|rubedo|salvage|mutagen|sample|orokin/i.test(
    text,
  );
}

function classifyDropSource(drop: WfcdDrop): SourceType {
  const place = normalize(drop.place ?? "");
  const item = normalize(drop.item ?? "");
  const combined = `${place} ${item}`;

  if (/\brelic\b|\blith\b|\bmeso\b|\bneo\b|\baxi\b/.test(combined)) {
    return "Relic";
  }

  if (/\bbounty\b|cetus|fortuna|orb vallis|deimos|cambion|zariman/.test(combined)) {
    return "Bounty";
  }

  if (/\benemy\b|\beximus\b|\bstalker\b|\bacolyte\b|\bboss\b|\bassassin\b|\bdemolisher\b|\bjuggernaut\b/.test(combined)) {
    return "Enemy Drop";
  }

  if (
    /\brotation\b|\bmission\b|defense|survival|interception|disruption|excavation|spy|capture|assassination|sanctuary|sortie|arbitration/.test(
      combined,
    )
  ) {
    return "Mission Reward";
  }

  if (looksLikeResource(drop.item ?? "") || looksLikeResource(drop.place ?? "")) {
    return "Resource";
  }

  return "Other";
}

function groupDropsBySourceType(drops: WfcdDrop[]): Map<SourceType, WfcdDrop[]> {
  const groups = new Map<SourceType, WfcdDrop[]>();

  for (const drop of drops) {
    const sourceType = classifyDropSource(drop);
    const group = groups.get(sourceType) ?? [];
    group.push(drop);
    groups.set(sourceType, group);
  }

  for (const [sourceType, group] of groups.entries()) {
    groups.set(
      sourceType,
      [...group].sort((a, b) => {
        const chanceA = toPercent(a.chance) ?? -1;
        const chanceB = toPercent(b.chance) ?? -1;
        return chanceB - chanceA;
      }),
    );
  }

  return groups;
}

function extractRelicNames(drops: WfcdDrop[]): string[] {
  const relics = new Set<string>();

  for (const drop of drops) {
    const text = `${drop.place ?? ""} ${drop.item ?? ""}`;
    const matches = text.match(/\b(?:Lith|Meso|Neo|Axi)\s+[A-Z0-9]+\b/gi) ?? [];

    for (const match of matches) {
      relics.add(match.trim());
    }
  }

  return [...relics].slice(0, 8);
}

function inferOpenWorldsFromBounties(drops: WfcdDrop[]): string[] {
  const worlds = new Set<string>();

  for (const drop of drops) {
    const place = normalize(drop.place ?? "");

    if (place.includes("cetus") || place.includes("plains")) {
      worlds.add("Plains of Eidolon (Cetus)");
    }

    if (place.includes("fortuna") || place.includes("orb vallis")) {
      worlds.add("Orb Vallis (Fortuna)");
    }

    if (place.includes("deimos") || place.includes("cambion")) {
      worlds.add("Cambion Drift (Necralisk)");
    }

    if (place.includes("zariman")) {
      worlds.add("Zariman");
    }
  }

  return [...worlds];
}

function detectPrimeVaultStatus(drops: WfcdDrop[]): "vaulted" | "unvaulted" | "unknown" {
  let hasVaulted = false;
  let hasUnvaulted = false;

  for (const drop of drops) {
    const combined = `${drop.place ?? ""} ${drop.item ?? ""} ${drop.rarity ?? ""}`.toLowerCase();

    if (combined.includes("unvault")) {
      hasUnvaulted = true;
    }

    if (combined.includes("vaulted")) {
      hasVaulted = true;
    }
  }

  if (hasUnvaulted) {
    return "unvaulted";
  }

  if (hasVaulted) {
    return "vaulted";
  }

  return "unknown";
}

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getLatestMedian(entries: StatEntry[]): number | null {
  if (entries.length === 0) {
    return null;
  }

  const sorted = [...entries].sort((a, b) => parseTimestamp(a.datetime) - parseTimestamp(b.datetime));
  const latest = sorted[sorted.length - 1];

  if (!latest || typeof latest.median !== "number") {
    return null;
  }

  return latest.median;
}

function humanizeUrlName(urlName: string): string {
  return urlName
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSourceTypeOrder(): SourceType[] {
  return ["Relic", "Enemy Drop", "Mission Reward", "Bounty", "Resource", "Other"];
}

function buildRecommendedStrategy(item: string, groupedDrops: Map<SourceType, WfcdDrop[]>): string[] {
  const strategyLines: string[] = [];

  const relicDrops = groupedDrops.get("Relic") ?? [];
  const enemyDrops = groupedDrops.get("Enemy Drop") ?? [];
  const bountyDrops = groupedDrops.get("Bounty") ?? [];
  const missionDrops = groupedDrops.get("Mission Reward") ?? [];
  const resourceDrops = groupedDrops.get("Resource") ?? [];

  if (relicDrops.length > 0) {
    const relics = extractRelicNames(relicDrops);
    if (relics.length > 0) {
      strategyLines.push(
        `Relic route: target ${relics.join(", ")}. For cracking runs, prioritize Capture or Exterminate fissures for best relics-per-hour and use squads to improve refinement consistency.`,
      );
    } else {
      strategyLines.push(
        "Relic route: focus the listed relics and run fast fissures (Capture/Exterminate) to maximize openings per hour.",
      );
    }
  }

  if (enemyDrops.length > 0) {
    strategyLines.push(
      "Enemy drop route: farm dense enemy spawns and bring loot frames - Nekros (Desecrate, ~54% extra corpse rolls), Khora with Pilfering Strangledome, or Hydroid with Pilfering Swarm.",
    );
  }

  if (bountyDrops.length > 0) {
    const worlds = inferOpenWorldsFromBounties(bountyDrops);
    if (worlds.length > 0) {
      strategyLines.push(
        `Bounty route: focus ${worlds.join(", ")} and target the listed bounty tier/rotation where this reward appears. Group runs improve clear speed and consistency.`,
      );
    } else {
      strategyLines.push(
        "Bounty route: run the specific bounty tiers/rotations shown above and repeat the fastest tier where this drop is present.",
      );
    }
  }

  if (missionDrops.length > 0) {
    strategyLines.push(
      "Mission reward route: prioritize the listed node/mission type and repeat the correct rotation (A/B/C). For endless missions, coordinated squads usually improve reward-per-minute.",
    );
  }

  if (resourceDrops.length > 0 || looksLikeResource(item)) {
    const bestResourceNode = resourceDrops[0]?.place ?? missionDrops[0]?.place;
    strategyLines.push(
      `Resource route: ${bestResourceNode ? `start at ${bestResourceNode}. ` : ""}Use Resource Booster + Resource Drop Chance Booster/Smeeta Kavat to increase yield, and favor high-density endless nodes.`,
    );
  }

  if (strategyLines.length === 0) {
    strategyLines.push(
      "Farm the highest chance sources first, then pivot to faster mission types with coordinated squads to optimize attempts per hour.",
    );
  }

  const isPrimeItem = /\bprime\b/i.test(item);
  if (isPrimeItem) {
    const allDrops = [...(groupedDrops.get("Relic") ?? []), ...(groupedDrops.get("Other") ?? [])];
    const vaultStatus = detectPrimeVaultStatus(allDrops);

    if (vaultStatus === "vaulted") {
      strategyLines.push(
        "Prime relic note: at least one source appears vaulted in available data, so farming may depend on unvault windows or relic inventory trading.",
      );
    }

    if (vaultStatus === "unvaulted") {
      strategyLines.push("Prime relic note: available data suggests relic sources are currently obtainable (unvaulted).");
    }

    if (vaultStatus === "unknown") {
      strategyLines.push(
        "Prime relic note: vault status is not explicit in this drop data; verify current relic availability in-game or official drop tables.",
      );
    }
  }

  return strategyLines;
}

export default async function farmGuide({ item }: InferSchema<typeof schema>): Promise<string> {
  const drops = await searchDrops(item);

  if (drops.length === 0) {
    return `No drop data found for "${item}". Try a more specific item name (for Prime gear include part/set), or check spelling.`;
  }

  const sortedDrops = [...drops].sort((a, b) => {
    const chanceA = toPercent(a.chance) ?? -1;
    const chanceB = toPercent(b.chance) ?? -1;
    return chanceB - chanceA;
  });

  const groupedDrops = groupDropsBySourceType(sortedDrops);

  let marketLine = "No matching warframe.market listing found (likely non-tradeable or uncommon trade name).";
  let marketMedian: number | null = null;

  try {
    const urlName = await findItemSlug(item);

    if (urlName) {
      const statistics = await getStatistics(urlName, "pc");
      const stats48Hours = statistics.statistics_closed["48hours"] ?? [];
      marketMedian = getLatestMedian(stats48Hours);

      if (marketMedian !== null) {
        marketLine = `Market price (PC, 48h median): ${formatNumber(marketMedian)} platinum (${humanizeUrlName(urlName)}).`;
      } else {
        marketLine = `Market listing found (${humanizeUrlName(urlName)}), but no recent 48h sales median is available.`;
      }
    }
  } catch (error) {
    const message = getErrorMessage(error);
    marketLine = isRateLimitedMessage(message)
      ? "warframe.market is rate limited, try again shortly."
      : `Market data unavailable right now: ${message}`;
  }

  const strategyLines = buildRecommendedStrategy(item, groupedDrops);

  const bestDropChance = toPercent(sortedDrops[0]?.chance);

  let buyVsFarmLine = "Buy vs Farm: without recent market data, prioritize the highest drop-chance sources above.";

  if (marketMedian !== null && bestDropChance !== null) {
    if (marketMedian <= 25 && bestDropChance < 8) {
      buyVsFarmLine =
        `Buy vs Farm: market median is low (${formatNumber(marketMedian)}p) while top drop chance is ${formatNumber(bestDropChance)}%, so buying is usually faster unless you specifically want the farm.`;
    } else if (marketMedian >= 80 && bestDropChance >= 12) {
      buyVsFarmLine =
        `Buy vs Farm: market median is high (${formatNumber(marketMedian)}p) and top drop chance is ${formatNumber(bestDropChance)}%, so farming is typically better value.`;
    } else {
      buyVsFarmLine =
        `Buy vs Farm: market median is ${formatNumber(marketMedian)}p and top drop chance is ${formatNumber(bestDropChance)}%; choose based on whether you value time or platinum more.`;
    }
  } else if (marketMedian === null) {
    buyVsFarmLine =
      "Buy vs Farm: this item looks non-tradeable or has insufficient market activity, so farming is the primary path.";
  }

  const lines: string[] = [];

  lines.push(`Farming guide for "${item}":`);
  lines.push("");
  lines.push("Drop Sources:");

  for (const sourceType of getSourceTypeOrder()) {
    const sourceDrops = groupedDrops.get(sourceType) ?? [];

    if (sourceDrops.length === 0) {
      continue;
    }

    lines.push("");
    lines.push(`${sourceType}:`);

    const topEntries = sourceDrops.slice(0, 8);

    for (const [index, drop] of topEntries.entries()) {
      lines.push(
        `${index + 1}. ${drop.place || "Unknown location"} | ${formatPercent(drop.chance)} | ${drop.rarity || "Unknown rarity"}`,
      );
    }

    if (sourceDrops.length > topEntries.length) {
      lines.push(`...and ${sourceDrops.length - topEntries.length} more ${sourceType.toLowerCase()} sources.`);
    }
  }

  lines.push("");
  lines.push("Recommended Strategy:");

  for (const strategyLine of strategyLines) {
    lines.push(`- ${strategyLine}`);
  }

  lines.push("");
  lines.push("Buy vs Farm:");
  lines.push(marketLine);
  lines.push(buyVsFarmLine);

  return lines.join("\n");
}
