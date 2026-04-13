import React, { useState } from 'react';
import Map from './components/Map';
import QuizView from './components/QuizView';
import EventNode from './components/EventNode';
import HUD from './components/HUD';
import InventoryView from './components/InventoryView';
import ShopView from './components/ShopView';
import LeaderboardView from './components/LeaderboardView';
import { GameState, MapNode, NodeType, Player, Item, ItemType, Difficulty, RunModifier, Language, LeaderboardEntry } from './types';
import { MAP_LAYERS, INITIAL_PLAYER, HEAL_AMOUNT_REST, MODIFIER_METADATA, BASE_PLAYER_DAMAGE, UI_TEXT } from './constants';
import { playSound } from './services/soundService';
import { Heart, Settings, X, Globe, Trophy } from 'lucide-react';
import { Analytics } from "@vercel/analytics/react"

// Generates Map. Supports partial regeneration from a specific layer.
const generateMap = (existingNodes: MapNode[] = [], startLayer: number = 0, modifiers: RunModifier[] = []): MapNode[] => {
  // Filter out nodes that are being regenerated (layer >= startLayer)
  const nodes: MapNode[] = existingNodes.filter(n => n.layer < startLayer);
  const layers = MAP_LAYERS;
  
  // 1. Generate Nodes
  for (let l = startLayer; l < layers; l++) {
      let count: number;
      if (l === 0 || l === layers - 1) {
          count = 1;
      } else {
          // Weighted random for 2, 3, or 4 nodes
          const rand = Math.random();
          if (rand < 0.3) count = 2;
          else if (rand < 0.8) count = 3;
          else count = 4;
      }

      // Add slight randomness to x positions to make it look less rigid
      const segment = 100 / count;
      
      for (let i = 0; i < count; i++) {
          let type = NodeType.ENEMY;
          
          if (l === layers - 1) {
              if (modifiers.includes(RunModifier.NO_BOSSES)) {
                  type = modifiers.includes(RunModifier.NO_ELITES) ? NodeType.ENEMY : NodeType.ELITE;
              } else {
                  type = NodeType.BOSS;
              }
          }
          else if (l === 0) type = NodeType.START;
          else if (l % 4 === 0) {
              type = modifiers.includes(RunModifier.NO_LOOT) ? NodeType.ENEMY : NodeType.TREASURE;
          }
          else if (l % 3 === 0 && i === 0) type = NodeType.REST;
          else if (l === 2 || l === 6) type = NodeType.SHOP; // Add Shops at specific layers
          else if (Math.random() > 0.75) {
              type = modifiers.includes(RunModifier.NO_ELITES) ? NodeType.ENEMY : NodeType.ELITE;
          }

          // Prevent duplicate shops on same layer if count > 1
          if (type === NodeType.SHOP && nodes.some(n => n.layer === l && n.type === NodeType.SHOP)) {
              type = NodeType.ENEMY;
          }

          // Calculate X with some jitter, keeping within bounds (10% - 90%)
          const baseX = (segment * i) + (segment / 2);
          const jitter = (Math.random() * 10) - 5; // +/- 5%
          const x = Math.max(10, Math.min(90, baseX + jitter));

          nodes.push({
              id: `node-${l}-${i}-${Date.now()}`, // Unique ID timestamp to prevent key collisions on reroll
              layer: l, type,
              x,
              y: 0, next: [], completed: false, locked: l !== 0
          });
      }
  }

  // 2. Connect Nodes
  // We need to connect from the layer before startLayer (if it exists) up to the second to last layer
  const connectStart = Math.max(0, startLayer - 1);

  for (let l = connectStart; l < layers - 1; l++) {
      const currentLayerNodes = nodes.filter(n => n.layer === l);
      const nextLayerNodes = nodes.filter(n => n.layer === l + 1);
      
      // Reset connections for the current layer we are processing
      currentLayerNodes.forEach(n => n.next = []);

      // Step A: Ensure every current node has at least one child
      currentLayerNodes.forEach(curr => {
          // Sort next layer nodes by distance to current node
          const sortedNext = [...nextLayerNodes].sort((a, b) => Math.abs(curr.x - a.x) - Math.abs(curr.x - b.x));
          
          // Connect to the closest one
          curr.next.push(sortedNext[0].id);

          // Chance to connect to 2nd closest (branching)
          if (sortedNext.length > 1 && Math.random() < 0.4) {
               // Only if it's not too far away
               if (Math.abs(curr.x - sortedNext[1].x) < 30) {
                   curr.next.push(sortedNext[1].id);
               }
          }
      });

      // Step B: Ensure every next node has at least one parent
      nextLayerNodes.forEach(next => {
          const hasParent = currentLayerNodes.some(curr => curr.next.includes(next.id));
          if (!hasParent) {
              // Find closest parent
              const sortedParents = [...currentLayerNodes].sort((a, b) => Math.abs(next.x - a.x) - Math.abs(next.x - b.x));
              const closestParent = sortedParents[0];
              
              // Add connection
              if (!closestParent.next.includes(next.id)) {
                  closestParent.next.push(next.id);
              }
          }
      });
  }
  
  if (startLayer === 0) {
      nodes.filter(n => n.layer === 0).forEach(n => n.locked = false);
  }
  return nodes;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [previousState, setPreviousState] = useState<GameState>(GameState.MENU);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [modifiers, setModifiers] = useState<RunModifier[]>([]);
  const [showModifiers, setShowModifiers] = useState(false);
  const [mapNodes, setMapNodes] = useState<MapNode[]>([]);
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [currentNode, setCurrentNode] = useState<MapNode | null>(null);
  const [language, setLanguage] = useState<Language>(Language.INDONESIAN);
  const hasSubmittedRef = React.useRef(false);

  const ui = UI_TEXT[language] || UI_TEXT.ENGLISH;

  const submitScore = async (finalPlayer: Player) => {
    try {
      const score = (finalPlayer.runStats.enemiesDefeated * 100) + 
                    (finalPlayer.runStats.goldEarned) + 
                    (finalPlayer.runStats.highestLayer * 50);
      
      const entry: LeaderboardEntry = {
          name: `Adventurer ${Math.floor(Math.random() * 10000)}`,
          score,
          layer: finalPlayer.runStats.highestLayer + 1,
          date: new Date().toISOString(),
          runId: finalPlayer.runStats.runId
      };
      
      // Save to Local Storage (Browser)
      const existing = localStorage.getItem('mathquest_leaderboard');
      let leaderboard: LeaderboardEntry[] = existing ? JSON.parse(existing) : [];
      
      // Deduplicate
      const isDuplicate = leaderboard.some(e => e.runId === entry.runId);
      if (!isDuplicate) {
          leaderboard.push(entry);
          leaderboard.sort((a, b) => b.score - a.score);
          leaderboard = leaderboard.slice(0, 10); // Keep top 10
          localStorage.setItem('mathquest_leaderboard', JSON.stringify(leaderboard));
      }
    } catch (e) {
      console.error("Failed to save score locally", e);
    }
  };

  // Handle Score Submission
  React.useEffect(() => {
      if ((gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          submitScore(player);
      }
  }, [gameState, player]);

  const startGame = () => {
    playSound.menuSelect();
    hasSubmittedRef.current = false;
    const newMap = generateMap([], 0, modifiers);
    setMapNodes(newMap);
    
    // Apply Modifiers to Player
    let initialPlayer = { ...INITIAL_PLAYER };
    
    // Reset Stats
    initialPlayer.runStats = {
        enemiesDefeated: 0,
        goldEarned: 0,
        startTime: Date.now(),
        highestLayer: 0,
        runId: `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    if (modifiers.includes(RunModifier.HALF_HP)) {
        initialPlayer.maxHp = Math.floor(initialPlayer.maxHp / 2);
        initialPlayer.hp = initialPlayer.maxHp;
    }
    if (modifiers.includes(RunModifier.GLASS_CANNON)) {
        initialPlayer.maxHp = Math.floor(initialPlayer.maxHp / 2);
        initialPlayer.hp = initialPlayer.maxHp;
        initialPlayer.attack += BASE_PLAYER_DAMAGE; // Double base damage
    }
    if (modifiers.includes(RunModifier.RICH_START)) {
        initialPlayer.gold += 100;
        initialPlayer.runStats.goldEarned += 100;
    }

    setPlayer(initialPlayer);
    setGameState(GameState.MAP);
  };

  const toggleModifier = (mod: RunModifier) => {
      setModifiers(prev => 
          prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
      );
      playSound.menuMove();
  };

  const handleNodeClick = (node: MapNode) => {
    setCurrentNode(node);
    setPlayer(prev => ({ 
        ...prev, 
        currentNodeId: node.id,
        runStats: {
            ...prev.runStats,
            highestLayer: Math.max(prev.runStats.highestLayer, node.layer)
        }
    }));
    if ([NodeType.ENEMY, NodeType.ELITE, NodeType.BOSS].includes(node.type)) {
        setGameState(GameState.QUIZ);
    } else if (node.type === NodeType.SHOP) {
        setGameState(GameState.SHOP);
    } else {
        setGameState(GameState.REWARD);
    }
  };

  const handleVictory = () => {
     if (!currentNode) return;
     const updated = mapNodes.map(n => n.id === currentNode.id ? { ...n, completed: true } : n);
     setMapNodes(updated);
     
     // Gold reward
     let goldReward = currentNode.type === NodeType.BOSS ? 150 : currentNode.type === NodeType.ELITE ? 75 : 30;
     
     if (modifiers.includes(RunModifier.DOUBLE_GOLD)) {
         goldReward *= 2;
     }

     setPlayer(prev => ({ 
         ...prev, 
         history: [...prev.history, currentNode.id],
         gold: prev.gold + goldReward,
         runStats: {
             ...prev.runStats,
             enemiesDefeated: prev.runStats.enemiesDefeated + 1,
             goldEarned: prev.runStats.goldEarned + goldReward
         }
     }));
     
     // Check if it was the last layer (Boss or Elite if NO_BOSSES)
     if (currentNode.layer === MAP_LAYERS - 1) {
         setPlayer(prev => ({ ...prev, runStats: { ...prev.runStats, endTime: Date.now() } }));
         setGameState(GameState.VICTORY);
     }
     else setGameState(GameState.MAP);
  };

  const handleDamage = (amount: number) => {
     // Apply Defense
     const actualDamage = Math.max(1, amount - player.defense);
     setPlayer(prev => {
         const hp = Math.max(0, prev.hp - actualDamage);
         if (hp === 0) {
             setTimeout(() => {
                 setPlayer(p => ({ ...p, runStats: { ...p.runStats, endTime: Date.now() } }));
                 setGameState(GameState.GAME_OVER);
             }, 1000);
         }
         return { ...prev, hp };
     });
  };

  const handleEventComplete = (item?: Item, heal?: boolean, loreId?: string) => {
      setPlayer(prev => {
          let p = { ...prev };
          if (heal) p.hp = Math.min(p.maxHp, p.hp + HEAL_AMOUNT_REST);
          if (item) p.inventory = [...p.inventory, item];
          if (loreId && !p.lore.includes(loreId)) p.lore = [...p.lore, loreId];
          p.history = [...p.history, currentNode!.id];
          return p;
      });
      if (currentNode) {
         setMapNodes(mapNodes.map(n => n.id === currentNode.id ? { ...n, completed: true } : n));
      }
      setGameState(GameState.MAP);
  };

  // Used during Quiz Phase for consumables
  const handleUseItemInBattle = (item: Item) => {
      if (item.type !== ItemType.POTION_HEAL && item.type !== ItemType.SCROLL_SKIP && item.type !== ItemType.BOMB) return;
      
      setPlayer(prev => {
          let p = { ...prev };
          if (item.type === ItemType.POTION_HEAL) {
              p.hp = Math.min(p.maxHp, p.hp + item.value);
          }
          // Remove used item
          p.inventory = p.inventory.filter(i => i.id !== item.id);
          return p;
      });
  };

  const handleEquipItem = (item: Item) => {
      playSound.menuSelect();
      setPlayer(prev => {
          let newInventory = [...prev.inventory];
          let currentWeapon = prev.equippedWeapon;
          let currentArmor = prev.equippedArmor;
          
          // Calculate Base Stats (Total - Equipped Bonuses)
          // Note: This assumes player.attack/defense currently holds Total Stats.
          let baseAttack = prev.attack - (currentWeapon ? currentWeapon.value : 0);
          let baseDefense = prev.defense - (currentArmor ? currentArmor.value : 0);

          if (item.type === ItemType.WEAPON) {
              // Unequip current if exists
              if (currentWeapon) {
                  newInventory.push(currentWeapon);
              }
              // Remove new item from inventory
              newInventory = newInventory.filter(i => i.id !== item.id);
              // Equip
              currentWeapon = item;
          } 
          else if (item.type === ItemType.ARMOR) {
               if (currentArmor) {
                  newInventory.push(currentArmor);
              }
              newInventory = newInventory.filter(i => i.id !== item.id);
              currentArmor = item;
          }
          
          // Recalculate Totals
          const newAttack = baseAttack + (currentWeapon ? currentWeapon.value : 0);
          const newDefense = baseDefense + (currentArmor ? currentArmor.value : 0);
          
          return {
              ...prev,
              inventory: newInventory,
              equippedWeapon: currentWeapon,
              equippedArmor: currentArmor,
              attack: newAttack,
              defense: newDefense
          };
      });
  };

  const handleUseItemFromInventory = (item: Item) => {
     if (item.type === ItemType.POTION_HEAL) {
         playSound.heal();
         setPlayer(prev => {
             const newHp = Math.min(prev.maxHp, prev.hp + item.value);
             return {
                 ...prev,
                 hp: newHp,
                 inventory: prev.inventory.filter(i => i.id !== item.id)
             };
         });
     } 
     else if (item.type === ItemType.SCROLL_REROLL) {
         playSound.heal(); // reusing magic sound
         setMapNodes(prevNodes => {
             const currentLayer = currentNode ? currentNode.layer : 0;
             const startGenLayer = currentLayer + 1;
             
             if (startGenLayer >= MAP_LAYERS) return prevNodes; 

             // Keep nodes up to current layer
             const keptNodes = prevNodes.filter(n => n.layer <= currentLayer);
             
             // Regenerate future
             return generateMap(keptNodes, startGenLayer, modifiers);
         });
         
         // Remove scroll
         setPlayer(prev => ({
             ...prev,
             inventory: prev.inventory.filter(i => i.id !== item.id)
         }));
     }
  };

  const handleShopBuy = (item: Item, cost: number) => {
      setPlayer(prev => ({
          ...prev,
          gold: prev.gold - cost,
          inventory: [...prev.inventory, item]
      }));
  };

  const handleShopLeave = () => {
      if (!currentNode) return;
      // Mark node complete
      setMapNodes(mapNodes.map(n => n.id === currentNode.id ? { ...n, completed: true } : n));
      setPlayer(prev => ({ ...prev, history: [...prev.history, currentNode.id] }));
      setGameState(GameState.MAP);
  };

  const toggleInventory = () => {
      if (gameState === GameState.INVENTORY) {
          setGameState(previousState);
      } else if (gameState === GameState.MAP) {
          setPreviousState(gameState);
          setGameState(GameState.INVENTORY);
      }
  };

  // UI Screens
  if (gameState === GameState.MENU) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-black text-white font-pixel p-4 overflow-y-auto">
              <h1 className="text-6xl mb-4 text-center animate-pulse text-yellow-500">{ui.title}</h1>
              <p className="mb-8 text-gray-400">{ui.subtitle}</p>
              
              <div className="flex flex-col gap-6 w-full max-w-md">
                  <div className="border border-gray-700 p-4">
                      <h3 className="text-xl text-center mb-2 text-yellow-400">{ui.difficulty}</h3>
                      <div className="flex justify-center gap-2">
                          {[Difficulty.EASY, Difficulty.MEDIUM, Difficulty.HARD].map((d) => (
                              <button 
                                key={d}
                                onClick={() => setDifficulty(d)}
                                className={`border px-3 py-2 text-sm hover:bg-white hover:text-black transition-colors ${difficulty === d ? 'border-yellow-400 text-yellow-400' : 'border-gray-500'}`}
                              >
                                  {d}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="border border-gray-700 p-4">
                      <h3 className="text-xl text-center mb-2 text-blue-400 flex items-center justify-center gap-2">
                          <Settings size={18} /> {ui.modifiers}
                      </h3>
                      <button 
                        onClick={() => setShowModifiers(true)}
                        className="w-full border border-gray-600 p-2 hover:bg-white hover:text-black transition-colors text-sm"
                      >
                          {modifiers.length > 0 ? `${modifiers.length} ${ui.active}` : ui.configure}
                      </button>
                  </div>

                  <div className="border border-gray-700 p-4">
                      <button 
                        onClick={() => setLanguage(l => l === Language.INDONESIAN ? Language.ENGLISH : Language.INDONESIAN)}
                        className="w-full flex items-center justify-center gap-2 hover:text-yellow-400"
                      >
                          <Globe size={18} />
                          {language === Language.INDONESIAN ? 'BAHASA: INDONESIA' : 'LANGUAGE: ENGLISH'}
                      </button>
                  </div>

                  <button 
                    onClick={() => setGameState(GameState.LEADERBOARD)}
                    className="border border-gray-700 p-4 w-full flex items-center justify-center gap-2 hover:text-yellow-400 hover:border-yellow-400 transition-colors"
                  >
                      <Trophy size={18} />
                      LEADERBOARD
                  </button>
                  
                  <button 
                    onClick={startGame}
                    className="mt-4 border-2 border-green-500 text-green-500 p-4 text-3xl hover:bg-green-500 hover:text-black animate-bounce w-full"
                  >
                      {ui.start}
                  </button>
              </div>

              {/* Modifiers Modal */}
              {showModifiers && (
                  <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
                      <div className="bg-gray-900 border-2 border-white w-full max-w-2xl max-h-[80vh] flex flex-col p-6 relative">
                          <button 
                            onClick={() => setShowModifiers(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                          >
                              <X size={32} />
                          </button>
                          
                          <h2 className="text-3xl text-center mb-6 text-blue-400 border-b border-gray-700 pb-4">{ui.runModifiers}</h2>
                          
                          <div className="overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
                              {Object.values(RunModifier).map((mod) => {
                                  const meta = MODIFIER_METADATA[mod] || { name: mod, description: 'Unknown', icon: '?' };
                                  const isActive = modifiers.includes(mod);
                                  return (
                                      <button 
                                        key={mod}
                                        onClick={() => toggleModifier(mod)}
                                        className={`border p-4 text-left transition-all flex items-start gap-3 group
                                            ${isActive ? 'border-green-400 bg-green-900/20' : 'border-gray-700 hover:border-white'}
                                        `}
                                      >
                                          <div className="text-3xl">{meta.icon}</div>
                                          <div>
                                              <div className={`font-bold mb-1 ${isActive ? 'text-green-400' : 'text-white'}`}>
                                                  {meta.name}
                                              </div>
                                              <div className="text-xs text-gray-400 group-hover:text-gray-300">
                                                  {meta.description}
                                              </div>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                          
                          <div className="mt-6 flex justify-end">
                              <button 
                                onClick={() => setShowModifiers(false)}
                                className="border border-white px-6 py-2 hover:bg-white hover:text-black"
                              >
                                  {ui.done}
                              </button>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  if (gameState === GameState.GAME_OVER) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-black text-white font-pixel">
             <Heart className="w-20 h-20 text-gray-800 mb-8" />
             <h1 className="text-6xl mb-4">{ui.gameOver}</h1>
             <p className="text-xl mb-8">{ui.refused}</p>
             
             <div className="bg-gray-900 p-6 rounded-lg border border-white mb-8 w-full max-w-md">
                <h2 className="text-2xl text-yellow-400 mb-4 border-b border-gray-700 pb-2">{ui.summary}</h2>
                <div className="flex justify-between mb-2">
                    <span>{ui.enemiesDefeated}:</span>
                    <span>{player.runStats?.enemiesDefeated || 0}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span>{ui.goldEarned}:</span>
                    <span>{player.runStats?.goldEarned || 0}</span>
                </div>
                <div className="flex justify-between mb-2">
                    <span>{ui.highestLayer}:</span>
                    <span>{(player.runStats?.highestLayer || 0) + 1}</span>
                </div>
                <div className="flex justify-between">
                    <span>{ui.timeTaken}:</span>
                    <span>{player.runStats?.endTime ? Math.floor((player.runStats.endTime - player.runStats.startTime) / 1000) : 0}s</span>
                </div>
            </div>

             <button onClick={() => setGameState(GameState.MENU)} className="border-2 border-white px-8 py-4 text-2xl hover:bg-white hover:text-black">
                 {ui.return}
             </button>
        </div>
    );
  }

  return (
    <div className="w-full h-screen bg-black font-pixel text-white flex flex-col">
        {/* HUD is visible in MAP, INVENTORY, and QUIZ if we want, but definitely MAP */}
        {(gameState === GameState.MAP || gameState === GameState.INVENTORY || gameState === GameState.QUIZ || gameState === GameState.SHOP) && (
            <HUD player={player} onOpenInventory={toggleInventory} />
        )}
        
        <div className="flex-1 overflow-hidden relative pt-12">
            {gameState === GameState.MAP && (
                <Map 
                    nodes={mapNodes} 
                    currentId={player.currentNodeId} 
                    onNodeClick={handleNodeClick} 
                    visitedIds={player.history} 
                />
            )}
            
            {gameState === GameState.INVENTORY && (
                <InventoryView 
                   player={player} 
                   onEquip={handleEquipItem} 
                   onUse={handleUseItemFromInventory}
                   onClose={toggleInventory} 
                />
            )}

            {gameState === GameState.SHOP && (
                <ShopView 
                    gold={player.gold}
                    onBuy={handleShopBuy}
                    onLeave={handleShopLeave}
                    layer={currentNode?.layer || 0}
                />
            )}

            {gameState === GameState.LEADERBOARD && (
                <LeaderboardView onClose={() => setGameState(GameState.MENU)} />
            )}

            {gameState === GameState.QUIZ && currentNode && (
                <QuizView 
                    nodeType={currentNode.type}
                    layer={currentNode.layer}
                    difficulty={difficulty}
                    playerHp={player.hp}
                    maxPlayerHp={player.maxHp}
                    playerAttack={player.attack}
                    inventory={player.inventory}
                    onVictory={handleVictory}
                    onDamage={handleDamage}
                    onUseItem={handleUseItemInBattle}
                    modifiers={modifiers}
                    language={language}
                    usedQuestions={player.usedQuestions || []}
                    onQuestionSeen={(q) => setPlayer(prev => ({ ...prev, usedQuestions: [...(prev.usedQuestions || []), q] }))}
                />
            )}
            {gameState === GameState.REWARD && currentNode && (
                <EventNode 
                    type={currentNode.type} 
                    onComplete={handleEventComplete} 
                    discoveredLore={player.lore}
                />
            )}
             {gameState === GameState.VICTORY && (
                 <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
                     <h1 className="text-yellow-400 text-6xl mb-4 animate-bounce">{ui.victory}</h1>
                     
                     <div className="bg-gray-900 p-6 rounded-lg border border-white mb-8 w-full max-w-md">
                        <h2 className="text-2xl text-yellow-400 mb-4 border-b border-gray-700 pb-2">{ui.summary}</h2>
                        <div className="flex justify-between mb-2">
                            <span>{ui.enemiesDefeated}:</span>
                            <span>{player.runStats?.enemiesDefeated || 0}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>{ui.goldEarned}:</span>
                            <span>{player.runStats?.goldEarned || 0}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>{ui.highestLayer}:</span>
                            <span>{(player.runStats?.highestLayer || 0) + 1}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{ui.timeTaken}:</span>
                            <span>{player.runStats?.endTime ? Math.floor((player.runStats.endTime - player.runStats.startTime) / 1000) : 0}s</span>
                        </div>
                    </div>

                     <button onClick={() => setGameState(GameState.MENU)} className="mt-8 border-2 border-white px-6 py-3">{ui.menu}</button>
                 </div>
             )}
        </div>
    </div>
  );
};

export default App;
