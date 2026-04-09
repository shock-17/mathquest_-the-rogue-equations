import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, ArrowLeft } from 'lucide-react';

interface LeaderboardViewProps {
  onClose: () => void;
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onClose }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = () => {
      try {
        const existing = localStorage.getItem('mathquest_leaderboard');
        if (existing) {
          setLeaderboard(JSON.parse(existing));
        }
      } catch (error) {
        console.error('Failed to load local leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="flex flex-col h-full bg-black text-white font-pixel p-4 animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6 border-b-2 border-white pb-2">
        <h2 className="text-4xl flex items-center gap-2">
          <Trophy className="text-yellow-400" size={32} />
          LEADERBOARD
        </h2>
        <button onClick={onClose} className="flex items-center gap-2 hover:text-yellow-400">
          <ArrowLeft /> BACK
        </button>
      </div>

      <div className="undertale-box p-6 flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="text-center py-10 text-2xl animate-pulse">Loading...</div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-10 text-gray-500">No records yet. Be the first!</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-700 text-yellow-400 text-xl">
                <th className="p-3">RANK</th>
                <th className="p-3">NAME</th>
                <th className="p-3">SCORE</th>
                <th className="p-3">LAYER</th>
                <th className="p-3 hidden md:table-cell">DATE</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <tr 
                  key={index} 
                  className={`border-b border-gray-800 hover:bg-gray-900 transition-colors ${index < 3 ? 'text-yellow-200' : 'text-gray-300'}`}
                >
                  <td className="p-3 text-2xl font-bold">
                    {index === 0 && '🥇'}
                    {index === 1 && '🥈'}
                    {index === 2 && '🥉'}
                    {index > 2 && `#${index + 1}`}
                  </td>
                  <td className="p-3 text-xl">{entry.name}</td>
                  <td className="p-3 font-mono text-green-400">{entry.score.toLocaleString()}</td>
                  <td className="p-3">{entry.layer}</td>
                  <td className="p-3 text-sm text-gray-500 hidden md:table-cell">{new Date(entry.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LeaderboardView;
