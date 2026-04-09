import React from 'react';
import { Player } from '../types';
import { Sword, Shield, Backpack } from 'lucide-react';
import { playSound } from '../services/soundService';

interface HUDProps {
  player: Player;
  onOpenInventory: () => void;
}

const HUD: React.FC<HUDProps> = ({ player, onOpenInventory }) => {
  return (
    <div className="fixed top-0 left-0 w-full p-2 z-50 flex justify-between items-start font-pixel text-white bg-black border-b-2 border-white">
      
      <div className="flex gap-4 md:gap-6 items-center">
         <div className="text-xl">LV {Math.max(1, player.history.length)}</div>
         
         <div className="flex items-center gap-2">
             <span className="text-yellow-400">HP</span>
             <div className="w-24 md:w-32 h-4 bg-red-900 border border-white relative">
                 <div className="h-full bg-yellow-400" style={{width: `${(player.hp / player.maxHp) * 100}%`}}></div>
                 <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center text-xs shadow-black drop-shadow-md">
                     {player.hp} / {player.maxHp}
                 </div>
             </div>
         </div>
      </div>

      <div className="flex items-center gap-4">
          <div className="flex gap-4 text-sm md:text-base">
              <div className="flex items-center gap-1">
                  <Sword size={16} /> 
                  <span>{player.attack}</span>
              </div>
              <div className="flex items-center gap-1">
                  <Shield size={16} />
                  <span>{player.defense}</span>
              </div>
              <div className="text-yellow-400">$ {player.gold}G</div>
          </div>
          
          <button 
            onClick={() => { playSound.menuSelect(); onOpenInventory(); }}
            className="border border-white p-1 hover:bg-white hover:text-black transition-colors flex items-center gap-2 px-2"
          >
              <Backpack size={18} />
              <span className="hidden md:inline">ITEM</span>
          </button>
      </div>

    </div>
  );
};

export default HUD;