export interface WfcdComponent {
  name?: string;
  uniqueName?: string;
  itemCount?: number;
  [key: string]: unknown;
}

export interface WfcdItem {
  name: string;
  uniqueName: string;
  description?: string;
  category?: string;
  tradable?: boolean;
  masteryReq?: number;
  components?: WfcdComponent[];
  imageName?: string;
  wikiUrl?: string;
  [key: string]: unknown;
}

export interface WfcdWeapon {
  name: string;
  uniqueName: string;
  category?: string;
  type?: string;
  description?: string;
  damage?: Record<string, number>;
  totalDamage?: number;
  criticalChance?: number;
  criticalMultiplier?: number;
  statusChance?: number;
  fireRate?: number;
  magazineSize?: number;
  reloadTime?: number;
  multishot?: number;
  noise?: string;
  trigger?: string;
  masteryReq?: number;
  disposition?: number;
  polarities?: string[];
  [key: string]: unknown;
}

export interface WfcdWarframeAbility {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface WfcdWarframe {
  name: string;
  uniqueName: string;
  description?: string;
  health?: number;
  shield?: number;
  armor?: number;
  power?: number;
  sprintSpeed?: number;
  abilities?: WfcdWarframeAbility[];
  passive?: string | { description?: string; [key: string]: unknown };
  polarities?: string[];
  aura?: string;
  auraPolarity?: string;
  [key: string]: unknown;
}

export interface WfcdModLevelStats {
  stats?: string[];
  [key: string]: unknown;
}

export interface WfcdMod {
  name: string;
  uniqueName: string;
  description?: string;
  polarity?: string;
  rarity?: string;
  baseDrain?: number;
  fusionLimit?: number;
  compatName?: string;
  type?: string;
  stats?: string[];
  levelStats?: WfcdModLevelStats[];
  [key: string]: unknown;
}

export interface WfcdDrop {
  place: string;
  item: string;
  rarity: string;
  chance: number;
  [key: string]: unknown;
}

export interface WikiSearchResult {
  title: string;
  pageid: number;
  snippet: string;
}

export interface MarketItem {
  id: string;
  url_name: string;
  item_name: string;
  thumb: string;
}

export interface MarketOrder {
  platinum: number;
  quantity: number;
  order_type: "sell" | "buy";
  user: {
    ingame_name: string;
    status: string;
    reputation: number;
  };
}

export interface StatEntry {
  datetime: string;
  volume: number;
  min_price: number;
  max_price: number;
  avg_price: number;
  median: number;
  wa_price: number;
  moving_avg: number;
}

export interface MarketStatistics {
  statistics_closed: {
    "48hours": StatEntry[];
    "90days": StatEntry[];
  };
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  permalink: string;
  author: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  link_flair_text: string | null;
}

export interface WorldStateFissure {
  id?: string;
  node?: string;
  missionType?: string;
  tier?: string;
  tierNum?: number;
  enemy?: string;
  isHard?: boolean;
  isStorm?: boolean;
  expired?: boolean;
  eta?: string;
  [key: string]: unknown;
}

export interface WorldStateSortieVariant {
  node?: string;
  missionType?: string;
  modifier?: string;
  modifierDescription?: string;
  [key: string]: unknown;
}

export interface WorldStateSortie {
  id?: string;
  boss?: string;
  faction?: string;
  expired?: boolean;
  eta?: string;
  variants?: WorldStateSortieVariant[];
  [key: string]: unknown;
}

export interface WorldStateAlert {
  id?: string;
  activation?: string;
  expiry?: string;
  eta?: string;
  expired?: boolean;
  mission?: {
    node?: string;
    type?: string;
    faction?: string;
    reward?: {
      asString?: string;
      itemString?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WorldStateInvasion {
  id?: string;
  node?: string;
  desc?: string;
  completion?: number;
  completed?: boolean;
  eta?: string;
  attackerReward?: {
    asString?: string;
    [key: string]: unknown;
  };
  defenderReward?: {
    asString?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WorldStateVoidTrader {
  id?: string;
  character?: string;
  location?: string;
  active?: boolean;
  startString?: string;
  endString?: string;
  inventory?: Array<{
    item?: string;
    ducats?: number;
    credits?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface WorldStateNightwave {
  id?: string;
  active?: boolean;
  season?: number;
  phase?: number;
  possibleChallenges?: Array<{
    id?: string;
    title?: string;
    desc?: string;
    reputation?: number;
    isDaily?: boolean;
    isElite?: boolean;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export interface WorldStateCycle {
  id?: string;
  expiry?: string;
  timeLeft?: string;
  isDay?: boolean;
  state?: string;
  shortString?: string;
  [key: string]: unknown;
}

export interface WorldState {
  timestamp?: string;
  fissures?: WorldStateFissure[];
  sortie?: WorldStateSortie;
  alerts?: WorldStateAlert[];
  invasions?: WorldStateInvasion[];
  voidTrader?: WorldStateVoidTrader;
  nightwave?: WorldStateNightwave;
  cetusCycle?: WorldStateCycle;
  vallisCycle?: WorldStateCycle;
  cambionCycle?: WorldStateCycle;
  earthCycle?: WorldStateCycle;
  [key: string]: unknown;
}
