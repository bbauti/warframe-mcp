import { searchWeapons } from "../api/wfcd";
import { findEnemyByName } from "../data/enemy-scaling";
import { type WfcdWeapon } from "../../types/api-responses";
import { applyMods, resolveRecommendedGoal, selectOptimalMods } from "./mod-effects";
import { calcAvgCritMultiplier, calcBurstDps, calcEffectiveDpsVsEnemy, calcSustainedDps } from "./formulas";
import { type BuildConfig, type BuildGoal, type DamageResult, type EnemyType, type ModEntry, type WeaponStats } from "./types";

export interface BuildRecommendation {
  weapon: WeaponStats;
  matchedWeaponName: string;
  goal: BuildGoal;
  enemy?: EnemyType;
  mods: ModEntry[];
  result: DamageResult;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function pickBestWeaponMatch(query: string, candidates: WfcdWeapon[]): WfcdWeapon | null {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedQuery = normalize(query);

  const exactMatch = candidates.find((candidate) => normalize(candidate.name) === normalizedQuery);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatch = candidates.find((candidate) => normalize(candidate.name).startsWith(normalizedQuery));
  if (prefixMatch) {
    return prefixMatch;
  }

  const partialMatch = candidates.find((candidate) => normalize(candidate.name).includes(normalizedQuery));
  if (partialMatch) {
    return partialMatch;
  }

  return candidates[0];
}

function normalizeChance(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  if (value > 1) {
    return value / 100;
  }

  return Math.max(0, value);
}

function normalizeWeaponType(value: string | undefined): WeaponStats["weaponType"] {
  const normalized = (value ?? "").toLowerCase();

  if (normalized.includes("shotgun")) {
    return "shotgun";
  }

  if (normalized.includes("pistol") || normalized.includes("secondary")) {
    return "pistol";
  }

  if (normalized.includes("melee")) {
    return "melee";
  }

  if (normalized.includes("bow")) {
    return "bow";
  }

  if (normalized.includes("rifle") || normalized.includes("primary")) {
    return "rifle";
  }

  return "other";
}

function extractDamage(weapon: WfcdWeapon): Record<string, number> {
  const result: Record<string, number> = {};

  if (!weapon.damage || typeof weapon.damage !== "object") {
    return result;
  }

  for (const [type, amount] of Object.entries(weapon.damage)) {
    if (typeof amount === "number" && Number.isFinite(amount) && amount > 0) {
      result[type] = amount;
    }
  }

  return result;
}

function sumDamage(damage: Record<string, number>): number {
  return Object.values(damage).reduce((total, value) => total + value, 0);
}

export function mapWeaponToStats(weapon: WfcdWeapon): WeaponStats {
  const damage = extractDamage(weapon);
  const totalDamage =
    typeof weapon.totalDamage === "number" && weapon.totalDamage > 0
      ? weapon.totalDamage
      : sumDamage(damage);

  const normalizedWeaponType = normalizeWeaponType(weapon.type ?? weapon.category);

  return {
    name: weapon.name,
    damage,
    totalDamage,
    criticalChance: normalizeChance(weapon.criticalChance),
    criticalMultiplier:
      typeof weapon.criticalMultiplier === "number" && weapon.criticalMultiplier > 0
        ? weapon.criticalMultiplier
        : 1,
    statusChance: normalizeChance(weapon.statusChance),
    fireRate: typeof weapon.fireRate === "number" && weapon.fireRate > 0 ? weapon.fireRate : 1,
    magazineSize:
      typeof weapon.magazineSize === "number" && weapon.magazineSize > 0
        ? weapon.magazineSize
        : normalizedWeaponType === "melee"
          ? 1
          : 30,
    reloadTime:
      typeof weapon.reloadTime === "number" && weapon.reloadTime >= 0
        ? weapon.reloadTime
        : normalizedWeaponType === "melee"
          ? 0
          : 2,
    multishot: typeof weapon.multishot === "number" && weapon.multishot > 0 ? weapon.multishot : 1,
    disposition: typeof weapon.disposition === "number" && weapon.disposition > 0 ? weapon.disposition : 1,
    weaponType: normalizedWeaponType,
  };
}

export function calculateBuild(config: BuildConfig): DamageResult {
  const modded = applyMods(config.weapon, config.mods);

  const avgCritMultiplier = calcAvgCritMultiplier(
    modded.effectiveCritChance,
    modded.effectiveCritMultiplier,
  );

  const damagePerShot = modded.totalDamage;
  const burstDps = calcBurstDps(
    damagePerShot,
    avgCritMultiplier,
    modded.effectiveMultishot,
    modded.effectiveFireRate,
  );
  const sustainedDps = calcSustainedDps(
    burstDps,
    Math.max(1, config.weapon.magazineSize),
    modded.effectiveFireRate,
    Math.max(0, config.weapon.reloadTime),
  );

  const result: DamageResult = {
    damagePerShot,
    damageBreakdown: modded.damageBreakdown,
    avgCritMultiplier,
    effectiveCritChance: modded.effectiveCritChance,
    effectiveStatusChance: modded.effectiveStatusChance,
    effectiveMultishot: modded.effectiveMultishot,
    effectiveFireRate: modded.effectiveFireRate,
    burstDps,
    sustainedDps,
    magazineDamage:
      damagePerShot * avgCritMultiplier * modded.effectiveMultishot * Math.max(1, config.weapon.magazineSize),
    statusProcsPerSecond:
      modded.effectiveStatusChance * modded.effectiveMultishot * modded.effectiveFireRate,
  };

  if (config.enemyType) {
    result.effectiveDpsVsArmor = calcEffectiveDpsVsEnemy(
      config,
      config.enemyLevel ?? config.enemyType.baseLevel,
    );
  }

  return result;
}

export async function recommendAndCalculate(
  weaponName: string,
  goal: BuildGoal,
  enemyType?: string,
  enemyLevel?: number,
): Promise<BuildRecommendation> {
  const results = await searchWeapons(weaponName);
  const matched = pickBestWeaponMatch(weaponName, results);

  if (!matched) {
    throw new Error(`No weapons found matching "${weaponName}".`);
  }

  const weapon = mapWeaponToStats(matched);
  const resolvedGoal = resolveRecommendedGoal(weapon, goal);
  const mods = selectOptimalMods(weapon, resolvedGoal, 8);
  const resolvedEnemy = enemyType ? findEnemyByName(enemyType) : null;

  const result = calculateBuild({
    weapon,
    mods,
    enemyType: resolvedEnemy ?? undefined,
    enemyLevel,
  });

  return {
    weapon,
    matchedWeaponName: matched.name,
    goal: resolvedGoal,
    enemy: resolvedEnemy ?? undefined,
    mods,
    result,
  };
}
