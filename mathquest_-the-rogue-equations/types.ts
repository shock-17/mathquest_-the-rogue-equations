export enum NodeType {
  START = 'START',
  ENEMY = 'ENEMY',
  ELITE = 'ELITE',
  TREASURE = 'TREASURE',
  REST = 'REST',
  BOSS = 'BOSS',
  SHOP = 'SHOP',
}

export enum GameState {
  MENU = 'MENU',
  MAP = 'MAP',
  QUIZ = 'QUIZ',
  REWARD = 'REWARD',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  INVENTORY = 'INVENTORY',
  SHOP = 'SHOP',
  LEADERBOARD = 'LEADERBOARD',
}

export enum ItemType {
  POTION_HEAL = 'POTION_HEAL',
  WEAPON = 'WEAPON', // Increases Damage
  ARMOR = 'ARMOR',   // Reduces incoming damage
  SCROLL_SKIP = 'SCROLL_SKIP',
  SCROLL_REROLL = 'SCROLL_REROLL',
  BOMB = 'BOMB',
}

export enum Difficulty {
  EASY = 'EASY',     // Elementary
  MEDIUM = 'MEDIUM', // Junior High
  HARD = 'HARD'      // Senior High
}

export enum Rarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  LEGENDARY = 'LEGENDARY'
}

export enum RunModifier {
  NO_ELITES = 'NO_ELITES',
  NO_LOOT = 'NO_LOOT',
  NO_BOSSES = 'NO_BOSSES',
  HARDCORE = 'HARDCORE', // Less time
  EASY_MODE = 'EASY_MODE', // More time
  DOUBLE_GOLD = 'DOUBLE_GOLD',
  HALF_HP = 'HALF_HP',
  GLASS_CANNON = 'GLASS_CANNON',
  RICH_START = 'RICH_START',
}

export interface Item {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  icon: string;
  value: number; // Heal amount, Damage bonus, or Armor value
  price: number;
  rarity: Rarity;
}

export interface MapNode {
  id: string;
  layer: number;
  type: NodeType;
  x: number;
  y: number;
  next: string[];
  completed: boolean;
  locked: boolean;
}

export interface LoreItem {
  id: string;
  title: string;
  text: string;
  unlocked: boolean;
}

export interface RunStats {
  enemiesDefeated: number;
  goldEarned: number;
  startTime: number;
  endTime?: number;
  highestLayer: number;
  runId: string;
}

export interface Player {
  hp: number;
  maxHp: number;
  gold: number;
  attack: number; // Base damage multiplier
  defense: number; // Damage reduction
  inventory: Item[];
  equippedWeapon: Item | null;
  equippedArmor: Item | null;
  currentNodeId: string | null;
  history: string[];
  lore: string[]; // IDs of unlocked lore
  runStats: RunStats;
  usedQuestions: string[]; // Track questions seen in this run
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  layer: number;
  date: string;
  runId?: string;
}

export enum Language {
  INDONESIAN = 'INDONESIAN',
  ENGLISH = 'ENGLISH',
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: number;
  category?: string;
}