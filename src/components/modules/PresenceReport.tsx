import React, { useState, useMemo } from 'react';
import { Presence, Profile, ClassSession, ClassType, Payment, Settings } from '../../types';
import { 
  Download, 
  FileText, 
  Calendar, 
  Filter, 
  Loader2, 
  ChevronDown, 
  Users, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Activity, 
  BarChart4, 
  PieChart as PieIcon,
  Search,
  BookOpen,
  Trophy,
  Sparkles
} from 'lucide-react';
import { cn, formatDate, getMonthName } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid, 
  AreaChart, 
  Area,
  PieChart, 
  Pie 
} from 'recharts';
import { jsPDF } from 'jspdf';

// Safe sanitization helper of Latin-1 accents to avoid garbled characters in standard PDF fonts
const cleanStringForPDF = (str: string): string => {
  if (!str) return '';
  const map: Record<string, string> = {
    'á': 'a', 'à': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
    'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
    'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
    'ç': 'c', 'ñ': 'n',
    'Á': 'A', 'À': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E',
    'Í': 'I', 'Ì': 'I', 'Î': 'I', 'Ï': 'I',
    'Ó': 'O', 'Ò': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
    'Ú': 'U', 'Ù': 'U', 'Û': 'U', 'Ü': 'U',
    'Ç': 'C', 'Ñ': 'N',
    'º': '.', 'ª': '.'
  };
  return str.split('').map(char => map[char] || char).join('');
};

interface PresenceReportProps {
  presences: Presence[];
  profiles: Profile[];
  classes: ClassSession[];
  payments?: Payment[];
  settings?: Settings | null;
}

type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';
type ReportTab = 'attendance' | 'students' | 'finance';

export default function PresenceReport({ 
  presences, 
  profiles, 
  classes, 
  payments = [], 
  settings = null 
}: PresenceReportProps) {
  const [activeTab, setActiveTabTab] = useState<ReportTab>('attendance');
  const [range, setRange] = useState<TimeRange>('month');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Student statistics tab state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

  // Financial report selections
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const [reportMonth, setReportMonth] = useState<number>(currentMonthNum);
  const [reportYear, setReportYear] = useState<number>(currentYearNum);
  const [financeLoading, setFinanceLoading] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = [currentYearNum - 1, currentYearNum, currentYearNum + 1];

  // --- FILTERED PRESENCES (General Tab) ---
  const filteredPresences = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Start of current week (Sunday)
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return presences.filter(p => {
      if (!p.timestamp) return false;
      const pDate = new Date(p.timestamp);
      if (range === 'today') return pDate >= startOfToday;
      if (range === 'week') return pDate >= startOfWeek;
      if (range === 'month') return pDate >= startOfMonth;
      if (range === 'year') return pDate >= startOfYear;
      return true;
    });
  }, [presences, range]);

  // --- RECHARTS DATA PREPARATION: PRESENCES BY STUDENT ---
  const studentPresenceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPresences.forEach(p => {
      counts[p.memberId] = (counts[p.memberId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([memberId, count]) => {
        const student = profiles.find(pr => pr.id === memberId);
        return {
          name: student?.fullName ? student.fullName.split(' ')[0] + ' ' + (student.fullName.split(' ')[1] || '') : 'Visitante',
          'Presenças': count
        };
      })
      .sort((a, b) => b['Presenças'] - a['Presenças'])
      .slice(0, 10); // TOP 10
  }, [filteredPresences, profiles]);

  // --- RECHARTS DATA PREPARATION: PRESENCES BY CLASS ---
  const classPresenceData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPresences.forEach(p => {
      counts[p.classId] = (counts[p.classId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([classId, count]) => {
        const matchingClass = classes.find(c => c.id === classId);
        const label = matchingClass ? `${matchingClass.time} (${matchingClass.type})` : 'Outros/Geral';
        return {
          name: label,
          'Frequentadores': count
        };
      })
      .sort((a, b) => b['Frequentadores'] - a['Frequentadores'])
      .slice(0, 6); // TOP 6
  }, [filteredPresences, classes]);

  // --- FINANCIAL CALCULATION FOR SELECTED TARGET MONTH ---
  const activeStudentsList = useMemo(() => {
    return profiles.filter(p => !p.role || p.role === 'student');
  }, [profiles]);

  const financialStats = useMemo(() => {
    const monthlyFee = settings?.monthlyValue || 150;
    const paidList = activeStudentsList.filter(s => {
      const pay = payments.find(p => p.memberId === s.id && p.month === reportMonth && p.year === reportYear);
      return pay?.status === 'paid';
    });

    const paidVolume = paidList.length * monthlyFee;
    const totalVolume = activeStudentsList.length * monthlyFee;
    const pendingVolume = Math.max(0, totalVolume - paidVolume);

    return {
      totalStudents: activeStudentsList.length,
      paidCount: paidList.length,
      pendingCount: Math.max(0, activeStudentsList.length - paidList.length),
      paidVolume,
      pendingVolume,
      totalVolume,
      percent: totalVolume > 0 ? Math.round((paidVolume / totalVolume) * 100) : 0
    };
  }, [activeStudentsList, payments, reportMonth, reportYear, settings]);

  // --- INDIVIDUAL STUDENT STATS DATA ---
  const filteredStudentProfiles = useMemo(() => {
    return activeStudentsList.filter(student => 
      student.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(studentSearchTerm.toLowerCase()))
    );
  }, [activeStudentsList, studentSearchTerm]);

  // Auto-select first student when empty
  React.useEffect(() => {
    if (filteredStudentProfiles.length > 0 && !selectedStudentId) {
      setSelectedStudentId(filteredStudentProfiles[0].id);
    }
  }, [filteredStudentProfiles, selectedStudentId]);

  const selectedStudent = useMemo(() => {
    return activeStudentsList.find(s => s.id === selectedStudentId) || null;
  }, [activeStudentsList, selectedStudentId]);

  const selectedStudentPresences = useMemo(() => {
    return presences.filter(p => p.memberId === selectedStudentId);
  }, [presences, selectedStudentId]);

  const singleStudentStats = useMemo(() => {
    if (!selectedStudent) return null;
    
    // Count different types
    const classTypeCounts: Record<string, number> = {};
    const hourCounts: Record<string, number> = {};
    
    selectedStudentPresences.forEach(p => {
      const classInfo = classes.find(c => c.id === p.classId);
      if (classInfo) {
        classTypeCounts[classInfo.type] = (classTypeCounts[classInfo.type] || 0) + 1;
        hourCounts[classInfo.time] = (hourCounts[classInfo.time] || 0) + 1;
      }
    });

    // Favorite modality
    const favoriteModality = Object.entries(classTypeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Geral/Livre';
      
    // Favorite hour
    const favoriteHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Treinos Variados';

    // Last 30 days check-ins
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30DaysCount = selectedStudentPresences.filter(p => {
      if (!p.timestamp) return false;
      return new Date(p.timestamp) >= thirtyDaysAgo;
    }).length;

    // Monthly attendance history (last 6 months)
    const historyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${getMonthName(d.getMonth() + 1).slice(0, 3)}/${d.getFullYear().toString().substring(2)}`;
      historyMap[key] = 0;
    }

    selectedStudentPresences.forEach(p => {
      if (!p.timestamp) return;
      const pDate = new Date(p.timestamp);
      const key = `${getMonthName(pDate.getMonth() + 1).slice(0, 3)}/${pDate.getFullYear().toString().substring(2)}`;
      if (key in historyMap) {
        historyMap[key]++;
      }
    });

    const chartData = Object.entries(historyMap).map(([name, count]) => ({
      name,
      'Aulas Assistidas': count
    }));

    // Status of payments in the last 3 months
    const paymentStatusHistory = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const pay = payments.find(p => p.memberId === selectedStudentId && p.month === m && p.year === y);
      paymentStatusHistory.push({
        month: m,
        year: y,
        label: `${getMonthName(m)} / ${y}`,
        status: pay?.status || 'pending'
      });
    }

    return {
      totalCount: selectedStudentPresences.length,
      last30DaysCount,
      favoriteModality,
      favoriteHour,
      chartData,
      paymentStatusHistory
    };
  }, [selectedStudent, selectedStudentPresences, classes, payments, selectedStudentId]);

  // --- NATIVE PDF GENERATORS ---

  // 1. Download Presence Report PDF
  const handleDownloadPresencePDF = () => {
    setIsExporting(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        // Dark premium Header rect
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 38, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('JUDOKA DOJO', 15, 17);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(cleanStringForPDF('RELATORIO DE FISCALIZACAO E PRESENCA DE MEMBROS'), 15, 25);
        doc.text(cleanStringForPDF(`Periodo de Referencia: ${range === 'all' ? 'Todo o Historico' : range.toUpperCase()} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`), 15, 31);
        
        // Reset colors
        doc.setTextColor(15, 23, 42);
        
        // Document overview summary card
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 45, 180, 18, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, 45, 180, 18, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(cleanStringForPDF('TOTAL DE LANCAMENTOS NO PERIODO'), 20, 51);
        doc.setFont('helvetica', 'normal');
        doc.text(cleanStringForPDF('Este documento atesta a participacao oficial dos alunos nos treinos no quadrante selecionado.'), 20, 57);
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`${filteredPresences.length}`, 155, 56);
        
        // Table config
        const startY = 74;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        
        doc.text('Data / Hora', 15, startY);
        doc.text('Judoka (Aluno)', 55, startY);
        doc.text('Faixa / Graduaca', 115, startY);
        doc.text('Aula / Horario', 150, startY);
        doc.text('Tipo', 188, startY);
        
        // Table line
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.3);
        doc.line(15, startY + 2.5, 195, startY + 2.5);
        
        let currentY = startY + 8.5;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        
        filteredPresences.forEach((p, idx) => {
          // Page wrap safety
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text('Data / Hora', 15, currentY);
            doc.text('Judoka (Aluno)', 55, currentY);
            doc.text('Faixa / Graduaca', 115, currentY);
            doc.text('Aula / Horario', 150, currentY);
            doc.text('Tipo', 188, currentY);
            doc.line(15, currentY + 2.5, 195, currentY + 2.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(30, 41, 59);
            currentY += 8.5;
          }
          
          const student = profiles.find(pr => pr.id === p.memberId);
          const classInfo = classes.find(c => c.id === p.classId);
          
          const pDateStr = new Date(p.timestamp).toLocaleDateString('pt-BR') + ' ' + new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const nameStr = cleanStringForPDF(student?.fullName || 'Participante');
          const gradeStr = cleanStringForPDF(student?.currentGrade || 'Sem Grad.');
          const classTitle = cleanStringForPDF(classInfo?.title || 'Treino Reg');
          const typeStr = cleanStringForPDF(classInfo?.type || 'Geral');
          
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(13, currentY - 5, 184, 7, 'F');
          }
          
          doc.setTextColor(15, 23, 42);
          doc.text(pDateStr, 15, currentY);
          doc.text(nameStr.substring(0, 32), 55, currentY);
          doc.text(gradeStr, 115, currentY);
          doc.text(classTitle.substring(0, 20), 150, currentY);
          doc.text(typeStr, 188, currentY);
          
          currentY += 7;
        });
        
        doc.save(`Relatorio_Presencas_${range}__${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (err) {
        console.error("Erro ao exportar PDF de presenças:", err);
      } finally {
        setIsExporting(false);
      }
    }, 1200);
  };

  // 2. Download Payments Report PDF
  const handleDownloadPaymentPDF = () => {
    setFinanceLoading(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        // Dark premium Header rect
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 38, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('JUDOKA DOJO', 15, 17);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(cleanStringForPDF('RELATORIO MENSAL FINANCEIRO E DE ADIMPLENCIA'), 15, 25);
        doc.text(cleanStringForPDF(`Competencia: ${getMonthName(reportMonth)} de ${reportYear} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`), 15, 31);
        
        // Active summary stats box
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 45, 180, 22, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, 45, 180, 22, 'S');
        
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(cleanStringForPDF('ATIVOS REGISTRADOS'), 20, 52);
        doc.text(cleanStringForPDF('CONFIRMADOS (PAGOS)'), 80, 52);
        doc.text(cleanStringForPDF('A RECEBER (PENDENTES)'), 140, 52);
        
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.text(`${financialStats.totalStudents} Alunos`, 20, 60);
        doc.text(`${financialStats.paidCount} Alunos (R$ ${financialStats.paidVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, 80, 60);
        doc.text(`${financialStats.pendingCount} Alunos (R$ ${financialStats.pendingVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, 140, 60);
        
        // Table Columns Header
        const startY = 78;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        
        doc.text('Nome do Aluno (Judoka)', 15, startY);
        doc.text('Graduacao', 85, startY);
        doc.text('Mes de Referencia', 125, startY);
        doc.text('Status', 165, startY);
        
        // Line
        doc.setLineWidth(0.3);
        doc.line(15, startY + 2.5, 195, startY + 2.5);
        
        let currentY = startY + 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        
        activeStudentsList.forEach((student, idx) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(15, 23, 42);
            doc.text('Nome do Aluno (Judoka)', 15, currentY);
            doc.text('Graduacao', 85, currentY);
            doc.text('Mes de Referencia', 125, currentY);
            doc.text('Status', 165, currentY);
            doc.line(15, currentY + 2.5, 195, currentY + 2.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            currentY += 9;
          }
          
          const pay = payments.find(p => p.memberId === student.id && p.month === reportMonth && p.year === reportYear);
          const isPaid = pay?.status === 'paid';
          
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(13, currentY - 5, 184, 7.5, 'F');
          }
          
          doc.setTextColor(15, 23, 42);
          doc.text(cleanStringForPDF(student.fullName), 15, currentY);
          doc.text(cleanStringForPDF(student.currentGrade || 'Sem registro'), 85, currentY);
          doc.text(cleanStringForPDF(`${getMonthName(reportMonth)} / ${reportYear}`), 125, currentY);
          
          if (isPaid) {
            doc.setTextColor(16, 185, 129); // green
            doc.text('PAGO', 165, currentY);
          } else {
            doc.setTextColor(245, 158, 11); // orange
            doc.text('PENDENTE', 165, currentY);
          }
          
          currentY += 7.5;
        });
        
        doc.save(`Relatorio_Mensalidades_${cleanStringForPDF(getMonthName(reportMonth))}_${reportYear}.pdf`);
      } catch (err) {
        console.error("Erro ao exportar PDF financeiro:", err);
      } finally {
        setFinanceLoading(false);
      }
    }, 1200);
  };

  // 3. Download Single Student Card Report PDF
  const handleDownloadSingleStudentPDF = () => {
    if (!selectedStudent) return;
    setFinanceLoading(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const stdName = cleanStringForPDF(selectedStudent.fullName);
        const stdGrade = cleanStringForPDF(selectedStudent.currentGrade || 'Branca');
        
        // Dark premium Header rect
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 38, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('JUDOKA DOJO', 15, 17);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(cleanStringForPDF('FICHA DE RENDIMENTO E HISTORICO DE PRESENCAS'), 15, 25);
        doc.text(`Aluno: ${stdName.toUpperCase()} | Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, 15, 31);
        
        // Reset colors
        doc.setTextColor(15, 23, 42);
        
        // Athlete Details Block
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 45, 180, 34, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, 45, 180, 34, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('DADOS GERAIS DO ATLETA', 22, 52);
        
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        doc.text(`Nome completo: ${stdName}`, 22, 60);
        doc.text(`Graduacao / Faixa: ${stdGrade.toUpperCase()}`, 22, 66);
        doc.text(`Idade: ${selectedStudent.birthDate ? (new Date().getFullYear() - new Date(selectedStudent.birthDate).getFullYear()) + ' anos' : 'Nao informada'}`, 22, 72);
        
        doc.text(`Email: ${cleanStringForPDF(selectedStudent.email || 'Nao cadastrado')}`, 110, 60);
        doc.text(`Telefone: ${cleanStringForPDF(selectedStudent.phoneNumber || 'Nao informado')}`, 110, 66);
        doc.text(`Frequencia Acumulada: ${selectedStudentPresences.length} aulas`, 110, 72);
        
        // Table Config
        const startY = 90;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        
        doc.text(cleanStringForPDF('Historico Geral de Presencas no Tatame (Ultimos Check-ins)'), 15, startY);
        
        doc.setFontSize(8.5);
        doc.text('Data / Hora', 15, startY + 8);
        doc.text('Nome do Treino / Aula', 60, startY + 8);
        doc.text('Tipo de Aula', 135, startY + 8);
        doc.text('Status', 178, startY + 8);
        
        doc.setLineWidth(0.3);
        doc.line(15, startY + 10.5, 195, startY + 10.5);
        
        let currentY = startY + 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        
        const lastPresences = [...selectedStudentPresences]
          .sort((a,b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
          .slice(0, 18); // Show up to 18 recent
          
        lastPresences.forEach((p, idx) => {
          if (currentY > 265) {
            doc.addPage();
            currentY = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text('Data / Hora', 15, currentY);
            doc.text('Nome do Treino / Aula', 60, currentY);
            doc.text('Tipo de Aula', 135, currentY);
            doc.text('Status', 178, currentY);
            doc.line(15, currentY + 2.5, 195, currentY + 2.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            currentY += 8;
          }
          
          const classInfo = classes.find(c => c.id === p.classId);
          const pDateStr = new Date(p.timestamp).toLocaleDateString('pt-BR') + ' ' + new Date(p.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const classTitle = classInfo ? cleanStringForPDF(classInfo.title) : 'Treino Geral';
          const typeStr = classInfo ? cleanStringForPDF(classInfo.type) : 'Treino';
          
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(13, currentY - 4.5, 184, 6.5, 'F');
          }
          
          doc.setTextColor(15, 23, 42);
          doc.text(pDateStr, 15, currentY);
          doc.text(classTitle.substring(0, 36), 60, currentY);
          doc.text(typeStr, 135, currentY);
          
          doc.setTextColor(16, 185, 129);
          doc.text('PRESENTE', 178, currentY);
          
          currentY += 6.5;
        });
        
        if (lastPresences.length === 0) {
          doc.setTextColor(100, 116, 139);
          doc.text('Nao foram encontrados check-ins ou registros no historico deste aluno.', 25, currentY + 8);
          currentY += 15;
        }
        
        // Signatures at bottom
        if (currentY > 230) {
          doc.addPage();
          currentY = 40;
        } else {
          currentY = Math.max(currentY + 25, 230);
        }
        
        doc.setLineWidth(0.4);
        doc.setDrawColor(148, 163, 184);
        doc.line(25, currentY, 85, currentY);
        doc.line(125, currentY, 185, currentY);
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text('Assinatura do Sensei / Coordenador', 55, currentY + 5, { align: 'center' });
        doc.text('Assinatura do Aluno ou Responsavel', 155, currentY + 5, { align: 'center' });
        
        doc.save(`Ficha_Judoka_${stdName.replace(/\s+/g, '_')}.pdf`);
      } catch (err) {
        console.error("Erro ao exportar PDF individual:", err);
      } finally {
        setFinanceLoading(false);
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Navigation/Selection Tabs */}
      <div className="flex border-b border-slate-100 pb-px gap-3 overflow-x-auto">
        <button
          onClick={() => setActiveTabTab('attendance')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0",
            activeTab === 'attendance'
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <Activity className="w-4 h-4" />
          <span>Frequência & Presença</span>
        </button>
        <button
          onClick={() => setActiveTabTab('students')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0",
            activeTab === 'students'
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Estatísticas de Alunos</span>
        </button>
        <button
          onClick={() => setActiveTabTab('finance')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0",
            activeTab === 'finance'
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <Wallet className="w-4 h-4" />
          <span>Controle Financeiro</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'attendance' ? (

          <motion.div
            key="atts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Presence Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Painel de Frequência</h3>
                <p className="text-xs text-slate-400 mt-1">Estatísticas e auditoria detalhada de check-ins por alunos e aulas.</p>
              </div>
              
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-2.5 rounded-lg border transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider",
                    showFilters ? "bg-indigo-50 border-indigo-200 text-indigo-600" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Período</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showFilters && "rotate-180")} />
                </button>
                
                <button 
                  onClick={handleDownloadPresencePDF}
                  disabled={isExporting || filteredPresences.length === 0}
                  className="bg-[#0a0a0a] text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-slate-800 transition-all shadow-md disabled:opacity-50"
                >
                  {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>BAIXAR PDF</span>
                </button>
              </div>
            </div>

            {/* Time Filter Sub-panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex flex-wrap gap-2.5">
                    {[
                      { id: 'today', label: 'Hoje' },
                      { id: 'week', label: 'Esta Semana' },
                      { id: 'month', label: 'Este Mês' },
                      { id: 'year', label: 'Este Ano' },
                      { id: 'all', label: 'Todo o Histórico' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setRange(opt.id as TimeRange)}
                        className={cn(
                          "px-4 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all",
                          range === opt.id ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/10" : "bg-white border border-slate-200 text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* In-app Graphical Presence Reports! */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Presences by Student */}
              <div className="bg-white p-5 border border-slate-150 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <BarChart4 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 leading-none">Presenças por Aluno (Top 10)</h4>
                    <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">Quem mais treinou no período ({range === 'all' ? 'Histórico' : range})</p>
                  </div>
                </div>

                <div className="h-60 w-full">
                  {studentPresenceData.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Activity className="w-8 h-8 opacity-30 animate-pulse mb-1.5" />
                      <span className="text-xs font-bold text-slate-400">Nenhuma presença computada</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={studentPresenceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                        <XAxis 
                          dataKey="name" 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#94a3b8" 
                          fontSize={9} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            fontSize: '11px', 
                            fontFamily: 'Inter, sans-serif', 
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                          }} 
                        />
                        <Bar dataKey="Presenças" fill="#6366f1" radius={[6, 6, 0, 0]}>
                          {studentPresenceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#4f46e5'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Presences by Class (Aulas) */}
              <div className="bg-white p-5 border border-slate-150 rounded-[2rem] shadow-sm">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 leading-none">Presenças por Aulas/Treinos</h4>
                    <p className="text-[10px] text-slate-400 mt-1">Sessões e turmas com maior engajamento</p>
                  </div>
                </div>

                <div className="h-60 w-full">
                  {classPresenceData.length === 0 ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                      <Activity className="w-8 h-8 opacity-30 animate-pulse mb-1.5" />
                      <span className="text-xs font-bold text-slate-400">Nenhuma aula registrada com presenças</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={classPresenceData} layout="vertical" margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" horizontal={false} />
                        <XAxis 
                          type="number"
                          stroke="#94a3b8" 
                          fontSize={9} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <YAxis 
                          type="category"
                          dataKey="name" 
                          stroke="#475569" 
                          fontSize={9} 
                          fontWeight="bold" 
                          tickLine={false} 
                          axisLine={false}
                          width={100}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #e2e8f0', 
                            fontSize: '11px', 
                            fontWeight: 'bold',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                          }} 
                        />
                        <Bar dataKey="Frequentadores" fill="#10b981" radius={[0, 6, 6, 0]}>
                          {classPresenceData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

            </div>

            {/* Quick Summary Cards below charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Check-ins Atuais</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{filteredPresences.length}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Média de Alunos / Aula</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {(filteredPresences.length / Math.max(1, classes.length)).toFixed(1)}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 leading-none">Treinos Mapeados</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{classes.length}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Table layout of Check-ins */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Histórico Recente de Presenças</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Abaixo constam as últimas 20 presenças</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aluno</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Graduação</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aula/Treino</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPresences.slice(0, 20).map((p, idx) => {
                      const student = profiles.find(pr => pr.id === p.memberId);
                      const classData = classes.find(c => c.id === p.classId);
                      return (
                        <tr key={`${p.id}-${p.classId || idx}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-slate-500">{formatDate(p.timestamp)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-900">{student?.fullName || 'Visitante'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{student?.currentGrade || 'Sem faixa'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-semibold text-slate-700">{classData?.title || 'Treino Geral'}</span>
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
                    {filteredPresences.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                          Nenhum check-in registrado no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        ) : activeTab === 'students' ? (
          <motion.div
            key="studs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Title & Desc */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Desempenho e Estatísticas por Aluno</h3>
                <p className="text-xs text-slate-400 mt-1">Busque alunos para consultar histórico detalhado, frequência em tempo real e exportar a ficha de rendimentos.</p>
              </div>
            </div>

            {/* Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Selector Panel: Student Search & List */}
              <div className="lg:col-span-1 bg-white p-5 border border-slate-200 rounded-[2rem] shadow-sm flex flex-col h-[650px]">
                <div className="relative mb-4">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar aluno..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-500 transition-all font-sans"
                  />
                </div>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs scrollbar-thin">
                  {filteredStudentProfiles.map((student, idx) => {
                    const isSelected = student.id === selectedStudentId;
                    return (
                      <button
                        key={`${student.id}-${idx}`}
                        type="button"
                        onClick={() => setSelectedStudentId(student.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border border-transparent",
                          isSelected 
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/15 border-indigo-700"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 hover:border-slate-200"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-black uppercase text-xs shrink-0",
                          isSelected ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                        )}>
                          {student.fullName ? student.fullName.substring(0, 2) : 'JD'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate text-xs">{student.fullName}</p>
                          <p className={cn(
                            "text-[10px] uppercase tracking-wider font-extrabold mt-0.5",
                            isSelected ? "text-indigo-200" : "text-slate-400"
                          )}>
                            Faixa {student.currentGrade || 'Branca'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                  {filteredStudentProfiles.length === 0 && (
                    <div className="text-center py-10 text-slate-400 uppercase tracking-widest font-bold text-[10px]">
                      Nenhum aluno encontrado
                    </div>
                  )}
                </div>
              </div>

              {/* Right Details Panel: Student Metrics Dashboard */}
              <div className="lg:col-span-2 space-y-6">
                {selectedStudent ? (
                  <>
                    {/* Selected Student profile summary */}
                    <div className="bg-white p-6 border border-slate-200 rounded-[2rem] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center font-black uppercase text-lg text-indigo-600 border border-indigo-100 shrink-0">
                          {selectedStudent.fullName ? selectedStudent.fullName.substring(0, 2) : 'JD'}
                        </div>
                        <div>
                          <h4 className="text-xl font-black text-slate-900 leading-none">{selectedStudent.fullName}</h4>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex items-center text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              Faixa {selectedStudent.currentGrade || 'Branca'}
                            </span>
                            {selectedStudent.birthDate && (
                              <span className="text-[10px] font-bold text-slate-400">
                                • {new Date().getFullYear() - new Date(selectedStudent.birthDate).getFullYear()} anos
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400">
                              • Atleta {selectedStudent.status || 'Ativo'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={handleDownloadSingleStudentPDF}
                        type="button"
                        className="bg-slate-950 text-white hover:bg-slate-800 transition-all px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm self-start md:self-auto shrink-0 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>FICHA EM PDF</span>
                      </button>
                    </div>

                    {/* Bento stats grid */}
                    {singleStudentStats && (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Total de Treinos</span>
                          <p className="text-2xl font-black text-slate-900 mt-1">{singleStudentStats.totalCount}</p>
                          <span className="text-[9px] text-slate-400 font-medium block mt-1">Registros totais</span>
                        </div>
                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Últimos 30 Dias</span>
                          <p className="text-2xl font-black text-indigo-600 mt-1">{singleStudentStats.last30DaysCount}</p>
                          <span className="text-[9px] text-slate-400 font-medium block mt-1">Check-ins recentes</span>
                        </div>
                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Modalidade Freq.</span>
                          <p className="text-xs font-black text-emerald-600 mt-2 truncate uppercase tracking-tight">{singleStudentStats.favoriteModality}</p>
                          <span className="text-[9px] text-slate-400 font-medium block mt-1">Preferência de treino</span>
                        </div>
                        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block">Horário Comum</span>
                          <p className="text-xs font-black text-amber-600 mt-2 truncate">{singleStudentStats.favoriteHour}</p>
                          <span className="text-[9px] text-slate-400 font-medium block mt-1">Mais frequente</span>
                        </div>
                      </div>
                    )}

                    {/* Attendance Analysis Chart */}
                    <div className="bg-white p-5 border border-slate-200 rounded-[2rem] shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Frequência Mensal (Últimos 6 meses)</h4>
                      </div>
                      <div className="h-48 w-full">
                        {singleStudentStats && singleStudentStats.chartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={singleStudentStats.chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f8fafc" vertical={false} />
                              <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                              <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" allowDecimals={false} />
                              <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }} />
                              <Bar dataKey="Aulas Assistidas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                            Nenhum dado mensal disponível.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Financial Health */}
                    <div className="bg-white p-5 border border-slate-200 rounded-[2rem] shadow-sm">
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-500" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Situação Financeira Recente</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100">
                          Mensalidade ativa: R$ {(settings?.monthlyValue || 150).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {singleStudentStats?.paymentStatusHistory.map((item, idx) => {
                          const isPaid = item.status === 'paid';
                          return (
                            <div key={`${item.label}-${idx}`} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                              <div>
                                <p className="text-[10px] font-bold text-slate-500">{item.label}</p>
                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Mensalidade</p>
                              </div>
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> PAGO
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full animate-pulse">
                                  <AlertCircle className="w-3 h-3" /> PENDENTE
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Tatame Logs for selected Student */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-5 border-b border-slate-100">
                        <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Últimos Lançamentos de Treino</h4>
                      </div>
                      <div className="overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-400">Data / Treino</th>
                              <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-400">Horário</th>
                              <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-400">Atividade</th>
                              <th className="px-5 py-3 font-black uppercase tracking-widest text-slate-400">Check-in Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedStudentPresences.slice(0, 10).map((p, pIdx) => {
                              const classInfo = classes.find(c => c.id === p.classId);
                              return (
                                <tr key={`${p.id}-${pIdx}`} className="hover:bg-slate-50/20">
                                  <td className="px-5 py-3 font-semibold text-slate-700">
                                    {formatDate(p.timestamp)}
                                  </td>
                                  <td className="px-5 py-3 font-bold text-slate-900">
                                    {classInfo?.time || '--:--'}
                                  </td>
                                  <td className="px-5 py-3">
                                    <span className="font-bold text-slate-900">{classInfo?.title || 'Treino Regimental'}</span>
                                    <span className="block text-[10px] text-slate-400 mt-0.5">{classInfo?.type || 'Geral'}</span>
                                  </td>
                                  <td className="px-5 py-3 font-bold text-green-600">
                                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase">
                                      Confirmado
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {selectedStudentPresences.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                  Nenhum registro de treino encontrado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-white p-10 border border-slate-200 rounded-[2rem] shadow-sm text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-bold text-slate-500">Selecione um aluno na coluna lateral para iniciar a análise.</p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="fins"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Financial Report Section Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">Auditoria Mensal de Mensalidades</h3>
                <p className="text-xs text-slate-400 mt-1">Audite recebimentos gerais, inadimplência e baixe relatórios contábeis.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Reference controls */}
                <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-sm">
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(Number(e.target.value))}
                    className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    {months.map(m => (
                      <option key={m} value={m}>{getMonthName(m)}</option>
                    ))}
                  </select>
                  <div className="w-px h-4 bg-slate-250" />
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="bg-transparent border-none text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleDownloadPaymentPDF}
                  disabled={financeLoading || activeStudentsList.length === 0}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-md disabled:opacity-50"
                >
                  {financeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  <span>BAIXAR RELATÓRIO PDF</span>
                </button>
              </div>
            </div>

            {/* Financial Status Summary Quick-Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white p-5 border border-slate-150 rounded-[1.5rem] shadow-sm flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Taxa de Adimplência</span>
                <p className="text-2xl font-black text-slate-800 mt-1.5 leading-none">{financialStats.percent}%</p>
                <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full" style={{ width: `${financialStats.percent}%` }} />
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-150 rounded-[1.5rem] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Recebido (Pago)</span>
                  <p className="text-xl font-black text-emerald-600 mt-1 leading-none">
                    R$ {financialStats.paidVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-150 rounded-[1.5rem] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">A Receber (Pendente)</span>
                  <p className="text-xl font-black text-amber-600 mt-1 leading-none">
                    R$ {financialStats.pendingVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-150 rounded-[1.5rem] shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Faturamento Previsto</span>
                  <p className="text-xl font-black text-slate-900 mt-1 leading-none">
                    R$ {financialStats.totalVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-700 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* List with Payment details of Students */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Fluxo de Caixa e Adimplência por Aluno</h4>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100">
                  {financialStats.paidCount} de {financialStats.totalStudents} Pagos
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Aluno</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Graduação / Faixa</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Mês de Referência</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status financeiro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeStudentsList.map((student, idx) => {
                      const payDoc = payments.find(p => p.memberId === student.id && p.month === reportMonth && p.year === reportYear);
                      const isPaid = payDoc?.status === 'paid';

                      return (
                        <tr key={`${student.id}-${idx}`} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-900">{student.fullName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{student.currentGrade || 'Sem registro'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-medium text-slate-600">{getMonthName(reportMonth)} / {reportYear}</span>
                          </td>
                          <td className="px-6 py-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" /> PAGO (R$ {(settings?.monthlyValue || 150).toLocaleString('pt-BR')})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-bold">
                                <AlertCircle className="w-3.5 h-3.5" /> PENDENTE (R$ {(settings?.monthlyValue || 150).toLocaleString('pt-BR')})
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {activeStudentsList.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50">
                          Nenhum aluno registrado encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
