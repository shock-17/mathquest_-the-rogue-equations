import React, { useState } from 'react';
import { Item, ItemType, Player, Rarity } from '../types';
import { LORE_DATABASE } from '../constants';
import { Sword, Shield, Heart, ArrowLeft, Scroll, Book } from 'lucide-react';

interface InventoryViewProps {
  player: Player;
  onEquip: (item: Item) => void;
  onUse: (item: Item) => void;
  onClose: () => void;
}

const RARITY_COLORS = {
    [Rarity.COMMON]: 'border-gray-400 text-gray-400',
    [Rarity.UNCOMMON]: 'border-green-400 text-green-400',
    [Rarity.RARE]: 'border-blue-400 text-blue-400',
    [Rarity.LEGENDARY]: 'border-orange-400 text-orange-400',
};

const InventoryView: React.FC<InventoryViewProps> = ({ player, onEquip, onUse, onClose }) => {
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'LORE'>('ITEMS');

  return (
    <div className="flex flex-col h-full bg-black text-white font-pixel p-4 animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-2">
            <h2 className="text-4xl">INVENTORY</h2>
            <button onClick={onClose} className="flex items-center gap-2 hover:text-yellow-400">
                <ArrowLeft /> BACK
            </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 h-full overflow-hidden">
            
            {/* Left: Stats & Equipment */}
            <div className="md:w-1/3 flex flex-col gap-6">
                
                {/* Stats Panel */}
                <div className="undertale-box p-4">
                    <h3 className="text-2xl mb-4 text-yellow-400">STATS</h3>
                    <div className="space-y-2 text-xl">
                        <div className="flex justify-between">
                            <span className="flex items-center gap-2"><Heart size={20} className="text-red-500" /> MAX HP</span>
                            <span>{player.maxHp}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-2"><Sword size={20} className="text-blue-400" /> ATK</span>
                            <span>{player.attack}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="flex items-center gap-2"><Shield size={20} className="text-green-400" /> DEF</span>
                            <span>{player.defense}</span>
                        </div>
                    </div>
                </div>

                {/* Equipment Slots */}
                <div className="undertale-box p-4 flex-1">
                    <h3 className="text-2xl mb-4 text-blue-400">EQUIPMENT</h3>
                    
                    <div className="mb-4">
                        <div className="text-gray-400 text-sm mb-1">WEAPON</div>
                        <div className={`border p-3 flex items-center gap-3 ${player.equippedWeapon ? RARITY_COLORS[player.equippedWeapon.rarity].split(' ')[0] : 'border-white'}`}>
                            <span className="text-3xl">{player.equippedWeapon?.icon || '✊'}</span>
                            <div>
                                <div className={`text-lg ${player.equippedWeapon ? RARITY_COLORS[player.equippedWeapon.rarity].split(' ')[1] : 'text-white'}`}>{player.equippedWeapon?.name || 'Fists'}</div>
                                <div className="text-sm text-gray-400">{player.equippedWeapon ? `+${player.equippedWeapon.value} ATK` : '+0 ATK'}</div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="text-gray-400 text-sm mb-1">ARMOR</div>
                        <div className={`border p-3 flex items-center gap-3 ${player.equippedArmor ? RARITY_COLORS[player.equippedArmor.rarity].split(' ')[0] : 'border-white'}`}>
                            <span className="text-3xl">{player.equippedArmor?.icon || '👕'}</span>
                            <div>
                                <div className={`text-lg ${player.equippedArmor ? RARITY_COLORS[player.equippedArmor.rarity].split(' ')[1] : 'text-white'}`}>{player.equippedArmor?.name || 'T-Shirt'}</div>
                                <div className="text-sm text-gray-400">{player.equippedArmor ? `+${player.equippedArmor.value} DEF` : '+0 DEF'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Inventory / Lore Grid */}
            <div className="flex-1 undertale-box p-4 flex flex-col overflow-hidden">
                <div className="flex gap-4 mb-4 border-b border-gray-700 pb-2">
                    <button 
                        onClick={() => setActiveTab('ITEMS')}
                        className={`text-2xl hover:text-yellow-400 ${activeTab === 'ITEMS' ? 'text-yellow-400 underline' : 'text-gray-500'}`}
                    >
                        BAG ({player.inventory.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('LORE')}
                        className={`text-2xl hover:text-yellow-400 ${activeTab === 'LORE' ? 'text-yellow-400 underline' : 'text-gray-500'}`}
                    >
                        LORE ({player.lore.length})
                    </button>
                </div>
                
                {activeTab === 'ITEMS' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-2 custom-scrollbar">
                        {player.inventory.length === 0 && (
                            <div className="col-span-2 text-center text-gray-500 py-10">
                                Your bag is empty.
                            </div>
                        )}
                        {player.inventory.map((item, idx) => {
                            const rarityColor = RARITY_COLORS[item.rarity] || 'border-gray-700 text-white';
                            const borderColor = rarityColor.split(' ')[0];
                            const textColor = rarityColor.split(' ')[1];
                            
                            let typeLabel = '';
                            if (item.type === ItemType.WEAPON) typeLabel = 'WEAPON';
                            else if (item.type === ItemType.ARMOR) typeLabel = 'ARMOR';
                            else if (item.type === ItemType.POTION_HEAL) typeLabel = 'CONSUMABLE';
                            else if (item.type === ItemType.BOMB) typeLabel = 'BOMB (CONSUMABLE)';
                            else typeLabel = 'MAGIC SCROLL';
                            
                            return (
                            <div key={`${item.id}-${idx}`} className={`border p-3 hover:bg-gray-900 transition-colors flex justify-between items-center group ${borderColor}`}>
                                <div className="flex items-center gap-3">
                                    <div className="text-3xl">{item.icon}</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className={`text-xl group-hover:text-yellow-400 ${textColor}`}>{item.name}</div>
                                            <span className="text-[10px] px-1 border border-gray-600 text-gray-400 bg-gray-800 rounded">{typeLabel}</span>
                                        </div>
                                        <div className="text-xs text-gray-400">{item.description}</div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col gap-2">
                                    {(item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) && (
                                        <button 
                                          onClick={() => onEquip(item)}
                                          className="bg-blue-900 hover:bg-blue-700 text-xs px-3 py-1 border border-blue-500"
                                        >
                                            EQUIP
                                        </button>
                                    )}
                                    {(item.type === ItemType.POTION_HEAL || item.type === ItemType.SCROLL_REROLL) && (
                                        <button 
                                          onClick={() => onUse(item)}
                                          className="bg-green-900 hover:bg-green-700 text-xs px-3 py-1 border border-green-500"
                                        >
                                            USE
                                        </button>
                                    )}
                                    {(item.type === ItemType.BOMB || item.type === ItemType.SCROLL_SKIP) && (
                                        <span className="text-[10px] text-gray-500 border border-gray-700 px-2 py-1 text-center bg-gray-900">
                                            BATTLE ONLY
                                        </span>
                                    )}
                                </div>
                            </div>
                        )})}
                    </div>
                )}

                {activeTab === 'LORE' && (
                    <div className="flex flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar">
                        {player.lore.length === 0 && (
                            <div className="text-center text-gray-500 py-10">
                                No lore discovered yet. Explore the map!
                            </div>
                        )}
                        {player.lore.map((loreId) => {
                            const lore = LORE_DATABASE[loreId];
                            if (!lore) return null;
                            return (
                                <div key={loreId} className="border border-gray-700 p-4 hover:border-blue-400 hover:bg-gray-900 transition-colors">
                                    <div className="flex items-center gap-2 text-yellow-400 mb-2">
                                        <Book size={20} />
                                        <h3 className="text-xl font-bold">{lore.title}</h3>
                                    </div>
                                    <p className="text-gray-300 italic">"{lore.text}"</p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default InventoryView;
