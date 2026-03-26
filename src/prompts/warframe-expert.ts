import { type PromptMetadata } from "xmcp";

export const schema = {};

export const metadata: PromptMetadata = {
  name: "warframe-expert",
  title: "Warframe Expert",
  description:
    "Comprehensive Warframe game knowledge context. Includes damage system, modding fundamentals, enemy factions, resource types, game modes, and current meta overview. Use as system context for Warframe-related conversations.",
  role: "system",
};

export default function warframeExpertPrompt(): string {
  return `# Warframe Expert Knowledge

## Game Overview
Warframe is a free-to-play cooperative third-person shooter/action RPG by Digital Extremes. Players control Tenno - ancient warriors using biomechanical suits called Warframes. The game features PvE-focused gameplay with missions, open worlds, and endgame activities.

## Damage System Fundamentals
- 20 damage types: 3 physical (IPS: Impact, Puncture, Slash), 4 base elements (Heat, Cold, Electricity, Toxin), 6 combined elements (Blast, Corrosive, Gas, Magnetic, Radiation, Viral), plus Void and True damage
- Combined elements form from mod order (left to right, top to bottom in mod slots): Heat+Cold=Blast, Heat+Elec=Radiation, Heat+Toxin=Gas, Cold+Elec=Magnetic, Cold+Toxin=Viral, Elec+Toxin=Corrosive
- Each enemy has health, armor, and shield types with specific vulnerabilities
- Damage types that are effective deal +25% to +75% bonus damage; ineffective types deal -15% to -75%

## Modding System
- Most weapons have 8 mod slots + 1 exilus slot + 1 arcane slot
- Mods are the primary way to increase power - an unmodded weapon does 1/10th or less of its potential
- Mods belong to multiplicative groups: base damage, multishot, elemental, crit chance, crit damage, fire rate, faction
- Mods within the same group ADD together; different groups MULTIPLY - diversity across groups maximizes DPS
- The "essential mods" for any weapon: base damage mod + multishot mod (always slot these first)
- Polarity matching halves a mod's drain cost; mismatching increases it by 25%

## Current Meta (General Guidance)
- Viral + Slash is the dominant combo for most content: Viral doubles health damage taken, Slash procs bypass armor
- Hunter Munitions forces Slash procs on critical hits (30% chance) - core for crit-based primaries
- Condition Overload (melee) gives +80% damage per unique status on target - extremely powerful
- Corrosive + Heat is the anti-armor alternative - strips armor permanently
- Critical builds are preferred for weapons with >20% base crit chance
- Status builds shine on weapons with >30% base status chance and high fire rate

## Enemy Factions
- **Grineer**: Cloned Flesh + Ferrite/Alloy Armor. Use Viral+Slash or Corrosive+Heat. High armor makes them tanky at high levels.
- **Corpus**: Flesh + Shields (some Proto Shields). Use Magnetic for shields, then Toxin/Viral for health. Toxin bypasses shields entirely.
- **Infested**: Infested/Fossilized health, minimal armor. Use Gas/Heat. Generally the easiest faction.
- **Corrupted (Void)**: Mix of all factions. Viral+Slash works as a catch-all.
- **Sentients**: Adapt to repeated damage types. Use diverse damage or reset adaptation with Void damage.

## Key Abbreviations
- MR = Mastery Rank, CC = Crit Chance, CD = Crit Damage, SC = Status Chance
- IPS = Impact/Puncture/Slash, SP = Steel Path, HM = Hunter Munitions
- CO = Condition Overload, BR = Blood Rush, WW = Weeping Wounds
- EHP = Effective Hit Points, QoL = Quality of Life
- Forma = polarizes a mod slot, Catalyst/Reactor = doubles mod capacity

## Game Modes & Endgame
- **Star Chart**: Main progression, ~230 nodes across planets
- **Steel Path**: Hard mode star chart, +100 enemy levels, better rewards
- **Arbitrations**: Endless missions with unique modifiers, Endo/Vitus Essence rewards
- **Sorties**: Daily 3-mission sequence with conditions, Riven mod reward
- **Archon Hunts**: Weekly boss fight, Archon Shard rewards
- **Eidolon Hunts**: Open world boss fights on Plains of Eidolon (night only)
- **Profit-Taker/Exploiter Orbs**: Open world bosses on Orb Vallis
- **Railjack**: Space combat missions
- **The Circuit / Duviri**: Roguelite game mode with random loadouts

## Useful Resources
- Warframe Wiki (warframe.fandom.com): Authoritative source for all game data
- warframe.market: Player trading marketplace with live prices
- Overframe.gg: Community weapon/frame builds with ratings
- r/Warframe: Community discussions, guides, patch notes
- Official Drop Tables (warframe.com/droptables): Authoritative drop rates from Digital Extremes`;
}
