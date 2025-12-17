import React from 'react';
import { Rank, Skill } from '../types';
import { getElementColor, RANK_COLORS, ELEMENT_NAMES } from '../constants';

interface Props {
  skill: Skill;
  rank: Rank;
  isNew?: boolean;
  size?: 'normal' | 'mini';
  onClick?: () => void;
  className?: string;
}

export const SkillBadge: React.FC<Props> = ({ skill, rank, isNew, size = 'normal', onClick, className = '' }) => {
  const elementClass = getElementColor(skill.element);
  const rankClass = RANK_COLORS[rank];

  if (size === 'mini') {
    return (
      <div 
        onClick={onClick}
        className={`relative flex flex-col p-1 border rounded shadow-sm w-full cursor-pointer ${rankClass} ${className}`}
      >
        <div className="flex justify-between items-center">
          <span className={`text-[8px] px-1 rounded ${elementClass}`}>
            {ELEMENT_NAMES[skill.element]}
          </span>
          <span className="font-bold text-[8px] border border-current px-1 rounded">
            {rank}
          </span>
        </div>
        <div className="font-pixel text-[10px] truncate leading-tight mt-1">{skill.name}</div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`relative flex flex-col p-2 border-2 rounded-lg shadow-sm w-full transition-all ${rankClass} ${isNew ? 'animate-pulse ring-2 ring-yellow-400' : ''} ${className}`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className={`text-[10px] px-1 rounded ${elementClass}`}>
          {ELEMENT_NAMES[skill.element]}
        </span>
        <span className="font-bold text-xs border border-current px-1 rounded">
          {rank}
        </span>
      </div>
      <div className="font-pixel text-sm truncate">{skill.name}</div>
      <div className="text-[10px] opacity-80 truncate">{skill.description}</div>
    </div>
  );
};