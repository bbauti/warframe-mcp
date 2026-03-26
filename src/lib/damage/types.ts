export type DamageType =
  | "Impact"
  | "Puncture"
  | "Slash"
  | "Heat"
  | "Cold"
  | "Electricity"
  | "Toxin"
  | "Blast"
  | "Corrosive"
  | "Gas"
  | "Magnetic"
  | "Radiation"
  | "Viral"
  | "Void"
  | "True";

export interface WeaponStats {
  name: string;
  damage: Record<string, number>;
  totalDamage: number;
  criticalChance: number;
  criticalMultiplier: number;
  statusChance: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  multishot: number;
  disposition: number;
  weaponType: "rifle" | "shotgun" | "pistol" | "melee" | "bow" | "other";
}

export interface ModEntry {
  name: string;
  group: ModGroup;
  stats: Record<string, number>;
  drain: number;
  polarity: string;
}

export type ModGroup =
  | "baseDamage"
  | "multishot"
  | "elemental"
  | "critChance"
  | "critDamage"
  | "fireRate"
  | "faction"
  | "statusChance"
  | "statusDuration"
  | "special";

export interface BuildConfig {
  weapon: WeaponStats;
  mods: ModEntry[];
  enemyType?: EnemyType;
  enemyLevel?: number;
}

export type HealthType =
  | "flesh"
  | "clonedFlesh"
  | "fossilized"
  | "infested"
  | "infestedFlesh"
  | "machinery"
  | "robotic"
  | "object";

export type ArmorType = "ferrite" | "alloy" | "infested" | "none";
export type ShieldType = "shield" | "protoShield" | "none";

export interface EnemyType {
  name: string;
  healthType: HealthType;
  armorType: ArmorType;
  shieldType: ShieldType;
  baseArmor: number;
  baseHealth: number;
  baseShield: number;
  baseLevel: number;
}

export interface DamageResult {
  damagePerShot: number;
  damageBreakdown: Record<string, number>;
  avgCritMultiplier: number;
  effectiveCritChance: number;
  effectiveStatusChance: number;
  effectiveMultishot: number;
  effectiveFireRate: number;
  burstDps: number;
  sustainedDps: number;
  magazineDamage: number;
  effectiveDpsVsArmor?: number;
  statusProcsPerSecond?: number;
}

export type BuildGoal =
  | "general_dps"
  | "crit"
  | "status"
  | "hybrid"
  | "viral_slash"
  | "corrosive"
  | "comfort";
