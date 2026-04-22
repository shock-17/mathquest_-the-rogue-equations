import React, { useEffect, useState } from 'react';
import { TriviaQuestion, NodeType, Item, ItemType, Difficulty, RunModifier, Language } from '../types';
import { generateQuestion } from '../services/geminiService';
import { playSound } from '../services/soundService';
import { Heart, Skull, Sparkles, Zap, Clock } from 'lucide-react';
import { ENEMY_STATS, BASE_PLAYER_DAMAGE, UI_TEXT } from '../constants';
import { ASSETS } from '../assets';

interface QuizViewProps {
  nodeType: NodeType;
  layer: number;
  difficulty: Difficulty;
  playerHp: number;
  maxPlayerHp: number;
  playerAttack: number;
  inventory: Item[];
  onVictory: () => void;
  onDamage: (amount: number) => void;
  onUseItem: (item: Item) => void;
  modifiers: RunModifier[];
  language: Language;
  usedQuestions: string[];
  onQuestionSeen: (question: string) => void;
}

type Phase = 'MENU' | 'FIGHT_SELECT' | 'ITEM_SELECT' | 'QUESTION' | 'ENEMY_TURN' | 'WIN';

const QuizView: React.FC<QuizViewProps> = ({ 
  nodeType, 
  layer, 
  difficulty,
  playerHp, 
  maxPlayerHp,
  playerAttack,
  inventory,
  onVictory, 
  onDamage,
  onUseItem,
  modifiers,
  language,
  usedQuestions,
  onQuestionSeen
}) => {
  const maxEnemyHp = ENEMY_STATS[nodeType].hp;
  const enemyAtk = ENEMY_STATS[nodeType].damage;
  const ui = UI_TEXT[language];

  const [enemyHp, setEnemyHp] = useState(maxEnemyHp);
  const [phase, setPhase] = useState<Phase>('MENU');
  const [question, setQuestion] = useState<TriviaQuestion | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0); // For menu navigation
  const [dialogue, setDialogue] = useState(language === Language.INDONESIAN ? "Musuh mendekat!" : "The enemy draws near!");
  const [playerAction, setPlayerAction] = useState<'idle' | 'attack' | 'damage'>('idle');
  const [enemyAction, setEnemyAction] = useState<'idle' | 'attack' | 'damage'>('idle');
  const [timer, setTimer] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  
  // Visual Effects State
  const [activeEffect, setActiveEffect] = useState<'none' | 'heal' | 'magic' | 'hit'>('none');
  const [flash, setFlash] = useState(false);

  // Menu Options
  const MENU_OPTIONS = [ui.fight, ui.item]; 

  const getTimerDuration = () => {
    let base = 15;
    if (nodeType === NodeType.ELITE) base = 10;
    if (nodeType === NodeType.BOSS) base = 6;

    if (modifiers.includes(RunModifier.HARDCORE)) base = Math.max(3, base * 0.7);
    if (modifiers.includes(RunModifier.EASY_MODE)) base *= 1.5;

    return Math.floor(base);
  };

  // Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'QUESTION' && timer > 0) {
        interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleAnswer(-1); // Time out
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase, timer]);

  // Loading question
  const loadQuestion = async () => {
    setDialogue(ui.generating);
    // Short artificial delay for effect, but rely on generation time mostly
    const q = await generateQuestion(difficulty, layer, nodeType, language, usedQuestions);
    setQuestion(q);
    onQuestionSeen(q.question);
    
    const time = getTimerDuration();
    setTimer(time);
    setMaxTime(time);
    
    setPhase('QUESTION');
    setDialogue(ui.solve);
    playSound.menuSelect();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'MENU') {
        if (e.key === 'ArrowRight') {
            setSelectedIdx(prev => Math.min(prev + 1, MENU_OPTIONS.length - 1));
            playSound.menuMove();
        }
        if (e.key === 'ArrowLeft') {
            setSelectedIdx(prev => Math.max(prev - 1, 0));
            playSound.menuMove();
        }
        if (e.key === 'Enter' || e.key === ' ') {
            playSound.menuSelect();
            if (MENU_OPTIONS[selectedIdx] === 'FIGHT') loadQuestion();
            if (MENU_OPTIONS[selectedIdx] === 'ITEM') setPhase('ITEM_SELECT');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, selectedIdx, question]);

  const handleAnswer = (idx: number, isSkip: boolean = false) => {
    // If timed out (idx === -1), treat as wrong
    if (!question && idx !== -1) return;
    
    if (isSkip || (question && idx === question.correctIndex)) {
        // Correct
        setPhase('ENEMY_TURN'); // Block input
        playSound.attack();
        setPlayerAction('attack');
        setEnemyAction('damage'); // Enemy recoils
        
        // Calc damage
        let damage = BASE_PLAYER_DAMAGE + playerAttack;
        let isCrit = false;

        // Critical Hit Chance (20%)
        if (Math.random() < 0.2) {
            damage *= 2;
            isCrit = true;
            playSound.victory(); // Use victory sound for crit impact
        }

        const msg = isSkip 
            ? `${ui.skipped} ${ui.dealt} ${damage} ${ui.dmg}.` 
            : (isCrit ? `${ui.critical} ${ui.dealt} ${damage} ${ui.dmg}!` : `${ui.dealt} ${damage} ${ui.dmg}.`);
        
        setDialogue(msg);
        if (isCrit) setActiveEffect('magic'); // Reuse magic effect for crit visual

        setEnemyHp(prev => Math.max(0, prev - damage));

        setTimeout(() => {
            setPlayerAction('idle');
            setEnemyAction('idle');
            setActiveEffect('none');
            
            // Check win condition
            if (enemyHp - damage <= 0) {
                setPhase('WIN');
                playSound.victory();
                setDialogue(ui.won);
                setTimeout(onVictory, 2000);
            } else {
                setPhase('MENU');
                setDialogue(ui.enemyTurn);
            }
        }, 1000);

    } else {
        // Wrong - Enemy Attacks
        setPhase('ENEMY_TURN');
        setDialogue(idx === -1 ? ui.timeUp : `${ui.wrong} ${question?.options[question.correctIndex]}.`);
        
        setTimeout(() => {
            // Trigger Enemy Attack Animation
            setEnemyAction('attack');
            playSound.attack(); // Enemy Swing Sound
            
            setTimeout(() => {
                // Player takes damage after swipe
                triggerHitEffect();
                onDamage(enemyAtk);
                setEnemyAction('idle');

                setTimeout(() => {
                    setPlayerAction('idle');
                    setPhase('MENU');
                    setDialogue(ui.ready);
                }, 1000);
            }, 300); // Sync damage with middle of lunge
        }, 800);
    }
  };

  const triggerHitEffect = () => {
      playSound.damage();
      setPlayerAction('damage');
      setFlash(true);
      setActiveEffect('hit');
      setTimeout(() => {
          setFlash(false);
          setActiveEffect('none');
      }, 500);
  };

  const handleItemUse = (item: Item) => {
     if (item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) {
         setDialogue(ui.equipMap);
         return;
     }
     
     if (item.type === ItemType.POTION_HEAL) {
        setActiveEffect('heal');
        playSound.heal();
        setDialogue(`${ui.used} ${item.name}!`);
        onUseItem(item);
        setTimeout(() => {
            setActiveEffect('none');
            setPhase('MENU');
        }, 1000);
     } else if (item.type === ItemType.SCROLL_SKIP) {
        setActiveEffect('magic');
        playSound.heal(); // Use heal sound for magic buff too
        setDialogue(`${ui.used} ${item.name}!`);
        onUseItem(item); // Remove from inv
        
        // Treat as correct answer after animation
        setTimeout(() => {
            setActiveEffect('none');
            
            if (!question) {
                 // Create dummy correct state
                 setQuestion({
                     question: "Skipped",
                     options: [],
                     correctIndex: 0,
                     explanation: "",
                     difficulty: 1
                 });
                 handleAnswer(0, true);
            } else {
                handleAnswer(question.correctIndex, true);
            }
        }, 1000);
     } else if (item.type === ItemType.BOMB) {
        setActiveEffect('hit'); // Use hit effect for explosion
        playSound.damage(); // Use damage sound for explosion
        setDialogue(`${ui.used} ${item.name}! BOOM!`);
        onUseItem(item); // Remove from inv
        
        const damage = item.value;
        setEnemyHp(prev => Math.max(0, prev - damage));
        setEnemyAction('damage');

        setTimeout(() => {
            setActiveEffect('none');
            setEnemyAction('idle');
            
            if (enemyHp - damage <= 0) {
                setPhase('WIN');
                playSound.victory();
                setDialogue(ui.won);
                setTimeout(onVictory, 2000);
            } else {
                setPhase('MENU');
                setDialogue(`${ui.dealt} ${damage} ${ui.dmg}!`);
            }
        }, 1000);
     }
  };

  return (
    <div className={`flex flex-col h-full w-full bg-black text-white p-4 font-pixel relative select-none overflow-hidden ${flash ? 'animate-flash-red' : ''}`}>
       
       {/* Visual Effects Layer */}
       {activeEffect === 'heal' && (
           <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex flex-col items-center">
               <Heart className="text-green-400 w-16 h-16 animate-float-up opacity-0" fill="currentColor" />
               <div className="text-green-400 text-4xl animate-float-up delay-100 opacity-0 font-bold">{ui.recovered}</div>
           </div>
       )}

       {activeEffect === 'magic' && (
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
               <Sparkles className="text-yellow-400 w-32 h-32 animate-spin-slow" />
               <div className="absolute inset-0 bg-yellow-400 opacity-20 animate-pulse rounded-full blur-xl"></div>
           </div>
       )}

       {activeEffect === 'hit' && (
            <div className="absolute top-1/2 left-1/4 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
                 <div className="text-red-600 text-6xl font-bold animate-shake">- {enemyAtk}</div>
            </div>
       )}

       {/* Battle Area */}
       <div className="flex-1 flex justify-between items-center px-4 md:px-20 relative">
          
          {/* Player */}
          <div className="flex flex-col items-center relative group">
             {/* Player Damage Flash Overlay */}
             {playerAction === 'damage' && <div className="absolute inset-0 bg-red-500 mix-blend-multiply opacity-50 rounded-full animate-pulse"></div>}
             
             <img 
                 src={ASSETS.hero} 
                 alt="Player" 
                 className={`w-24 h-24 md:w-32 md:h-32 object-contain transition-transform ${playerAction === 'attack' ? 'animate-player-attack' : ''}`}
                 referrerPolicy="no-referrer"
             />
             
             <div className="mt-4 flex gap-4 text-xl">
                 <div className="flex items-center gap-1 text-yellow-400">
                     <span>HP</span>
                     <div className="w-20 md:w-32 h-4 bg-red-900 border border-white relative">
                         <div className="h-full bg-yellow-400 transition-all duration-300" style={{width: `${(playerHp/maxPlayerHp)*100}%`}}></div>
                     </div>
                     <span className="text-sm md:text-base">{playerHp}/{maxPlayerHp}</span>
                 </div>
             </div>
          </div>

          {/* Enemy */}
          <div className="flex flex-col items-center relative">
              {/* Enemy Attack Effect */}
              {enemyAction === 'attack' && (
                  <div className="absolute top-1/2 -left-10 text-white text-6xl animate-slash z-50 opacity-0 pointer-events-none">
                      <Zap size={64} fill="white" className="rotate-90"/>
                  </div>
              )}

              <div className={`transition-transform duration-100 relative
                  ${enemyAction === 'damage' ? 'animate-[shake_0.2s_infinite]' : ''}
                  ${enemyAction === 'attack' ? 'animate-lunge' : 'animate-bounce-slow'}
              `}>
                <img 
                    src={nodeType === NodeType.BOSS ? ASSETS.boss : nodeType === NodeType.ELITE ? ASSETS.elite : ASSETS.enemy} 
                    alt="Enemy" 
                    className={`object-contain ${nodeType === NodeType.BOSS ? 'w-32 h-32 md:w-40 md:h-40 drop-shadow-glow' : 'w-24 h-24 md:w-32 md:h-32'}`}
                    referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-4 w-full flex flex-col items-center">
                  <div className="w-24 md:w-32 h-4 bg-gray-700 border border-white relative">
                       <div className="h-full bg-green-500 transition-all duration-300" style={{width: `${Math.max(0, (enemyHp/maxEnemyHp)*100)}%`}}></div>
                  </div>
                  <span className="text-white mt-1 text-lg">{enemyHp} / {maxEnemyHp} HP</span>
              </div>
          </div>
       </div>

       {/* Dialogue / Action Box */}
       <div className="min-h-[12rem] md:min-h-[16rem] w-full max-w-4xl mx-auto undertale-box p-4 md:p-6 text-xl md:text-2xl relative mb-4 z-10 flex flex-col">
           {phase === 'MENU' && (
               <div className="typewriter">{dialogue}</div>
           )}

           {phase === 'QUESTION' && question && (
               <div className="w-full flex-1 flex flex-col">
                   <div className="flex justify-between items-start mb-4">
                       <div className="text-lg md:text-3xl font-bold max-w-[80%]">{question.question}</div>
                       <div className={`flex items-center gap-2 text-xl md:text-2xl ${timer <= 5 ? 'text-red-500 animate-pulse' : 'text-yellow-400'}`}>
                           <Clock size={24} className="hidden md:block" /> {timer}s
                       </div>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mt-auto">
                       {question.options.map((opt, i) => (
                           <button 
                             key={i} 
                             onClick={() => handleAnswer(i)}
                             className="text-left hover:text-yellow-400 flex items-start gap-2 transition-colors border border-transparent hover:border-white p-2 text-base md:text-xl"
                           >
                               <span className="text-red-500 mt-1">*</span>
                               <span>{opt}</span>
                           </button>
                       ))}
                   </div>
               </div>
           )}

           {phase === 'ITEM_SELECT' && (
               <div className="flex flex-col h-full">
                   <h3 className="mb-2 border-b border-white">{ui.inventory}</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto flex-1 max-h-48">
                       {inventory.length === 0 && <div className="p-2 text-gray-500">{ui.empty}</div>}
                       {inventory.map((item, i) => (
                           <button key={i} onClick={() => handleItemUse(item)} className="text-left hover:text-yellow-400 p-2 flex justify-between items-center border border-transparent hover:border-gray-700">
                               <span className="text-base md:text-xl">* {item.name}</span>
                               <span className="text-xs text-gray-400 ml-2">{item.description}</span>
                           </button>
                       ))}
                   </div>
                   <button onClick={() => setPhase('MENU')} className="mt-4 text-gray-400 text-sm hover:text-white text-left">* {ui.back}</button>
               </div>
           )}
           
           {(phase === 'ENEMY_TURN' || phase === 'WIN') && (
               <div>{dialogue}</div>
           )}
       </div>

       {/* Bottom Menu Buttons */}
       <div className="flex justify-center gap-2 md:gap-4 text-2xl md:text-3xl pb-2">
           {MENU_OPTIONS.map((opt, i) => (
               <div 
                 key={opt}
                 className={`
                    border-2 px-6 py-2 cursor-pointer transition-colors uppercase
                    ${phase === 'MENU' && selectedIdx === i ? 'border-yellow-400 text-yellow-400 bg-gray-900' : 'border-orange-600 text-orange-600'}
                 `}
                 onClick={() => {
                     if (phase !== 'MENU') return;
                     setSelectedIdx(i);
                     playSound.menuSelect();
                     if (i === 0) loadQuestion();
                     if (i === 1) setPhase('ITEM_SELECT');
                 }}
               >
                  <div className="flex items-center gap-2">
                    {phase === 'MENU' && selectedIdx === i && <Heart className="w-5 h-5 fill-red-500 text-red-500 animate-blink" />}
                    {opt}
                  </div>
               </div>
           ))}
       </div>

       <style>{`
         .typewriter {
           overflow: hidden;
           white-space: nowrap;
           margin: 0 auto;
           animation: typing 1s steps(40, end);
         }
         @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        @keyframes lunge {
            0% { transform: translateX(0) scale(1); }
            40% { transform: translateX(-150px) scale(1.4) rotate(-10deg); }
            50% { transform: translateX(-150px) scale(1.4) rotate(0deg); }
            100% { transform: translateX(0) scale(1); }
        }
        @keyframes player-attack {
            0% { transform: translateX(0) scale(1); }
            40% { transform: translateX(100px) scale(1.2) rotate(10deg); }
            50% { transform: translateX(100px) scale(1.2) rotate(0deg); }
            100% { transform: translateX(0) scale(1); }
        }
        @keyframes float-up {
            0% { transform: translateY(0) scale(0.5); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
        }
        @keyframes flash-red {
            0%, 100% { box-shadow: inset 0 0 0 0 rgba(255,0,0,0); }
            50% { box-shadow: inset 0 0 100px 50px rgba(255,0,0,0.5); background-color: rgba(50,0,0,1); }
        }
        @keyframes slash {
            0% { transform: translateX(0) rotate(0); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(-50px) rotate(-45deg); opacity: 0; }
        }
        @keyframes bounce-slow {
             0%, 100% { transform: translateY(0); }
             50% { transform: translateY(-10px); }
        }
        .animate-lunge {
            animation: lunge 0.4s ease-out;
        }
        .animate-player-attack {
            animation: player-attack 0.4s ease-out;
        }
        .animate-float-up {
            animation: float-up 1s ease-out forwards;
        }
        .animate-flash-red {
            animation: flash-red 0.3s ease-in-out;
        }
        .animate-slash {
            animation: slash 0.3s ease-out;
        }
        .animate-bounce-slow {
            animation: bounce-slow 2s infinite ease-in-out;
        }
        .drop-shadow-glow {
            filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.5));
        }
       `}</style>
    </div>
  );
};

export default QuizView;
