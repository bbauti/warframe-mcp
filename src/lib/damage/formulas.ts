import { getDamageEffectiveness } from "../data/damage-types";
import { armorAtLevel, damageReduction, healthAtLevel, shieldAtLevel } from "../data/enemy-scaling";
import { applyMods } from "./mod-effects";
import { type ArmorType, type BuildConfig, type HealthType, type ShieldType } from "./types";

export function calcModdedBaseDamage(baseDamage: number, baseDamageMods: number): number {
  return baseDamage * (1 + baseDamageMods);
}

export function calcMultishot(baseMultishot: number, multishotMods: number): number {
  return baseMultishot * (1 + multishotMods);
}

export function calcCritChance(baseCritChance: number, critChanceMods: number): number {
  return baseCritChance * (1 + critChanceMods);
}

export function calcCritMultiplier(baseCritMult: number, critDamageMods: number): number {
  return baseCritMult * (1 + critDamageMods);
}

export function calcAvgCritMultiplier(critChance: number, critMultiplier: number): number {
  if (critChance <= 0) {
    return 1;
  }

  if (critChance <= 1) {
    return 1 + critChance * (critMultiplier - 1);
  }

  const tier = Math.floor(critChance);
  const remainder = critChance - tier;

  return critMultiplier ** tier * (1 - remainder) + critMultiplier ** (tier + 1) * remainder;
}

export function calcFireRate(baseFireRate: number, fireRateMods: number): number {
  return baseFireRate * (1 + fireRateMods);
}

export function calcStatusChance(baseStatus: number, statusMods: number): number {
  return baseStatus * (1 + statusMods);
}

export function calcElementalDamage(moddedBaseDamage: number, elementalModSum: number): number {
  return moddedBaseDamage * elementalModSum;
}

export function calcBurstDps(
  damagePerShot: number,
  avgCritMult: number,
  multishot: number,
  fireRate: number,
): number {
  return damagePerShot * avgCritMult * multishot * fireRate;
}

export function calcSustainedDps(
  burstDps: number,
  magazineSize: number,
  fireRate: number,
  reloadTime: number,
): number {
  const timeToEmptyMagazine = magazineSize / Math.max(0.000001, fireRate);
  return burstDps * (timeToEmptyMagazine / (timeToEmptyMagazine + Math.max(0, reloadTime)));
}

export function calcDamageAgainstArmor(
  damage: Record<string, number>,
  armorType: ArmorType,
  armorValue: number,
): number {
  const armorDamageReduction = armorType === "none" ? 0 : damageReduction(armorValue);

  let totalDamage = 0;

  for (const [damageType, amount] of Object.entries(damage)) {
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const effectiveness = getDamageEffectiveness(damageType, armorType);
    totalDamage += amount * effectiveness * (1 - armorDamageReduction);
  }

  return totalDamage;
}

function calcShieldDamagePerSecond(
  dpsByType: Record<string, number>,
  shieldType: ShieldType,
): number {
  if (shieldType === "none") {
    return 0;
  }

  let shieldDamage = 0;

  for (const [damageType, dps] of Object.entries(dpsByType)) {
    if (!Number.isFinite(dps) || dps <= 0) {
      continue;
    }

    if (damageType === "Toxin") {
      continue;
    }

    shieldDamage += dps * getDamageEffectiveness(damageType, shieldType);
  }

  return shieldDamage;
}

function calcHealthDamagePerSecond(
  dpsByType: Record<string, number>,
  healthType: HealthType,
  armorType: ArmorType,
  armor: number,
): { total: number; bypass: number } {
  const armorReduction = armorType === "none" ? 0 : damageReduction(armor);

  let total = 0;
  let bypass = 0;

  for (const [damageType, dps] of Object.entries(dpsByType)) {
    if (!Number.isFinite(dps) || dps <= 0) {
      continue;
    }

    const healthMultiplier = getDamageEffectiveness(damageType, healthType);
    const armorMultiplier = getDamageEffectiveness(damageType, armorType);
    const effectiveDps = dps * healthMultiplier * armorMultiplier * (1 - armorReduction);

    total += effectiveDps;

    if (damageType === "Toxin") {
      bypass += effectiveDps;
    }
  }

  return { total, bypass };
}

export function calcEffectiveDpsVsEnemy(build: BuildConfig, enemyLevel: number): number {
  const enemy = build.enemyType;
  if (!enemy) {
    return 0;
  }

  const level = Math.max(enemy.baseLevel, Math.floor(enemyLevel));

  const scaledArmor =
    enemy.armorType === "none" ? 0 : armorAtLevel(enemy.baseArmor, level, enemy.baseLevel);
  const scaledHealth = healthAtLevel(enemy.baseHealth, level, enemy.baseLevel);
  const scaledShield =
    enemy.shieldType === "none" ? 0 : shieldAtLevel(enemy.baseShield, level, enemy.baseLevel);

  const modded = applyMods(build.weapon, build.mods);
  const avgCritMult = calcAvgCritMultiplier(modded.effectiveCritChance, modded.effectiveCritMultiplier);

  const projectileRate = modded.effectiveMultishot * modded.effectiveFireRate;
  const dpsByType: Record<string, number> = {};

  for (const [damageType, amount] of Object.entries(modded.damageBreakdown)) {
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    dpsByType[damageType] = amount * avgCritMult * projectileRate;
  }

  const shieldDps = calcShieldDamagePerSecond(dpsByType, enemy.shieldType);
  const healthDps = calcHealthDamagePerSecond(
    dpsByType,
    enemy.healthType,
    enemy.armorType,
    scaledArmor,
  );

  if (healthDps.total <= 0) {
    return 0;
  }

  let ttk = 0;

  if (scaledShield > 0 && enemy.shieldType !== "none") {
    const candidates: number[] = [];

    if (shieldDps > 0) {
      const shieldTime = scaledShield / shieldDps;
      const healthLeftAfterShield = Math.max(0, scaledHealth - healthDps.bypass * shieldTime);
      const healthTime = healthLeftAfterShield / healthDps.total;
      const strategyTime = shieldTime + healthTime;

      if (Number.isFinite(strategyTime) && strategyTime > 0) {
        candidates.push(strategyTime);
      }
    }

    if (healthDps.bypass > 0) {
      const bypassOnly = scaledHealth / healthDps.bypass;
      if (Number.isFinite(bypassOnly) && bypassOnly > 0) {
        candidates.push(bypassOnly);
      }
    }

    if (candidates.length === 0) {
      return 0;
    }

    ttk = Math.min(...candidates);
  } else {
    ttk = scaledHealth / healthDps.total;
  }

  if (!Number.isFinite(ttk) || ttk <= 0) {
    return 0;
  }

  const totalPool = scaledHealth + scaledShield;
  return totalPool / ttk;
}
