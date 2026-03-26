import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { searchItems } from "../lib/api/wfcd";
import { type WfcdItem } from "../types/api-responses";

export const schema = {
  query: z.string().describe("Item name to search for (weapon, warframe, mod, resource, etc.)"),
};

export const metadata: ToolMetadata = {
  name: "get_item",
  description:
    "Search for any Warframe item by name. Returns basic info including category, description, mastery requirement, and components. For detailed weapon/warframe/mod stats, use the specific tools instead.",
  annotations: {
    title: "Get Item",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

function formatMasteryReq(value: number | undefined): string {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${value}`;
}

function formatComponents(item: WfcdItem): string {
  if (!Array.isArray(item.components) || item.components.length === 0) {
    return "None listed";
  }

  return item.components
    .map((component) => {
      const componentName = component.name ?? "Unknown Component";
      const count = typeof component.itemCount === "number" ? ` x${component.itemCount}` : "";
      return `${componentName}${count}`;
    })
    .join(", ");
}

export default async function getItem({ query }: InferSchema<typeof schema>): Promise<string> {
  const results = await searchItems(query);

  if (results.length === 0) {
    return `No items found matching "${query}". Try a different name or check spelling.`;
  }

  const lines: string[] = [];
  const topResults = results.slice(0, 5);

  lines.push(`Item search results for "${query}":`);
  lines.push("");

  for (const [index, item] of topResults.entries()) {
    lines.push(`${index + 1}. ${item.name}`);
    lines.push(`Category: ${item.category ?? "Unknown"}`);
    lines.push(`Tradable: ${item.tradable === true ? "Yes" : item.tradable === false ? "No" : "Unknown"}`);
    lines.push(`Mastery Requirement: ${formatMasteryReq(item.masteryReq)}`);
    lines.push(`Description: ${item.description?.trim() || "No description available."}`);
    lines.push(`Components: ${formatComponents(item)}`);
    lines.push("");
  }

  return lines.join("\n").trim();
}
