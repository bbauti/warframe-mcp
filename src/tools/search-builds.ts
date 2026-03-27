import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchBuilds, getBuildDetail } from "../lib/api/overframe";

const OVERFRAME_BASE_URL = "https://overframe.gg";
const BUILDS_PER_PAGE = 25;

export const schema = {
  item: z.string().describe("Warframe or weapon name to search builds for (e.g. 'Kullervo', 'Soma Prime', 'Nikana Prime')"),
  filter: z
    .string()
    .optional()
    .describe(
      "Filter builds by keywords in title (e.g. 'steel path', 'endgame', 'beginner', 'low forma'). Multiple keywords can be comma-separated and ANY match will be included.",
    ),
  limit: z.number().optional().describe("Max results to return (default: 5, max: 10)"),
};

export const metadata: ToolMetadata = {
  name: "search_builds",
  description:
    "Search Overframe.gg for community-created builds for any Warframe, weapon, or companion. Returns builds sorted by community votes (score). Supports filtering by keywords in build titles (e.g. 'steel path', 'endgame', 'beginner'). Use this to find popular, community-validated builds rather than mathematically calculated ones.",
  annotations: {
    title: "Search Builds",
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

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3).replace(/\s+$/, "")}...`;
}

function normalizeFilterText(text: string): string {
  return text
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

function parseFilterGroups(filter: string): string[][] {
  return filter
    .split(",")
    .map((group) => normalizeFilterText(group))
    .filter((group) => group.length > 0)
    .map((group) => group.split(" ").filter((word) => word.length > 0));
}

function matchesFilter(text: string, groups: string[][]): boolean {
  const normalizedText = normalizeFilterText(text);

  return groups.some((group) => group.every((word) => normalizedText.includes(word)));
}

function toAbsoluteBuildLink(buildUrl: string, buildId: number): string {
  if (/^https?:\/\//i.test(buildUrl)) {
    return buildUrl;
  }

  if (buildUrl.startsWith("/")) {
    return `${OVERFRAME_BASE_URL}${buildUrl}`;
  }

  return `${OVERFRAME_BASE_URL}/build/${buildId}/`;
}

export default async function searchBuildsHandler({ item, filter, limit }: InferSchema<typeof schema>): Promise<string> {
  const selectedLimit = Math.min(10, Math.max(1, Math.floor(limit ?? 5)));

  try {
    const hasFilter = typeof filter === "string" && filter.trim().length > 0;
    const fetchLimit = hasFilter ? 200 : Math.max(BUILDS_PER_PAGE, selectedLimit * BUILDS_PER_PAGE);
    const maxPages = Math.ceil(fetchLimit / BUILDS_PER_PAGE);
    const filterGroups = hasFilter ? parseFilterGroups(filter) : [];
    let builds = await searchBuilds(item, { limit: fetchLimit, maxPages });

    if (builds.length === 0) {
      return `No builds found for "${item}" on Overframe.gg. Check the item name spelling — try the full name (e.g. "Soma Prime" instead of "Soma") or the base name without "Prime".`;
    }

    const detailCache = new Map<number, Awaited<ReturnType<typeof getBuildDetail>>>();

    if (filterGroups.length > 0) {
      const filteredBuilds: typeof builds = [];

      for (const build of builds) {
        if (matchesFilter(build.title, filterGroups)) {
          filteredBuilds.push(build);
        }

        if (filteredBuilds.length >= selectedLimit) {
          break;
        }
      }

      if (filteredBuilds.length < selectedLimit) {
        const probeLimit = Math.min(builds.length, 60);

        for (const build of builds.slice(0, probeLimit)) {
          if (filteredBuilds.some((candidate) => candidate.id === build.id)) {
            continue;
          }

          let detail = detailCache.get(build.id);
          if (detail === undefined) {
            try {
              detail = await getBuildDetail(build.id);
            } catch {
              detail = null;
            }

            detailCache.set(build.id, detail);
          }

          const searchableText = detail?.description ? `${build.title} ${detail.description}` : build.title;
          if (matchesFilter(searchableText, filterGroups)) {
            filteredBuilds.push(build);
          }

          if (filteredBuilds.length >= selectedLimit) {
            break;
          }
        }
      }

      builds = filteredBuilds;
    }

    builds = builds.sort((a, b) => b.score - a.score).slice(0, selectedLimit);

    if (builds.length === 0) {
      return `No builds found for "${item}" matching filter "${filter}" on Overframe.gg. Try different keywords or remove the filter to see all builds.`;
    }

    const details = await Promise.all(
      builds.map(async (build) => {
        const cached = detailCache.get(build.id);
        if (cached !== undefined) {
          return cached;
        }

        try {
          const detail = await getBuildDetail(build.id);
          detailCache.set(build.id, detail);
          return detail;
        } catch {
          detailCache.set(build.id, null);
          return null;
        }
      }),
    );

    const lines: string[] = [];
    const headerParts = [`Overframe builds for "${item}"`];
    if (filter) {
      headerParts.push(`(filtered by: ${filter})`);
    }
    lines.push(`${headerParts.join(" ")}:`);
    lines.push("");

    for (const [index, build] of builds.entries()) {
      const detail = details[index];
      const equippedMods = detail ? detail.slots.filter((s) => s.mod !== null).length : null;
      const modsText = equippedMods !== null ? `${equippedMods} mods equipped` : "mods unknown";
      const guide = detail?.description ? truncate(detail.description.replace(/\s+/g, " ").trim(), 200) : "No guide provided";
      const updated = build.updated ? build.updated.slice(0, 10) : "unknown";

      lines.push(`${index + 1}. ${build.title}`);
      lines.push(`   Score: ${build.score} votes | Formas: ${build.formas} | Author: ${build.author.username}`);
      lines.push(`   Updated: ${updated}`);
      lines.push(`   Mods: ${modsText}`);
      lines.push(`   Guide: ${guide}`);
      lines.push(`   Link: ${toAbsoluteBuildLink(build.url, build.id)}`);
      lines.push("");
    }

    return lines.join("\n").trim();
  } catch (error) {
    return `Unable to search builds for "${item}": ${getErrorMessage(error)}`;
  }
}
