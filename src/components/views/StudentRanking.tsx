import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Profile, UserRole } from '../../types';
import { Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function StudentRanking() {
  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'profiles'), (snapshot) => {
      const sorted = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(p => !p.isPointer && (!p.role || p.role === UserRole.STUDENT || p.role === UserRole.PROFESSOR))
        .sort((a,b) => (b.points || 0) - (a.points || 0));
      setLeaderboard(sorted.slice(0, 10));
    });
    return unsub;
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-4">
        <div className="w-16 h-16 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 rotate-12">
          <Trophy className="text-white w-10 h-10 -rotate-12" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Ranking dos Guerreiros</h2>
          <p className="text-slate-500 text-sm font-medium">Os 10 alunos mais dedicados (Pontos por presença e pagamentos).</p>
        </div>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {leaderboard.map((p, i) => (
          <div key={`${p.id}-${i}`} className={cn(
            "p-6 flex items-center gap-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors",
            i === 0 ? "bg-amber-50/30" : ""
          )}>
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-sm border",
              i === 0 ? "bg-amber-400 text-white border-amber-500" : 
              i === 1 ? "bg-slate-200 text-slate-600 border-slate-300" :
              i === 2 ? "bg-orange-200 text-orange-700 border-orange-300" :
              "bg-white text-slate-300 border-slate-100"
            )}>
              {i + 1}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-900">{p.fullName}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {p.currentGrade && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Faixa {p.currentGrade}</span>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-slate-900 font-mono tracking-tight">{p.points || 0}</p>
              <p className="text-[8px] uppercase font-bold tracking-widest text-slate-400">Pontos Ganhos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
