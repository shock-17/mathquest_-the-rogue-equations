import React, { useState, useEffect } from 'react';
import { Item, ItemType, NodeType } from '../types';
import { ITEMS, HEAL_AMOUNT_REST, LOOT_OPEN_DURATION, LORE_DATABASE } from '../constants';
import { playSound } from '../services/soundService';
import { Scroll } from 'lucide-react';

interface EventNodeProps {
  type: NodeType;
  onComplete: (item?: Item, heal?: boolean, loreId?: string) => void;
  discoveredLore: string[];
}

const EventNode: React.FC<EventNodeProps> = ({ type, onComplete, discoveredLore }) => {
  const [rolling, setRolling] = useState(false);
  const [currentIcon, setCurrentIcon] = useState('❓');
  const [reward, setReward] = useState<Item | null>(null);
  const [loreFound, setLoreFound] = useState<string | null>(null);

  // Pool for random loot
  const lootPool = Object.values(ITEMS);

  const startRoll = () => {
    if (rolling) return;
    setRolling(true);
    playSound.menuSelect();

    let steps = 0;
    const maxSteps = 20;
    const interval = setInterval(() => {
       const randomItem = lootPool[Math.floor(Math.random() * lootPool.length)];
       setCurrentIcon(randomItem.icon);
       playSound.menuMove();
       steps++;
       if (steps > maxSteps) {
           clearInterval(interval);
           
           // Chance for Lore (30%) if there is undiscovered lore
           const availableLore = Object.keys(LORE_DATABASE).filter(id => !discoveredLore.includes(id));
           let foundLoreId: string | null = null;
           
           if (availableLore.length > 0 && Math.random() < 0.3) {
               foundLoreId = availableLore[Math.floor(Math.random() * availableLore.length)];
               setLoreFound(foundLoreId);
           }

           // Final item
           const finalItem = lootPool[Math.floor(Math.random() * lootPool.length)];
           const newItem = { ...finalItem, id: Math.random().toString() };
           setReward(newItem);
           setCurrentIcon(newItem.icon);
           playSound.victory();
       }
    }, 100);
  };

  if (reward) {
      return (
          <div className="flex flex-col items-center justify-center h-full text-white font-pixel p-8">
              <div className="undertale-box p-10 flex flex-col items-center max-w-2xl">
                  <div className="text-8xl mb-4">{currentIcon}</div>
                  <h2 className="text-4xl text-yellow-400 mb-2">{reward.name}</h2>
                  <p className="text-xl mb-6">{reward.description}</p>
                  
                  {loreFound && (
                      <div className="mb-6 border-t border-gray-500 pt-4 w-full">
                          <div className="flex items-center justify-center gap-2 text-blue-400 mb-2">
                              <Scroll />
                              <span className="text-xl font-bold">LORE DISCOVERED!</span>
                          </div>
                          <h3 className="text-lg text-yellow-200 mb-1">{LORE_DATABASE[loreFound].title}</h3>
                          <p className="text-sm text-gray-300 italic">"{LORE_DATABASE[loreFound].text}"</p>
                      </div>
                  )}

                  <button 
                    onClick={() => onComplete(reward, undefined, loreFound || undefined)}
                    className="border-2 border-white px-6 py-2 hover:bg-white hover:text-black text-2xl"
                  >
                      [ TAKE ALL ]
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-white font-pixel">
        <h2 className="text-4xl mb-8">{type === NodeType.REST ? 'A Quiet Spot' : 'A Mysterious Box'}</h2>
        
        {type === NodeType.REST ? (
            <div className="undertale-box p-8 flex flex-col items-center">
                <div className="text-6xl mb-4">⛺</div>
                <p className="text-2xl mb-6">Rest and recover HP?</p>
                <button 
                  onClick={() => { playSound.heal(); onComplete(undefined, true); }}
                  className="border-2 border-white px-6 py-2 hover:bg-white hover:text-black text-2xl"
                >
                    [ REST (+{HEAL_AMOUNT_REST} HP) ]
                </button>
            </div>
        ) : (
            <div className="undertale-box p-8 flex flex-col items-center min-w-[300px]">
                <div className="text-9xl mb-8 transition-transform">{currentIcon}</div>
                {!rolling && (
                    <button 
                        onClick={startRoll}
                        className="border-2 border-white px-6 py-2 hover:bg-white hover:text-black text-2xl blink"
                    >
                        [ OPEN ]
                    </button>
                )}
                {rolling && <p className="text-2xl animate-pulse">Rolling...</p>}
            </div>
        )}
    </div>
  );
};

export default EventNode;