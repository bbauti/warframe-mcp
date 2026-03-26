import { get, set } from "../cache";
import {
  type MarketItem,
  type MarketOrder,
  type MarketStatistics,
  type StatEntry,
} from "../../types/api-responses";

const MARKET_BASE_URL = "https://api.warframe.market/v1";
const ITEM_LIST_TTL_MS = 4 * 60 * 60 * 1000;
const ORDERS_TTL_MS = 3 * 60 * 1000;
const STATISTICS_TTL_MS = 5 * 60 * 1000;

type Platform = "pc" | "ps4" | "xbox" | "switch";

interface MarketItemsResponse {
  payload?: {
    items?: unknown;
  };
}

interface MarketOrdersResponse {
  payload?: {
    orders?: unknown;
  };
}

interface MarketStatisticsResponse {
  payload?: {
    statistics_closed?: unknown;
  };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function normalizePlatform(platform?: string): Platform {
  const normalized = (platform ?? "pc").trim().toLowerCase();

  if (normalized === "ps4" || normalized === "xbox" || normalized === "switch") {
    return normalized;
  }

  return "pc";
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

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function parseMarketItem(raw: unknown): MarketItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    id?: unknown;
    url_name?: unknown;
    item_name?: unknown;
    thumb?: unknown;
  };

  const id = asString(candidate.id);
  const urlName = asString(candidate.url_name);
  const itemName = asString(candidate.item_name);

  if (!id || !urlName || !itemName) {
    return null;
  }

  return {
    id,
    url_name: urlName,
    item_name: itemName,
    thumb: asString(candidate.thumb) ?? "",
  };
}

function parseMarketOrder(raw: unknown): MarketOrder | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as {
    platinum?: unknown;
    quantity?: unknown;
    order_type?: unknown;
    user?: unknown;
  };

  const platinum = asNumber(candidate.platinum);
  const quantity = asNumber(candidate.quantity);
  const orderType = candidate.order_type;

  if ((orderType !== "sell" && orderType !== "buy") || platinum === null || quantity === null) {
    return null;
  }

  const user = candidate.user && typeof candidate.user === "object" ? candidate.user : {};
  const userCandidate = user as {
    ingame_name?: unknown;
    status?: unknown;
    reputation?: unknown;
  };

  return {
    platinum,
    quantity,
    order_type: orderType,
    user: {
      ingame_name: asString(userCandidate.ingame_name) ?? "Unknown",
      status: asString(userCandidate.status) ?? "offline",
      reputation: asNumber(userCandidate.reputation) ?? 0,
    },
  };
}

function parseStatEntry(raw: unknown): StatEntry | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  const datetime = asString(candidate.datetime);
  const volume = asNumber(candidate.volume);
  const minPrice = asNumber(candidate.min_price);
  const maxPrice = asNumber(candidate.max_price);
  const avgPrice = asNumber(candidate.avg_price);
  const median = asNumber(candidate.median);
  const waPrice = asNumber(candidate.wa_price);
  const movingAvg = asNumber(candidate.moving_avg);

  if (
    !datetime ||
    volume === null ||
    minPrice === null ||
    maxPrice === null ||
    avgPrice === null ||
    median === null ||
    waPrice === null ||
    movingAvg === null
  ) {
    return null;
  }

  return {
    datetime,
    volume,
    min_price: minPrice,
    max_price: maxPrice,
    avg_price: avgPrice,
    median,
    wa_price: waPrice,
    moving_avg: movingAvg,
  };
}

async function requestMarket<T>(path: string, platform?: string): Promise<T> {
  const url = new URL(path, MARKET_BASE_URL);
  const headers: HeadersInit = {
    Platform: normalizePlatform(platform),
  };

  let response: Response;
  try {
    response = await fetch(url.toString(), { headers });
  } catch (error) {
    throw new Error(`Failed to reach warframe.market API: ${getErrorMessage(error)}`);
  }

  if (response.status === 429) {
    throw new Error("warframe.market is rate limited, try again shortly.");
  }

  if (!response.ok) {
    throw new Error(`warframe.market API request failed: ${response.status} ${response.statusText}`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("warframe.market API returned invalid JSON");
  }
}

export async function fetchItemList(): Promise<MarketItem[]> {
  const cacheKey = "market:items:list";
  const cached = get<MarketItem[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await requestMarket<MarketItemsResponse>("/items");
    const rawItems = Array.isArray(response.payload?.items) ? response.payload.items : [];
    const items = rawItems.map((entry) => parseMarketItem(entry)).filter((entry): entry is MarketItem => entry !== null);

    set(cacheKey, items, ITEM_LIST_TTL_MS);
    return items;
  } catch (error) {
    throw new Error(`Unable to fetch market item list: ${getErrorMessage(error)}`);
  }
}

function buildSlugCandidates(query: string, querySlug: string): string[] {
  const hasPrime = /\bprime\b/i.test(query);
  const hasSet = /\bset\b/i.test(query);
  const baseSlug = querySlug.replace(/_set$/, "");

  const candidates = new Set<string>();

  if (querySlug) {
    candidates.add(querySlug);
  }

  if (baseSlug) {
    candidates.add(baseSlug);
  }

  if ((hasPrime || hasSet) && baseSlug) {
    candidates.add(`${baseSlug}_set`);
  }

  if (querySlug.endsWith("_set") && baseSlug) {
    candidates.add(baseSlug);
  }

  return [...candidates].filter((candidate) => candidate.length > 0);
}

export async function findItemSlug(query: string): Promise<string | null> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return null;
  }

  const items = await fetchItemList();

  if (items.length === 0) {
    return null;
  }

  const querySlug = toSlug(trimmedQuery);
  const queryNormalized = normalizeForMatch(trimmedQuery);

  if (!querySlug || !queryNormalized) {
    return null;
  }

  const itemBySlug = new Map(items.map((entry) => [entry.url_name.toLowerCase(), entry]));
  const slugCandidates = buildSlugCandidates(trimmedQuery, querySlug);

  for (const candidate of slugCandidates) {
    if (itemBySlug.has(candidate)) {
      return candidate;
    }
  }

  if (queryNormalized.length < 3) {
    return null;
  }

  const queryLower = trimmedQuery.toLowerCase();
  const queryTokens = tokenize(trimmedQuery);
  const wantsPrime = /\bprime\b/i.test(trimmedQuery);
  const wantsSet = /\bset\b/i.test(trimmedQuery);

  let bestMatch: { score: number; slug: string } | null = null;

  for (const item of items) {
    const itemNameLower = item.item_name.toLowerCase();
    const slugLower = item.url_name.toLowerCase();
    const itemNameNormalized = normalizeForMatch(itemNameLower);
    const slugNormalized = normalizeForMatch(slugLower);

    let score = 0;

    if (itemNameNormalized === queryNormalized || slugNormalized === queryNormalized) {
      score += 1000;
    }

    if (itemNameLower === queryLower || slugLower === querySlug) {
      score += 900;
    }

    if (itemNameLower.startsWith(queryLower) || slugLower.startsWith(querySlug)) {
      score += 300;
    }

    if (itemNameNormalized.startsWith(queryNormalized) || slugNormalized.startsWith(queryNormalized)) {
      score += 220;
    }

    if (itemNameLower.includes(queryLower) || slugLower.includes(querySlug)) {
      score += 140;
    }

    if (itemNameNormalized.includes(queryNormalized) || slugNormalized.includes(queryNormalized)) {
      score += 120;
    }

    const tokenMatches = queryTokens.filter((token) => itemNameLower.includes(token) || slugLower.includes(token)).length;
    score += tokenMatches * 40;

    if (wantsPrime && (itemNameLower.includes("prime") || slugLower.includes("prime"))) {
      score += 30;
    }

    if (wantsSet && slugLower.endsWith("_set")) {
      score += 45;
    }

    if (wantsPrime && !wantsSet && slugLower.endsWith("_set")) {
      score += 20;
    }

    score -= Math.min(Math.abs(slugNormalized.length - queryNormalized.length), 40);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { score, slug: item.url_name };
    }
  }

  if (!bestMatch || bestMatch.score < 160) {
    return null;
  }

  return bestMatch.slug;
}

export async function getOrders(urlName: string, platform?: string): Promise<MarketOrder[]> {
  const normalizedUrlName = toSlug(urlName);
  const normalizedPlatform = normalizePlatform(platform);

  if (!normalizedUrlName) {
    return [];
  }

  const cacheKey = `market:orders:${normalizedPlatform}:${normalizedUrlName}`;
  const cached = get<MarketOrder[]>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await requestMarket<MarketOrdersResponse>(`/items/${encodeURIComponent(normalizedUrlName)}/orders`, normalizedPlatform);
    const rawOrders = Array.isArray(response.payload?.orders) ? response.payload.orders : [];
    const orders = rawOrders.map((entry) => parseMarketOrder(entry)).filter((entry): entry is MarketOrder => entry !== null);

    set(cacheKey, orders, ORDERS_TTL_MS);
    return orders;
  } catch (error) {
    throw new Error(`Unable to fetch market orders for "${normalizedUrlName}": ${getErrorMessage(error)}`);
  }
}

export async function getStatistics(urlName: string, platform?: string): Promise<MarketStatistics> {
  const normalizedUrlName = toSlug(urlName);
  const normalizedPlatform = normalizePlatform(platform);

  if (!normalizedUrlName) {
    return {
      statistics_closed: {
        "48hours": [],
        "90days": [],
      },
    };
  }

  const cacheKey = `market:statistics:${normalizedPlatform}:${normalizedUrlName}`;
  const cached = get<MarketStatistics>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const response = await requestMarket<MarketStatisticsResponse>(
      `/items/${encodeURIComponent(normalizedUrlName)}/statistics`,
      normalizedPlatform,
    );

    const statisticsClosed =
      response.payload?.statistics_closed && typeof response.payload.statistics_closed === "object"
        ? (response.payload.statistics_closed as Record<string, unknown>)
        : {};

    const raw48Hours = Array.isArray(statisticsClosed["48hours"]) ? statisticsClosed["48hours"] : [];
    const raw90Days = Array.isArray(statisticsClosed["90days"]) ? statisticsClosed["90days"] : [];

    const statistics: MarketStatistics = {
      statistics_closed: {
        "48hours": raw48Hours
          .map((entry) => parseStatEntry(entry))
          .filter((entry): entry is StatEntry => entry !== null),
        "90days": raw90Days
          .map((entry) => parseStatEntry(entry))
          .filter((entry): entry is StatEntry => entry !== null),
      },
    };

    set(cacheKey, statistics, STATISTICS_TTL_MS);
    return statistics;
  } catch (error) {
    throw new Error(`Unable to fetch market statistics for "${normalizedUrlName}": ${getErrorMessage(error)}`);
  }
}
