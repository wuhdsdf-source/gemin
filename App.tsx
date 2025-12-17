import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { GameState, GamePhase, Rank, Skill, SpiritOption, PlayerSkillState, DevilContractData, PendingSkill, StarterOption, ElementType } from './types';
import { SKILLS, SCORES, RANK_SCORES, RANK_ORDER, DEVIL_CONTRACT_POOL, ELEMENT_COLORS, getElementColor, ELEMENT_NAMES } from './constants';
import { playSound } from './services/soundService';
import { SkillBadge } from './components/SkillBadge';

// --- Helper Logic ---

const getRandomSkill = (): Skill => SKILLS[Math.floor(Math.random() * SKILLS.length)];
const getSkillsByElement = (el: string) => SKILLS.filter(s => s.element === el);

const getNextRank = (currentRank: Rank): Rank | 'OVERFLOW' => {
  const idx = RANK_ORDER.indexOf(currentRank);
  if (idx === -1 || idx === RANK_ORDER.length - 1) return 'OVERFLOW';
  return RANK_ORDER[idx + 1] as Rank;
};

const generateOptions = (round: number): SpiritOption[] => {
  const options: SpiritOption[] = [];
  
  if (round === 1) {
    // 3 Common (LV1), 1 Rare (LV3)
    for(let i=0; i<3; i++) {
        options.push({
            id: `r1-c-${i}`,
            type: 'COMMON',
            revealed: false,
            skills: Array.from({length: 3}, () => ({ skillId: getRandomSkill().id, rank: 'LV1' }))
        });
    }
    options.push({
        id: `r1-r-0`,
        type: 'RARE',
        revealed: false,
        skills: [{ skillId: getRandomSkill().id, rank: 'LV3' }]
    });

  } else if (round === 2 || round === 3) {
      // 2 Common (LV2), 2 Rare (LV3)
      for(let i=0; i<2; i++) {
        options.push({
            id: `r${round}-c-${i}`,
            type: 'COMMON',
            revealed: false,
            skills: Array.from({length: 3}, () => ({ skillId: getRandomSkill().id, rank: 'LV2' }))
        });
      }
      for(let i=0; i<2; i++) {
        options.push({
            id: `r${round}-r-${i}`,
            type: 'RARE',
            revealed: false,
            skills: [{ skillId: getRandomSkill().id, rank: 'LV3' }]
        });
      }

  } else if (round === 4 || round === 5) {
      // 2 Common (LV3), 2 Divine (LV4)
      for(let i=0; i<2; i++) {
        options.push({
            id: `r${round}-c-${i}`,
            type: 'COMMON',
            revealed: false,
            skills: Array.from({length: 3}, () => ({ skillId: getRandomSkill().id, rank: 'LV3' }))
        });
      }
      for(let i=0; i<2; i++) {
        options.push({
            id: `r${round}-d-${i}`,
            type: 'DIVINE',
            revealed: false,
            skills: [{ skillId: getRandomSkill().id, rank: 'LV4' }]
        });
      }
  }

  return options.sort(() => Math.random() - 0.5); // Shuffle display
};

// --- App Component ---

const App: React.FC = () => {
  const [state, setState] = useState<GameState>({
    phase: 'START',
    round: 0,
    score: 0,
    inventory: {},
    currentOptions: [],
    logs: [{ id: 0, text: "欢迎来到元素精灵模拟器 V10.2!" }],
    acquisitionQueue: [],
    pendingReplaceSkill: undefined,
    starterChoices: []
  });
  
  const logCounter = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (text: string, color?: string) => {
    setState(prev => ({
      ...prev,
      logs: [...prev.logs, { id: logCounter.current++, text, color }]
    }));
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.logs]);

  // --- Queue Processor ---
  useEffect(() => {
    if (state.phase === 'REPLACE_SKILL') return; 
    if (state.acquisitionQueue.length === 0) return;

    const nextItem = state.acquisitionQueue[0];
    processSkillItem(nextItem);
  }, [state.acquisitionQueue, state.phase]);

  const processSkillItem = (item: PendingSkill) => {
      const { skillId, rank } = item;
      const existing = state.inventory[skillId];
      const inventoryCount = Object.keys(state.inventory).length;

      if (existing || inventoryCount < 6) {
          const res = calculateAcquisitionResult(state.inventory, skillId, rank);
          
          addLog(res.message, res.scoreDelta > 900 ? "text-yellow-400" : "text-white");
          if (res.scoreDelta > 900) playSound.levelUp();
          
          setState(prev => ({
              ...prev,
              inventory: res.newInventory,
              score: prev.score + res.scoreDelta,
              acquisitionQueue: prev.acquisitionQueue.slice(1) 
          }));
      } else {
          setState(prev => ({
              ...prev,
              phase: 'REPLACE_SKILL',
              pendingReplaceSkill: item
          }));
          playSound.error();
          addLog("技能槽已满！请选择放弃新技能或替换旧技能。", "text-red-400");
      }
  };

  // --- Scoring & Logic Engine ---

  const calculateAcquisitionResult = (currentInv: Record<string, PlayerSkillState>, skillId: string, newRank: Rank) => {
      const existing = currentInv[skillId];
      let scoreDelta = 0;
      let message = "";
      const newInventory = { ...currentInv };
      const skillName = SKILLS.find(s => s.id === skillId)?.name || "Unknown";

      if (!existing) {
          // New Skill
          scoreDelta = RANK_SCORES[newRank];
          message = `获得: ${skillName} (${newRank}). +${scoreDelta}`;
          newInventory[skillId] = { rank: newRank };
      } else {
          // Upgrade / Merge
          const oldRankIdx = RANK_ORDER.indexOf(existing.rank);
          const newRankIdx = RANK_ORDER.indexOf(newRank);

          if (existing.rank === 'LV1' && newRank === 'LV1') {
              // LV1+LV1 -> LV2
              scoreDelta = SCORES.MERGE_LV1_TO_LV2;
              newInventory[skillId] = { rank: 'LV2' };
              message = `融合! ${skillName} LV1+LV1 -> LV2. +${scoreDelta}`;
          } else if (existing.rank === 'LV4' && newRank === 'LV4') {
              // Divine Overflow
              scoreDelta = SCORES.OVERFLOW_DIVINE;
              message = `神圣溢出! ${skillName} (LV4). +${scoreDelta}`;
          } else if (newRank === existing.rank) {
              // Standard Overflow
              scoreDelta = SCORES.OVERFLOW_NORMAL;
              message = `溢出. ${skillName} (${newRank}). +${scoreDelta}`;
          } else if (newRankIdx > oldRankIdx) {
              // Upgrades
              newInventory[skillId] = { rank: newRank };
              
              if (existing.rank === 'LV1' && newRank === 'LV3') {
                  scoreDelta = SCORES.UPGRADE_LV1_TO_LV3;
              } else if (existing.rank === 'LV2' && newRank === 'LV4') {
                  scoreDelta = SCORES.UPGRADE_LV2_TO_LV4;
              } else if (existing.rank === 'LV3' && newRank === 'LV4') {
                  scoreDelta = SCORES.UPGRADE_LV3_TO_LV4;
              } else {
                  scoreDelta = SCORES.UPGRADE_LV2_TO_LV3;
              }
              message = `升级! ${skillName} ${existing.rank} -> ${newRank}. +${scoreDelta}`;
          } else {
              scoreDelta = 50;
              message = `转化为经验: 低阶 ${skillName} (${newRank}). +${scoreDelta}`;
          }
      }
      return { newInventory, scoreDelta, message };
  };

  // --- Actions ---

  const startGame = () => {
    playSound.confirm();
    const r1Preview = generateOptions(1);

    // Generate specific starter options
    const starters: StarterOption[] = (['FIRE', 'WATER', 'GRASS'] as ElementType[]).map(el => {
        const skills = getSkillsByElement(el);
        const skill = skills[Math.floor(Math.random() * skills.length)];
        return { element: el, skill };
    });
    
    setState(prev => ({ 
        ...prev, 
        phase: 'R0_SELECTION', 
        round: 0, 
        score: 0, 
        inventory: {}, 
        logs: [],
        previewOptions: r1Preview,
        acquisitionQueue: [],
        pendingReplaceSkill: undefined,
        starterChoices: starters
    }));
    addLog("序章: 请选择你的初始伙伴精灵！", "text-yellow-400");
  };

  const selectStarter = (option: StarterOption) => {
    playSound.confirm();
    
    setState(prev => ({
      ...prev,
      score: 50, 
      phase: 'ROUND_START',
      round: 1,
      inventory: { [option.skill.id]: { rank: 'LV1' } }
    }));
    addLog(`初始精灵: ${option.skill.name} (LV1). +50分.`, "text-green-400");
    
    setTimeout(() => startRound(1), 500);
  };

  const startRound = (roundNum: number) => {
    // Phase 1: Setup options
    let options: SpiritOption[];
    if (roundNum === 1 && state.previewOptions && state.previewOptions.length > 0) {
        options = state.previewOptions;
    } else {
        options = generateOptions(roundNum);
    }

    // Phase 2: Rabbit Check (20%)
    // Since state update is async, we calculate logic first then batch update
    const isRabbit = Math.random() < 0.2;
    
    if (isRabbit) {
       playSound.event();
       setState(prev => ({
           ...prev,
           round: roundNum,
           phase: 'EVENT_RABBIT_MODAL',
           currentOptions: options,
           previewOptions: undefined
       }));
       // Note: Rabbit logic executes when user closes modal to avoid flash
    } else {
       // Direct flow check for Devil
       proceedToDevilOrDraw(roundNum, options);
    }
  };

  const executeRabbitUpgrade = () => {
      // Logic for Rabbit: Upgrade random skill + 1
      const keys = Object.keys(state.inventory);
      if (keys.length === 0) return; // Should not happen after starter

      const targetId = keys[Math.floor(Math.random() * keys.length)];
      const target = state.inventory[targetId];
      const nextRank = getNextRank(target.rank);

      let logMsg = "";
      let scoreAdd = 0;
      let newInv = { ...state.inventory };

      if (nextRank === 'OVERFLOW') {
          scoreAdd = SCORES.OVERFLOW_NORMAL; // Just normal overflow bonus if maxed? Or divine? Let's use Divine for max
          logMsg = `魔兔祝福: ${SKILLS.find(s=>s.id===targetId)?.name} 已至巅峰! +${scoreAdd}分`;
      } else {
          // Use calculation logic to ensure scoring is consistent
          const res = calculateAcquisitionResult(newInv, targetId, nextRank);
          newInv = res.newInventory;
          scoreAdd = res.scoreDelta;
          logMsg = `魔兔祝福: ${res.message}`;
      }

      playSound.legendary();
      addLog(logMsg, "text-pink-400");

      setState(prev => ({
          ...prev,
          inventory: newInv,
          score: prev.score + scoreAdd,
      }));
      
      // Proceed
      proceedToDevilOrDraw(state.round, state.currentOptions);
  };

  const proceedToDevilOrDraw = (roundNum: number, options: SpiritOption[]) => {
      // Check Devil (R2 / R4) - 90% chance
      const isDevilRound = (roundNum === 2 || roundNum === 4);
      const isDevilTrigger = isDevilRound && Math.random() < 0.9;

      if (isDevilTrigger) {
           playSound.error();
           const contracts = [...DEVIL_CONTRACT_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
           addLog(`=== 第 ${roundNum} 回合 ===`, "text-blue-300");
           addLog("😈 恶魔降临! 请选择一份契约。", "text-red-500");
           
           setState(prev => ({ 
               ...prev, 
               round: roundNum,
               phase: 'EVENT_DEVIL', 
               currentOptions: options, 
               currentDevilOptions: contracts,
               previewOptions: undefined 
            }));
      } else {
          playSound.event();
          addLog(`=== 第 ${roundNum} 回合 ===`, "text-blue-300");
          addLog("请选择一个精灵进行共鸣。");
          setState(prev => ({ 
              ...prev, 
              round: roundNum,
              phase: 'DRAW_PHASE',
              currentOptions: options,
              previewOptions: undefined
           }));
      }
  };

  // --- Interaction Handlers ---

  const handleDraw = (option: SpiritOption) => {
      playSound.select();
      
      const skillsToAcquire: {skillId: string, rank: Rank}[] = [];

      if (option.type === 'RARE' || option.type === 'DIVINE') {
          skillsToAcquire.push(...option.skills);
      } else {
          const shuffled = [...option.skills].sort(() => Math.random() - 0.5);
          skillsToAcquire.push(shuffled[0], shuffled[1]);
      }

      setState(prev => ({
          ...prev,
          phase: 'DRAW_RESULT',
          acquisitionQueue: skillsToAcquire
      }));
  };

  const handleReplaceDecision = (action: 'DISCARD_NEW' | 'REPLACE_OLD', targetSkillId?: string) => {
      if (!state.pendingReplaceSkill) return;

      if (action === 'DISCARD_NEW') {
          addLog("放弃了新技能。", "text-gray-400");
          setState(prev => ({
              ...prev,
              phase: 'DRAW_RESULT', 
              pendingReplaceSkill: undefined,
              acquisitionQueue: prev.acquisitionQueue.slice(1)
          }));
      } else if (action === 'REPLACE_OLD' && targetSkillId) {
          const oldSkill = SKILLS.find(s => s.id === targetSkillId);
          addLog(`遗忘了 ${oldSkill?.name}，腾出了空间。`, "text-gray-400");
          
          const newInv = { ...state.inventory };
          delete newInv[targetSkillId];
          
          const res = calculateAcquisitionResult(newInv, state.pendingReplaceSkill.skillId, state.pendingReplaceSkill.rank);
          
          addLog(res.message, "text-yellow-400");
          playSound.levelUp();

          setState(prev => ({
              ...prev,
              phase: 'DRAW_RESULT',
              inventory: res.newInventory,
              score: prev.score + res.scoreDelta,
              pendingReplaceSkill: undefined,
              acquisitionQueue: prev.acquisitionQueue.slice(1)
          }));
      }
  };

  const handleDevilContractClick = (contract: DevilContractData) => {
    if (contract.requiresTarget) {
      if (Object.keys(state.inventory).length === 0) {
        addLog("你没有技能可供献祭/操作！", "text-red-500");
        return;
      }
      setState(prev => ({ 
        ...prev, 
        phase: 'DEVIL_TARGET_SELECTION', 
        pendingContractId: contract.id 
      }));
      addLog(`请点击下方技能栏，选择一个技能用于 [${contract.name}]`, "text-yellow-300 animate-pulse");
      return;
    }

    let newScore = state.score;
    let newInventory = { ...state.inventory };
    let logMsg = "";
    let queueToAdd: PendingSkill[] = [];

    switch(contract.id) {
      case 'alchemy': 
        const keys = Object.keys(newInventory);
        if (keys.length > 0) {
          const targetId = keys[Math.floor(Math.random() * keys.length)];
          const target = newInventory[targetId];
          const nextR = getNextRank(target.rank);
          if (nextR !== 'OVERFLOW') {
            const res = calculateAcquisitionResult(newInventory, targetId, nextR);
            newInventory = res.newInventory;
            newScore += res.scoreDelta;
            logMsg = `点石成金: ${res.message}`;
          } else {
            newScore += SCORES.OVERFLOW_DIVINE;
            logMsg = `点石成金: 目标已是最高阶，转化为分数 +${SCORES.OVERFLOW_DIVINE}`;
          }
        } else {
          logMsg = "没有技能可强化...";
        }
        break;

      case 'gift': 
        const counts = { FIRE: 0, WATER: 0, GRASS: 0 };
        Object.keys(newInventory).forEach(k => {
           const s = SKILLS.find(sk => sk.id === k);
           if(s) counts[s.element]++;
        });
        const minVal = Math.min(...Object.values(counts));
        const elements = (['FIRE', 'WATER', 'GRASS'] as const).filter(e => counts[e] === minVal);
        const chosenEl = elements[Math.floor(Math.random() * elements.length)];
        const elSkills = getSkillsByElement(chosenEl);
        const giftSkill = elSkills[Math.floor(Math.random() * elSkills.length)];
        
        queueToAdd.push({ skillId: giftSkill.id, rank: 'LV2' });
        logMsg = `流派馈赠: 获得 ${giftSkill.name} (LV2)...`;
        break;

      case 'greed': 
        newScore = Math.floor(newScore * 0.5);
        const greedSkill = getRandomSkill();
        queueToAdd.push({ skillId: greedSkill.id, rank: 'LV4' });
        logMsg = `贪婪契约: 分数减半! 获得 ${greedSkill.name} (LV4)...`;
        break;

      case 'last_stand': 
        const killKeys = Object.keys(newInventory);
        if (killKeys.length > 0) {
          const toKill = killKeys[Math.floor(Math.random() * killKeys.length)];
          delete newInventory[toKill];
          const killName = SKILLS.find(s => s.id === toKill)?.name;
          logMsg = `破釜沉舟: 失去了 ${killName}. `;
          
          Object.keys(newInventory).forEach(k => {
            const t = newInventory[k];
            const nR = getNextRank(t.rank);
            if (nR !== 'OVERFLOW') {
              newInventory[k].rank = nR;
              logMsg += `[${SKILLS.find(s => s.id === k)?.name} -> ${nR}] `;
            }
          });
        } else {
          logMsg = "没有技能可供献祭...";
        }
        break;
    }

    if (queueToAdd.length > 0) {
         addLog(logMsg, "text-yellow-300");
         setState(prev => ({
            ...prev,
            score: newScore, 
            phase: 'DRAW_RESULT', 
            acquisitionQueue: queueToAdd,
            pendingContractId: undefined
         }));
    } else {
         finalizeDevilTurn(newInventory, newScore, logMsg);
    }
  };

  const handleInventoryClick = (skillId: string) => {
    if (state.phase === 'REPLACE_SKILL') {
        handleReplaceDecision('REPLACE_OLD', skillId);
        return;
    }

    if (state.phase !== 'DEVIL_TARGET_SELECTION' || !state.pendingContractId) return;

    let newInventory = { ...state.inventory };
    let newScore = state.score;
    let logMsg = "";
    
    const targetSkill = SKILLS.find(s => s.id === skillId);
    if (!targetSkill) return;

    if (state.pendingContractId === 'void') {
      const currentRank = newInventory[skillId].rank;
      delete newInventory[skillId];
      
      let newSkill = getRandomSkill();
      while (newSkill.id === skillId) { newSkill = getRandomSkill(); }
      
      const res = calculateAcquisitionResult(newInventory, newSkill.id, currentRank);
      newInventory = res.newInventory;
      newScore += res.scoreDelta;
      logMsg = `虚空重构: ${targetSkill.name} 变为 ${newSkill.name} (${currentRank}).`;

    } else if (state.pendingContractId === 'mirror') {
      const currentRank = newInventory[skillId].rank;
      const res = calculateAcquisitionResult(newInventory, skillId, currentRank);
      newInventory = res.newInventory;
      newScore += res.scoreDelta;
      logMsg = `复制镜像: ${res.message}`;
    }

    finalizeDevilTurn(newInventory, newScore, logMsg);
  };

  const finalizeDevilTurn = (inv: Record<string, PlayerSkillState>, sc: number, msg: string) => {
    playSound.levelUp();
    addLog(msg, "text-yellow-300");
    setState(prev => ({
      ...prev,
      inventory: inv,
      score: sc,
      phase: 'DRAW_PHASE',
      pendingContractId: undefined
    }));
  };

  useEffect(() => {
      if (state.phase === 'DRAW_RESULT' && state.acquisitionQueue.length === 0) {
          const timeout = setTimeout(() => {
              if (state.round < 5) {
                  startRound(state.round + 1);
              } else {
                  endGame(state.inventory, state.score);
              }
          }, 1500);
          return () => clearTimeout(timeout);
      }
  }, [state.phase, state.acquisitionQueue.length, state.round]);


  const endGame = (finalInventory: Record<string, PlayerSkillState>, rawScore: number) => {
      let finalScore = rawScore;
      addLog("=== 最终结算 ===", "text-purple-300");

      ['FIRE', 'WATER', 'GRASS'].forEach(el => {
          const elSkills = getSkillsByElement(el);
          const ownedStates = elSkills.map(s => finalInventory[s.id]).filter((s): s is PlayerSkillState => !!s);
          
          // Simplified Rule: Just need 3 skills
          if (ownedStates.length === 3) {
              finalScore += SCORES.COLLECTION_COMPLETE;
              addLog(`${ELEMENT_NAMES[el as any]}系 集结成功! +${SCORES.COLLECTION_COMPLETE}`, getElementColor(el as any).split(' ')[0] + " text-white");
          }
      });

      setState(prev => ({
          ...prev,
          score: finalScore,
          inventory: finalInventory,
          phase: 'GAME_OVER'
      }));
      playSound.legendary();
  };

  const getTitle = (score: number) => {
      if (score >= 23000) return "驯兽巅峰神话·裂空斩界的狂拽战皇·万灵至尊传说精灵王";
      if (score > 15000) return "踏碎穹苍的不羁战神·灵宠无上宗师";
      if (score > 10000) return "狂霸酷炫超神驯兽大师";
      if (score > 5000) return "精英训练家";
      return "新人训练家";
  };

  // --- Render Helpers ---

  const renderInventory = () => {
    const collections: string[] = [];
    ['FIRE', 'WATER', 'GRASS'].forEach(el => {
        const elSkills = getSkillsByElement(el);
        const ownedCount = elSkills.filter(s => state.inventory[s.id]).length;
        if (ownedCount === 3) collections.push(el);
    });

    return (
      <div className="w-full max-w-md mx-auto mt-2 p-1 bg-gray-800 rounded-lg border-2 border-gray-600">
        <div className="text-[10px] text-gray-400 text-center mb-1 flex justify-between px-2">
            <span>{Object.keys(state.inventory).length}/6</span>
            <span>
              {collections.length > 0 ? (
                <span className="text-yellow-400 animate-pulse">
                  ★ 羁绊: {collections.map(c => ELEMENT_NAMES[c as any]).join(' ')} ★
                </span>
              ) : "收集流派获得加成"}
            </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
         {[0,1,2,3,4,5].map(idx => {
             const keys = Object.keys(state.inventory);
             const skillId = keys[idx];
             
             if (skillId) {
                 const skill = SKILLS.find(s => s.id === skillId);
                 const owned = state.inventory[skillId];
                 const isCollected = skill && collections.includes(skill.element);
                 const isReplaceTarget = state.phase === 'REPLACE_SKILL';
                 const isDevilTarget = state.phase === 'DEVIL_TARGET_SELECTION';
                 
                 return (
                   <div key={skillId} className={`relative ${isCollected ? 'ring-1 ring-white rounded-lg' : ''}`}>
                     <SkillBadge 
                       skill={skill!} 
                       rank={owned.rank} 
                       size="mini"
                       onClick={() => handleInventoryClick(skillId)}
                       className={(isReplaceTarget || isDevilTarget) ? 'animate-bounce border-yellow-400 cursor-pointer hover:bg-gray-700' : ''}
                     />
                     {isReplaceTarget && (
                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none text-red-500 font-bold text-xs">替换</div>
                     )}
                   </div>
                 );
             } else {
                 return (
                     <div key={`empty-${idx}`} className="h-12 bg-gray-900/50 rounded border border-gray-800 flex items-center justify-center">
                         <span className="text-gray-700 text-xs">空</span>
                     </div>
                 );
             }
         })}
        </div>
      </div>
    );
  };

  const renderOptionPreview = (opt: SpiritOption) => {
    return (
        <div key={opt.id} className={`
             flex flex-col items-center p-1 rounded border w-24 min-h-[100px] opacity-90
             ${opt.type === 'DIVINE' ? 'bg-yellow-900/30 border-yellow-500' : 
               opt.type === 'RARE' ? 'bg-purple-900/30 border-purple-500' : 
               'bg-gray-700/30 border-gray-500'}
        `}>
            <div className="text-xs mb-1 font-bold">
                {opt.type === 'DIVINE' ? '👑 神圣' : opt.type === 'RARE' ? '✨ 稀有' : '📦 普通'}
            </div>
            
            <div className="flex flex-col gap-1 w-full">
               {opt.skills.map((s, i) => {
                   const sk = SKILLS.find(k => k.id === s.skillId);
                   if (!sk) return null;
                   return (
                       <div key={i} className={`flex items-center text-[8px] px-1 rounded ${getElementColor(sk.element)}`}>
                           <span className="mr-1">{s.rank}</span>
                           <span className="truncate">{sk.name}</span>
                       </div>
                   )
               })}
            </div>
        </div>
    );
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col items-center overflow-hidden font-vt323 relative">
        {/* Header */}
        <div className="w-full bg-red-600 border-b-4 border-red-800 p-2 shadow-lg z-10 flex justify-between items-center px-4 shrink-0 h-16">
            <div className="flex flex-col">
                <span className="text-[10px] text-red-200">回合</span>
                <span className="text-xl font-pixel">{state.phase === 'GAME_OVER' ? 'END' : state.round}/5</span>
            </div>
            <div className="text-center">
                <div className={`text-xs px-2 py-1 rounded-full ${state.phase === 'EVENT_DEVIL' || state.phase === 'DEVIL_TARGET_SELECTION' ? 'bg-red-900 animate-pulse' : 'bg-black/20'}`}>
                    {state.phase === 'REPLACE_SKILL' ? '空间不足' :
                     state.phase === 'EVENT_DEVIL' ? '恶魔降临' : 
                     state.phase === 'DEVIL_TARGET_SELECTION' ? '选择目标' :
                     state.phase === 'EVENT_RABBIT_MODAL' ? '魔兔降临' : 
                     state.phase === 'R0_SELECTION' ? '初始选择' :
                     state.phase === 'DRAW_PHASE' ? '抽取' :
                     state.phase === 'GAME_OVER' ? '结束' : '...'}
                </div>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-[10px] text-red-200">分数</span>
                <span className="text-xl font-pixel text-yellow-300">{state.score}</span>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-2xl flex flex-col justify-center items-center p-4 relative overflow-y-auto">
            
            {state.phase === 'START' && (
                <div className="text-center animate-bounce">
                    <h1 className="text-4xl text-yellow-400 font-pixel mb-8 px-4 leading-normal">
                        元素精灵<br/>模拟器
                    </h1>
                    <button 
                        onClick={startGame}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded pixel-border font-pixel"
                    >
                        开始游戏
                    </button>
                    <p className="mt-4 text-gray-500 text-sm">V10.3 LV System</p>
                </div>
            )}

            {state.phase === 'R0_SELECTION' && (
                <div className="flex flex-col items-center w-full">
                    <h2 className="text-lg mb-4">选择你的初始伙伴</h2>
                    <div className="flex gap-4 mb-6">
                        {state.starterChoices?.map((choice) => (
                            <button
                                key={choice.element}
                                onClick={() => selectStarter(choice)}
                                className={`w-28 h-40 rounded-lg border-4 flex flex-col items-center justify-between p-2 transform hover:scale-105 transition-transform ${getElementColor(choice.element)}`}
                            >
                                <div className="text-3xl mt-2">
                                    {choice.element === 'FIRE' ? '🔥' : choice.element === 'WATER' ? '💧' : '🌿'}
                                </div>
                                
                                {/* Skill Preview Badge */}
                                <div className="w-full bg-black/30 rounded p-1 mt-1">
                                    <div className="text-[10px] text-center font-bold">{choice.skill.name}</div>
                                    <div className="text-[8px] text-center text-white/80">LV1</div>
                                </div>

                                <span className="text-xs font-bold mb-1">{ELEMENT_NAMES[choice.element]}</span>
                            </button>
                        ))}
                    </div>
                    {state.previewOptions && (
                        <div className="w-full max-w-md bg-black/40 p-2 rounded-lg border border-gray-600">
                            <h3 className="text-[10px] text-gray-300 text-center mb-2 uppercase tracking-widest">- 第一轮 (R1) 遭遇预告 -</h3>
                            <div className="grid grid-cols-4 gap-2">
                                {state.previewOptions.map(opt => renderOptionPreview(opt))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Rabbit Modal */}
            {state.phase === 'EVENT_RABBIT_MODAL' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-pink-900/90 border-4 border-pink-400 p-6 rounded-xl max-w-xs text-center shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                         <div className="text-6xl mb-4 animate-bounce">🐇</div>
                         <h2 className="text-2xl font-pixel text-pink-300 mb-2">魔兔降临!</h2>
                         <p className="text-white mb-6">魔兔对你释放了祝福魔法！<br/>随机升级一个技能。</p>
                         <button 
                             onClick={executeRabbitUpgrade}
                             className="bg-pink-600 hover:bg-pink-500 text-white px-6 py-3 rounded font-bold border-b-4 border-pink-800 active:border-b-0 active:translate-y-1"
                         >
                             接受祝福
                         </button>
                    </div>
                </div>
            )}

            {state.phase === 'REPLACE_SKILL' && state.pendingReplaceSkill && (
                <div className="flex flex-col items-center w-full px-4 animate-in fade-in zoom-in duration-300">
                    <div className="bg-red-900/80 border-2 border-red-500 p-4 rounded-lg text-center max-w-sm w-full shadow-2xl">
                        <h2 className="text-lg font-bold mb-2">⚠ 技能槽已满</h2>
                        <div className="text-sm mb-4">新技能无法放入。请选择：</div>
                        
                        <div className="bg-black/30 p-2 rounded mb-4">
                            <div className="text-xs text-gray-400 mb-1">新获得技能</div>
                            {(() => {
                                const sk = SKILLS.find(s => s.id === state.pendingReplaceSkill!.skillId);
                                if (!sk) return null;
                                return <SkillBadge skill={sk} rank={state.pendingReplaceSkill!.rank} />;
                            })()}
                        </div>

                        <div className="flex gap-2 justify-center">
                            <button 
                                onClick={() => handleReplaceDecision('DISCARD_NEW')}
                                className="bg-gray-600 px-4 py-2 rounded text-sm hover:bg-gray-500"
                            >
                                放弃新技能
                            </button>
                        </div>
                        <div className="mt-4 text-xs text-yellow-300 animate-pulse">
                            或者点击下方技能栏中的旧技能进行替换
                        </div>
                    </div>
                </div>
            )}

            {(state.phase === 'EVENT_DEVIL' || state.phase === 'DEVIL_TARGET_SELECTION') && (
                <div className="flex flex-col items-center w-full px-2">
                    <div className="text-5xl mb-2 animate-bounce">😈</div>
                    <h2 className="text-lg text-red-400 mb-4 font-bold">
                      {state.phase === 'DEVIL_TARGET_SELECTION' ? '选择一个目标技能' : '黑暗契约'}
                    </h2>
                    
                    {state.phase === 'EVENT_DEVIL' && state.currentDevilOptions && (
                        <div className="grid grid-cols-1 gap-2 w-full max-w-md">
                            {state.currentDevilOptions.map(contract => (
                                <button
                                    key={contract.id}
                                    onClick={() => handleDevilContractClick(contract)}
                                    className="bg-gray-800 border border-red-900 p-3 rounded hover:bg-gray-700 text-left group flex flex-col relative overflow-hidden"
                                >
                                    <div className="flex justify-between">
                                      <span className="font-bold text-red-300 group-hover:text-red-100">{contract.name}</span>
                                      {contract.requiresTarget && <span className="text-[10px] bg-red-900 px-1 rounded text-white self-center">需指定</span>}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">{contract.description}</div>
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {state.phase === 'DEVIL_TARGET_SELECTION' && (
                       <div className="text-center text-sm text-yellow-200 animate-pulse mb-8">
                          请在下方技能栏点击一个技能
                       </div>
                    )}
                </div>
            )}

            {state.phase === 'DRAW_PHASE' && (
                <div className="grid grid-cols-2 gap-2 w-full px-2 auto-rows-fr">
                    {state.currentOptions.map((opt, idx) => (
                        <button
                            key={opt.id}
                            onClick={() => handleDraw(opt)}
                            className={`
                                relative p-2 rounded-xl border-4 flex flex-col items-center gap-1 transition-all hover:-translate-y-1 active:translate-y-1 overflow-hidden
                                ${opt.type === 'DIVINE' ? 'bg-yellow-900 border-yellow-500' : 
                                  opt.type === 'RARE' ? 'bg-purple-900 border-purple-500' : 
                                  'bg-gray-700 border-gray-500'}
                            `}
                        >
                            <div className="flex justify-between w-full items-center px-1">
                                <span className="text-2xl">{opt.type === 'DIVINE' ? '👑' : opt.type === 'RARE' ? '✨' : '📦'}</span>
                                <span className="text-[10px] font-bold bg-black/40 px-1 rounded">
                                  {opt.type === 'COMMON' ? '随机2个' : '获得所有'}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-1 w-full mt-1">
                                {opt.skills.map((s, i) => {
                                   const skillInfo = SKILLS.find(sk => sk.id === s.skillId);
                                   if (!skillInfo) return null;
                                   return (
                                     <SkillBadge 
                                       key={i} 
                                       skill={skillInfo} 
                                       rank={s.rank} 
                                       size="mini" 
                                       className="bg-black/20 border-white/20"
                                     />
                                   );
                                })}
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
            {state.phase === 'DRAW_RESULT' && (
                 <div className="flex flex-col items-center justify-center animate-pulse">
                     <h2 className="text-2xl text-yellow-300">
                        {state.acquisitionQueue.length > 0 ? "处理中..." : "获得力量中..."}
                     </h2>
                 </div>
            )}

            {state.phase === 'GAME_OVER' && (
                <div className="text-center p-4 bg-gray-800 rounded-xl border-4 border-yellow-600 mx-2 w-full max-w-md">
                    <h2 className="text-2xl font-pixel text-yellow-400 mb-2">游戏结束</h2>
                    <div className="text-lg mb-2">最终得分: {state.score}</div>
                    <div className="mb-4 p-3 bg-black/30 rounded border border-gray-600">
                        <div className="text-xs text-gray-400 mb-1">获得称号</div>
                        <div className="text-md font-bold text-green-300 leading-tight">
                            {getTitle(state.score)}
                        </div>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="bg-white text-black px-6 py-2 font-bold font-pixel hover:bg-gray-200"
                    >
                        再玩一次
                    </button>
                </div>
            )}
        </div>

        {/* Bottom Section */}
        <div className="w-full max-w-2xl bg-gray-800 border-t-4 border-gray-600 shrink-0 flex flex-col pb-safe">
             {/* Log Box */}
             <div 
                ref={scrollRef}
                className="h-20 bg-gray-900 m-2 p-2 rounded border-2 border-gray-500 overflow-y-auto font-mono text-xs shadow-inner"
             >
                 {state.logs.map(log => (
                     <div key={log.id} className={`mb-1 ${log.color || 'text-gray-300'}`}>
                         {'> '}{log.text}
                     </div>
                 ))}
             </div>
             
             {/* Inventory */}
             {state.phase !== 'START' && (
               <div className="px-2 pb-2">
                 {renderInventory()}
               </div>
             )}
        </div>
    </div>
  );
};

// --- Initialization ---

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}