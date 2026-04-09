import React, { useState, useEffect } from 'react';
import { Item, ItemType, Rarity } from '../types';
import { ITEMS } from '../constants';
import { playSound } from '../services/soundService';
import { ShoppingBag, ArrowLeft, Coins } from 'lucide-react';

interface ShopViewProps {
  gold: number;
  onBuy: (item: Item, cost: number) => void;
  onLeave: () => void;
  layer: number;
}

const RARITY_COLORS = {
    [Rarity.COMMON]: 'border-gray-400 text-gray-400',
    [Rarity.UNCOMMON]: 'border-green-400 text-green-400',
    [Rarity.RARE]: 'border-blue-400 text-blue-400',
    [Rarity.LEGENDARY]: 'border-orange-400 text-orange-400',
};

const getRarityWeights = (layer: number) => {
    if (layer < 3) return { [Rarity.COMMON]: 0.7, [Rarity.UNCOMMON]: 0.3, [Rarity.RARE]: 0, [Rarity.LEGENDARY]: 0 };
    if (layer < 6) return { [Rarity.COMMON]: 0.5, [Rarity.UNCOMMON]: 0.4, [Rarity.RARE]: 0.1, [Rarity.LEGENDARY]: 0 };
    if (layer < 9) return { [Rarity.COMMON]: 0.3, [Rarity.UNCOMMON]: 0.4, [Rarity.RARE]: 0.3, [Rarity.LEGENDARY]: 0 };
    return { [Rarity.COMMON]: 0.1, [Rarity.UNCOMMON]: 0.3, [Rarity.RARE]: 0.4, [Rarity.LEGENDARY]: 0.2 };
};

const getRandomRarity = (weights: Record<Rarity, number>): Rarity => {
    const rand = Math.random();
    let sum = 0;
    const order = [Rarity.COMMON, Rarity.UNCOMMON, Rarity.RARE, Rarity.LEGENDARY];
    for (const r of order) {
        sum += weights[r] || 0;
        if (rand < sum) return r;
    }
    return Rarity.COMMON;
};

const ShopView: React.FC<ShopViewProps> = ({ gold, onBuy, onLeave, layer }) => {
  const [shopItems, setShopItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("Welcome stranger!");

  useEffect(() => {
      // Generate random shop stock
      const stock: Item[] = [];
      const weights = getRarityWeights(layer);
      
      // Pick 3 random items
      for(let i=0; i<3; i++) {
          const targetRarity = getRandomRarity(weights);
          const rarityKeys = Object.keys(ITEMS).filter(k => ITEMS[k].rarity === targetRarity);
          
          let selectedKey: string;
          if (rarityKeys.length > 0) {
              selectedKey = rarityKeys[Math.floor(Math.random() * rarityKeys.length)];
          } else {
              // Fallback to any item if pool is empty
              const allKeys = Object.keys(ITEMS);
              selectedKey = allKeys[Math.floor(Math.random() * allKeys.length)];
          }
          
          const baseItem = ITEMS[selectedKey];
          
          // Price Scaling Logic
          // Base scaling: 10% increase per layer
          const priceMultiplier = 1 + (layer * 0.1);
          const scaledPrice = Math.floor(baseItem.price * priceMultiplier);

          // Assign unique IDs to shop items
          stock.push({ 
              ...baseItem, 
              id: `shop-${i}-${Date.now()}`,
              price: scaledPrice
          });
      }
      setShopItems(stock);
  }, [layer]);

  const handleBuy = (item: Item) => {
      if (gold >= item.price) {
          playSound.buy(); // Positive feedback sound
          onBuy(item, item.price);
          setMessage("Pleasure doing business.");
          // Remove purchased item from stock
          setShopItems(prev => prev.filter(i => i.id !== item.id));
      } else {
          playSound.damage(); // Error sound
          setMessage("You don't have enough gold!");
      }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white font-pixel p-4 items-center justify-center">
        <h1 className="text-5xl text-yellow-400 mb-8 flex items-center gap-4">
            <ShoppingBag size={48} /> MYSTERIOUS SHOP
        </h1>

        <div className="undertale-box p-8 w-full max-w-4xl flex flex-col gap-6">
            <div className="text-2xl text-center mb-4 min-h-[40px]">{message}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {shopItems.map((item) => {
                    const rarityColor = RARITY_COLORS[item.rarity] || 'border-white text-white';
                    // Extract border color for hover effect
                    const borderColorClass = rarityColor.split(' ').find(c => c.startsWith('border-')) || 'border-white';
                    
                    let typeLabel = '';
                    if (item.type === ItemType.WEAPON) typeLabel = 'WEAPON';
                    else if (item.type === ItemType.ARMOR) typeLabel = 'ARMOR';
                    else if (item.type === ItemType.POTION_HEAL) typeLabel = 'CONSUMABLE';
                    else if (item.type === ItemType.BOMB) typeLabel = 'BOMB (BATTLE ONLY)';
                    else typeLabel = 'MAGIC SCROLL';
                    
                    return (
                    <div key={item.id} className={`border p-4 flex flex-col items-center transition-colors group ${borderColorClass} hover:bg-gray-900`}>
                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                        <div className={`text-xl font-bold text-center ${rarityColor.split(' ').find(c => c.startsWith('text-'))}`}>{item.name}</div>
                        <div className="text-xs uppercase mb-1 opacity-70">{item.rarity} • {typeLabel}</div>
                        <div className="text-gray-400 text-sm mb-2 h-10 text-center">{item.description}</div>
                        <div className="text-yellow-400 text-2xl mb-4">{item.price} G</div>
                        <button 
                            onClick={() => handleBuy(item)}
                            className={`border-2 px-6 py-2 text-xl ${gold >= item.price ? 'border-white hover:bg-white hover:text-black' : 'border-gray-600 text-gray-600 cursor-not-allowed'}`}
                        >
                            BUY
                        </button>
                    </div>
                )})}
            </div>

            <div className="flex justify-between items-center mt-8 border-t border-gray-700 pt-4">
                <div className="flex items-center gap-2 text-2xl text-yellow-400">
                    <Coins /> {gold} G
                </div>
                <button 
                    onClick={() => { playSound.menuSelect(); onLeave(); }}
                    className="flex items-center gap-2 text-xl hover:text-red-400 transition-colors"
                >
                    <ArrowLeft /> LEAVE SHOP
                </button>
            </div>
        </div>
    </div>
  );
};

export default ShopView;
