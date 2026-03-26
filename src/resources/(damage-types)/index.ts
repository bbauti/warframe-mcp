import { type ResourceMetadata } from "xmcp";
import { DAMAGE_EFFECTIVENESS } from "../../lib/data/damage-types";

export const metadata: ResourceMetadata = {
  name: "damage-types",
  title: "Damage Types",
  description: "Warframe damage type reference: categories, element recipes, and effectiveness multipliers.",
};

const PHYSICAL_TYPES = ["Impact", "Puncture", "Slash"];
const BASE_ELEMENTS = ["Heat", "Cold", "Electricity", "Toxin"];
const COMBINED_ELEMENTS = ["Blast", "Corrosive", "Gas", "Magnetic", "Radiation", "Viral"];
const SPECIAL_TYPES = ["Void", "True"];

const RECIPES: Array<{ result: string; components: [string, string] }> = [
  { result: "Blast", components: ["Heat", "Cold"] },
  { result: "Radiation", components: ["Heat", "Electricity"] },
  { result: "Gas", components: ["Heat", "Toxin"] },
  { result: "Magnetic", components: ["Cold", "Electricity"] },
  { result: "Viral", components: ["Cold", "Toxin"] },
  { result: "Corrosive", components: ["Electricity", "Toxin"] },
];

const TARGET_ORDER = [
  "ferrite",
  "alloy",
  "flesh",
  "clonedFlesh",
  "shield",
  "protoShield",
  "robotic",
  "machinery",
  "infestedFlesh",
  "fossilized",
  "infested",
] as const;

function formatMultiplier(value: number): string {
  const delta = (value - 1) * 100;
  if (delta > 0) {
    return `+${delta.toFixed(0)}% (${value.toFixed(2)}x)`;
  }

  return `${delta.toFixed(0)}% (${value.toFixed(2)}x)`;
}

export default function damageTypesResource(): string {
  const lines: string[] = [];

  lines.push("WARFRAME DAMAGE TYPES");
  lines.push("");
  lines.push(`Physical: ${PHYSICAL_TYPES.join(", ")}`);
  lines.push(`Base Elements: ${BASE_ELEMENTS.join(", ")}`);
  lines.push(`Combined Elements: ${COMBINED_ELEMENTS.join(", ")}`);
  lines.push(`Special: ${SPECIAL_TYPES.join(", ")}`);
  lines.push("");

  lines.push("COMBINED ELEMENT RECIPES");
  for (const recipe of RECIPES) {
    lines.push(`${recipe.components[0]} + ${recipe.components[1]} = ${recipe.result}`);
  }
  lines.push("");

  lines.push("EFFECTIVENESS (NON-NEUTRAL ONLY)");

  const perTarget: Record<string, string[]> = {};

  for (const [damageType, targetMap] of Object.entries(DAMAGE_EFFECTIVENESS)) {
    if (!targetMap) {
      continue;
    }

    for (const [targetType, multiplier] of Object.entries(targetMap)) {
      if (typeof multiplier !== "number" || multiplier === 1) {
        continue;
      }

      if (!perTarget[targetType]) {
        perTarget[targetType] = [];
      }

      perTarget[targetType].push(`${damageType}: ${formatMultiplier(multiplier)}`);
    }
  }

  for (const targetType of TARGET_ORDER) {
    const entries = perTarget[targetType] ?? [];
    if (entries.length === 0) {
      continue;
    }

    lines.push("");
    lines.push(`${targetType}:`);
    for (const entry of entries) {
      lines.push(`- ${entry}`);
    }
  }

  lines.push("");
  lines.push("Notes:");
  lines.push("- Unlisted damage-type/target interactions are neutral (1.00x)."
  );
  lines.push("- Toxin damage bypasses shields.");
  lines.push("- Element order in mod loadout determines final combined elements.");

  return lines.join("\n");
}
