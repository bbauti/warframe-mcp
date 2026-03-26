import { get, set } from "../cache";
import {
  type WfcdDrop,
  type WfcdItem,
  type WfcdMod,
  type WfcdWarframe,
  type WfcdWeapon,
  type WorldState,
} from "../../types/api-responses";

const WFCD_BASE_URL = "https://api.warframestat.us";
const STATIC_TTL_MS = 4 * 60 * 60 * 1000;
const WORLD_STATE_TTL_MS = 60 * 1000;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

async function requestWfcd<T>(path: string): Promise<T> {
  const url = new URL(path, WFCD_BASE_URL);
  url.searchParams.set("language", "en");

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (error) {
    throw new Error(`Failed to reach WarframeStat API: ${getErrorMessage(error)}`);
  }

  if (!response.ok) {
    throw new Error(
      `WarframeStat API request failed: ${response.status} ${response.statusText}`,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("WarframeStat API returned invalid JSON");
  }
}

async function fetchSearchResults<T>(cacheKey: string, path: string): Promise<T[]> {
  const cached = get<T[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const data = await requestWfcd<unknown>(path);
    const results = Array.isArray(data) ? (data as T[]) : [];
    set(cacheKey, results, STATIC_TTL_MS);
    return results;
  } catch {
    return [];
  }
}

export async function searchItems(query: string): Promise<WfcdItem[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const encodedQuery = encodeURIComponent(trimmedQuery);
  const cacheKey = `wfcd:items:${trimmedQuery.toLowerCase()}`;
  return fetchSearchResults<WfcdItem>(cacheKey, `/items/search/${encodedQuery}`);
}

export async function searchWeapons(query: string): Promise<WfcdWeapon[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const encodedQuery = encodeURIComponent(trimmedQuery);
  const cacheKey = `wfcd:weapons:${trimmedQuery.toLowerCase()}`;
  return fetchSearchResults<WfcdWeapon>(cacheKey, `/weapons/search/${encodedQuery}`);
}

export async function searchWarframes(query: string): Promise<WfcdWarframe[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const encodedQuery = encodeURIComponent(trimmedQuery);
  const cacheKey = `wfcd:warframes:${trimmedQuery.toLowerCase()}`;
  return fetchSearchResults<WfcdWarframe>(cacheKey, `/warframes/search/${encodedQuery}`);
}

export async function searchMods(query: string): Promise<WfcdMod[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const encodedQuery = encodeURIComponent(trimmedQuery);
  const cacheKey = `wfcd:mods:${trimmedQuery.toLowerCase()}`;
  return fetchSearchResults<WfcdMod>(cacheKey, `/mods/search/${encodedQuery}`);
}

export async function searchDrops(query: string): Promise<WfcdDrop[]> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const encodedQuery = encodeURIComponent(trimmedQuery);
  const cacheKey = `wfcd:drops:${trimmedQuery.toLowerCase()}`;
  return fetchSearchResults<WfcdDrop>(cacheKey, `/drops/search/${encodedQuery}`);
}

export async function getWorldState(platform = "pc"): Promise<WorldState> {
  const normalizedPlatform = platform.trim().toLowerCase() || "pc";
  const cacheKey = `wfcd:worldstate:${normalizedPlatform}`;

  const cached = get<WorldState>(cacheKey);
  if (cached) {
    return cached;
  }

  const encodedPlatform = encodeURIComponent(normalizedPlatform);

  try {
    const worldState = await requestWfcd<WorldState>(`/${encodedPlatform}/`);
    set(cacheKey, worldState, WORLD_STATE_TTL_MS);
    return worldState;
  } catch (error) {
    throw new Error(
      `Unable to fetch world state for platform "${normalizedPlatform}": ${getErrorMessage(error)}`,
    );
  }
}
