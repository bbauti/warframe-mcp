import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { findItemSlug, getOrders, getStatistics } from "../lib/api/market";
import { type StatEntry } from "../types/api-responses";

export const schema = {
  item: z
    .string()
    .describe(
      "Item name to check price for (e.g. 'Ash Prime Set', 'Condition Overload', 'Primed Continuity')",
    ),
  platform: z.enum(["pc", "ps4", "xbox", "switch"]).optional().describe("Gaming platform (default: pc)"),
};

export const metadata: ToolMetadata = {
  name: "check_market",
  description:
    "Check current trading prices for an item on warframe.market. Returns median price, price range, recent volume, top sell offers from online players, and 90-day price trend. Use this when a user asks about item value, whether to buy or sell, or trading prices.",
  annotations: {
    title: "Check Market",
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

function formatNumber(value: number | undefined, digits = 2): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/A";
  }

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summarize48Hours(entries: StatEntry[]): {
  median: number;
  minPrice: number;
  maxPrice: number;
  volume: number;
} | null {
  if (entries.length === 0) {
    return null;
  }

  const sorted = [...entries].sort((a, b) => parseTimestamp(a.datetime) - parseTimestamp(b.datetime));
  const latest = sorted[sorted.length - 1];

  if (!latest) {
    return null;
  }

  const minPrice = Math.min(...sorted.map((entry) => entry.min_price));
  const maxPrice = Math.max(...sorted.map((entry) => entry.max_price));
  const volume = sorted.reduce((sum, entry) => sum + Math.max(0, entry.volume), 0);

  return {
    median: latest.median,
    minPrice,
    maxPrice,
    volume,
  };
}

function summarize90DayTrend(entries: StatEntry[]): {
  firstWeekAvg: number;
  lastWeekAvg: number;
  changePct: number;
  direction: "up" | "down" | "flat";
} | null {
  if (entries.length < 2) {
    return null;
  }

  const enriched = entries
    .map((entry) => ({
      entry,
      timestamp: parseTimestamp(entry.datetime),
    }))
    .filter((entry) => entry.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (enriched.length < 2) {
    return null;
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const firstTimestamp = enriched[0].timestamp;
  const lastTimestamp = enriched[enriched.length - 1].timestamp;

  const firstWeek = enriched
    .filter((entry) => entry.timestamp <= firstTimestamp + weekMs)
    .map((entry) => entry.entry.avg_price);

  const lastWeek = enriched
    .filter((entry) => entry.timestamp >= lastTimestamp - weekMs)
    .map((entry) => entry.entry.avg_price);

  if (firstWeek.length === 0 || lastWeek.length === 0) {
    return null;
  }

  const firstWeekAvg = average(firstWeek);
  const lastWeekAvg = average(lastWeek);

  if (firstWeekAvg <= 0) {
    return null;
  }

  const changePct = ((lastWeekAvg - firstWeekAvg) / firstWeekAvg) * 100;
  const direction = changePct > 2 ? "up" : changePct < -2 ? "down" : "flat";

  return {
    firstWeekAvg,
    lastWeekAvg,
    changePct,
    direction,
  };
}

function humanizeUrlName(urlName: string): string {
  return urlName
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function checkMarket({ item, platform }: InferSchema<typeof schema>): Promise<string> {
  const selectedPlatform = platform ?? "pc";

  try {
    const urlName = await findItemSlug(item);

    if (!urlName) {
      return `No market listing found for "${item}". Try the exact trade name (for Prime gear, adding "Set" often helps).`;
    }

    const [statistics, orders] = await Promise.all([
      getStatistics(urlName, selectedPlatform),
      getOrders(urlName, selectedPlatform),
    ]);

    const stats48Hours = statistics.statistics_closed["48hours"] ?? [];
    const stats90Days = statistics.statistics_closed["90days"] ?? [];

    const recentSummary = summarize48Hours(stats48Hours);
    const trendSummary = summarize90DayTrend(stats90Days);

    const topSellers = orders
      .filter((order) => order.order_type === "sell" && order.user.status === "ingame")
      .sort((a, b) => a.platinum - b.platinum)
      .slice(0, 5);

    const lines: string[] = [];

    lines.push(`Market price check for "${item}" (${selectedPlatform.toUpperCase()}):`);
    lines.push(`Matched listing: ${humanizeUrlName(urlName)} (${urlName})`);

    if (recentSummary) {
      lines.push(`Current median price (48h): ${formatNumber(recentSummary.median)} platinum`);
      lines.push(`Price range (48h): ${formatNumber(recentSummary.minPrice)} - ${formatNumber(recentSummary.maxPrice)} platinum`);
      lines.push(`Recent volume (48h): ${formatNumber(recentSummary.volume, 0)} trades`);
    } else {
      lines.push("Current median price (48h): No recent sales data.");
      lines.push("Price range (48h): No recent sales data.");
      lines.push("Recent volume (48h): No recent sales data.");
    }

    if (trendSummary) {
      const trendLabel =
        trendSummary.direction === "up" ? "Upward" : trendSummary.direction === "down" ? "Downward" : "Mostly flat";

      lines.push(
        `90-day trend: ${trendLabel} (${trendSummary.changePct >= 0 ? "+" : ""}${formatNumber(trendSummary.changePct)}%) | first-week avg ${formatNumber(trendSummary.firstWeekAvg)}p -> last-week avg ${formatNumber(trendSummary.lastWeekAvg)}p`,
      );
    } else {
      lines.push("90-day trend: Not enough historical data.");
    }

    lines.push("");
    lines.push("Top 5 cheapest active sell offers (online players):");

    if (topSellers.length === 0) {
      lines.push("No active sellers found, check back later");
    } else {
      for (const [index, order] of topSellers.entries()) {
        lines.push(
          `${index + 1}. ${formatNumber(order.platinum)}p | Qty ${formatNumber(order.quantity, 0)} | ${order.user.ingame_name} (rep ${formatNumber(order.user.reputation, 0)})`,
        );
      }
    }

    return lines.join("\n");
  } catch (error) {
    const message = getErrorMessage(error);

    if (isRateLimitedMessage(message)) {
      return "warframe.market is rate limited, try again shortly.";
    }

    return `Unable to check market price for "${item}": ${message}`;
  }
}
