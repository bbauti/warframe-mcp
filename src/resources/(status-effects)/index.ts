import { type ResourceMetadata } from "xmcp";

export const metadata: ResourceMetadata = {
  name: "status-effects",
  title: "Status Effects",
  description: "Warframe status effect reference including behavior, duration, and stacking notes.",
};

interface StatusEffect {
  name: string;
  effect: string;
  duration: string;
  stacking: string;
  notes: string;
}

const STATUS_EFFECTS: StatusEffect[] = [
  {
    name: "Impact",
    effect: "Brief stagger and opening for finishers on repeated procs.",
    duration: "Instant / short control window",
    stacking: "Refreshes control effect",
    notes: "Primary value is interruption and crowd control.",
  },
  {
    name: "Puncture",
    effect: "Reduces enemy outgoing damage.",
    duration: "~6s",
    stacking: "Stacks with diminishing benefit",
    notes: "Defensive status; useful for survivability.",
  },
  {
    name: "Slash",
    effect: "Applies bleed damage over time.",
    duration: "~6s",
    stacking: "Stacks independently",
    notes: "Bleed ticks bypass armor, making Slash strong into armored targets.",
  },
  {
    name: "Heat",
    effect: "Applies fire DoT and panic stagger.",
    duration: "~6s",
    stacking: "Refreshes and ramps",
    notes: "Also applies temporary armor reduction while active.",
  },
  {
    name: "Cold",
    effect: "Slows movement and action speed.",
    duration: "~6s",
    stacking: "Stacks up to heavy slow",
    notes: "Control-focused status with strong defensive value.",
  },
  {
    name: "Electricity",
    effect: "Chains damage and stun to nearby enemies.",
    duration: "~3-6s",
    stacking: "Stacks DoT and chaining pressure",
    notes: "Very strong for grouped enemies and robotic targets.",
  },
  {
    name: "Toxin",
    effect: "Applies toxin DoT directly to health.",
    duration: "~6s",
    stacking: "Stacks independently",
    notes: "Bypasses shields entirely.",
  },
  {
    name: "Blast",
    effect: "Disorients enemies and reduces combat effectiveness.",
    duration: "~6s",
    stacking: "Refreshes and strengthens debuff",
    notes: "Best used as control utility rather than raw damage scaling.",
  },
  {
    name: "Corrosive",
    effect: "Reduces enemy armor.",
    duration: "~8s",
    stacking: "Stacks to high armor strip",
    notes: "Excellent anti-armor status, especially for Steel Path enemies.",
  },
  {
    name: "Gas",
    effect: "Creates an AoE cloud that deals toxin-like damage over time.",
    duration: "~6s",
    stacking: "Cloud damage stacks with repeated procs",
    notes: "Strong in dense infested-style packs.",
  },
  {
    name: "Magnetic",
    effect: "Increases shield damage taken and disrupts shields.",
    duration: "~6s",
    stacking: "Stacks with stronger shield vulnerability",
    notes: "Best versus Corpus and shield-heavy enemies.",
  },
  {
    name: "Radiation",
    effect: "Confuses enemies and can cause friendly fire.",
    duration: "~12s",
    stacking: "Refreshes confusion window",
    notes: "Strong crowd-control option and good alloy matchup.",
  },
  {
    name: "Viral",
    effect: "Increases damage dealt to health.",
    duration: "~6s",
    stacking: "1st stack high spike, additional stacks increase up to cap",
    notes: "Core meta amplifier, especially paired with Slash or Toxin.",
  },
  {
    name: "Void",
    effect: "Applies Void debuff effects (including bullet-attractor style interactions in some contexts).",
    duration: "Context-dependent",
    stacking: "Context-dependent",
    notes: "Mostly appears from Operator/amp or Void-specific mechanics.",
  },
];

export default function statusEffectsResource(): string {
  const lines: string[] = [];

  lines.push("WARFRAME STATUS EFFECTS");
  lines.push("");

  for (const effect of STATUS_EFFECTS) {
    lines.push(`${effect.name}:`);
    lines.push(`- Effect: ${effect.effect}`);
    lines.push(`- Duration: ${effect.duration}`);
    lines.push(`- Stacking: ${effect.stacking}`);
    lines.push(`- Notes: ${effect.notes}`);
    lines.push("");
  }

  lines.push("Key Notes:");
  lines.push("- Slash damage-over-time bypasses armor.");
  lines.push("- Toxin damage-over-time bypasses shields.");
  lines.push("- Viral increases damage to health and scales strongly with repeated procs.");
  lines.push("- Corrosive is a premier anti-armor status for high-level content.");

  return lines.join("\n").trim();
}
