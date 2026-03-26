import {
  type ArmorType,
  type DamageType,
  type HealthType,
  type ShieldType,
} from "../damage/types";

export type TargetType = ArmorType | HealthType | ShieldType;

type EffectivenessTable = Partial<Record<DamageType, Partial<Record<TargetType, number>>>>;

export const DAMAGE_EFFECTIVENESS: EffectivenessTable = {
  Impact: {
    flesh: 0.75,
    clonedFlesh: 0.75,
    shield: 1.5,
  },
  Puncture: {
    ferrite: 1.5,
    shield: 0.8,
    robotic: 1.25,
  },
  Slash: {
    ferrite: 0.85,
    alloy: 0.5,
    flesh: 1.25,
    clonedFlesh: 1.25,
    robotic: 0.75,
    machinery: 0.75,
    infestedFlesh: 1.5,
    fossilized: 1.15,
    infested: 1.25,
  },
  Heat: {
    clonedFlesh: 1.25,
    protoShield: 0.5,
    infestedFlesh: 1.5,
    infested: 1.25,
  },
  Cold: {
    alloy: 1.25,
    shield: 1.5,
    fossilized: 0.75,
  },
  Electricity: {
    robotic: 1.5,
    machinery: 1.5,
  },
  Toxin: {
    flesh: 1.5,
    protoShield: 1.5,
    machinery: 1.25,
  },
  Blast: {
    ferrite: 0.75,
    machinery: 1.75,
    fossilized: 1.5,
  },
  Corrosive: {
    ferrite: 1.75,
    protoShield: 0.5,
    fossilized: 1.75,
  },
  Gas: {
    infestedFlesh: 1.5,
    infested: 1.75,
  },
  Magnetic: {
    alloy: 0.5,
    shield: 1.75,
    protoShield: 1.75,
  },
  Radiation: {
    alloy: 1.75,
    shield: 0.75,
    robotic: 1.25,
    fossilized: 0.25,
    infested: 0.5,
  },
  Viral: {
    clonedFlesh: 1.75,
    machinery: 0.75,
    infestedFlesh: 0.5,
    infested: 0.5,
  },
};

export function getDamageEffectiveness(damageType: string, targetType: TargetType): number {
  const perDamageType = DAMAGE_EFFECTIVENESS[damageType as DamageType];
  if (!perDamageType) {
    return 1;
  }

  return perDamageType[targetType] ?? 1;
}
