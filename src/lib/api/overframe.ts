import { get, set } from "../cache";
import { searchItems, searchWarframes, searchWeapons } from "./wfcd";

declare function require(moduleName: string): unknown;

type ExecFileOptions = {
  encoding?: string;
  maxBuffer?: number;
};

type ExecFileCallback = (error: Error | null, stdout: string, stderr: string) => void;

const { execFile } = require("child_process") as {
  execFile: (
    file: string,
    args: string[],
    options: ExecFileOptions,
    callback: ExecFileCallback,
  ) => void;
};

const OVERFRAME_BASE_URL = "https://overframe.gg";
const OVERFRAME_API_URL = "https://overframe.gg/api/v1";
const OVERFRAME_TTL_MS = 10 * 60 * 1000;
const OVERFRAME_SITEMAP_TTL_MS = 12 * 60 * 60 * 1000;
const OVERFRAME_USER_AGENT = "WarframeMCP/1.0 (Warframe Knowledge Bot)";
const CURL_MAX_BUFFER_BYTES = 50 * 1024 * 1024;
const BUILDS_PER_PAGE = 25;

export interface OverframeBuildAuthor {
  id: number;
  username: string;
  url: string;
  is_staff: boolean;
}

export interface OverframeBuildItemData {
  id: number;
  locTag: string;
  texture: string;
  texture_new: string;
}

export interface OverframeBuild {
  id: number;
  created: string;
  updated: string;
  score: number;
  url: string;
  author: OverframeBuildAuthor;
  formas: number;
  guide_wordcount: number;
  item_data: OverframeBuildItemData;
  title: string;
}

export interface OverframeBuildSlot {
  id: number;
  slot_id: number;
  build_id: number;
  mod: number | null;
  rank: number;
  polarity: string;
  drain: number;
  polarity_match: boolean;
}

export interface OverframeBuildDetail {
  id: number;
  created: string;
  updated: string;
  score: number;
  url: string;
  author: OverframeBuildAuthor;
  formas: number;
  item_data: OverframeBuildItemData;
  title: string;
  description: string;
  comment_count: number;
  slots: OverframeBuildSlot[];
  platinum_cost: number;
  endo_cost: number;
  item_rank: number;
  mastery_rank: number;
  stats: Record<string, number>;
  total_damage: number;
}

interface OverframeResolvedItem {
  id: number;
  slug: string;
  name: string;
  url: string;
}

interface OverframeItemPage {
  buildCount: number;
  pageCount: number;
  currentPage: number;
  builds: OverframeBuild[];
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\bsteelpath\b/g, "steel path")
    .replace(/\bsp\b/g, "steel path")
    .replace(/\blevelcap\b/g, "level cap")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function toSlug(value: string): string {
  return normalizeSearchText(value).replace(/\s+/g, "-");
}

function toDisplayNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPositiveInteger(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

async function execCurl(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      ["-L", "-sS", "--compressed", "-A", OVERFRAME_USER_AGENT, ...args],
      { encoding: "utf8", maxBuffer: CURL_MAX_BUFFER_BYTES },
      (error, stdout, stderr) => {
        if (error) {
          const details = stderr.trim() || getErrorMessage(error);
          reject(new Error(`curl request failed: ${details}`));
          return;
        }

        resolve(stdout);
      },
    );
  });
}

async function fetchText(url: string, headers?: Record<string, string>): Promise<string> {
  const args: string[] = [];

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      args.push("-H", `${key}: ${value}`);
    }
  }

  args.push(url);
  return execCurl(args);
}

async function fetchJson<T>(url: string): Promise<T> {
  const responseText = await fetchText(url, { Accept: "application/json" });

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error("Overframe.gg API returned invalid JSON");
  }
}

function extractNextData(html: string): unknown {
  const match = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  if (!match || !match[1]) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

async function getSitemapItems(): Promise<OverframeResolvedItem[]> {
  const cacheKey = "overframe:sitemap:items";
  const cached = get<OverframeResolvedItem[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const xml = await fetchText(`${OVERFRAME_BASE_URL}/sitemap.xml`);
  const items: OverframeResolvedItem[] = [];
  const pattern = /<loc>https:\/\/overframe\.gg\/items\/arsenal\/(\d+)\/([^<]+?)\/<\/loc>/g;

  let match = pattern.exec(xml);
  while (match) {
    const id = Number.parseInt(match[1], 10);
    const slug = match[2]?.trim() ?? "";

    if (Number.isFinite(id) && slug) {
      items.push({
        id,
        slug,
        name: toDisplayNameFromSlug(slug),
        url: `${OVERFRAME_BASE_URL}/items/arsenal/${id}/${slug}/`,
      });
    }

    match = pattern.exec(xml);
  }

  set(cacheKey, items, OVERFRAME_SITEMAP_TTL_MS);
  return items;
}

async function getResolutionCandidates(itemName: string): Promise<string[]> {
  const candidates = new Set<string>();
  const trimmedName = itemName.trim();

  if (trimmedName) {
    candidates.add(trimmedName);
  }

  const [warframes, weapons, items] = await Promise.all([
    searchWarframes(trimmedName),
    searchWeapons(trimmedName),
    searchItems(trimmedName),
  ]);

  for (const result of [...warframes, ...weapons, ...items]) {
    if (typeof result.name === "string" && result.name.trim()) {
      candidates.add(result.name.trim());
    }
  }

  return [...candidates];
}

async function resolveItem(itemName: string): Promise<OverframeResolvedItem | null> {
  const trimmedName = itemName.trim();
  if (!trimmedName) {
    return null;
  }

  const sitemapItems = await getSitemapItems();
  const itemsBySlug = new Map<string, OverframeResolvedItem>();

  for (const item of sitemapItems) {
    itemsBySlug.set(item.slug, item);
  }

  const candidates = await getResolutionCandidates(trimmedName);

  for (const candidate of candidates) {
    const exact = itemsBySlug.get(toSlug(candidate));
    if (exact) {
      return exact;
    }
  }

  const normalizedCandidates = new Set(candidates.map((candidate) => normalizeSearchText(candidate)));

  for (const item of sitemapItems) {
    const normalizedSlug = normalizeSearchText(item.slug);
    if (normalizedCandidates.has(normalizedSlug)) {
      return item;
    }
  }

  const normalizedQuery = normalizeSearchText(trimmedName);
  const partialMatches = sitemapItems.filter((item) => {
    const normalizedSlug = normalizeSearchText(item.slug);
    return normalizedSlug.startsWith(normalizedQuery) || normalizedSlug.includes(normalizedQuery);
  });

  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  return null;
}

function parseItemPage(nextData: unknown, currentPage: number): OverframeItemPage {
  if (!nextData || typeof nextData !== "object") {
    throw new Error("Overframe.gg item page did not include usable page data");
  }

  const props = (nextData as Record<string, unknown>).props;
  if (!props || typeof props !== "object") {
    throw new Error("Overframe.gg item page did not include props");
  }

  const pageProps = (props as Record<string, unknown>).pageProps;
  if (!pageProps || typeof pageProps !== "object") {
    throw new Error("Overframe.gg item page did not include pageProps");
  }

  const rawBuilds = (pageProps as Record<string, unknown>).builds;

  return {
    buildCount: toPositiveInteger((pageProps as Record<string, unknown>).buildCount, 0),
    pageCount: toPositiveInteger((pageProps as Record<string, unknown>).pageCount, 1),
    currentPage: toPositiveInteger((pageProps as Record<string, unknown>).currentPage, currentPage),
    builds: Array.isArray(rawBuilds) ? (rawBuilds as OverframeBuild[]) : [],
  };
}

async function fetchItemBuildPage(item: OverframeResolvedItem, page: number): Promise<OverframeItemPage> {
  const cacheKey = `overframe:item:${item.id}:page:${page}`;
  const cached = get<OverframeItemPage>(cacheKey);

  if (cached) {
    return cached;
  }

  const url = new URL(item.url);
  if (page > 1) {
    url.searchParams.set("page", String(page));
  }

  const html = await fetchText(url.toString());
  const nextData = extractNextData(html);
  const result = parseItemPage(nextData, page);

  set(cacheKey, result, OVERFRAME_TTL_MS);
  return result;
}

export async function searchBuilds(
  itemName: string,
  options?: { limit?: number; maxPages?: number },
): Promise<OverframeBuild[]> {
  const trimmedName = itemName.trim();
  if (!trimmedName) {
    return [];
  }

  const limit = Math.min(250, Math.max(1, Math.floor(options?.limit ?? BUILDS_PER_PAGE)));
  const requestedPages = Math.min(10, Math.max(1, Math.floor(options?.maxPages ?? Math.ceil(limit / BUILDS_PER_PAGE))));

  try {
    const item = await resolveItem(trimmedName);
    if (!item) {
      return [];
    }

    const cacheKey = `overframe:builds:${item.id}:${limit}:${requestedPages}`;
    const cached = get<OverframeBuild[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const firstPage = await fetchItemBuildPage(item, 1);
    const pageCount = Math.min(firstPage.pageCount, requestedPages);
    const pagePromises: Array<Promise<OverframeItemPage>> = [];

    for (let page = 2; page <= pageCount; page += 1) {
      pagePromises.push(fetchItemBuildPage(item, page));
    }

    const additionalPages = await Promise.all(pagePromises);
    const dedupedBuilds = new Map<number, OverframeBuild>();
    const allBuilds = [...firstPage.builds];

    for (const page of additionalPages) {
      allBuilds.push(...page.builds);
    }

    for (const build of allBuilds) {
      if (!dedupedBuilds.has(build.id)) {
        dedupedBuilds.set(build.id, build);
      }
    }

    const results = [...dedupedBuilds.values()].sort((a, b) => b.score - a.score).slice(0, limit);
    set(cacheKey, results, OVERFRAME_TTL_MS);
    return results;
  } catch (error) {
    throw new Error(`Unable to fetch Overframe.gg builds for "${trimmedName}": ${getErrorMessage(error)}`);
  }
}

export async function getBuildDetail(buildId: number): Promise<OverframeBuildDetail | null> {
  const cacheKey = `overframe:build:${buildId}`;
  const cached = get<OverframeBuildDetail>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const detail = await fetchJson<OverframeBuildDetail>(`${OVERFRAME_API_URL}/builds/${buildId}/`);
    set(cacheKey, detail, OVERFRAME_TTL_MS);
    return detail;
  } catch (error) {
    throw new Error(`Unable to fetch Overframe.gg build detail for ID ${buildId}: ${getErrorMessage(error)}`);
  }
}
