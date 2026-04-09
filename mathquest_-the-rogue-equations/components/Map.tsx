import React, { useRef, useEffect } from 'react';
import { MapNode, NodeType } from '../types';
import { playSound } from '../services/soundService';

interface MapProps {
  nodes: MapNode[];
  currentId: string | null;
  onNodeClick: (node: MapNode) => void;
  visitedIds: string[];
}

const LAYER_HEIGHT = 120;
const TOP_PADDING = 80;

const Map: React.FC<MapProps> = ({ nodes, currentId, onNodeClick, visitedIds }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [hoveredNodeId, setHoveredNodeId] = React.useState<string | null>(null);

  const maxLayer = nodes.length > 0 ? Math.max(...nodes.map(n => n.layer)) : 0;
  const totalHeight = (maxLayer + 1) * LAYER_HEIGHT + TOP_PADDING * 2;

  useEffect(() => {
      if (currentId && nodeRefs.current[currentId]) {
          nodeRefs.current[currentId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
  }, [currentId]);

  const getIcon = (type: NodeType) => {
      switch(type) {
          case NodeType.BOSS: return '👿';
          case NodeType.ELITE: return '👹';
          case NodeType.TREASURE: return '📦';
          case NodeType.REST: return '⛺';
          case NodeType.SHOP: return '💰';
          case NodeType.START: return '🏠';
          default: return '💀';
      }
  };

  const isReachable = (node: MapNode) => {
    if (!currentId) return node.layer === 0;
    const curr = nodes.find(n => n.id === currentId);
    return curr?.next.includes(node.id) && !node.completed;
  };

  const getNodeY = (layer: number) => {
      // Layer 0 is at the top (small Y value)
      return (layer * LAYER_HEIGHT) + TOP_PADDING;
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-black overflow-y-auto relative font-pixel custom-scrollbar">
       {/* Background Grid Effect */}
       <div className="absolute inset-0 pointer-events-none opacity-20" 
            style={{ 
                backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                height: totalHeight 
            }} 
       />

       <div className="w-full max-w-2xl mx-auto relative" style={{ height: totalHeight }}>
           {/* Connections Layer */}
           <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
               <defs>
                   <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                       <stop offset="0%" stopColor="#ffff00" stopOpacity="0.8" />
                       <stop offset="100%" stopColor="#ff0000" stopOpacity="0.8" />
                   </linearGradient>
                   <filter id="glow">
                       <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                       <feMerge>
                           <feMergeNode in="coloredBlur"/>
                           <feMergeNode in="SourceGraphic"/>
                       </feMerge>
                   </filter>
               </defs>
               {nodes.flatMap(node => node.next.map(nextId => {
                   const target = nodes.find(n => n.id === nextId);
                   if (!target) return null;
                   
                   const isNextReachable = isReachable(target);
                   const isCurrentPath = node.id === currentId && isNextReachable;
                   const isPastPath = visitedIds.includes(node.id) && visitedIds.includes(nextId);
                   
                   // Hover Logic
                   const isHoveredPath = 
                       (hoveredNodeId === target.id && node.id === currentId) || // Incoming to hovered from current
                       (hoveredNodeId === node.id && nextId === target.id);      // Outgoing from hovered
                   
                   const y1 = getNodeY(node.layer);
                   const y2 = getNodeY(target.layer);

                   return (
                       <g key={`${node.id}-${nextId}`}>
                           {/* Base Line */}
                           <line 
                             x1={`${node.x}%`} y1={y1}
                             x2={`${target.x}%`} y2={y2}
                             stroke={isPastPath ? "#888" : "#555"}
                             strokeWidth={isPastPath ? 4 : 2}
                             strokeDasharray={isPastPath ? "none" : "4 4"}
                             opacity={isPastPath ? 0.6 : 0.5}
                           />
                           
                           {/* Active/Hover Path Animation */}
                           {(isCurrentPath || isHoveredPath) && (
                               <line 
                                 x1={`${node.x}%`} y1={y1}
                                 x2={`${target.x}%`} y2={y2}
                                 stroke={isHoveredPath ? "#60A5FA" : "#FBBF24"} // Blue for hover, Yellow for active
                                 strokeWidth={isHoveredPath ? 4 : 3}
                                 strokeDasharray={isHoveredPath ? "none" : "10 5"}
                                 className={!isHoveredPath ? "animate-dash-flow" : ""}
                                 filter="url(#glow)"
                                 opacity={isHoveredPath || isCurrentPath ? 1 : 0}
                               />
                           )}
                       </g>
                   );
               }))}
           </svg>

           {/* Nodes Layer */}
           {nodes.map(node => {
               const active = node.id === currentId;
               const reachable = isReachable(node);
               const visited = visitedIds.includes(node.id);
               const topPos = getNodeY(node.layer);
               const isBoss = node.type === NodeType.BOSS;

               return (
                   <div
                     key={node.id}
                     ref={el => { if(el) nodeRefs.current[node.id] = el }}
                     onMouseEnter={() => setHoveredNodeId(node.id)}
                     onMouseLeave={() => setHoveredNodeId(null)}
                     onClick={() => {
                         if (reachable) {
                             playSound.menuSelect();
                             onNodeClick(node);
                         }
                     }}
                     className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500
                        ${active ? 'scale-125 z-30' : 'z-20'}
                        ${reachable ? 'cursor-pointer hover:scale-110 z-25' : ''}
                        ${!reachable && !visited && !active ? 'opacity-60 grayscale' : ''}
                     `}
                     style={{
                         left: `${node.x}%`,
                         top: `${topPos}px`,
                         width: isBoss ? 80 : 60, 
                         height: isBoss ? 80 : 60
                     }}
                   >
                       {/* Node Circle */}
                       <div className={`
                          w-full h-full flex items-center justify-center border-4 rounded-full shadow-lg relative transition-colors duration-300
                          ${active ? 'border-yellow-400 bg-gray-900 shadow-yellow-500/50' : ''}
                          ${visited && !active ? 'border-gray-600 bg-gray-800' : ''}
                          ${reachable ? 'border-blue-400 bg-black animate-float shadow-blue-500/50' : ''}
                          ${!active && !visited && !reachable ? 'border-gray-700 bg-black' : ''}
                          ${isBoss ? 'border-red-600 shadow-red-600/50' : ''}
                       `}>
                           {/* Pulse Effect for Active/Reachable */}
                           {(active || reachable) && (
                               <div className={`absolute inset-0 rounded-full border-2 opacity-0 animate-ping
                                   ${active ? 'border-yellow-400' : 'border-blue-400'}
                               `}></div>
                           )}

                           <span className="text-3xl select-none filter drop-shadow-md">
                               {visited && !active ? '❌' : getIcon(node.type)}
                           </span>
                       </div>
                       
                       {/* Label (Optional, maybe for Boss) */}
                       {isBoss && <div className="absolute -bottom-6 text-red-500 font-bold text-sm tracking-widest animate-pulse">BOSS</div>}
                   </div>
               );
           })}
       </div>

       <style>{`
         @keyframes dash-flow {
             from { stroke-dashoffset: 15; }
             to { stroke-dashoffset: 0; }
         }
         .animate-dash-flow {
             animation: dash-flow 1s linear infinite;
         }
         @keyframes float {
             0%, 100% { transform: translateY(0); }
             50% { transform: translateY(-5px); }
         }
         .animate-float {
             animation: float 2s ease-in-out infinite;
         }
       `}</style>
    </div>
  );
};

export default Map;