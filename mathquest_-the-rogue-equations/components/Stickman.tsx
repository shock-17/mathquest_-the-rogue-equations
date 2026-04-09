import React from 'react';

interface StickmanProps {
  action?: 'idle' | 'attack' | 'damage';
}

const Stickman: React.FC<StickmanProps> = ({ action = 'idle' }) => {
  return (
    <div className={`relative w-16 h-24 transition-transform duration-100 ${action === 'damage' ? 'animate-[shake_0.2s_infinite]' : ''} ${action === 'attack' ? 'animate-player-attack' : ''}`}>
        {/* Head */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-white rounded-full bg-black"></div>
        {/* Body */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-10 bg-white"></div>
        {/* Arms */}
        <div className={`absolute top-10 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-white ${action === 'attack' ? 'rotate-[-20deg]' : ''}`}></div>
        {/* Legs */}
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-8 h-8">
             <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-white origin-top rotate-12"></div>
             <div className="absolute top-0 left-1/2 w-0.5 h-8 bg-white origin-top -rotate-12"></div>
        </div>
        
        {/* Weapon if attacking */}
        {action === 'attack' && (
            <div className="absolute top-6 right-0 w-8 h-1 bg-red-500 rotate-45"></div>
        )}
    </div>
  );
};

export default Stickman;