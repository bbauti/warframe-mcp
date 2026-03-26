import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { recommendAndCalculate } from "../lib/damage/calculator";
import { type BuildGoal, type ModEntry } from "../lib/damage/types";

export const schema = {
  weapon: z.string().describe("Weapon name (e.g. 'Soma Prime', 'Rubico Prime', 'Nikana Prime')"),
  goal: z
    .enum(["general_dps", "crit", "status", "hybrid", "viral_slash", "corrosive", "comfort"])
    .optional()
    .describe(
      "Build goal. Default 'general_dps' auto-detects best approach. 'viral_slash' for Viral+Slash proc meta. 'corrosive' for anti-armor. 'comfort' includes QoL mods.",
    ),
  enemy_type: z
    .string()
    .optional()
    .describe("Enemy to calculate effective DPS against (e.g. 'Corrupted Heavy Gunner', 'Corpus Tech')"),
  enemy_level: z.number().optional().describe("Enemy level for scaling calculations (e.g. 100, 175 for Steel Path)"),
};

export const metadata: ToolMetadata = {
  name: "recommend_build",
  description:
    "Calculate the optimal mod build for a weapon based on the goal. Uses Warframe's actual damage formulas to compute real DPS numbers. Returns the recommended mod list, DPS breakdown, and explanation of why each mod was chosen. This is NOT a guess - it's mathematically calculated.",
  annotations: {
    title: "Recommend Build",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

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

  return `${formatNumber(value * 100)}%`;
}

function describeModReason(mod: ModEntry, goal: BuildGoal): string {
  switch (mod.group) {
    case "baseDamage":
      return "Core multiplicative base damage scaling.";
    case "multishot":
      return "Extra projectiles per trigger increases true DPS and status throughput.";
    case "critChance":
      return goal === "status"
        ? "Secondary crit scaling to stabilize hybrid output."
        : "Raises crit tier frequency for higher average hit value.";
    case "critDamage":
      return "Amplifies crit payout once crit chance is established.";
    case "statusChance":
      return "Improves proc consistency, especially for elemental setups.";
    case "fireRate":
      return "Quality-of-life and DPS pacing improvement via faster firing/attacks.";
    case "elemental": {
      if (mod.stats.Toxin && mod.stats.Cold) {
        return "Dual-stat Viral package for health scaling and proc pressure.";
      }

      if (mod.stats.Toxin) {
        return "Toxin component used for Viral/Corrosive assembly and shield bypass pressure.";
      }

      if (mod.stats.Cold) {
        return "Cold component used for Viral/Magnetic assembly with control utility.";
      }

      if (mod.stats.Electricity) {
        return "Electricity component used for Corrosive assembly and robotic matchup value.";
      }

      if (mod.stats.Heat) {
        return "Heat adds strong standalone DoT pressure and anti-health value.";
      }

      return "Elemental scaling increases total modded damage and matchup leverage.";
    }
    case "special":
      if (mod.stats.slashOnCrit) {
        return "Converts crits into Slash procs for armor-agnostic bleed damage.";
      }

      if (mod.stats.damagePerStatus) {
        return "Stacks multiplicative damage from applied status effects.";
      }

      return "Specialized multiplier for this build archetype.";
    case "faction":
      return "Faction multiplier adds a final damage-layer bonus versus target faction.";
    default:
      return "Selected for overall expected DPS contribution.";
  }
}

function getGoalRationale(goal: BuildGoal): string {
  switch (goal) {
    case "crit":
      return "Crit-focused setup prioritizing crit chance/damage scaling, then elemental support.";
    case "status":
      return "Status-focused setup prioritizing proc rate and 60/60 elemental uptime.";
    case "hybrid":
      return "Hybrid setup balances crit tiers and status application for broad consistency.";
    case "viral_slash":
      return "Viral + Slash setup uses Viral multipliers and Slash bleed pressure for high EHP targets.";
    case "corrosive":
      return "Corrosive + Heat setup targets armored enemies with strong anti-armor coverage.";
    case "comfort":
      return "Comfort setup keeps damage high while adding fire-rate/handling quality-of-life.";
    default:
      return "General DPS auto-selected the highest-value archetype from base weapon stats.";
  }
}

export default async function recommendBuild({
  weapon,
  goal,
  enemy_type,
  enemy_level,
}: InferSchema<typeof schema>): Promise<string> {
  const selectedGoal = goal ?? "general_dps";

  try {
    const recommendation = await recommendAndCalculate(weapon, selectedGoal, enemy_type, enemy_level);

    const lines: string[] = [];

    lines.push(`Weapon: ${recommendation.weapon.name}`);
    if (recommendation.matchedWeaponName !== recommendation.weapon.name) {
      lines.push(`Matched Result: ${recommendation.matchedWeaponName}`);
    }
    lines.push(`Weapon Type: ${recommendation.weapon.weaponType}`);
    lines.push(`Build Goal: ${recommendation.goal}`);
    lines.push(`Base Damage: ${formatNumber(recommendation.weapon.totalDamage)}`);
    lines.push(`Base Critical Chance: ${formatPercent(recommendation.weapon.criticalChance)}`);
    lines.push(`Base Critical Multiplier: ${formatNumber(recommendation.weapon.criticalMultiplier)}x`);
    lines.push(`Base Status Chance: ${formatPercent(recommendation.weapon.statusChance)}`);
    lines.push(`Base Fire Rate: ${formatNumber(recommendation.weapon.fireRate)}`);
    lines.push(`Base Magazine: ${formatNumber(recommendation.weapon.magazineSize, 0)}`);
    lines.push(`Base Reload: ${formatNumber(recommendation.weapon.reloadTime)}s`);
    lines.push("");

    lines.push("Recommended Mods (1-8):");

    for (const [index, mod] of recommendation.mods.entries()) {
      lines.push(`${index + 1}. ${mod.name}`);
      lines.push(`Reason: ${describeModReason(mod, recommendation.goal)}`);
    }

    lines.push("");
    lines.push("DPS Breakdown:");
    lines.push(`Damage per Shot: ${formatNumber(recommendation.result.damagePerShot)}`);
    lines.push(`Burst DPS: ${formatNumber(recommendation.result.burstDps)}`);
    lines.push(`Sustained DPS: ${formatNumber(recommendation.result.sustainedDps)}`);
    lines.push(`Magazine Damage: ${formatNumber(recommendation.result.magazineDamage)}`);
    lines.push(`Average Crit Multiplier: ${formatNumber(recommendation.result.avgCritMultiplier)}x`);
    lines.push(`Effective Crit Chance: ${formatPercent(recommendation.result.effectiveCritChance)}`);
    lines.push(`Effective Status Chance: ${formatPercent(recommendation.result.effectiveStatusChance)}`);
    lines.push(`Effective Multishot: ${formatNumber(recommendation.result.effectiveMultishot)}`);
    lines.push(`Effective Fire Rate: ${formatNumber(recommendation.result.effectiveFireRate)}`);
    lines.push(`Status Procs/s: ${formatNumber(recommendation.result.statusProcsPerSecond)}`);

    if (enemy_type) {
      const resolvedEnemyName = recommendation.enemy?.name ?? enemy_type;
      lines.push(`Enemy Target: ${resolvedEnemyName}${typeof enemy_level === "number" ? ` (Level ${Math.floor(enemy_level)})` : ""}`);

      if (typeof recommendation.result.effectiveDpsVsArmor === "number") {
        lines.push(`Effective DPS vs Enemy: ${formatNumber(recommendation.result.effectiveDpsVsArmor)}`);
      } else {
        lines.push("Effective DPS vs Enemy: Unable to compute (enemy preset not recognized).");
      }
    }

    lines.push("");
    lines.push(`Build Rationale: ${getGoalRationale(recommendation.goal)}`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return `Unable to recommend a build for "${weapon}": ${message}`;
  }
}
