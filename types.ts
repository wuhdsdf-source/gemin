export type ElementType = 'FIRE' | 'WATER' | 'GRASS';

export type Rank = 'LV1' | 'LV2' | 'LV3' | 'LV4';

export interface Skill {
  id: string;
  name: string;
  element: ElementType;
  description: string;
}

export interface PlayerSkillState {
  rank: Rank;
}

export interface SpiritOption {
  id: string;
  type: 'COMMON' | 'RARE' | 'DIVINE';
  skills: { skillId: string; rank: Rank }[]; // A spirit can carry multiple skills
  revealed: boolean;
}

export interface StarterOption {
  element: ElementType;
  skill: Skill;
}

export type GamePhase = 
  | 'START' 
  | 'R0_SELECTION' 
  | 'ROUND_START' 
  | 'EVENT_RABBIT_MODAL' // New Modal Phase for Rabbit
  | 'EVENT_DEVIL' 
  | 'DEVIL_TARGET_SELECTION' 
  | 'DRAW_PHASE' 
  | 'DRAW_RESULT' 
  | 'REPLACE_SKILL' 
  | 'GAME_OVER';

export interface LogEntry {
  id: number;
  text: string;
  color?: string;
}

export interface DevilContractData {
  id: string;
  name: string;
  description: string;
  requiresTarget?: boolean;
}

export interface PendingSkill {
  skillId: string;
  rank: Rank;
  source?: string;
}

export interface GameState {
  phase: GamePhase;
  round: number;
  score: number;
  inventory: Record<string, PlayerSkillState>; // skillId -> Rank
  currentOptions: SpiritOption[];
  previewOptions?: SpiritOption[]; 
  logs: LogEntry[];
  currentDevilOptions?: DevilContractData[]; 
  pendingContractId?: string; 
  
  // Starter Selection
  starterChoices?: StarterOption[];

  // Rabbit Data
  rabbitUpgradeInfo?: string; // Info text for the modal

  // Queue System
  acquisitionQueue: PendingSkill[]; 
  pendingReplaceSkill?: PendingSkill; 
}