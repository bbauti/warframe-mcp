import { z } from "zod";
import { type InferSchema, type ToolMetadata } from "xmcp";
import { getWorldState } from "../lib/api/wfcd";
import {
  type WorldState,
  type WorldStateAlert,
  type WorldStateCycle,
  type WorldStateFissure,
  type WorldStateInvasion,
  type WorldStateSortie,
  type WorldStateVoidTrader,
} from "../types/api-responses";

export const schema = {
  category: z
    .enum([
      "all",
      "fissures",
      "sortie",
      "invasions",
      "baro",
      "nightwave",
      "cycles",
      "alerts",
      "archon_hunt",
      "steel_path",
      "events",
    ])
    .optional()
    .describe("What game state info to get (default: all — returns summary of everything)"),
  platform: z
    .enum(["pc", "ps4", "xb1", "swi"])
    .optional()
    .describe("Platform (default: pc)"),
};

export const metadata: ToolMetadata = {
  name: "world_state",
  description:
    "Get the current live game state in Warframe — active Void Fissures, Sortie missions, Invasions, Baro Ki'Teer status, Nightwave challenges, day/night cycles (Cetus, Vallis, Cambion), Archon Hunt, Steel Path honors, and active events. Use this when a user asks what's happening in the game right now.",
  annotations: {
    title: "World State",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
};

type Category = NonNullable<InferSchema<typeof schema>["category"]>;

const FISSURE_TIER_ORDER: Record<string, number> = {
  lith: 1,
  meso: 2,
  neo: 3,
  axi: 4,
  requiem: 5,
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return null;
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

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") {
    return value;
  }

  return null;
}

function formatNumber(value: number | null, digits = 2): string {
  if (value === null) {
    return "N/A";
  }

  return value.toFixed(digits).replace(/\.?0+$/, "");
}

function normalizePercent(value: unknown): number | null {
  const numeric = asNumber(value);
  if (numeric === null) {
    return null;
  }

  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return Math.max(0, Math.min(100, percent));
}

function formatPercent(value: unknown): string {
  const normalized = normalizePercent(value);
  if (normalized === null) {
    return "N/A";
  }

  return `${formatNumber(normalized, 1)}%`;
}

function formatTimeDelta(milliseconds: number): string {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return "now";
  }

  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatEta(eta: unknown, expiry: unknown): string {
  const etaText = asString(eta);
  if (etaText) {
    return etaText;
  }

  const expiryText = asString(expiry);
  if (!expiryText) {
    return "Unknown";
  }

  const expiryMs = Date.parse(expiryText);
  if (!Number.isFinite(expiryMs)) {
    return "Unknown";
  }

  return formatTimeDelta(expiryMs - Date.now());
}

function getPlatformLabel(platform: string): string {
  switch (platform) {
    case "ps4":
      return "PS4";
    case "xb1":
      return "XB1";
    case "swi":
      return "Switch";
    default:
      return "PC";
  }
}

function getFissureTierRank(fissure: WorldStateFissure): number {
  const tier = (fissure.tier ?? "").toLowerCase();
  if (tier in FISSURE_TIER_ORDER) {
    return FISSURE_TIER_ORDER[tier];
  }

  if (typeof fissure.tierNum === "number" && Number.isFinite(fissure.tierNum)) {
    return fissure.tierNum;
  }

  return 99;
}

function sortFissures(fissures: WorldStateFissure[]): WorldStateFissure[] {
  return [...fissures].sort((a, b) => {
    const rankDiff = getFissureTierRank(a) - getFissureTierRank(b);
    if (rankDiff !== 0) {
      return rankDiff;
    }

    const nodeA = a.node ?? "";
    const nodeB = b.node ?? "";
    return nodeA.localeCompare(nodeB);
  });
}

function formatFissureEntry(fissure: WorldStateFissure): string {
  const tier = fissure.tier ?? "Unknown Tier";
  const node = fissure.node ?? "Unknown Node";
  const missionType = fissure.missionType ?? "Unknown Mission";
  const timeRemaining = formatEta(fissure.eta, undefined);
  return `${tier} | ${node} | ${missionType} | ${timeRemaining}`;
}

function buildFissureLines(fissures: WorldStateFissure[] | undefined, summary: boolean): string[] {
  const active = sortFissures((fissures ?? []).filter((fissure) => fissure.expired !== true));

  if (active.length === 0) {
    return ["No active fissures found."];
  }

  if (summary) {
    const lines: string[] = [`Active fissures: ${active.length}`];
    const preview = active.slice(0, 3).map((fissure) => formatFissureEntry(fissure));
    lines.push(`Highlights: ${preview.join(" ; ")}`);
    return lines;
  }

  const lines: string[] = [];
  for (const [index, fissure] of active.entries()) {
    lines.push(`${index + 1}. ${formatFissureEntry(fissure)}`);
  }

  return lines;
}

function buildSortieLines(sortie: WorldStateSortie | undefined, summary: boolean): string[] {
  if (!sortie || sortie.expired === true) {
    return ["No active sortie found."];
  }

  const boss = sortie.boss ?? "Unknown";
  const faction = sortie.faction ?? "Unknown";
  const eta = formatEta(sortie.eta, undefined);
  const variants = Array.isArray(sortie.variants) ? sortie.variants : [];

  if (summary) {
    const missionPreview = variants
      .slice(0, 3)
      .map((variant) => `${variant.missionType ?? "Unknown"} @ ${variant.node ?? "Unknown"}`)
      .join(" ; ");

    return [
      `Boss: ${boss} | Faction: ${faction} | Ends in: ${eta}`,
      missionPreview ? `Missions: ${missionPreview}` : "Missions: No variant data.",
    ];
  }

  const lines: string[] = [];
  lines.push(`Boss: ${boss}`);
  lines.push(`Faction: ${faction}`);
  lines.push(`Ends In: ${eta}`);

  if (variants.length === 0) {
    lines.push("Missions: No variant data.");
    return lines;
  }

  lines.push("Missions:");
  for (const [index, variant] of variants.entries()) {
    const missionType = variant.missionType ?? "Unknown Mission";
    const node = variant.node ?? "Unknown Node";
    const modifier = variant.modifier ?? "No modifier";
    const modifierDescription = variant.modifierDescription ?? "No description";
    lines.push(`${index + 1}. ${missionType} @ ${node} | ${modifier} (${modifierDescription})`);
  }

  return lines;
}

function getInvasionFaction(invasion: Record<string, unknown>, side: "attacker" | "defender"): string {
  const sideRecord = asRecord(invasion[side]);
  const faction = asString(sideRecord?.faction);
  return faction ?? "Unknown";
}

function getInvasionReward(invasion: WorldStateInvasion, side: "attacker" | "defender"): string {
  const invasionRecord = invasion as Record<string, unknown>;

  const rewardFromTyped =
    side === "attacker"
      ? invasion.attackerReward?.asString
      : invasion.defenderReward?.asString;

  if (asString(rewardFromTyped)) {
    return rewardFromTyped as string;
  }

  const rewardRecord = asRecord(invasionRecord[`${side}Reward`]);
  const asStringValue = asString(rewardRecord?.asString);
  if (asStringValue) {
    return asStringValue;
  }

  const sideRecord = asRecord(invasionRecord[side]);
  const nestedReward = asRecord(sideRecord?.reward);
  const nestedAsString = asString(nestedReward?.asString);
  if (nestedAsString) {
    return nestedAsString;
  }

  return "None";
}

function buildInvasionLines(invasions: WorldStateInvasion[] | undefined, summary: boolean): string[] {
  const active = (invasions ?? []).filter((invasion) => invasion.completed !== true);

  if (active.length === 0) {
    return ["No active invasions found."];
  }

  if (summary) {
    const previews = active.slice(0, 2).map((invasion) => {
      const record = invasion as Record<string, unknown>;
      const attackerFaction = getInvasionFaction(record, "attacker");
      const defenderFaction = getInvasionFaction(record, "defender");
      const node = invasion.node ?? "Unknown Node";
      const progress = formatPercent(invasion.completion);
      return `${node}: ${attackerFaction} vs ${defenderFaction} (${progress})`;
    });

    return [`Active invasions: ${active.length}`, `Highlights: ${previews.join(" ; ")}`];
  }

  const lines: string[] = [];

  for (const [index, invasion] of active.entries()) {
    const invasionRecord = invasion as Record<string, unknown>;
    const node = invasion.node ?? "Unknown Node";
    const attackerFaction = getInvasionFaction(invasionRecord, "attacker");
    const defenderFaction = getInvasionFaction(invasionRecord, "defender");
    const attackerReward = getInvasionReward(invasion, "attacker");
    const defenderReward = getInvasionReward(invasion, "defender");
    const progress = formatPercent(invasion.completion);
    const eta = formatEta(invasion.eta, undefined);

    lines.push(
      `${index + 1}. ${node} | ${attackerFaction} vs ${defenderFaction} | ${progress} complete | ${eta}`,
    );
    lines.push(`   Rewards: Attacker ${attackerReward} | Defender ${defenderReward}`);
  }

  return lines;
}

function buildBaroLines(voidTrader: WorldStateVoidTrader | undefined, summary: boolean): string[] {
  if (!voidTrader) {
    return ["No Baro Ki'Teer data available."];
  }

  const isActive = voidTrader.active === true;
  const location = voidTrader.location ?? "Unknown location";
  const start = voidTrader.startString ?? "Unknown";
  const end = voidTrader.endString ?? "Unknown";

  if (!isActive) {
    if (summary) {
      return [`Baro is away. Next arrival: ${start}`, `Expected location: ${location}`];
    }

    return [
      "Status: Inactive",
      `Next Arrival: ${start}`,
      `Expected Location: ${location}`,
    ];
  }

  const inventory = Array.isArray(voidTrader.inventory) ? voidTrader.inventory : [];

  if (summary) {
    const preview = inventory
      .slice(0, 3)
      .map((entry) => `${entry.item ?? "Unknown"} (${formatNumber(asNumber(entry.ducats), 0)}d)`)
      .join(" ; ");

    return [
      `Baro is active at ${location} (leaves in ${end})`,
      preview.length > 0 ? `Highlights: ${preview}` : "Inventory data not available.",
    ];
  }

  const lines: string[] = [];
  lines.push("Status: Active");
  lines.push(`Location: ${location}`);
  lines.push(`Departure: ${end}`);

  if (inventory.length === 0) {
    lines.push("Inventory: No inventory data available.");
    return lines;
  }

  lines.push("Inventory:");
  for (const [index, entry] of inventory.entries()) {
    const item = entry.item ?? "Unknown Item";
    const ducats = formatNumber(asNumber(entry.ducats), 0);
    const credits = formatNumber(asNumber(entry.credits), 0);
    lines.push(`${index + 1}. ${item} | ${ducats} ducats | ${credits} credits`);
  }

  return lines;
}

function buildNightwaveLines(worldState: WorldState, summary: boolean): string[] {
  const nightwaveRecord = asRecord(worldState.nightwave);
  if (!nightwaveRecord) {
    return ["No Nightwave data available."];
  }

  const active = asBoolean(nightwaveRecord.active);
  const season = formatNumber(asNumber(nightwaveRecord.season), 0);
  const challenges = Array.isArray(nightwaveRecord.possibleChallenges)
    ? nightwaveRecord.possibleChallenges
    : [];

  if (summary) {
    const preview = challenges
      .slice(0, 3)
      .map((challenge) => {
        const challengeRecord = asRecord(challenge);
        const title = asString(challengeRecord?.title) ?? "Unknown";
        const standing = formatNumber(asNumber(challengeRecord?.reputation), 0);
        return `${title} (+${standing})`;
      })
      .join(" ; ");

    return [
      `Nightwave: ${active === true ? "Active" : "Inactive"} | Season ${season}`,
      `Challenges: ${challenges.length}`,
      preview.length > 0 ? `Highlights: ${preview}` : "No challenge data available.",
    ];
  }

  const lines: string[] = [];
  lines.push(`Status: ${active === true ? "Active" : "Inactive"}`);
  lines.push(`Season: ${season}`);
  lines.push(`Challenges: ${challenges.length}`);

  if (challenges.length === 0) {
    return lines;
  }

  lines.push("Challenge List:");
  for (const [index, challenge] of challenges.entries()) {
    const challengeRecord = asRecord(challenge);
    const title = asString(challengeRecord?.title) ?? "Unknown Challenge";
    const description = asString(challengeRecord?.desc) ?? "No description";
    const standing = formatNumber(asNumber(challengeRecord?.reputation), 0);
    const isDaily = asBoolean(challengeRecord?.isDaily) === true;
    const isElite = asBoolean(challengeRecord?.isElite) === true;
    const tag = isDaily ? "Daily" : isElite ? "Elite Weekly" : "Weekly";

    lines.push(`${index + 1}. [${tag}] ${title} | +${standing} standing`);
    lines.push(`   ${description}`);
  }

  return lines;
}

function getCycleState(name: string, cycle: WorldStateCycle): string {
  const state = asString(cycle.state);

  if (name === "Cetus" || name === "Earth") {
    if (typeof cycle.isDay === "boolean") {
      return cycle.isDay ? "Day" : "Night";
    }
  }

  if (name === "Orb Vallis") {
    const cycleRecord = cycle as Record<string, unknown>;
    const isWarm = asBoolean(cycleRecord.isWarm);
    if (isWarm !== null) {
      return isWarm ? "Warm" : "Cold";
    }
  }

  if (state) {
    return state;
  }

  const shortString = asString(cycle.shortString);
  if (shortString) {
    return shortString;
  }

  return "Unknown";
}

function getCycleTimeLeft(cycle: WorldStateCycle): string {
  const direct = asString(cycle.timeLeft);
  if (direct) {
    return direct;
  }

  const shortString = asString(cycle.shortString);
  if (shortString && /\d/.test(shortString)) {
    return shortString;
  }

  return formatEta(undefined, cycle.expiry);
}

function buildCycleLines(cycle: WorldStateCycle | undefined, label: string): string {
  if (!cycle) {
    return `${label}: No data`;
  }

  const state = getCycleState(label, cycle);
  const timeLeft = getCycleTimeLeft(cycle);
  return `${label}: ${state} | Time to change: ${timeLeft}`;
}

function buildCyclesLines(worldState: WorldState, summary: boolean): string[] {
  const lines = [
    buildCycleLines(worldState.cetusCycle, "Cetus"),
    buildCycleLines(worldState.vallisCycle, "Orb Vallis"),
    buildCycleLines(worldState.cambionCycle, "Cambion Drift"),
    buildCycleLines(worldState.earthCycle, "Earth"),
  ];

  if (summary) {
    return [
      lines[0],
      lines[1],
      `${lines[2]} ; ${lines[3]}`,
    ];
  }

  return lines;
}

function getVariantLines(record: Record<string, unknown>): string[] {
  const variants = Array.isArray(record.variants) ? record.variants : [];
  const lines: string[] = [];

  for (const [index, variant] of variants.entries()) {
    const variantRecord = asRecord(variant);
    const missionType = asString(variantRecord?.missionType) ?? "Unknown Mission";
    const node = asString(variantRecord?.node) ?? "Unknown Node";
    const modifier = asString(variantRecord?.modifier);

    if (modifier) {
      lines.push(`${index + 1}. ${missionType} @ ${node} | ${modifier}`);
    } else {
      lines.push(`${index + 1}. ${missionType} @ ${node}`);
    }
  }

  return lines;
}

function buildArchonHuntLines(worldState: WorldState, summary: boolean): string[] {
  const archonRecord = asRecord(worldState["archonHunt"]);
  if (!archonRecord) {
    return ["No active Archon Hunt data found."];
  }

  const boss = asString(archonRecord.boss) ?? asString(archonRecord.target) ?? "Unknown";
  const eta = formatEta(archonRecord.eta, archonRecord.expiry);
  const variants = getVariantLines(archonRecord);

  if (summary) {
    const missionPreview = variants.slice(0, 3).join(" ; ");
    return [
      `Boss: ${boss} | Ends in: ${eta}`,
      missionPreview.length > 0 ? `Missions: ${missionPreview}` : "Missions: No variant data.",
    ];
  }

  const lines: string[] = [];
  lines.push(`Boss: ${boss}`);
  lines.push(`Ends In: ${eta}`);

  if (variants.length === 0) {
    lines.push("Missions: No variant data.");
    return lines;
  }

  lines.push("Missions:");
  lines.push(...variants);
  return lines;
}

function buildSteelPathLines(worldState: WorldState, summary: boolean): string[] {
  const steelPathRecord = asRecord(worldState["steelPath"]);
  if (!steelPathRecord) {
    return ["No Steel Path honors data found."];
  }

  const currentRewardRecord = asRecord(steelPathRecord.currentReward);
  const currentRewardName =
    asString(currentRewardRecord?.name) ?? asString(steelPathRecord.currentReward) ?? "Unknown";
  const currentRewardCost = formatNumber(asNumber(currentRewardRecord?.cost), 0);
  const remaining = asString(steelPathRecord.remaining) ?? formatEta(steelPathRecord.eta, steelPathRecord.expiry);

  const rotation = Array.isArray(steelPathRecord.rotation) ? steelPathRecord.rotation : [];

  if (summary) {
    const rotationPreview = rotation
      .slice(0, 3)
      .map((entry) => {
        const entryRecord = asRecord(entry);
        const name = asString(entryRecord?.name) ?? asString(entry);
        const cost = formatNumber(asNumber(entryRecord?.cost), 0);
        return name ? `${name} (${cost})` : null;
      })
      .filter((entry): entry is string => entry !== null)
      .join(" ; ");

    return [
      `Current honors reward: ${currentRewardName} (${currentRewardCost} SE)`,
      `Rotation refresh: ${remaining}`,
      rotationPreview.length > 0 ? `Rotation preview: ${rotationPreview}` : "Rotation details unavailable.",
    ];
  }

  const lines: string[] = [];
  lines.push(`Current Reward: ${currentRewardName}`);
  lines.push(`Steel Essence Cost: ${currentRewardCost}`);
  lines.push(`Rotation Refresh: ${remaining}`);

  if (rotation.length === 0) {
    lines.push("Rotation: No rotation data available.");
    return lines;
  }

  lines.push("Rotation:");
  for (const [index, entry] of rotation.entries()) {
    const entryRecord = asRecord(entry);
    const name = asString(entryRecord?.name) ?? asString(entry) ?? "Unknown";
    const cost = formatNumber(asNumber(entryRecord?.cost), 0);
    lines.push(`${index + 1}. ${name} | ${cost} SE`);
  }

  return lines;
}

function formatEventRewards(eventRecord: Record<string, unknown>): string {
  const rewards = Array.isArray(eventRecord.rewards) ? eventRecord.rewards : [];
  if (rewards.length === 0) {
    return "None listed";
  }

  const formatted = rewards
    .map((reward) => {
      const rewardRecord = asRecord(reward);
      return asString(rewardRecord?.asString) ?? asString(rewardRecord?.itemString) ?? asString(rewardRecord?.item);
    })
    .filter((reward): reward is string => reward !== null);

  if (formatted.length === 0) {
    return "None listed";
  }

  return formatted.join(", ");
}

function buildEventsLines(worldState: WorldState, summary: boolean): string[] {
  const events = Array.isArray(worldState.events) ? worldState.events : [];
  const activeEvents = events
    .map((event) => asRecord(event))
    .filter((event): event is Record<string, unknown> => event !== null)
    .filter((event) => asBoolean(event.expired) !== true);

  if (activeEvents.length === 0) {
    return ["No active events found."];
  }

  if (summary) {
    const previews = activeEvents
      .slice(0, 3)
      .map((event) => {
        const description = asString(event.description) ?? asString(event.id) ?? "Unnamed event";
        const eta = formatEta(event.eta, event.expiry);
        return `${description} (${eta})`;
      });

    return [`Active events: ${activeEvents.length}`, `Highlights: ${previews.join(" ; ")}`];
  }

  const lines: string[] = [];

  for (const [index, event] of activeEvents.entries()) {
    const description = asString(event.description) ?? asString(event.id) ?? "Unnamed event";
    const eta = formatEta(event.eta, event.expiry);
    const node = asString(event.node) ?? "Various/Unknown";
    const faction = asString(event.faction) ?? "Unknown";
    const rewards = formatEventRewards(event);

    lines.push(`${index + 1}. ${description}`);
    lines.push(`   Faction: ${faction} | Node: ${node} | Ends In: ${eta}`);
    lines.push(`   Rewards: ${rewards}`);
  }

  return lines;
}

function buildAlertsLines(alerts: WorldStateAlert[] | undefined, summary: boolean): string[] {
  const activeAlerts = (alerts ?? []).filter((alert) => alert.expired !== true);

  if (activeAlerts.length === 0) {
    return ["No active alerts found."];
  }

  if (summary) {
    const preview = activeAlerts
      .slice(0, 3)
      .map((alert) => {
        const node = alert.mission?.node ?? "Unknown Node";
        const missionType = alert.mission?.type ?? "Unknown Mission";
        const reward = alert.mission?.reward?.asString ?? alert.mission?.reward?.itemString ?? "Unknown reward";
        return `${missionType} @ ${node} (${reward})`;
      });

    return [`Active alerts: ${activeAlerts.length}`, `Highlights: ${preview.join(" ; ")}`];
  }

  const lines: string[] = [];

  for (const [index, alert] of activeAlerts.entries()) {
    const node = alert.mission?.node ?? "Unknown Node";
    const missionType = alert.mission?.type ?? "Unknown Mission";
    const faction = alert.mission?.faction ?? "Unknown";
    const reward = alert.mission?.reward?.asString ?? alert.mission?.reward?.itemString ?? "Unknown reward";
    const eta = formatEta(alert.eta, alert.expiry);

    lines.push(`${index + 1}. ${missionType} @ ${node}`);
    lines.push(`   Faction: ${faction} | Reward: ${reward} | Ends In: ${eta}`);
  }

  return lines;
}

function addSection(lines: string[], title: string, sectionLines: string[]): void {
  lines.push(`${title}:`);
  lines.push(...sectionLines);
  lines.push("");
}

function buildAllSummary(worldState: WorldState): string {
  const lines: string[] = [];

  addSection(lines, "Void Fissures", buildFissureLines(worldState.fissures, true));
  addSection(lines, "Sortie", buildSortieLines(worldState.sortie, true));
  addSection(lines, "Invasions", buildInvasionLines(worldState.invasions, true));
  addSection(lines, "Baro Ki'Teer", buildBaroLines(worldState.voidTrader, true));
  addSection(lines, "Nightwave", buildNightwaveLines(worldState, true));
  addSection(lines, "Cycles", buildCyclesLines(worldState, true));
  addSection(lines, "Alerts", buildAlertsLines(worldState.alerts, true));
  addSection(lines, "Archon Hunt", buildArchonHuntLines(worldState, true));
  addSection(lines, "Steel Path Honors", buildSteelPathLines(worldState, true));
  addSection(lines, "Events", buildEventsLines(worldState, true));

  return lines.join("\n").trim();
}

function buildCategoryOutput(worldState: WorldState, category: Category): string {
  const lines: string[] = [];

  switch (category) {
    case "fissures":
      addSection(lines, "Void Fissures", buildFissureLines(worldState.fissures, false));
      break;
    case "sortie":
      addSection(lines, "Sortie", buildSortieLines(worldState.sortie, false));
      break;
    case "invasions":
      addSection(lines, "Invasions", buildInvasionLines(worldState.invasions, false));
      break;
    case "baro":
      addSection(lines, "Baro Ki'Teer", buildBaroLines(worldState.voidTrader, false));
      break;
    case "nightwave":
      addSection(lines, "Nightwave", buildNightwaveLines(worldState, false));
      break;
    case "cycles":
      addSection(lines, "Cycles", buildCyclesLines(worldState, false));
      break;
    case "alerts":
      addSection(lines, "Alerts", buildAlertsLines(worldState.alerts, false));
      break;
    case "archon_hunt":
      addSection(lines, "Archon Hunt", buildArchonHuntLines(worldState, false));
      break;
    case "steel_path":
      addSection(lines, "Steel Path Honors", buildSteelPathLines(worldState, false));
      break;
    case "events":
      addSection(lines, "Events", buildEventsLines(worldState, false));
      break;
    case "all":
    default:
      return buildAllSummary(worldState);
  }

  return lines.join("\n").trim();
}

export default async function worldStateTool({ category, platform }: InferSchema<typeof schema>): Promise<string> {
  const selectedCategory: Category = category ?? "all";
  const selectedPlatform = platform ?? "pc";

  try {
    const worldState = await getWorldState(selectedPlatform);
    const lines: string[] = [];

    lines.push(`Warframe World State (${getPlatformLabel(selectedPlatform)})`);

    if (worldState.timestamp) {
      lines.push(`Snapshot Timestamp: ${worldState.timestamp}`);
    }

    lines.push("");
    lines.push(buildCategoryOutput(worldState, selectedCategory));

    return lines.join("\n").trim();
  } catch (error) {
    return `Unable to fetch world state: ${getErrorMessage(error)}`;
  }
}
