import React, { useState, useMemo } from 'react';
import { Presence, Profile, ClassSession, ClassType } from '../../types';
import { Download, FileText, Calendar, Filter, Loader2, ChevronDown } from 'lucide-react';
import { cn, formatDate } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface PresenceReportProps {
  presences: Presence[];
  profiles: Profile[];
  classes: ClassSession[];
}

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

export default function PresenceReport({ presences, profiles, classes }: PresenceReportProps) {
  const [range, setRange] = useState<TimeRange>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const filteredPresences = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return presences.filter(p => {
      const pDate = new Date(p.timestamp);
      if (range === 'today') return pDate >= startOfToday;
      if (range === 'week') return pDate >= startOfWeek;
      if (range === 'month') return pDate >= startOfMonth;
      if (range === 'year') return pDate >= startOfYear;
      return true;
    });
  }, [presences, range]);

  const handleExport = () => {
    setIsExporting(true);
    
    // Simulate generation delay
    setTimeout(() => {
      const headers = ['Data', 'Aluno', 'E-mail', 'Aula', 'Tipo', 'Professor', 'Pontos'];
      const rows = filteredPresences.map(p => {
        const student = profiles.find(pr => pr.id === p.memberId);
        const classInfo = classes.find(c => c.id === p.classId);
        const professor = profiles.find(pr => pr.id === classInfo?.professorId);

        return [
          new Date(p.timestamp).toLocaleString('pt-BR'),
          student?.fullName || 'Desconhecido',
          student?.email || 'N/A',
          classInfo?.title || 'Treino Regular',
          classInfo?.type || 'N/A',
          professor?.fullName || 'N/A',
          p.pointsAwarded || '10'
        ].map(val => `"${val}"`).join(',');
      });

      const csvContent = [headers.join(','), ...rows].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `Relatorio_Presencas_${range}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsExporting(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Relatórios de Presença</h2>
          <p className="text-slate-500 text-sm mt-1">Gere diários de classe e estatísticas de frequência.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "p-2.5 rounded-lg border transition-all flex items-center gap-2 text-sm font-bold",
              showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filtros</span>
            <ChevronDown className={cn("w-4 h-4 transition-transform", showFilters && "rotate-180")} />
          </button>
          
          <button 
            onClick={handleExport}
            disabled={isExporting || filteredPresences.length === 0}
            className="bg-[#0a0a0a] text-white px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex flex-wrap gap-3">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'month', label: 'Este Mês' },
                { id: 'year', label: 'Este Ano' },
                { id: 'all', label: 'Todo Histórico' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setRange(opt.id as TimeRange)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                    range === opt.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" : "bg-white border border-slate-200 text-slate-400 hover:text-slate-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Presenças</p>
          </div>
          <p className="text-3xl font-black text-slate-900">{filteredPresences.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">No período selecionado</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Média Diária</p>
          </div>
          <p className="text-3xl font-black text-slate-900">
            {(filteredPresences.length / (range === 'month' ? 30 : range === 'week' ? 7 : 1)).toFixed(1)}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Check-ins / dia</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pronto para Exportar</p>
          </div>
          <p className="text-sm font-bold text-slate-700">Formato CSV (Excel)</p>
          <p className="text-[10px] text-slate-400 mt-1">Compatível com planilhas</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aluno</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aula</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPresences.slice(0, 20).map((p, idx) => {
                const student = profiles.find(pr => pr.id === p.memberId);
                const classData = classes.find(c => c.id === p.classId);
                return (
                  <tr key={`${p.id}-${p.classId || idx}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-500">{formatDate(p.timestamp)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{student?.fullName || 'Desconhecido'}</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">{student?.currentGrade}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{classData?.title || 'Treino Geral'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded",
                        classData?.type === ClassType.JUDO ? "bg-indigo-50 text-indigo-600" :
                        classData?.type === ClassType.KATA ? "bg-amber-50 text-amber-600" :
                        classData?.type === ClassType.NE_WAZA ? "bg-teal-50 text-teal-600" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {classData?.type || 'N/A'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredPresences.length > 20 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-xs text-slate-400 font-medium bg-slate-50/30">
                    Exibindo as 20 presenças mais recentes de um total de {filteredPresences.length}. Use o botão de exportar para ver o histórico completo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
