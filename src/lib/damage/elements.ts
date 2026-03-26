import { type DamageType } from "./types";

export type BaseElement = "Heat" | "Cold" | "Electricity" | "Toxin";

const BASE_ELEMENTS: BaseElement[] = ["Heat", "Cold", "Electricity", "Toxin"];

const BASE_ELEMENT_SET = new Set<string>(BASE_ELEMENTS);

function isBaseElement(value: string): value is BaseElement {
  return BASE_ELEMENT_SET.has(value);
}

function pairKey(first: BaseElement, second: BaseElement): string {
  return [first, second].sort().join("+");
}

export const COMBINATION_MAP: Record<string, DamageType> = {
  [pairKey("Heat", "Cold")]: "Blast",
  [pairKey("Heat", "Electricity")]: "Radiation",
  [pairKey("Heat", "Toxin")]: "Gas",
  [pairKey("Cold", "Electricity")]: "Magnetic",
  [pairKey("Cold", "Toxin")]: "Viral",
  [pairKey("Electricity", "Toxin")]: "Corrosive",
};

function canonicalElement(raw: string): DamageType | null {
  const normalized = raw.trim().toLowerCase();
  const byName: Record<string, DamageType> = {
    impact: "Impact",
    puncture: "Puncture",
    slash: "Slash",
    heat: "Heat",
    cold: "Cold",
    electricity: "Electricity",
    toxin: "Toxin",
    blast: "Blast",
    corrosive: "Corrosive",
    gas: "Gas",
    magnetic: "Magnetic",
    radiation: "Radiation",
    viral: "Viral",
    void: "Void",
    true: "True",
  };

  return byName[normalized] ?? null;
}

function addToRecord(record: Record<string, number>, key: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    return;
  }

  record[key] = (record[key] ?? 0) + value;
}

export function resolveElements(
  elementalMods: Array<{ element: string; value: number }>,
): Record<string, number> {
  const ordered: Array<{ element: DamageType; value: number }> = [];

  for (const mod of elementalMods) {
    if (!mod || typeof mod.element !== "string" || typeof mod.value !== "number") {
      continue;
    }

    const element = canonicalElement(mod.element);
    if (!element || mod.value <= 0) {
      continue;
    }

    ordered.push({ element, value: mod.value });
  }

  const resolved: Record<string, number> = {};

  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index];

    if (isBaseElement(current.element) && index + 1 < ordered.length) {
      const next = ordered[index + 1];

      if (isBaseElement(next.element)) {
        const combination = COMBINATION_MAP[pairKey(current.element, next.element)];

        if (combination) {
          addToRecord(resolved, combination, current.value + next.value);
          index += 1;
          continue;
        }
      }
    }

    addToRecord(resolved, current.element, current.value);
  }

  return resolved;
}
