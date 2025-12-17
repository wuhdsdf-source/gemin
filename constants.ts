import { ElementType, Rank, Skill } from './types';

// --- Data ---

export const SKILLS: Skill[] = [
  // Fire
  { id: 'f1', name: '暴击', element: 'FIRE', description: '双倍伤害几率' },
  { id: 'f2', name: '连击', element: 'FIRE', description: '攻击两次' },
  { id: 'f3', name: '力量', element: 'FIRE', description: '基础攻击提升' },
  // Water
  { id: 'w1', name: '坚韧', element: 'WATER', description: '防止被秒杀' },
  { id: 'w2', name: '反射', element: 'WATER', description: '反弹受到的伤害' },
  { id: 'w3', name: '嘲讽', element: 'WATER', description: '吸引敌方火力' },
  // Grass
  { id: 'g1', name: '治愈', element: 'GRASS', description: '恢复生命值' },
  { id: 'g2', name: '免疫', element: 'GRASS', description: '抵挡异常状态' },
  { id: 'g3', name: '复生', element: 'GRASS', description: '阵亡后复活' },
];

export const RANK_SCORES: Record<Rank, number> = {
  'LV1': 50,
  'LV2': 150,
  'LV3': 450,
  'LV4': 750,
};

// --- Rules ---

export const RANK_ORDER = ['LV1', 'LV2', 'LV3', 'LV4'];

export const SCORES = {
  RABBIT: 0, // Score is now handled by the upgrade itself
  
  // Upgrade Logic
  MERGE_LV1_TO_LV2: 1500, // A+A -> B
  UPGRADE_LV1_TO_LV3: 1000, // A -> C
  UPGRADE_LV2_TO_LV4: 1000, // B -> D
  UPGRADE_LV3_TO_LV4: 750,  // C -> D
  
  // Fallbacks
  UPGRADE_LV2_TO_LV3: 500, 
  
  OVERFLOW_NORMAL: 100,
  OVERFLOW_DIVINE: 1000, // D+D

  // Collection (Simplified Rule)
  COLLECTION_COMPLETE: 6000, 
};

// New Pool of 6 Contracts
export const DEVIL_CONTRACT_POOL = [
  { id: 'alchemy', name: '点石成金', description: '随机一个现有属性等级 +1。' },
  { id: 'void', name: '虚空重构', description: '指定一个现有属性，重置为同等级的其他随机属性。', requiresTarget: true },
  { id: 'gift', name: '流派馈赠', description: '随机获得一个目前拥有数量最少的流派的“LV2”属性。' },
  { id: 'greed', name: '贪婪契约', description: '当前分数 -50%，随机获得一个“LV4”属性。' },
  { id: 'last_stand', name: '破釜沉舟', description: '随机销毁一个现有属性，使剩余所有属性等级 +1。' },
  { id: 'mirror', name: '复制镜像', description: '选择一个现有属性，获得一个同等级副本（即指定升级）。', requiresTarget: true },
];

export const DEVIL_CONTRACTS = DEVIL_CONTRACT_POOL;

export const ELEMENT_COLORS: Record<ElementType, string> = {
  FIRE: 'red',
  WATER: 'blue',
  GRASS: 'green',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
  FIRE: '火',
  WATER: '水',
  GRASS: '草',
};

export const RANK_COLORS: Record<Rank, string> = {
  LV1: 'bg-gray-200 border-gray-400 text-gray-800',
  LV2: 'bg-blue-100 border-blue-400 text-blue-900',
  LV3: 'bg-purple-100 border-purple-400 text-purple-900',
  LV4: 'bg-yellow-100 border-yellow-500 text-yellow-900',
};

// Helper to get element color classes
export const getElementColor = (el: ElementType) => {
  switch (el) {
    case 'FIRE': return 'bg-red-500 border-red-700 text-white';
    case 'WATER': return 'bg-blue-500 border-blue-700 text-white';
    case 'GRASS': return 'bg-green-500 border-green-700 text-white';
  }
};