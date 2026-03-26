import { getModsForWeaponType } from "../data/mod-groups";
import { resolveElements } from "./elements";
import { type BuildGoal, type ModEntry, type ModGroup, type WeaponStats } from "./types";

const IPS_TYPES = ["Impact", "Puncture", "Slash"] as const;
const ELEMENT_TYPES = [
  "Heat",
  "Cold",
  "Electricity",
  "Toxin",
  "Blast",
  "Corrosive",
  "Gas",
  "Magnetic",
  "Radiation",
  "Viral",
] as const;

const ELEMENT_SET = new Set<string>(ELEMENT_TYPES);
const IPS_SET = new Set<string>(IPS_TYPES);

export interface AppliedModsResult {
  moddedBaseDamage: number;
  totalDamage: number;
  damageBreakdown: Record<string, number>;
  elementalPercents: Record<string, number>;
  elementalDamageBreakdown: Record<string, number>;
  effectiveCritChance: number;
  effectiveCritMultiplier: number;
  effectiveStatusChance: number;
  effectiveMultishot: number;
  effectiveFireRate: number;
  groupTotals: Record<ModGroup, number>;
  statTotals: Record<string, number>;
}

function addValue(record: Record<string, number>, key: string, value: number): void {
  if (!Number.isFinite(value) || value === 0) {
    return;
  }

  record[key] = (record[key] ?? 0) + value;
}

function sumDamage(damage: Record<string, number>): number {
  return Object.values(damage).reduce((total, value) => {
    if (!Number.isFinite(value) || value <= 0) {
      return total;
    }

    return total + value;
  }, 0);
}

function getNumericStat(mod: ModEntry, key: string): number {
  const value = mod.stats[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function getGroupContribution(mod: ModEntry): number {
  switch (mod.group) {
    case "baseDamage":
      return getNumericStat(mod, "baseDamage");
    case "multishot":
      return getNumericStat(mod, "multishot");
    case "elemental":
      return Object.entries(mod.stats).reduce((total, [key, value]) => {
        if (ELEMENT_SET.has(key) && Number.isFinite(value) && value > 0) {
          return total + value;
        }

        return total;
      }, 0);
    case "critChance":
      return getNumericStat(mod, "critChance") + getNumericStat(mod, "critChanceComboMult");
    case "critDamage":
      return getNumericStat(mod, "critDamage");
    case "fireRate":
      return (
        getNumericStat(mod, "fireRate") +
        getNumericStat(mod, "attackSpeed") +
        getNumericStat(mod, "attackSpeedOnCrit")
      );
    case "statusChance":
      return getNumericStat(mod, "statusChance") + getNumericStat(mod, "statusChanceComboMult");
    case "statusDuration":
      return getNumericStat(mod, "statusDuration");
    default:
      return 0;
  }
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, value);
}

function initializeGroupTotals(): Record<ModGroup, number> {
  return {
    baseDamage: 0,
    multishot: 0,
    elemental: 0,
    critChance: 0,
    critDamage: 0,
    fireRate: 0,
    faction: 0,
    statusChance: 0,
    statusDuration: 0,
    special: 0,
  };
}

export function applyMods(weapon: WeaponStats, mods: ModEntry[]): AppliedModsResult {
  const groupTotals = initializeGroupTotals();
  const statTotals: Record<string, number> = {};
  const elementalMods: Array<{ element: string; value: number }> = [];
  const ipsBonusMods: Record<string, number> = {
    Impact: 0,
    Puncture: 0,
    Slash: 0,
  };

  for (const mod of mods) {
    addValue(groupTotals, mod.group, getGroupContribution(mod));

    for (const [stat, value] of Object.entries(mod.stats)) {
      if (!Number.isFinite(value) || value === 0) {
        continue;
      }

      addValue(statTotals, stat, value);

      if (ELEMENT_SET.has(stat) && value > 0) {
        elementalMods.push({ element: stat, value });
      }

      if (IPS_SET.has(stat) && value > 0) {
        addValue(ipsBonusMods, stat, value);
      }
    }
  }

  const rawBaseDamage =
    typeof weapon.totalDamage === "number" && weapon.totalDamage > 0
      ? weapon.totalDamage
      : sumDamage(weapon.damage);

  const baseDamage = Math.max(1, rawBaseDamage || 1);

  const baseDamageMods = statTotals.baseDamage ?? 0;
  const multishotMods = statTotals.multishot ?? 0;
  const critChanceMods = (statTotals.critChance ?? 0) + (statTotals.critChanceComboMult ?? 0);
  const critDamageMods = statTotals.critDamage ?? 0;
  const statusChanceMods = (statTotals.statusChance ?? 0) + (statTotals.statusChanceComboMult ?? 0);
  const fireRateMods =
    (statTotals.fireRate ?? 0) +
    (statTotals.attackSpeed ?? 0) +
    (statTotals.attackSpeedOnCrit ?? 0);

  const moddedBaseDamage = clampNonNegative(baseDamage * (1 + baseDamageMods));

  const originalBreakdown: Record<string, number> = {};
  for (const [type, value] of Object.entries(weapon.damage)) {
    if (Number.isFinite(value) && value > 0) {
      originalBreakdown[type] = value;
    }
  }

  if (Object.keys(originalBreakdown).length === 0) {
    originalBreakdown.Impact = baseDamage;
  }

  const originalTotal = Math.max(0.000001, sumDamage(originalBreakdown));
  const baseScale = moddedBaseDamage / originalTotal;

  const damageBreakdown: Record<string, number> = {};

  for (const [type, value] of Object.entries(originalBreakdown)) {
    damageBreakdown[type] = value * baseScale;
  }

  for (const ipsType of IPS_TYPES) {
    const multiplier = ipsBonusMods[ipsType] ?? 0;
    if (multiplier <= 0) {
      continue;
    }

    const ipsBaseAmount = damageBreakdown[ipsType] ?? 0;
    if (ipsBaseAmount <= 0) {
      continue;
    }

    addValue(damageBreakdown, ipsType, ipsBaseAmount * multiplier);
  }

  const elementalPercents = resolveElements(elementalMods);
  const elementalDamageBreakdown: Record<string, number> = {};

  for (const [element, percent] of Object.entries(elementalPercents)) {
    if (!Number.isFinite(percent) || percent <= 0) {
      continue;
    }

    const elementDamage = moddedBaseDamage * percent;
    elementalDamageBreakdown[element] = elementDamage;
    addValue(damageBreakdown, element, elementDamage);
  }

  const totalDamage = sumDamage(damageBreakdown);

  return {
    moddedBaseDamage,
    totalDamage,
    damageBreakdown,
    elementalPercents,
    elementalDamageBreakdown,
    effectiveCritChance: clampNonNegative(weapon.criticalChance * (1 + critChanceMods)),
    effectiveCritMultiplier: Math.max(1, weapon.criticalMultiplier * (1 + critDamageMods)),
    effectiveStatusChance: clampNonNegative(weapon.statusChance * (1 + statusChanceMods)),
    effectiveMultishot: clampNonNegative(weapon.multishot * (1 + multishotMods)),
    effectiveFireRate: Math.max(0.01, weapon.fireRate * (1 + fireRateMods)),
    groupTotals,
    statTotals,
  };
}

function normalizeGoal(goal: BuildGoal, weapon: WeaponStats): BuildGoal {
  if (goal !== "general_dps") {
    return goal;
  }

  const highCrit = weapon.criticalChance >= 0.3;
  const highStatus = weapon.statusChance >= 0.3;

  if (highCrit && highStatus) {
    return "hybrid";
  }

  if (highCrit) {
    return "crit";
  }

  if (highStatus) {
    return "status";
  }

  if (weapon.criticalChance >= 0.2 && weapon.statusChance >= 0.2) {
    return "hybrid";
  }

  if (weapon.statusChance > weapon.criticalChance) {
    return "status";
  }

  if (weapon.criticalChance >= 0.2) {
    return "crit";
  }

  return "corrosive";
}

function pickBestMod(
  pool: ModEntry[],
  chosen: Set<string>,
  filter: (mod: ModEntry) => boolean,
  score: (mod: ModEntry) => number,
): ModEntry | null {
  let best: ModEntry | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const mod of pool) {
    const key = mod.name.toLowerCase();
    if (chosen.has(key) || !filter(mod)) {
      continue;
    }

    const value = score(mod);
    if (value > bestScore) {
      best = mod;
      bestScore = value;
    }
  }

  return best;
}

function addMod(
  selected: ModEntry[],
  selectedNames: Set<string>,
  mod: ModEntry | null,
  slotCount: number,
): boolean {
  if (!mod || selected.length >= slotCount) {
    return false;
  }

  const key = mod.name.toLowerCase();
  if (selectedNames.has(key)) {
    return false;
  }

  selected.push(mod);
  selectedNames.add(key);
  return true;
}

function elementalScore(mod: ModEntry, element: string, preferStatus: boolean): number {
  const elementValue = getNumericStat(mod, element);
  const statusValue = getNumericStat(mod, "statusChance");

  if (preferStatus) {
    return statusValue * 4 + elementValue;
  }

  return elementValue * 4 + statusValue;
}

function addElementMod(
  pool: ModEntry[],
  selected: ModEntry[],
  selectedNames: Set<string>,
  element: string,
  preferStatus: boolean,
  slotCount: number,
): boolean {
  const mod = pickBestMod(
    pool,
    selectedNames,
    (candidate) => candidate.group === "elemental" && getNumericStat(candidate, element) > 0,
    (candidate) => elementalScore(candidate, element, preferStatus),
  );

  return addMod(selected, selectedNames, mod, slotCount);
}

function addBestByGroup(
  pool: ModEntry[],
  selected: ModEntry[],
  selectedNames: Set<string>,
  group: ModGroup,
  slotCount: number,
): boolean {
  const mod = pickBestMod(
    pool,
    selectedNames,
    (candidate) => candidate.group === group,
    (candidate) => {
      switch (group) {
        case "baseDamage":
          return getNumericStat(candidate, "baseDamage");
        case "multishot":
          return getNumericStat(candidate, "multishot");
        case "critChance":
          return getNumericStat(candidate, "critChance") + getNumericStat(candidate, "critChanceComboMult");
        case "critDamage":
          return getNumericStat(candidate, "critDamage");
        case "fireRate":
          return (
            getNumericStat(candidate, "fireRate") +
            getNumericStat(candidate, "attackSpeed") +
            getNumericStat(candidate, "attackSpeedOnCrit")
          );
        case "statusChance":
          return getNumericStat(candidate, "statusChance") + getNumericStat(candidate, "statusChanceComboMult");
        case "special":
          return (
            getNumericStat(candidate, "damagePerStatus") +
            getNumericStat(candidate, "slashOnCrit") +
            getNumericStat(candidate, "faction")
          );
        default:
          return 0;
      }
    },
  );

  return addMod(selected, selectedNames, mod, slotCount);
}

function addHunterMunitionsIfUseful(
  pool: ModEntry[],
  selected: ModEntry[],
  selectedNames: Set<string>,
  weapon: WeaponStats,
  slotCount: number,
): boolean {
  if (weapon.weaponType === "melee" || weapon.criticalChance < 0.3) {
    return false;
  }

  const hunter = pickBestMod(
    pool,
    selectedNames,
    (mod) => mod.name === "Hunter Munitions",
    () => 1,
  );

  return addMod(selected, selectedNames, hunter, slotCount);
}

function addViralPackage(
  pool: ModEntry[],
  selected: ModEntry[],
  selectedNames: Set<string>,
  slotCount: number,
  preferStatus: boolean,
): void {
  addElementMod(pool, selected, selectedNames, "Toxin", preferStatus, slotCount);
  addElementMod(pool, selected, selectedNames, "Cold", preferStatus, slotCount);
}

function addCorrosiveHeatPackage(
  pool: ModEntry[],
  selected: ModEntry[],
  selectedNames: Set<string>,
  slotCount: number,
  preferStatus: boolean,
): void {
  // Order matters: Electricity + Toxin => Corrosive, Heat remains standalone.
  addElementMod(pool, selected, selectedNames, "Electricity", preferStatus, slotCount);
  addElementMod(pool, selected, selectedNames, "Toxin", preferStatus, slotCount);
  addElementMod(pool, selected, selectedNames, "Heat", preferStatus, slotCount);
}

function buildPriorityScore(mod: ModEntry, goal: BuildGoal, canCrit: boolean): number {
  if (!canCrit && (mod.group === "critChance" || mod.group === "critDamage")) {
    return Number.NEGATIVE_INFINITY;
  }

  if (mod.name === "Hunter Munitions" && !canCrit) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;

  if (mod.group === "baseDamage") {
    score += 100;
  }

  if (mod.group === "multishot") {
    score += 95;
  }

  if (mod.group === "fireRate") {
    score += 45;
  }

  if (mod.group === "special") {
    score += 30;
  }

  if (mod.group === "faction") {
    score += 15;
  }

  switch (goal) {
    case "crit":
      if (mod.group === "critChance") {
        score += 80;
      }
      if (mod.group === "critDamage") {
        score += 75;
      }
      if (mod.name === "Hunter Munitions") {
        score += 70;
      }
      if (mod.group === "elemental") {
        score += 30;
      }
      break;
    case "status":
      if (mod.group === "statusChance") {
        score += 85;
      }
      if (mod.group === "elemental") {
        score += 80 + getNumericStat(mod, "statusChance") * 20;
      }
      if (mod.group === "special") {
        score += 45;
      }
      break;
    case "hybrid":
      if (mod.group === "critChance") {
        score += 60;
      }
      if (mod.group === "critDamage") {
        score += 60;
      }
      if (mod.group === "statusChance") {
        score += 60;
      }
      if (mod.group === "elemental") {
        score += 55;
      }
      if (mod.group === "special") {
        score += 50;
      }
      break;
    case "viral_slash":
      if (mod.name === "Hunter Munitions") {
        score += 85;
      }
      if (mod.group === "critChance" || mod.group === "critDamage") {
        score += 65;
      }
      if (mod.group === "elemental") {
        score += 40;
      }
      break;
    case "corrosive":
      if (mod.group === "statusChance") {
        score += 55;
      }
      if (mod.group === "elemental") {
        const corrosiveWeight =
          getNumericStat(mod, "Toxin") +
          getNumericStat(mod, "Electricity") +
          getNumericStat(mod, "Heat");
        score += 70 + corrosiveWeight * 10;
      }
      break;
    case "comfort":
      if (mod.group === "fireRate") {
        score += 85;
      }
      if (mod.group === "multishot") {
        score += 70;
      }
      if (mod.group === "elemental") {
        score += 35;
      }
      break;
    default:
      break;
  }

  return score;
}

function elementalCap(goal: BuildGoal): number {
  if (goal === "viral_slash") {
    return 2;
  }

  if (goal === "corrosive") {
    return 3;
  }

  return 3;
}

export function selectOptimalMods(weapon: WeaponStats, goal: BuildGoal, slotCount: number): ModEntry[] {
  const normalizedSlotCount = Math.max(1, Math.min(8, Math.floor(slotCount || 8)));
  const pool = getModsForWeaponType(weapon.weaponType);
  const selected: ModEntry[] = [];
  const selectedNames = new Set<string>();

  const resolvedGoal = normalizeGoal(goal, weapon);
  const canCrit = weapon.criticalChance >= 0.2;

  addBestByGroup(pool, selected, selectedNames, "baseDamage", normalizedSlotCount);
  addBestByGroup(pool, selected, selectedNames, "multishot", normalizedSlotCount);

  switch (resolvedGoal) {
    case "crit": {
      if (canCrit) {
        addBestByGroup(pool, selected, selectedNames, "critChance", normalizedSlotCount);
        addBestByGroup(pool, selected, selectedNames, "critDamage", normalizedSlotCount);
      }
      addHunterMunitionsIfUseful(pool, selected, selectedNames, weapon, normalizedSlotCount);
      addViralPackage(pool, selected, selectedNames, normalizedSlotCount, weapon.statusChance >= 0.25);
      break;
    }

    case "status": {
      addBestByGroup(pool, selected, selectedNames, "statusChance", normalizedSlotCount);
      addViralPackage(pool, selected, selectedNames, normalizedSlotCount, true);
      addBestByGroup(pool, selected, selectedNames, "special", normalizedSlotCount);
      break;
    }

    case "hybrid": {
      if (canCrit) {
        addBestByGroup(pool, selected, selectedNames, "critChance", normalizedSlotCount);
        addBestByGroup(pool, selected, selectedNames, "critDamage", normalizedSlotCount);
      }
      addBestByGroup(pool, selected, selectedNames, "statusChance", normalizedSlotCount);
      addViralPackage(pool, selected, selectedNames, normalizedSlotCount, true);
      addHunterMunitionsIfUseful(pool, selected, selectedNames, weapon, normalizedSlotCount);
      addBestByGroup(pool, selected, selectedNames, "special", normalizedSlotCount);
      break;
    }

    case "viral_slash": {
      if (canCrit) {
        addBestByGroup(pool, selected, selectedNames, "critChance", normalizedSlotCount);
        addBestByGroup(pool, selected, selectedNames, "critDamage", normalizedSlotCount);
      }
      addViralPackage(pool, selected, selectedNames, normalizedSlotCount, true);
      addHunterMunitionsIfUseful(pool, selected, selectedNames, weapon, normalizedSlotCount);
      break;
    }

    case "corrosive": {
      addBestByGroup(pool, selected, selectedNames, "statusChance", normalizedSlotCount);
      addCorrosiveHeatPackage(pool, selected, selectedNames, normalizedSlotCount, true);
      addBestByGroup(pool, selected, selectedNames, "special", normalizedSlotCount);
      break;
    }

    case "comfort": {
      addBestByGroup(pool, selected, selectedNames, "fireRate", normalizedSlotCount);
      addViralPackage(pool, selected, selectedNames, normalizedSlotCount, false);
      addBestByGroup(pool, selected, selectedNames, "statusChance", normalizedSlotCount);
      break;
    }

    default:
      break;
  }

  const cap = elementalCap(resolvedGoal);

  while (selected.length < normalizedSlotCount) {
    const currentElementalCount = selected.filter((mod) => mod.group === "elemental").length;

    const bestCandidate = pickBestMod(
      pool,
      selectedNames,
      (mod) => {
        if (mod.group === "elemental" && currentElementalCount >= cap) {
          return false;
        }

        if (!canCrit && (mod.group === "critChance" || mod.group === "critDamage")) {
          return false;
        }

        if (mod.name === "Hunter Munitions" && weapon.criticalChance < 0.3) {
          return false;
        }

        return true;
      },
      (mod) => buildPriorityScore(mod, resolvedGoal, canCrit),
    );

    if (!addMod(selected, selectedNames, bestCandidate, normalizedSlotCount)) {
      break;
    }
  }

  return selected;
}

export function resolveRecommendedGoal(weapon: WeaponStats, goal: BuildGoal): BuildGoal {
  return normalizeGoal(goal, weapon);
}
