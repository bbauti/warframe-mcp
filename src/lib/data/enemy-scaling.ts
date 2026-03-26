import { type EnemyType } from "../damage/types";

function levelDelta(currentLevel: number, baseLevel: number): number {
  return Math.max(0, currentLevel - baseLevel);
}

export function armorAtLevel(baseArmor: number, currentLevel: number, baseLevel: number): number {
  const delta = levelDelta(currentLevel, baseLevel);
  return Math.max(0, baseArmor * (1 + delta ** 1.75 * 0.005));
}

export function healthAtLevel(baseHealth: number, currentLevel: number, baseLevel: number): number {
  const delta = levelDelta(currentLevel, baseLevel);
  return Math.max(0, baseHealth * (1 + delta ** 2 * 0.015));
}

export function shieldAtLevel(baseShield: number, currentLevel: number, baseLevel: number): number {
  const delta = levelDelta(currentLevel, baseLevel);
  return Math.max(0, baseShield * (1 + delta ** 2 * 0.0075));
}

export function damageReduction(armor: number): number {
  if (armor <= 0) {
    return 0;
  }

  return armor / (armor + 300);
}

export function effectiveHealth(health: number, armor: number): number {
  const reduction = damageReduction(armor);
  return health / Math.max(0.000001, 1 - reduction);
}

export function armorAfterStrip(armor: number, stripPercent: number): number {
  const normalizedStrip = Math.max(0, Math.min(stripPercent, 1));
  return armor * (1 - normalizedStrip);
}

function createEnemy(enemy: Omit<EnemyType, "name"> & { name: string }): EnemyType {
  return enemy;
}

export const ENEMIES: Record<string, EnemyType> = {
  "Corrupted Heavy Gunner": createEnemy({
    name: "Corrupted Heavy Gunner",
    healthType: "clonedFlesh",
    armorType: "ferrite",
    shieldType: "none",
    baseArmor: 500,
    baseHealth: 700,
    baseShield: 0,
    baseLevel: 8,
  }),
  "Corrupted Bombard": createEnemy({
    name: "Corrupted Bombard",
    healthType: "clonedFlesh",
    armorType: "alloy",
    shieldType: "none",
    baseArmor: 500,
    baseHealth: 700,
    baseShield: 0,
    baseLevel: 8,
  }),
  "Corpus Tech": createEnemy({
    name: "Corpus Tech",
    healthType: "flesh",
    armorType: "none",
    shieldType: "shield",
    baseArmor: 0,
    baseHealth: 700,
    baseShield: 650,
    baseLevel: 15,
  }),
  "Corrupted Ancient": createEnemy({
    name: "Corrupted Ancient",
    healthType: "fossilized",
    armorType: "none",
    shieldType: "none",
    baseArmor: 0,
    baseHealth: 400,
    baseShield: 0,
    baseLevel: 1,
  }),
  Demolyst: createEnemy({
    name: "Demolyst",
    healthType: "robotic",
    armorType: "alloy",
    shieldType: "shield",
    baseArmor: 200,
    baseHealth: 3500,
    baseShield: 1500,
    baseLevel: 1,
  }),
  "Steel Path Lancer": createEnemy({
    name: "Steel Path Lancer",
    healthType: "clonedFlesh",
    armorType: "ferrite",
    shieldType: "none",
    baseArmor: 200,
    baseHealth: 150,
    baseShield: 0,
    baseLevel: 1,
  }),
  "Elite Lancer": createEnemy({
    name: "Elite Lancer",
    healthType: "clonedFlesh",
    armorType: "ferrite",
    shieldType: "none",
    baseArmor: 150,
    baseHealth: 150,
    baseShield: 0,
    baseLevel: 6,
  }),
  "Kuva Heavy Gunner": createEnemy({
    name: "Kuva Heavy Gunner",
    healthType: "clonedFlesh",
    armorType: "ferrite",
    shieldType: "none",
    baseArmor: 900,
    baseHealth: 1800,
    baseShield: 0,
    baseLevel: 40,
  }),
  Nox: createEnemy({
    name: "Nox",
    healthType: "clonedFlesh",
    armorType: "alloy",
    shieldType: "none",
    baseArmor: 350,
    baseHealth: 1200,
    baseShield: 0,
    baseLevel: 30,
  }),
  "Corpus Crewman": createEnemy({
    name: "Corpus Crewman",
    healthType: "flesh",
    armorType: "none",
    shieldType: "shield",
    baseArmor: 0,
    baseHealth: 120,
    baseShield: 240,
    baseLevel: 1,
  }),
  "Nullifier Crewman": createEnemy({
    name: "Nullifier Crewman",
    healthType: "flesh",
    armorType: "none",
    shieldType: "protoShield",
    baseArmor: 0,
    baseHealth: 250,
    baseShield: 400,
    baseLevel: 10,
  }),
  "Corpus Bursa": createEnemy({
    name: "Corpus Bursa",
    healthType: "robotic",
    armorType: "alloy",
    shieldType: "shield",
    baseArmor: 450,
    baseHealth: 1400,
    baseShield: 800,
    baseLevel: 15,
  }),
  "Ancient Healer": createEnemy({
    name: "Ancient Healer",
    healthType: "fossilized",
    armorType: "none",
    shieldType: "none",
    baseArmor: 0,
    baseHealth: 1200,
    baseShield: 0,
    baseLevel: 20,
  }),
  "Infested Charger": createEnemy({
    name: "Infested Charger",
    healthType: "infestedFlesh",
    armorType: "none",
    shieldType: "none",
    baseArmor: 0,
    baseHealth: 200,
    baseShield: 0,
    baseLevel: 1,
  }),
  "Juggernaut Behemoth": createEnemy({
    name: "Juggernaut Behemoth",
    healthType: "fossilized",
    armorType: "infested",
    shieldType: "none",
    baseArmor: 300,
    baseHealth: 8000,
    baseShield: 0,
    baseLevel: 40,
  }),
};

export function findEnemyByName(name: string): EnemyType | null {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return null;
  }

  const exact = ENEMIES[trimmedName];
  if (exact) {
    return exact;
  }

  const normalized = trimmedName.toLowerCase();

  const exactCaseInsensitive = Object.values(ENEMIES).find((enemy) => enemy.name.toLowerCase() === normalized);
  if (exactCaseInsensitive) {
    return exactCaseInsensitive;
  }

  const partialMatch = Object.values(ENEMIES).find((enemy) => enemy.name.toLowerCase().includes(normalized));
  if (partialMatch) {
    return partialMatch;
  }

  return null;
}
