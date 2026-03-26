import { readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const warframeDir = resolve(process.cwd(), "warframe");
const outputPath = resolve(warframeDir, "inventory.json");

const nonModEntries = [
  { category: "warframes", name: "Dagath", rankText: "Rank 29", count: 1, sourceImages: ["IMG_4414.HEIC"] },
  { category: "warframes", name: "Excalibur", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4414.HEIC"] },
  { category: "warframes", name: "Excalibur Umbra", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Kullervo", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Loki", rankText: "Rank 0", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Nekros", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Nidus", rankText: "Unranked", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Qorvex", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Revenant", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Vauban", rankText: "Rank 0", count: 1, sourceImages: ["IMG_4414.HEIC", "IMG_4415.HEIC"] },
  { category: "warframes", name: "Xaku", rankText: "Rank 7", count: 1, sourceImages: ["IMG_4415.HEIC"] },

  { category: "weapons", name: "Bo", rankText: "Unranked", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Boltor", rankText: "Rank 28", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Boltor", rankText: "Unranked", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Braton", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Broken Scepter", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Broken War", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Burston", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Cedo", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4416.HEIC"] },
  { category: "weapons", name: "Cestra", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4416.HEIC", "IMG_4417.HEIC"] },
  { category: "weapons", name: "Dex Sybaris", rankText: "Unranked", count: 1, sourceImages: ["IMG_4416.HEIC", "IMG_4417.HEIC"] },
  { category: "weapons", name: "Drakgoon", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Dual Keres", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Ether Daggers", rankText: "Rank 25", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Fang", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Fragor", rankText: "Rank 4", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Fragor", rankText: "Unranked", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Furis", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Furis", rankText: "Unranked", count: 1, sourceImages: ["IMG_4417.HEIC"] },
  { category: "weapons", name: "Gammacor", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "Gorgon", rankText: "Unranked", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "Grimoire", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "Heat Sword", rankText: "Unranked", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "Kraken", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "Lato", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "Lecta", rankText: "Rank 1", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "MK1-Braton", rankText: "Rank 8", count: 1, sourceImages: ["IMG_4418.HEIC"] },
  { category: "weapons", name: "Mire", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4418.HEIC", "IMG_4419.HEIC"] },
  { category: "weapons", name: "Nataruk", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4418.HEIC", "IMG_4419.HEIC"] },
  { category: "weapons", name: "Penta", rankText: "Rank 4", count: 1, sourceImages: ["IMG_4419.HEIC"] },
  { category: "weapons", name: "Rubico", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4419.HEIC"] },
  { category: "weapons", name: "Rumblejack", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4419.HEIC"] },
  { category: "weapons", name: "Skana", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4419.HEIC"] },
  { category: "weapons", name: "Skiajati", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4419.HEIC"] },
  { category: "weapons", name: "Syam", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4419.HEIC"] },
  { category: "weapons", name: "Thornbak", rankText: "Rank 2", count: 1, sourceImages: ["IMG_4419.HEIC"] },
  { category: "weapons", name: "Vulkar", rankText: "Rank 11", count: 1, sourceImages: ["IMG_4419.HEIC"] },

  { category: "robotics", name: "Artax", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },
  { category: "robotics", name: "Carrier", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },
  { category: "robotics", name: "Deconstructor", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },
  { category: "robotics", name: "Deth Machine Rifle", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },
  { category: "robotics", name: "Dethcube", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },
  { category: "robotics", name: "Helios", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },
  { category: "robotics", name: "Sweeper", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },
  { category: "robotics", name: "Taxon", rankText: "Rank 30", count: 1, sourceImages: ["IMG_4420.HEIC"] },

  { category: "arcanes", name: "Fractalized Reset", rankText: "Unranked", count: 1, sourceImages: ["IMG_4421.HEIC"] },
  { category: "arcanes", name: "Melee Animosity", rankText: "Unranked", count: 1, sourceImages: ["IMG_4421.HEIC"] },
  { category: "arcanes", name: "Melee Retaliation", rankText: "Unranked", count: 1, sourceImages: ["IMG_4421.HEIC"] },

  { category: "gear", name: "Archwing Launcher", count: 1, sourceImages: ["IMG_4422.HEIC"] },
  { category: "gear", name: "Atomicycle Summon", count: 1, sourceImages: ["IMG_4422.HEIC"] },
  { category: "gear", name: "K-Drive Launcher", count: 1, sourceImages: ["IMG_4422.HEIC"] },
  { category: "gear", name: "Kinetic Siphon Trap", count: 10, sourceImages: ["IMG_4422.HEIC"] },
  { category: "gear", name: "Necramech Summon", count: 1, sourceImages: ["IMG_4422.HEIC"] },
  { category: "gear", name: "Override", count: 1, sourceImages: ["IMG_4422.HEIC"] },
  { category: "gear", name: "Sentry Gun", count: 1, sourceImages: ["IMG_4422.HEIC"] },

  { category: "prime_parts", name: "Acceltra Prime Blueprint", count: 1, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Afuris Prime Blueprint", count: 1, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Baruuk Prime Chassis", count: 1, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Baruuk Prime Systems", count: 1, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Braton Prime Barrel", count: 1, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Bronco Prime Receiver", count: 1, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Burston Prime Receiver", count: 2, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Chroma Prime Blueprint", count: 1, sourceImages: ["IMG_4423.HEIC"] },
  {
    category: "prime_parts",
    name: "Cobra & Crane Prime (component suffix truncated in screenshot)",
    count: 1,
    sourceImages: ["IMG_4423.HEIC"],
    notes: ["The screenshot only shows the shared prefix, so the exact component suffix could not be confirmed."],
  },
  { category: "prime_parts", name: "Corinth Prime Blueprint", count: 2, sourceImages: ["IMG_4423.HEIC"] },
  { category: "prime_parts", name: "Dual Keres Prime Blade", count: 2, sourceImages: ["IMG_4424.HEIC"] },
  { category: "prime_parts", name: "Fang Prime Blueprint", count: 2, sourceImages: ["IMG_4424.HEIC"] },
  { category: "prime_parts", name: "Gauss Prime Chassis", count: 1, sourceImages: ["IMG_4424.HEIC"] },
  { category: "prime_parts", name: "Grendel Prime Neuroptics", count: 1, sourceImages: ["IMG_4424.HEIC"] },
  { category: "prime_parts", name: "Gunsen Prime Blueprint", count: 1, sourceImages: ["IMG_4424.HEIC"] },
  { category: "prime_parts", name: "Hildryn Prime Systems", count: 1, sourceImages: ["IMG_4424.HEIC"] },
  { category: "prime_parts", name: "Hystrix Prime Blueprint", count: 1, sourceImages: ["IMG_4424.HEIC", "IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Larkspur Prime Blueprint", count: 2, sourceImages: ["IMG_4424.HEIC", "IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Octavia Prime Systems", count: 1, sourceImages: ["IMG_4424.HEIC", "IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Paris Prime Upper Limb", count: 1, sourceImages: ["IMG_4424.HEIC", "IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Phantasma Prime Receiver", count: 1, sourceImages: ["IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Sevagoth Prime Neuroptics", count: 1, sourceImages: ["IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Sevagoth Prime Systems", count: 1, sourceImages: ["IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Tatsu Prime Blueprint", count: 1, sourceImages: ["IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Valkyr Prime Blueprint", count: 1, sourceImages: ["IMG_4425.HEIC"] },
  { category: "prime_parts", name: "Yareli Prime Blueprint", count: 1, sourceImages: ["IMG_4425.HEIC"] },
];

const modRows = String.raw`
IMG_4426.HEIC|Accelerated Deflection (2)|Unranked
IMG_4426.HEIC|Ammo Case (6)|Unranked
IMG_4426.HEIC|Ammo Drum (11)|Unranked
IMG_4426.HEIC|Ammo Drum|Rank 5
IMG_4426.HEIC|Ammo Stock|Unranked
IMG_4426.HEIC|Animal Instinct (3)|Unranked
IMG_4426.HEIC|Armored Agility (2)|Unranked
IMG_4426.HEIC|Armored Agility|Rank 5
IMG_4426.HEIC|Assault Mode (12)|Unranked
IMG_4426.HEIC|Atlantis Vulcan|Unranked
IMG_4426.HEIC|Auto Breach|Unranked
IMG_4426.HEIC|Balanced Posture|Unranked
IMG_4426.HEIC|Bane of Corpus|Unranked
IMG_4426.HEIC|Bane of Infested|Unranked
IMG_4426.HEIC|Bleeding Edge|Unranked
IMG_4426.HEIC|Blind Justice (3)|Unranked
IMG_4426.HEIC|Blood For Ammo (2)|Unranked
IMG_4427.HEIC|Blood For Energy|Unranked
IMG_4427.HEIC|Blood For Life|Unranked
IMG_4427.HEIC|Blunderbuss (9)|Unranked
IMG_4427.HEIC|Broad Eye|Unranked
IMG_4427.HEIC|Burning Wasp (6)|Unranked
IMG_4427.HEIC|Calculated Redirection (11)|Unranked
IMG_4427.HEIC|Chilling Grasp (2)|Unranked
IMG_4427.HEIC|Cleanse Infested (4)|Unranked
IMG_4427.HEIC|Combustion Beam (5)|Unranked
IMG_4427.HEIC|Combustion Rounds|Unranked
IMG_4427.HEIC|Concussion Rounds (4)|Unranked
IMG_4427.HEIC|Condition's Perfection|Unranked
IMG_4427.HEIC|Continuity|Unranked
IMG_4427.HEIC|Continuity|Rank 5
IMG_4427.HEIC|Convulsion (3)|Unranked
IMG_4427.HEIC|Crossing Snakes|Rank 3
IMG_4427.HEIC|Cryo Rounds (5)|Unranked
IMG_4428.HEIC|Cutting Edge|Unranked
IMG_4428.HEIC|Deep Freeze|Rank 4
IMG_4428.HEIC|Diamond Skin (6)|Unranked
IMG_4428.HEIC|Discipline's Merit|Rank 3
IMG_4428.HEIC|Dispatch Overdrive (2)|Unranked
IMG_4428.HEIC|Dispatch Overdrive|Rank 5
IMG_4428.HEIC|Disruptor (6)|Unranked
IMG_4428.HEIC|Disruptor|Rank 2
IMG_4428.HEIC|Draining Bite|Unranked
IMG_4428.HEIC|Dreamer's Bond|Rank 5
IMG_4428.HEIC|Dreamer's Wrath|Unranked
IMG_4428.HEIC|Eagle Eye|Unranked
IMG_4428.HEIC|Energy Amplifier|Unranked
IMG_4428.HEIC|Enhanced Durability|Unranked
IMG_4428.HEIC|Enhanced Vitality (5)|Unranked
IMG_4428.HEIC|Equilibrium|Unranked
IMG_4428.HEIC|Expel Infested|Unranked
IMG_4429.HEIC|Extend (2)|Unranked
IMG_4429.HEIC|Failsafe|Unranked
IMG_4429.HEIC|Fast Deflection (5)|Unranked
IMG_4429.HEIC|Fast Hands (6)|Unranked
IMG_4429.HEIC|Fatal Attraction (4)|Unranked
IMG_4429.HEIC|Fever Strike (2)|Unranked
IMG_4429.HEIC|Final Act|Unranked
IMG_4429.HEIC|Finishing Touch (3)|Unranked
IMG_4429.HEIC|Flailing Branch (3)|Unranked
IMG_4429.HEIC|Flame Repellent (2)|Unranked
IMG_4429.HEIC|Flechette (3)|Unranked
IMG_4429.HEIC|Flow (2)|Unranked
IMG_4429.HEIC|Flow|Rank 5
IMG_4429.HEIC|Fracturing Wind (8)|Unranked
IMG_4429.HEIC|Fury (6)|Unranked
IMG_4429.HEIC|Gaia's Tragedy (2)|Unranked
IMG_4429.HEIC|Gemini Cross (2)|Unranked
IMG_4430.HEIC|Ghost (4)|Unranked
IMG_4430.HEIC|Guardian|Unranked
IMG_4430.HEIC|Hawk Eye|Unranked
IMG_4430.HEIC|Heated Charge (5)|Unranked
IMG_4430.HEIC|Heated Charge|Rank 5
IMG_4430.HEIC|Heavy Impact (3)|Unranked
IMG_4430.HEIC|Heavy Trauma (3)|Unranked
IMG_4430.HEIC|Hit And Run (2)|Unranked
IMG_4430.HEIC|Homing Fang (2)|Unranked
IMG_4430.HEIC|Hornet Strike (5)|Unranked
IMG_4430.HEIC|Hornet Strike|Rank 6
IMG_4430.HEIC|Hush (3)|Unranked
IMG_4430.HEIC|Hydraulic Barrel|Unranked
IMG_4430.HEIC|Incendiary Coat (2)|Unranked
IMG_4430.HEIC|Infected Clip (7)|Unranked
IMG_4430.HEIC|Insulation|Unranked
IMG_4430.HEIC|Intensify|Unranked
IMG_4431.HEIC|Intensify|Rank 5
IMG_4431.HEIC|Intruder (2)|Unranked
IMG_4431.HEIC|Investigator|Unranked
IMG_4431.HEIC|Iron Phoenix|Rank 3
IMG_4431.HEIC|Jahu|Unranked
IMG_4431.HEIC|Killing Blow|Rank 5
IMG_4431.HEIC|Lasting Sting (2)|Unranked
IMG_4431.HEIC|Lightning Rod (4)|Unranked
IMG_4431.HEIC|Lingering Torment (7)|Unranked
IMG_4431.HEIC|Live Wire|Unranked
IMG_4431.HEIC|Loyal Companion|Rank 5
IMG_4431.HEIC|Magazine Warp (3)|Unranked
IMG_4431.HEIC|Magnetic Might|Rank 3
IMG_4431.HEIC|Master Key|Unranked
IMG_4431.HEIC|Master's Edge|Unranked
IMG_4431.HEIC|Melee Prowess (9)|Unranked
IMG_4432.HEIC|Mentor's Legacy|Unranked
IMG_4432.HEIC|Metal Fiber (4)|Unranked
IMG_4432.HEIC|Modified Munitions|Unranked
IMG_4432.HEIC|Molecular Conversion|Unranked
IMG_4432.HEIC|Molten Impact (3)|Unranked
IMG_4432.HEIC|Molten Impact|Rank 5
IMG_4432.HEIC|Mountain's Edge|Unranked
IMG_4432.HEIC|No Return (8)|Unranked
IMG_4432.HEIC|No Return|Rank 4
IMG_4432.HEIC|North Wind (7)|Unranked
IMG_4432.HEIC|North Wind|Rank 5
IMG_4432.HEIC|Opportunity's Reach|Unranked
IMG_4432.HEIC|Organ Shatter (4)|Unranked
IMG_4432.HEIC|Organ Shatter|Rank 5
IMG_4432.HEIC|Out of Sight|Unranked
IMG_4432.HEIC|Overview (2)|Unranked
IMG_4432.HEIC|Pack Leader (2)|Unranked
IMG_4433.HEIC|Parry|Unranked
IMG_4433.HEIC|Patagium|Unranked
IMG_4433.HEIC|Perpetual Agony (3)|Unranked
IMG_4433.HEIC|Physique|Rank 5
IMG_4433.HEIC|Piercing Hit (4)|Unranked
IMG_4433.HEIC|Piercing Hit|Rank 3
IMG_4433.HEIC|Pistol Gambit (8)|Unranked
IMG_4433.HEIC|Point Blank (3)|Unranked
IMG_4433.HEIC|Point Blank|Rank 5
IMG_4433.HEIC|Point Strike (5)|Unranked
IMG_4433.HEIC|Point Strike|Rank 5
IMG_4433.HEIC|Polar Magazine|Unranked
IMG_4433.HEIC|Pounce|Rank 3
IMG_4433.HEIC|Power Throw (2)|Unranked
IMG_4433.HEIC|Precision Intensify|Unranked
IMG_4433.HEIC|Pressure Point (18)|Unranked
IMG_4434.HEIC|Pressure Point|Rank 5
IMG_4434.HEIC|Quick Return (9)|Unranked
IMG_4434.HEIC|Quickdraw (10)|Unranked
IMG_4434.HEIC|Ravage|Unranked
IMG_4434.HEIC|Razor Shot (5)|Unranked
IMG_4434.HEIC|Reach (6)|Unranked
IMG_4434.HEIC|Reach|Rank 3
IMG_4434.HEIC|Reaping Spiral (2)|Unranked
IMG_4434.HEIC|Rebound|Unranked
IMG_4434.HEIC|Redirection (8)|Unranked
IMG_4434.HEIC|Redirection|Rank 3
IMG_4434.HEIC|Reflect|Unranked
IMG_4434.HEIC|Reflection|Unranked
IMG_4434.HEIC|Reflex Coil (2)|Unranked
IMG_4434.HEIC|Reflex Guard|Unranked
IMG_4434.HEIC|Regen (8)|Unranked
IMG_4434.HEIC|Repair Kit (7)|Unranked
IMG_4435.HEIC|Revenge (11)|Unranked
IMG_4435.HEIC|Rifle Ammo Mutation|Unranked
IMG_4435.HEIC|Rifle Aptitude|Unranked
IMG_4435.HEIC|Rubedo-Lined Barrel|Unranked
IMG_4435.HEIC|Runtime|Unranked
IMG_4435.HEIC|Rupture (15)|Unranked
IMG_4435.HEIC|Rush (2)|Unranked
IMG_4435.HEIC|Rush|Rank 5
IMG_4435.HEIC|Sacrificial Pressure|Rank 6
IMG_4435.HEIC|Sacrificial Steel|Rank 6
IMG_4435.HEIC|Savagery|Unranked
IMG_4435.HEIC|Sawtooth Clip (4)|Unranked
IMG_4435.HEIC|Seeking Fury (3)|Unranked
IMG_4435.HEIC|Serration (5)|Unranked
IMG_4435.HEIC|Serration|Rank 8
IMG_4435.HEIC|Sharpened Claws|Unranked
IMG_4435.HEIC|Shattering Impact|Rank 5
IMG_4436.HEIC|Shell Compression (2)|Unranked
IMG_4436.HEIC|Shimmering Blight|Unranked
IMG_4436.HEIC|Shocking Touch (5)|Unranked
IMG_4436.HEIC|Shocking Touch|Rank 4
IMG_4436.HEIC|Shotgun Barrage|Unranked
IMG_4436.HEIC|Shotgun Savvy|Unranked
IMG_4436.HEIC|Shredder (6)|Unranked
IMG_4436.HEIC|Sinking Talon (3)|Unranked
IMG_4436.HEIC|Slip Magazine (2)|Unranked
IMG_4436.HEIC|Smite Grineer (6)|Unranked
IMG_4436.HEIC|Smite Infested (2)|Unranked
IMG_4436.HEIC|Spare Parts (4)|Unranked
IMG_4436.HEIC|Speed Trigger (4)|Unranked
IMG_4436.HEIC|Spring-Loaded Broadhead|Unranked
IMG_4436.HEIC|Spry Sights|Unranked
IMG_4436.HEIC|Stabilizer|Unranked
IMG_4436.HEIC|Steel Fiber (4)|Unranked
IMG_4437.HEIC|Stinging Thorn|Unranked
IMG_4437.HEIC|Stormbringer (6)|Unranked
IMG_4437.HEIC|Stormbringer|Rank 1
IMG_4437.HEIC|Streamline|Rank 2
IMG_4437.HEIC|Stretch (3)|Unranked
IMG_4437.HEIC|Stretch|Rank 5
IMG_4437.HEIC|Sudden Impact|Unranked
IMG_4437.HEIC|Sundering Weave (4)|Unranked
IMG_4437.HEIC|Superior Defenses|Unranked
IMG_4437.HEIC|Suppress (12)|Unranked
IMG_4437.HEIC|Swipe|Unranked
IMG_4437.HEIC|Swirling Tiger (2)|Unranked
IMG_4437.HEIC|Swooping Falcon|Unranked
IMG_4437.HEIC|System Reroute|Unranked
IMG_4437.HEIC|Tactical Pump (3)|Unranked
IMG_4437.HEIC|Target Cracker|Unranked
IMG_4437.HEIC|Target Cracker|Rank 3
IMG_4438.HEIC|Targeting Receptor|Unranked
IMG_4438.HEIC|Territorial Aggression|Unranked
IMG_4438.HEIC|Thief's Wit (8)|Unranked
IMG_4438.HEIC|Thumper (3)|Unranked
IMG_4438.HEIC|Tonkor Fevacak|Rank 8
IMG_4438.HEIC|Transfusion|Unranked
IMG_4438.HEIC|Trick Mag (10)|Unranked
IMG_4438.HEIC|True Steel|Unranked
IMG_4438.HEIC|Twitch|Unranked
IMG_4438.HEIC|Umbral Fiber|Rank 5
IMG_4438.HEIC|Umbral Intensify|Rank 7
IMG_4438.HEIC|Umbral Vitality|Rank 5
IMG_4438.HEIC|Undying Will|Unranked
IMG_4438.HEIC|Unleashed|Rank 5
IMG_4438.HEIC|Untraceable|Unranked
IMG_4438.HEIC|Vacuum (4)|Unranked
IMG_4438.HEIC|Vaporize (3)|Unranked
IMG_4439.HEIC|Vitality (11)|Unranked
IMG_4439.HEIC|Vitality|Rank 4
IMG_4439.HEIC|Vulpine Mask|Unranked
IMG_4439.HEIC|Warm Coat|Unranked
`;

function parseRank(rankText) {
  if (!rankText) {
    return null;
  }
  if (rankText === "Unranked") {
    return null;
  }
  const match = /^Rank (\d+)$/.exec(rankText);
  if (!match) {
    throw new Error(`Unsupported rank text: ${rankText}`);
  }
  return Number.parseInt(match[1], 10);
}

function parseNameAndCount(rawName) {
  const match = /^(.+?) \((\d+)\)$/.exec(rawName);
  if (!match) {
    return { name: rawName, count: 1 };
  }
  return {
    name: match[1],
    count: Number.parseInt(match[2], 10),
  };
}

function addEntry(groupedEntries, entry) {
  const key = `${entry.category}::${entry.name}`;
  if (!groupedEntries.has(key)) {
    groupedEntries.set(key, {
      category: entry.category,
      name: entry.name,
      copies: new Map(),
      notes: new Set(entry.notes ?? []),
      sourceImages: new Set(entry.sourceImages ?? []),
    });
  }

  const groupedEntry = groupedEntries.get(key);
  const rankText = entry.rankText ?? null;
  const rank = parseRank(rankText);
  const copyKey = `${rankText ?? "null"}::${rank ?? "null"}`;

  groupedEntry.sourceImages = new Set([...groupedEntry.sourceImages, ...(entry.sourceImages ?? [])]);
  for (const note of entry.notes ?? []) {
    groupedEntry.notes.add(note);
  }

  if (!groupedEntry.copies.has(copyKey)) {
    groupedEntry.copies.set(copyKey, {
      count: 0,
      rank,
      rank_text: rankText,
    });
  }

  groupedEntry.copies.get(copyKey).count += entry.count ?? 1;
}

function buildInventory() {
  const groupedEntries = new Map();

  for (const entry of nonModEntries) {
    addEntry(groupedEntries, entry);
  }

  for (const row of modRows.trim().split("\n")) {
    const [sourceImage, rawName, rankText] = row.split("|");
    const { name, count } = parseNameAndCount(rawName);
    addEntry(groupedEntries, {
      category: "mods",
      name,
      count,
      rankText,
      sourceImages: [sourceImage],
    });
  }

  const categories = {};
  for (const groupedEntry of [...groupedEntries.values()].sort((left, right) => {
    return left.category.localeCompare(right.category) || left.name.localeCompare(right.name);
  })) {
    const copies = [...groupedEntry.copies.values()].sort((left, right) => {
      if (left.rank === null && right.rank !== null) {
        return 1;
      }
      if (left.rank !== null && right.rank === null) {
        return -1;
      }
      if (left.rank !== null && right.rank !== null) {
        return left.rank - right.rank;
      }
      return 0;
    });

    const entry = {
      name: groupedEntry.name,
      source_images: [...groupedEntry.sourceImages].sort(),
      copies,
      total_count: copies.reduce((sum, copy) => sum + copy.count, 0),
    };

    if (groupedEntry.notes.size > 0) {
      entry.notes = [...groupedEntry.notes];
    }

    if (!categories[groupedEntry.category]) {
      categories[groupedEntry.category] = [];
    }
    categories[groupedEntry.category].push(entry);
  }

  const sourceImages = readdirSync(warframeDir)
    .filter((fileName) => fileName.toUpperCase().endsWith(".HEIC"))
    .sort();

  const summaryByCategory = Object.fromEntries(
    Object.entries(categories).map(([categoryName, entries]) => {
      return [
        categoryName,
        {
          unique_items: entries.length,
          total_copies: entries.reduce((sum, entry) => sum + entry.total_count, 0),
        },
      ];
    }),
  );

  const summary = {
    unique_items: Object.values(categories).reduce((sum, entries) => sum + entries.length, 0),
    total_copies: Object.values(categories).reduce((sum, entries) => {
      return sum + entries.reduce((entrySum, entry) => entrySum + entry.total_count, 0);
    }, 0),
    by_category: summaryByCategory,
  };

  return {
    source_folder: warframeDir,
    source_images: sourceImages,
    extracted_at: new Date().toISOString(),
    extraction_notes: [
      "This JSON was built from the screenshots currently stored in the warframe folder.",
      "Tonkor Fevacak is stored exactly as it appears in the screenshot.",
      "One Cobra & Crane Prime part has a truncated suffix in the screenshot, so its exact component name could not be confirmed.",
    ],
    summary,
    categories,
  };
}

const inventory = buildInventory();

writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);

console.log(`Wrote ${outputPath}`);
console.log(JSON.stringify(inventory.summary, null, 2));
