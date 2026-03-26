import { z } from "zod";
import { type InferSchema, type PromptMetadata } from "xmcp";

export const schema = {
  weapon_type: z
    .enum(["rifle", "pistol", "shotgun", "melee", "all"])
    .optional()
    .describe("Focus on specific weapon type or all"),
};

export const metadata: PromptMetadata = {
  name: "build-advisor",
  title: "Build Advisor",
  description:
    "Context for making Warframe weapon build recommendations. Teaches mod selection strategy, multiplicative group optimization, and build archetypes.",
  role: "system",
};

function getFocusLine(weaponType: InferSchema<typeof schema>["weapon_type"]): string {
  if (!weaponType || weaponType === "all") {
    return "Focus: apply these rules to all weapon classes and adapt to each weapon's base stats.";
  }

  return `Focus: prioritize ${weaponType} recommendations while still applying cross-weapon modding fundamentals.`;
}

export default function buildAdvisorPrompt({ weapon_type }: InferSchema<typeof schema>): string {
  return `# Warframe Build Advisor - Mod Selection Guide

${getFocusLine(weapon_type)}

## The Golden Rules of Modding
1. ALWAYS slot base damage + multishot first - they're the biggest multipliers
2. DIVERSIFY across multiplicative groups - don't stack 3 mods from the same group
3. Match your build to the weapon's strengths - don't force crit on a status weapon
4. Elemental combo order matters - plan which combined elements you want

## How to Read Weapon Stats
- Crit Chance >=30%: Crit build viable
- Crit Chance >=20% + Status >=20%: Hybrid build
- Status Chance >=30% + high fire rate: Status build
- Crit Chance <15% + Status <20%: Raw damage build (rare, usually weak weapons)

## Build Archetypes

### Pure Crit (CC >= 30%)
Slots: Base Damage -> Multishot -> Crit Chance -> Crit Damage -> Hunter Munitions -> 2 Elementals (Viral) -> Flex
Why: Maximizes crit scaling. HM forces Slash procs that bypass armor.
Best for: Soma Prime, Rubico Prime, Vectis Prime, etc.

### Status (SC >= 30%, high fire rate)
Slots: Base Damage -> Multishot -> 4 Elemental 60/60 mods (for max status + elements) -> Flex x 2
Why: Many status procs per second. Viral stacking melts health, Corrosive strips armor.
Best for: Kuva Nukor, Ignis Wraith, Cedo, etc.

### Hybrid (CC >= 20% AND SC >= 20%)
Slots: Base Damage -> Multishot -> Crit Chance -> Crit Damage -> 2 Elemental 60/60 -> Flex x 2
Why: Benefits from both crit and status. Very flexible.
Best for: Acceltra, Phantasma, Fulmin, etc.

### Viral + Slash Meta
Slots: Base Damage -> Multishot -> Crit Chance -> Crit Damage -> Hunter Munitions -> 2 Viral elements -> Flex
Why: Viral doubles health damage, Slash procs from HM bypass armor entirely. Dominant combo for Grineer/Corrupted.
Requires: >=25% crit chance for HM to be worth it

### Anti-Armor (Corrosive + Heat)
Slots: Base Damage -> Multishot -> Crit Chance -> Crit Damage -> Corrosive elements -> Heat -> Flex
Why: Corrosive strips armor permanently (-26% per proc, stacks 10x). Heat strips 50% + DoT.
Best against: High-level Grineer (Steel Path, Archon Hunts)

### Melee - Condition Overload Build
Slots: Pressure Point -> Condition Overload -> Blood Rush -> Organ Shatter -> Elemental x 2 (Viral) -> Weeping Wounds -> Berserker Fury
Why: CO gives +80% per status type on target. Blood Rush scales crit with combo counter. Insane scaling.

## Multiplicative Groups (Refresh)
| Group | Mods | Stacking |
|-------|------|----------|
| Base Damage | Serration, Hornet Strike, etc. | Additive within, multiplicative with other groups |
| Multishot | Split Chamber, Barrel Diffusion | Additive within |
| Critical Chance | Point Strike, Pistol Gambit | Additive within |
| Critical Damage | Vital Sense, Target Cracker | Additive within |
| Elemental | All elemental mods | Each COMBINED element is separate multiplier |
| Fire Rate | Speed Trigger, Fury | Additive within |
| Faction | Bane mods | Final multiplier (double-dips on DoTs) |

## Pro Tips
- Galvanized mods (from Arbitrations) are direct upgrades to base versions
- Arcane Merciless/Dexterity add conditional base damage - very strong
- Riven mods can replace weaker mods if the stats are good
- For Steel Path: prioritize armor bypass (Viral+Slash or Corrosive+Heat)
- Faction mods double-dip on Slash/Toxin DoTs - huge for endgame DPS`;
}
