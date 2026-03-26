import { type ModEntry, type WeaponStats } from "../damage/types";

type WeaponType = WeaponStats["weaponType"];

interface ModDefinition extends ModEntry {
  compatibility: WeaponType[] | "all";
}

function createMod(
  name: string,
  group: ModEntry["group"],
  stats: Record<string, number>,
  drain: number,
  polarity: string,
  compatibility: ModDefinition["compatibility"],
): ModDefinition {
  return {
    name,
    group,
    stats,
    drain,
    polarity,
    compatibility,
  };
}

const RIFLE_COMPATIBILITY: WeaponType[] = ["rifle", "bow"];

export const MODS: Record<string, ModDefinition> = {
  // Rifle / Bow
  Serration: createMod(
    "Serration",
    "baseDamage",
    { baseDamage: 1.65 },
    14,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Amalgam Serration": createMod(
    "Amalgam Serration",
    "baseDamage",
    { baseDamage: 1.55 },
    14,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Heavy Caliber": createMod(
    "Heavy Caliber",
    "baseDamage",
    { baseDamage: 1.65, accuracy: -0.55 },
    14,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Split Chamber": createMod(
    "Split Chamber",
    "multishot",
    { multishot: 0.9 },
    15,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Galvanized Chamber": createMod(
    "Galvanized Chamber",
    "multishot",
    { multishot: 1.1 },
    15,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Vigilante Armaments": createMod(
    "Vigilante Armaments",
    "multishot",
    { multishot: 0.6 },
    7,
    "naramon",
    RIFLE_COMPATIBILITY,
  ),
  "Point Strike": createMod(
    "Point Strike",
    "critChance",
    { critChance: 1.5 },
    9,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Critical Delay": createMod(
    "Critical Delay",
    "critChance",
    { critChance: 2, fireRate: -0.2 },
    9,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Argon Scope": createMod(
    "Argon Scope",
    "critChance",
    { critChance: 1.35 },
    9,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Galvanized Scope": createMod(
    "Galvanized Scope",
    "critChance",
    { critChance: 1.2 },
    11,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Vital Sense": createMod(
    "Vital Sense",
    "critDamage",
    { critDamage: 1.2 },
    11,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Hammer Shot": createMod(
    "Hammer Shot",
    "critDamage",
    { critDamage: 0.6, statusChance: 0.8 },
    9,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Speed Trigger": createMod(
    "Speed Trigger",
    "fireRate",
    { fireRate: 0.6 },
    9,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  Shred: createMod(
    "Shred",
    "fireRate",
    { fireRate: 0.3, punchThrough: 2.2 },
    11,
    "naramon",
    RIFLE_COMPATIBILITY,
  ),
  Hellfire: createMod(
    "Hellfire",
    "elemental",
    { Heat: 0.9 },
    11,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Cryo Rounds": createMod(
    "Cryo Rounds",
    "elemental",
    { Cold: 0.9 },
    11,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Primed Cryo Rounds": createMod(
    "Primed Cryo Rounds",
    "elemental",
    { Cold: 1.65 },
    16,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  Stormbringer: createMod(
    "Stormbringer",
    "elemental",
    { Electricity: 0.9 },
    11,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Infected Clip": createMod(
    "Infected Clip",
    "elemental",
    { Toxin: 0.9 },
    11,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Malignant Force": createMod(
    "Malignant Force",
    "elemental",
    { Toxin: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    RIFLE_COMPATIBILITY,
  ),
  "Rime Rounds": createMod(
    "Rime Rounds",
    "elemental",
    { Cold: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    RIFLE_COMPATIBILITY,
  ),
  "Thermite Rounds": createMod(
    "Thermite Rounds",
    "elemental",
    { Heat: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    RIFLE_COMPATIBILITY,
  ),
  "High Voltage": createMod(
    "High Voltage",
    "elemental",
    { Electricity: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    RIFLE_COMPATIBILITY,
  ),
  "Rifle Aptitude": createMod(
    "Rifle Aptitude",
    "statusChance",
    { statusChance: 0.9 },
    9,
    "vazarin",
    RIFLE_COMPATIBILITY,
  ),
  "Hunter Munitions": createMod(
    "Hunter Munitions",
    "special",
    { slashOnCrit: 0.3 },
    11,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),
  "Galvanized Aptitude": createMod(
    "Galvanized Aptitude",
    "special",
    { damagePerStatus: 0.8 },
    14,
    "madurai",
    RIFLE_COMPATIBILITY,
  ),

  // Pistol
  "Hornet Strike": createMod(
    "Hornet Strike",
    "baseDamage",
    { baseDamage: 2.2 },
    14,
    "madurai",
    ["pistol"],
  ),
  "Augur Pact": createMod(
    "Augur Pact",
    "baseDamage",
    { baseDamage: 0.9 },
    9,
    "madurai",
    ["pistol"],
  ),
  "Barrel Diffusion": createMod(
    "Barrel Diffusion",
    "multishot",
    { multishot: 1.2 },
    11,
    "madurai",
    ["pistol"],
  ),
  "Galvanized Diffusion": createMod(
    "Galvanized Diffusion",
    "multishot",
    { multishot: 1.1 },
    14,
    "madurai",
    ["pistol"],
  ),
  "Lethal Torrent": createMod(
    "Lethal Torrent",
    "multishot",
    { multishot: 0.6, fireRate: 0.6 },
    11,
    "madurai",
    ["pistol"],
  ),
  "Pistol Gambit": createMod(
    "Pistol Gambit",
    "critChance",
    { critChance: 1.2 },
    9,
    "madurai",
    ["pistol"],
  ),
  "Primed Pistol Gambit": createMod(
    "Primed Pistol Gambit",
    "critChance",
    { critChance: 1.87 },
    14,
    "madurai",
    ["pistol"],
  ),
  "Creeping Bullseye": createMod(
    "Creeping Bullseye",
    "critChance",
    { critChance: 2, fireRate: -0.2 },
    9,
    "madurai",
    ["pistol"],
  ),
  "Hydraulic Crosshairs": createMod(
    "Hydraulic Crosshairs",
    "critChance",
    { critChance: 1.2 },
    9,
    "madurai",
    ["pistol"],
  ),
  "Target Cracker": createMod(
    "Target Cracker",
    "critDamage",
    { critDamage: 0.6 },
    9,
    "madurai",
    ["pistol"],
  ),
  "Primed Target Cracker": createMod(
    "Primed Target Cracker",
    "critDamage",
    { critDamage: 1.1 },
    14,
    "madurai",
    ["pistol"],
  ),
  "Anemic Agility": createMod(
    "Anemic Agility",
    "fireRate",
    { fireRate: 0.9, baseDamage: -0.15 },
    9,
    "madurai",
    ["pistol"],
  ),
  "Heated Charge": createMod(
    "Heated Charge",
    "elemental",
    { Heat: 0.9 },
    11,
    "madurai",
    ["pistol"],
  ),
  "Primed Heated Charge": createMod(
    "Primed Heated Charge",
    "elemental",
    { Heat: 1.65 },
    16,
    "madurai",
    ["pistol"],
  ),
  "Deep Freeze": createMod(
    "Deep Freeze",
    "elemental",
    { Cold: 0.9 },
    11,
    "vazarin",
    ["pistol"],
  ),
  Convulsion: createMod(
    "Convulsion",
    "elemental",
    { Electricity: 0.9 },
    11,
    "madurai",
    ["pistol"],
  ),
  "Pathogen Rounds": createMod(
    "Pathogen Rounds",
    "elemental",
    { Toxin: 0.9 },
    11,
    "madurai",
    ["pistol"],
  ),
  Scorch: createMod(
    "Scorch",
    "elemental",
    { Heat: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["pistol"],
  ),
  Frostbite: createMod(
    "Frostbite",
    "elemental",
    { Cold: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["pistol"],
  ),
  Jolt: createMod(
    "Jolt",
    "elemental",
    { Electricity: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["pistol"],
  ),
  "Pistol Pestilence": createMod(
    "Pistol Pestilence",
    "elemental",
    { Toxin: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["pistol"],
  ),
  "Galvanized Shot": createMod(
    "Galvanized Shot",
    "special",
    { damagePerStatus: 0.8 },
    14,
    "madurai",
    ["pistol"],
  ),

  // Shotgun
  "Point Blank": createMod(
    "Point Blank",
    "baseDamage",
    { baseDamage: 0.9 },
    9,
    "madurai",
    ["shotgun"],
  ),
  "Primed Point Blank": createMod(
    "Primed Point Blank",
    "baseDamage",
    { baseDamage: 1.65 },
    14,
    "madurai",
    ["shotgun"],
  ),
  Blaze: createMod(
    "Blaze",
    "elemental",
    { Heat: 0.6, baseDamage: 0.6 },
    9,
    "madurai",
    ["shotgun"],
  ),
  "Hell's Chamber": createMod(
    "Hell's Chamber",
    "multishot",
    { multishot: 1.2 },
    15,
    "madurai",
    ["shotgun"],
  ),
  "Galvanized Hell": createMod(
    "Galvanized Hell",
    "multishot",
    { multishot: 1.1 },
    15,
    "madurai",
    ["shotgun"],
  ),
  Blunderbuss: createMod(
    "Blunderbuss",
    "critChance",
    { critChance: 0.9 },
    9,
    "madurai",
    ["shotgun"],
  ),
  "Critical Deceleration": createMod(
    "Critical Deceleration",
    "critChance",
    { critChance: 2, fireRate: -0.2 },
    9,
    "madurai",
    ["shotgun"],
  ),
  Ravage: createMod(
    "Ravage",
    "critDamage",
    { critDamage: 0.6 },
    9,
    "madurai",
    ["shotgun"],
  ),
  "Primed Ravage": createMod(
    "Primed Ravage",
    "critDamage",
    { critDamage: 1.1 },
    14,
    "madurai",
    ["shotgun"],
  ),
  "Shotgun Spazz": createMod(
    "Shotgun Spazz",
    "fireRate",
    { fireRate: 0.9 },
    11,
    "madurai",
    ["shotgun"],
  ),
  "Incendiary Coat": createMod(
    "Incendiary Coat",
    "elemental",
    { Heat: 0.9 },
    11,
    "madurai",
    ["shotgun"],
  ),
  "Chilling Grasp": createMod(
    "Chilling Grasp",
    "elemental",
    { Cold: 0.9 },
    11,
    "vazarin",
    ["shotgun"],
  ),
  "Charged Shell": createMod(
    "Charged Shell",
    "elemental",
    { Electricity: 0.9 },
    11,
    "madurai",
    ["shotgun"],
  ),
  "Contagious Spread": createMod(
    "Contagious Spread",
    "elemental",
    { Toxin: 0.9 },
    11,
    "madurai",
    ["shotgun"],
  ),
  "Scattering Inferno": createMod(
    "Scattering Inferno",
    "elemental",
    { Heat: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["shotgun"],
  ),
  "Frigid Blast": createMod(
    "Frigid Blast",
    "elemental",
    { Cold: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["shotgun"],
  ),
  "Shell Shock": createMod(
    "Shell Shock",
    "elemental",
    { Electricity: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["shotgun"],
  ),
  "Toxic Barrage": createMod(
    "Toxic Barrage",
    "elemental",
    { Toxin: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["shotgun"],
  ),
  "Galvanized Savvy": createMod(
    "Galvanized Savvy",
    "special",
    { damagePerStatus: 0.8 },
    14,
    "madurai",
    ["shotgun"],
  ),

  // Melee
  "Pressure Point": createMod(
    "Pressure Point",
    "baseDamage",
    { baseDamage: 1.2 },
    9,
    "madurai",
    ["melee"],
  ),
  "Primed Pressure Point": createMod(
    "Primed Pressure Point",
    "baseDamage",
    { baseDamage: 1.65 },
    14,
    "madurai",
    ["melee"],
  ),
  "Condition Overload": createMod(
    "Condition Overload",
    "special",
    { damagePerStatus: 0.8 },
    14,
    "madurai",
    ["melee"],
  ),
  "True Steel": createMod(
    "True Steel",
    "critChance",
    { critChance: 1.2 },
    9,
    "madurai",
    ["melee"],
  ),
  "Sacrificial Steel": createMod(
    "Sacrificial Steel",
    "critChance",
    { critChance: 2.2 },
    16,
    "umbra",
    ["melee"],
  ),
  "Blood Rush": createMod(
    "Blood Rush",
    "critChance",
    { critChanceComboMult: 0.6 },
    9,
    "madurai",
    ["melee"],
  ),
  "Organ Shatter": createMod(
    "Organ Shatter",
    "critDamage",
    { critDamage: 0.9 },
    9,
    "madurai",
    ["melee"],
  ),
  "Gladiator Might": createMod(
    "Gladiator Might",
    "critDamage",
    { critDamage: 0.6 },
    9,
    "madurai",
    ["melee"],
  ),
  Fury: createMod(
    "Fury",
    "fireRate",
    { attackSpeed: 0.3 },
    9,
    "madurai",
    ["melee"],
  ),
  "Primed Fury": createMod(
    "Primed Fury",
    "fireRate",
    { attackSpeed: 0.55 },
    14,
    "madurai",
    ["melee"],
  ),
  "Berserker Fury": createMod(
    "Berserker Fury",
    "fireRate",
    { attackSpeedOnCrit: 0.7 },
    9,
    "madurai",
    ["melee"],
  ),
  "Gladiator Vice": createMod(
    "Gladiator Vice",
    "fireRate",
    { attackSpeed: 0.3 },
    9,
    "madurai",
    ["melee"],
  ),
  "Weeping Wounds": createMod(
    "Weeping Wounds",
    "statusChance",
    { statusChanceComboMult: 0.4 },
    9,
    "naramon",
    ["melee"],
  ),
  "Drifting Contact": createMod(
    "Drifting Contact",
    "statusDuration",
    { statusChance: 0.4, comboDuration: 10 },
    9,
    "naramon",
    ["melee"],
  ),
  "Fever Strike": createMod(
    "Fever Strike",
    "elemental",
    { Toxin: 0.9 },
    11,
    "madurai",
    ["melee"],
  ),
  "Molten Impact": createMod(
    "Molten Impact",
    "elemental",
    { Heat: 0.9 },
    11,
    "madurai",
    ["melee"],
  ),
  "North Wind": createMod(
    "North Wind",
    "elemental",
    { Cold: 0.9 },
    11,
    "madurai",
    ["melee"],
  ),
  "Shocking Touch": createMod(
    "Shocking Touch",
    "elemental",
    { Electricity: 0.9 },
    11,
    "madurai",
    ["melee"],
  ),
  "Vicious Frost": createMod(
    "Vicious Frost",
    "elemental",
    { Cold: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["melee"],
  ),
  "Virulent Scourge": createMod(
    "Virulent Scourge",
    "elemental",
    { Toxin: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["melee"],
  ),
  "Volcanic Edge": createMod(
    "Volcanic Edge",
    "elemental",
    { Heat: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["melee"],
  ),
  "Voltaic Strike": createMod(
    "Voltaic Strike",
    "elemental",
    { Electricity: 0.6, statusChance: 0.6 },
    7,
    "naramon",
    ["melee"],
  ),

  // Faction (usable broadly for recommendation purposes)
  "Bane of Grineer": createMod(
    "Bane of Grineer",
    "faction",
    { grineer: 0.3 },
    9,
    "madurai",
    "all",
  ),
  "Bane of Corpus": createMod(
    "Bane of Corpus",
    "faction",
    { corpus: 0.3 },
    9,
    "madurai",
    "all",
  ),
  "Bane of Infested": createMod(
    "Bane of Infested",
    "faction",
    { infested: 0.3 },
    9,
    "madurai",
    "all",
  ),
  "Bane of Corrupted": createMod(
    "Bane of Corrupted",
    "faction",
    { corrupted: 0.3 },
    9,
    "madurai",
    "all",
  ),
  "Primed Bane of Grineer": createMod(
    "Primed Bane of Grineer",
    "faction",
    { grineer: 0.55 },
    14,
    "madurai",
    "all",
  ),
  "Primed Bane of Corpus": createMod(
    "Primed Bane of Corpus",
    "faction",
    { corpus: 0.55 },
    14,
    "madurai",
    "all",
  ),
  "Primed Bane of Infested": createMod(
    "Primed Bane of Infested",
    "faction",
    { infested: 0.55 },
    14,
    "madurai",
    "all",
  ),
  "Primed Bane of Corrupted": createMod(
    "Primed Bane of Corrupted",
    "faction",
    { corrupted: 0.55 },
    14,
    "madurai",
    "all",
  ),
};

function normalizeWeaponType(type: string): WeaponType {
  const normalized = type.trim().toLowerCase();

  if (normalized === "rifle" || normalized.includes("primary")) {
    return "rifle";
  }

  if (normalized.includes("shotgun")) {
    return "shotgun";
  }

  if (normalized === "secondary" || normalized.includes("pistol")) {
    return "pistol";
  }

  if (normalized.includes("melee")) {
    return "melee";
  }

  if (normalized.includes("bow")) {
    return "bow";
  }

  return "other";
}

function toModEntry(mod: ModDefinition): ModEntry {
  return {
    name: mod.name,
    group: mod.group,
    stats: { ...mod.stats },
    drain: mod.drain,
    polarity: mod.polarity,
  };
}

export function getModsForWeaponType(type: string): ModEntry[] {
  const normalizedType = normalizeWeaponType(type);

  return Object.values(MODS)
    .filter((mod) => mod.compatibility === "all" || mod.compatibility.includes(normalizedType))
    .map(toModEntry);
}

export function getModByName(name: string, type?: string): ModEntry | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = type ? getModsForWeaponType(type) : Object.values(MODS).map(toModEntry);
  const normalized = trimmed.toLowerCase();

  const exact = candidates.find((candidate) => candidate.name.toLowerCase() === normalized);
  if (exact) {
    return exact;
  }

  const partial = candidates.find((candidate) => candidate.name.toLowerCase().includes(normalized));
  if (partial) {
    return partial;
  }

  return null;
}
