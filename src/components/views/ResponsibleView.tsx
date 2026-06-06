import React, { useEffect, useState } from 'react';
import { db, doc } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Profile, UserRole, ClassSession, Presence, Payment, Schedule } from '../../types';
import { useAuth } from '../../AuthContext';
import { Users, GraduationCap, Trophy, Wallet, ChevronRight, Activity, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';
import StudentView from './StudentView';
import { motion, AnimatePresence } from 'motion/react';

export default function ResponsibleView({ activeTab, setActiveTab }: { activeTab: string, setActiveTab: (t: string) => void }) {
  const { user } = useAuth();
  const [dependents, setDependents] = useState<Profile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const profileId = user.id || user.uid || '';
    if (!profileId || profileId === 'undefined') return;
    
    // Find all students whose responsibleId matches this user's profile ID
    const q = query(collection(db, 'profiles'), where('responsibleId', '==', profileId));
    
    // Also fetch current user's own profile to check if isStudent is true
    const docRef = doc(db, 'profiles', profileId);
    
    let selfProfile: Profile | null = null;
    let dependentsList: Profile[] = [];

    const handleStatesUpdate = () => {
      let mergedList = [...dependentsList];
      if (selfProfile && selfProfile.isStudent) {
        // Prepend self so the parent is selectable and labeled
        const selfAsStudent: Profile = {
          ...selfProfile,
          fullName: `${selfProfile.fullName} (Você)`
        };
        // Remove duplicates where the self ID is already in the list
        mergedList = mergedList.filter(d => d.id !== selfProfile!.id);
        mergedList = [selfAsStudent, ...mergedList];
      }
      // Guarantee unique IDs across all items
      const seenIds = new Set<string>();
      const uniqueList: Profile[] = [];
      for (const p of mergedList) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          uniqueList.push(p);
        }
      }
      setDependents(uniqueList);
      if (uniqueList.length > 0 && !selectedStudentId) {
        setSelectedStudentId(uniqueList[0].id);
      }
      setLoading(false);
    };

    const unsubDeps = onSnapshot(q, (snapshot) => {
      dependentsList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Profile))
        .filter(p => !p.isPointer); // Filter out pointer profiles to prevent duplication
      handleStatesUpdate();
    });

    const unsubSelf = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        selfProfile = { id: docSnap.id, ...docSnap.data() } as Profile;
      }
      handleStatesUpdate();
    });

    return () => {
      unsubDeps();
      unsubSelf();
    };
  }, [user, selectedStudentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (dependents.length === 0) {
    return (
      <div className="text-center p-12 bg-white rounded-[2.5rem] border border-slate-100 shadow-xl space-y-4">
        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
          <Users className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Nenhum aluno vinculado</h2>
        <p className="text-slate-500 max-w-sm mx-auto">Não encontramos alunos sob sua responsabilidade. Entre em contato com a administração para vincular seus filhos ou dependentes.</p>
      </div>
    );
  }

  const selectedStudent = dependents.find(d => d.id === selectedStudentId) || dependents[0];

  return (
    <div className="space-y-8">
      {/* Student Selector Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {dependents.map((dependent) => (
          <button
            key={dependent.id}
            onClick={() => setSelectedStudentId(dependent.id)}
            className={cn(
              "flex items-center gap-3 px-5 py-3 rounded-2xl transition-all border-2",
              selectedStudentId === dependent.id 
                ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200 scale-105" 
                : "bg-white border-slate-100 text-slate-600 hover:border-indigo-100"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs",
              selectedStudentId === dependent.id ? "bg-white/20" : "bg-slate-100"
            )}>
              {dependent.fullName.charAt(0)}
            </div>
            <span className="font-bold text-sm">{dependent.fullName.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Gerenciando: {selectedStudent.fullName}</h3>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Visão do Responsável</p>
          </div>
        </div>
        
        {/* Render the StudentView but forced to use the selected student's data */}
        {/* We need to ensure StudentView can accept a custom profile instead of just useAuth */}
        <StudentView 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          forcedProfile={selectedStudent} 
        />
      </div>
    </div>
  );
}
