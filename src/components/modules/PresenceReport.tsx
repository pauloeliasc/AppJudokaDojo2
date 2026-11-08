import React, { useState, useMemo } from 'react';
import { Presence, Profile, ClassSession, ClassType, Payment, Settings } from '../../types';
import { 
  Download, 
  FileText, 
  FileSpreadsheet,
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
  Sparkles,
  ArrowUpDown,
  Table as TableIcon,
  FileDown,
  Layers,
  Check,
  X
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
  CartesianGrid 
} from 'recharts';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';

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

// Safe helper to extract Date from Presence record
const getPresenceDate = (p: Presence): Date | null => {
  if (p.timestamp) {
    const d = new Date(p.timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  if (p.checkInDate && p.checkInDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = p.checkInDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return null;
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
type AttendanceViewMode = 'monthly_matrix' | 'general_summary' | 'single_month' | 'raw_checkins';

export default function PresenceReport({ 
  presences, 
  profiles, 
  classes, 
  payments = [], 
  settings = null 
}: PresenceReportProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('attendance');
  const [viewMode, setViewMode] = useState<AttendanceViewMode>('monthly_matrix');
  const [range, setRange] = useState<TimeRange>('year');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Year and Month selection for monthly division
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [matrixSearch, setMatrixSearch] = useState<string>('');
  const [matrixSort, setMatrixSort] = useState<'total_desc' | 'name_asc' | 'grade'>('total_desc');

  // Student statistics tab state
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');

  // Financial report selections
  const [reportMonth, setReportMonth] = useState<number>(currentMonthNum);
  const [reportYear, setReportYear] = useState<number>(currentYearNum);
  const [financeLoading, setFinanceLoading] = useState(false);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Dynamic list of available years based on presences
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>([currentYearNum, currentYearNum - 1]);
    presences.forEach(p => {
      const d = getPresenceDate(p);
      if (d) yearsSet.add(d.getFullYear());
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [presences, currentYearNum]);

  // List of active students (exclude administrative or inactive profiles if needed)
  const activeStudentsList = useMemo(() => {
    return profiles.filter(p => !p.role || p.role === 'student');
  }, [profiles]);

  // --- MONTHLY DIVISION MATRIX COMPUTATION ---
  // Calculates student attendance divided month-by-month for the selected year
  const monthlyMatrixData = useMemo(() => {
    // Presences in the selected year
    const yearPresences = presences.filter(p => {
      const d = getPresenceDate(p);
      return d && d.getFullYear() === selectedYear;
    });

    // Map memberId -> array of 12 month counts
    const memberMonthCounts: Record<string, number[]> = {};
    const memberAllTimeCounts: Record<string, number> = {};
    const memberLastPresence: Record<string, Date> = {};

    // First, calculate all-time counts and last presence
    presences.forEach(p => {
      memberAllTimeCounts[p.memberId] = (memberAllTimeCounts[p.memberId] || 0) + 1;
      const d = getPresenceDate(p);
      if (d) {
        if (!memberLastPresence[p.memberId] || d > memberLastPresence[p.memberId]) {
          memberLastPresence[p.memberId] = d;
        }
      }
    });

    // Second, calculate month-by-month counts for selected year
    yearPresences.forEach(p => {
      const d = getPresenceDate(p);
      if (!d) return;
      const mIdx = d.getMonth(); // 0 to 11
      if (!memberMonthCounts[p.memberId]) {
        memberMonthCounts[p.memberId] = new Array(12).fill(0);
      }
      memberMonthCounts[p.memberId][mIdx] = (memberMonthCounts[p.memberId][mIdx] || 0) + 1;
    });

    // Totals per month for the entire dojo
    const dojoTotalsPerMonth = new Array(12).fill(0);
    yearPresences.forEach(p => {
      const d = getPresenceDate(p);
      if (d) {
        dojoTotalsPerMonth[d.getMonth()]++;
      }
    });

    // Structure student rows
    const studentRows = activeStudentsList.map(student => {
      const monthsCount = memberMonthCounts[student.id] || new Array(12).fill(0);
      const yearTotal = monthsCount.reduce((acc, curr) => acc + curr, 0);
      const activeMonths = monthsCount.filter(c => c > 0).length;
      const monthlyAverage = Number((yearTotal / 12).toFixed(1));
      const activeMonthlyAverage = activeMonths > 0 ? Number((yearTotal / activeMonths).toFixed(1)) : 0;
      const allTimeTotal = memberAllTimeCounts[student.id] || 0;
      const lastPresence = memberLastPresence[student.id] || null;

      return {
        id: student.id,
        fullName: student.fullName,
        callNumber: student.callNumber || '',
        currentGrade: student.currentGrade || 'Branca',
        email: student.email || '',
        phoneNumber: student.phoneNumber || '',
        status: student.status || 'active',
        months: monthsCount,
        yearTotal,
        monthlyAverage,
        activeMonthlyAverage,
        allTimeTotal,
        lastPresence
      };
    });

    // Filter by search query
    const filteredRows = studentRows.filter(s => {
      if (!matrixSearch.trim()) return true;
      const query = matrixSearch.toLowerCase();
      return (
        s.fullName.toLowerCase().includes(query) ||
        s.currentGrade.toLowerCase().includes(query) ||
        (s.callNumber && s.callNumber.toLowerCase().includes(query))
      );
    });

    // Sort rows
    filteredRows.sort((a, b) => {
      if (matrixSort === 'total_desc') {
        if (b.yearTotal !== a.yearTotal) return b.yearTotal - a.yearTotal;
        return a.fullName.localeCompare(b.fullName);
      }
      if (matrixSort === 'name_asc') {
        return a.fullName.localeCompare(b.fullName);
      }
      if (matrixSort === 'grade') {
        return (a.currentGrade || '').localeCompare(b.currentGrade || '');
      }
      return 0;
    });

    const dojoYearGrandTotal = dojoTotalsPerMonth.reduce((a, b) => a + b, 0);
    const studentsWithPresenceInYear = studentRows.filter(s => s.yearTotal > 0).length;
    
    // Find best month of the year
    let maxMonthIdx = 0;
    let maxMonthVal = 0;
    dojoTotalsPerMonth.forEach((val, idx) => {
      if (val > maxMonthVal) {
        maxMonthVal = val;
        maxMonthIdx = idx;
      }
    });

    return {
      studentRows: filteredRows,
      allStudentRows: studentRows,
      dojoTotalsPerMonth,
      dojoYearGrandTotal,
      studentsWithPresenceInYear,
      bestMonth: {
        month: maxMonthIdx + 1,
        name: getMonthName(maxMonthIdx + 1),
        count: maxMonthVal
      }
    };
  }, [presences, selectedYear, activeStudentsList, matrixSearch, matrixSort]);

  // --- FILTERED PRESENCES (General Time Range Tab) ---
  const filteredPresences = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    return presences.filter(p => {
      const pDate = getPresenceDate(p);
      if (!pDate) return false;
      if (range === 'today') return pDate >= startOfToday;
      if (range === 'week') return pDate >= startOfWeek;
      if (range === 'month') return pDate >= startOfMonth;
      if (range === 'year') return pDate >= startOfYear;
      return true;
    });
  }, [presences, range]);

  // --- SPECIFIC MONTH FILTERED DATA ---
  const singleMonthData = useMemo(() => {
    const monthPresences = presences.filter(p => {
      const d = getPresenceDate(p);
      return d && d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
    });

    const studentCounts: Record<string, number> = {};
    monthPresences.forEach(p => {
      studentCounts[p.memberId] = (studentCounts[p.memberId] || 0) + 1;
    });

    const studentList = activeStudentsList.map(s => ({
      ...s,
      monthPresences: studentCounts[s.id] || 0
    })).sort((a, b) => b.monthPresences - a.monthPresences);

    return {
      presences: monthPresences,
      studentList,
      totalPresences: monthPresences.length,
      activeAttendees: studentList.filter(s => s.monthPresences > 0).length
    };
  }, [presences, selectedYear, selectedMonth, activeStudentsList]);

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
      .slice(0, 10);
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
      .slice(0, 6);
  }, [filteredPresences, classes]);

  // --- FINANCIAL CALCULATION FOR SELECTED TARGET MONTH ---
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
    
    const classTypeCounts: Record<string, number> = {};
    const hourCounts: Record<string, number> = {};
    
    selectedStudentPresences.forEach(p => {
      const classInfo = classes.find(c => c.id === p.classId);
      if (classInfo) {
        classTypeCounts[classInfo.type] = (classTypeCounts[classInfo.type] || 0) + 1;
        hourCounts[classInfo.time] = (hourCounts[classInfo.time] || 0) + 1;
      }
    });

    const favoriteModality = Object.entries(classTypeCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Geral/Livre';
      
    const favoriteHour = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Treinos Variados';

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last30DaysCount = selectedStudentPresences.filter(p => {
      const d = getPresenceDate(p);
      return d && d >= thirtyDaysAgo;
    }).length;

    const historyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${getMonthName(d.getMonth() + 1).slice(0, 3)}/${d.getFullYear().toString().substring(2)}`;
      historyMap[key] = 0;
    }

    selectedStudentPresences.forEach(p => {
      const pDate = getPresenceDate(p);
      if (!pDate) return;
      const key = `${getMonthName(pDate.getMonth() + 1).slice(0, 3)}/${pDate.getFullYear().toString().substring(2)}`;
      if (key in historyMap) {
        historyMap[key]++;
      }
    });

    const chartData = Object.entries(historyMap).map(([name, count]) => ({
      name,
      'Aulas Assistidas': count
    }));

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

  // ==========================================
  // --- EXCEL (.XLSX) EXPORT IMPLEMENTATION ---
  // ==========================================
  const handleExportExcel = (mode: 'monthly_all' | 'general' | 'single_month' = 'monthly_all') => {
    setIsExportingExcel(true);
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();

        // 1. Sheet: Monthly Division (Mês a Mês por Aluno)
        const monthlyExportRows = monthlyMatrixData.allStudentRows.map((s, idx) => ({
          'Nº Chamada': s.callNumber || (idx + 1),
          'Aluno (Judoka)': s.fullName,
          'Graduação / Faixa': s.currentGrade || 'Branca',
          'Status': s.status === 'active' ? 'Ativo' : (s.status || 'Ativo'),
          'Jan': s.months[0],
          'Fev': s.months[1],
          'Mar': s.months[2],
          'Abr': s.months[3],
          'Mai': s.months[4],
          'Jun': s.months[5],
          'Jul': s.months[6],
          'Ago': s.months[7],
          'Set': s.months[8],
          'Out': s.months[9],
          'Nov': s.months[10],
          'Dez': s.months[11],
          'Total no Ano': s.yearTotal,
          'Média Mensal': s.monthlyAverage,
          'Total Histórico': s.allTimeTotal
        }));

        // Footer Total Row for the Dojo
        const dojoTotalRow = {
          'Nº Chamada': '',
          'Aluno (Judoka)': 'TOTAL DO DOJÔ NO MÊS',
          'Graduação / Faixa': 'TODAS AS FAIXAS',
          'Status': 'CONSOLIDADO',
          'Jan': monthlyMatrixData.dojoTotalsPerMonth[0],
          'Fev': monthlyMatrixData.dojoTotalsPerMonth[1],
          'Mar': monthlyMatrixData.dojoTotalsPerMonth[2],
          'Abr': monthlyMatrixData.dojoTotalsPerMonth[3],
          'Mai': monthlyMatrixData.dojoTotalsPerMonth[4],
          'Jun': monthlyMatrixData.dojoTotalsPerMonth[5],
          'Jul': monthlyMatrixData.dojoTotalsPerMonth[6],
          'Ago': monthlyMatrixData.dojoTotalsPerMonth[7],
          'Set': monthlyMatrixData.dojoTotalsPerMonth[8],
          'Out': monthlyMatrixData.dojoTotalsPerMonth[9],
          'Nov': monthlyMatrixData.dojoTotalsPerMonth[10],
          'Dez': monthlyMatrixData.dojoTotalsPerMonth[11],
          'Total no Ano': monthlyMatrixData.dojoYearGrandTotal,
          'Média Mensal': Number((monthlyMatrixData.dojoYearGrandTotal / 12).toFixed(1)),
          'Total Histórico': presences.length
        };
        monthlyExportRows.push(dojoTotalRow);

        const wsMonthly = XLSX.utils.json_to_sheet(monthlyExportRows);
        wsMonthly['!cols'] = [
          { wch: 12 }, // Nº Chamada
          { wch: 32 }, // Aluno
          { wch: 20 }, // Faixa
          { wch: 12 }, // Status
          { wch: 8 },  // Jan
          { wch: 8 },  // Fev
          { wch: 8 },  // Mar
          { wch: 8 },  // Abr
          { wch: 8 },  // Mai
          { wch: 8 },  // Jun
          { wch: 8 },  // Jul
          { wch: 8 },  // Ago
          { wch: 8 },  // Set
          { wch: 8 },  // Out
          { wch: 8 },  // Nov
          { wch: 8 },  // Dez
          { wch: 15 }, // Total no Ano
          { wch: 15 }, // Média Mensal
          { wch: 16 }  // Total Histórico
        ];
        XLSX.utils.book_append_sheet(wb, wsMonthly, `Frequencia_Mensal_${selectedYear}`);

        // 2. Sheet: Relatório Geral Consolidado
        const generalExportRows = monthlyMatrixData.allStudentRows.map((s, idx) => ({
          'Ranking': idx + 1,
          'Aluno (Judoka)': s.fullName,
          'Graduação': s.currentGrade,
          'Status': s.status,
          'Presenças no Ano': s.yearTotal,
          'Total Acumulado': s.allTimeTotal,
          'Média Mensal': s.monthlyAverage,
          'Último Treino': s.lastPresence ? s.lastPresence.toLocaleDateString('pt-BR') : 'Sem registros',
          'Email': s.email || '-',
          'Telefone': s.phoneNumber || '-'
        }));
        const wsGeneral = XLSX.utils.json_to_sheet(generalExportRows);
        wsGeneral['!cols'] = [
          { wch: 10 },
          { wch: 32 },
          { wch: 20 },
          { wch: 12 },
          { wch: 18 },
          { wch: 18 },
          { wch: 14 },
          { wch: 16 },
          { wch: 28 },
          { wch: 18 }
        ];
        XLSX.utils.book_append_sheet(wb, wsGeneral, "Relatorio_Geral_Alunos");

        // 3. Sheet: Detalhamento do Mês Ativo (se aplicável)
        const monthActiveRows = singleMonthData.studentList.map((s, idx) => ({
          'Posição': idx + 1,
          'Aluno': s.fullName,
          'Graduação': s.currentGrade || 'Branca',
          [`Presenças em ${getMonthName(selectedMonth)}/${selectedYear}`]: s.monthPresences,
          'Frequência': s.monthPresences > 0 ? 'Presente' : 'Sem registro no mês'
        }));
        const wsSingleMonth = XLSX.utils.json_to_sheet(monthActiveRows);
        wsSingleMonth['!cols'] = [
          { wch: 10 },
          { wch: 32 },
          { wch: 20 },
          { wch: 28 },
          { wch: 22 }
        ];
        XLSX.utils.book_append_sheet(wb, wsSingleMonth, `${getMonthName(selectedMonth).slice(0, 3)}_${selectedYear}`);

        // 4. Sheet: Histórico Individual de Check-ins do Ano
        const yearPresencesSorted = presences
          .filter(p => {
            const d = getPresenceDate(p);
            return d && d.getFullYear() === selectedYear;
          })
          .sort((a, b) => new Date(b.timestamp || '').getTime() - new Date(a.timestamp || '').getTime());

        const checkinRows = yearPresencesSorted.slice(0, 500).map(p => {
          const student = profiles.find(pr => pr.id === p.memberId);
          const classInfo = classes.find(c => c.id === p.classId);
          const pDate = getPresenceDate(p);
          return {
            'Data': pDate ? pDate.toLocaleDateString('pt-BR') : p.checkInDate,
            'Hora': pDate ? pDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
            'Mês': pDate ? getMonthName(pDate.getMonth() + 1) : '-',
            'Aluno': student?.fullName || 'Visitante',
            'Graduação': student?.currentGrade || 'Sem registro',
            'Aula / Treino': classInfo?.title || 'Treino Regimental',
            'Modalidade': classInfo?.type || 'Geral'
          };
        });
        const wsCheckins = XLSX.utils.json_to_sheet(checkinRows);
        wsCheckins['!cols'] = [
          { wch: 14 },
          { wch: 10 },
          { wch: 14 },
          { wch: 32 },
          { wch: 20 },
          { wch: 26 },
          { wch: 16 }
        ];
        XLSX.utils.book_append_sheet(wb, wsCheckins, "Historico_Checkins");

        // Write file (Excel .xlsx compatible with Microsoft Excel, LibreOffice Calc, and Google Sheets)
        const fileName = `Relatorio_Frequencia_Alunos_Mensal_${selectedYear}.xlsx`;
        XLSX.writeFile(wb, fileName);
      } catch (err) {
        console.error("Erro ao gerar planilha Excel:", err);
      } finally {
        setIsExportingExcel(false);
        setIsExportModalOpen(false);
      }
    }, 400);
  };

  // ==========================================
  // --- PDF EXPORT IMPLEMENTATIONS ---
  // ==========================================

  // 1. Download Monthly Division PDF (Landscape A4: Month-by-month student attendance)
  const handleDownloadMonthlyPDF = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = 297;
        const pageHeight = 210;

        // Header Dark Navy
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, pageWidth, 30, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('JUDOKA DOJO', 14, 12);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(cleanStringForPDF('RELATORIO ANUAL DE FREQUENCIA - DIVISAO MENSAL DOS ALUNOS'), 14, 18);
        doc.text(cleanStringForPDF(`Ano de Referencia: ${selectedYear} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} | Total de Alunos: ${activeStudentsList.length}`), 14, 24);
        
        // Summary bar below header
        doc.setFillColor(248, 250, 252);
        doc.rect(14, 34, pageWidth - 28, 12, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(14, 34, pageWidth - 28, 12, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text(cleanStringForPDF(`TOTAL DE PRESENCAS NO ANO: ${monthlyMatrixData.dojoYearGrandTotal}`), 20, 41.5);
        doc.text(cleanStringForPDF(`ALUNOS PRESENTES NO ANO: ${monthlyMatrixData.studentsWithPresenceInYear} de ${activeStudentsList.length}`), 95, 41.5);
        doc.text(cleanStringForPDF(`MES COM MAIOR FREQUENCIA: ${cleanStringForPDF(monthlyMatrixData.bestMonth.name).toUpperCase()} (${monthlyMatrixData.bestMonth.count} presencas)`), 175, 41.5);

        // Columns layout
        // Start X = 14mm. Total width = 269mm.
        // Aluno: 52mm, Faixa: 25mm, 12 Meses: 12*13mm = 156mm, Total: 18mm, Media: 18mm = 269mm.
        const startY = 53;
        const colX = {
          name: 14,
          grade: 66,
          months: [91, 104, 117, 130, 143, 156, 169, 182, 195, 208, 221, 234],
          total: 247,
          avg: 265
        };

        const renderTableHeader = (y: number) => {
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y - 4, pageWidth - 28, 7.5, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);

          doc.text('Aluno (Judoka)', colX.name + 2, y);
          doc.text('Graduacao', colX.grade, y);
          const monthShorts = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          monthShorts.forEach((m, idx) => {
            doc.text(m, colX.months[idx], y);
          });
          doc.text('Total', colX.total, y);
          doc.text('Media/m', colX.avg, y);

          doc.setDrawColor(203, 213, 225);
          doc.line(14, y + 3.5, pageWidth - 14, y + 3.5);
        };

        renderTableHeader(startY);

        let currentY = startY + 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);

        monthlyMatrixData.allStudentRows.forEach((student, idx) => {
          // Page break check
          if (currentY > pageHeight - 22) {
            doc.addPage();
            currentY = 20;
            renderTableHeader(currentY);
            currentY += 8;
          }

          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(14, currentY - 3.5, pageWidth - 28, 5.5, 'F');
          }

          doc.setTextColor(15, 23, 42);
          doc.setFont('helvetica', student.yearTotal > 0 ? 'bold' : 'normal');
          doc.text(cleanStringForPDF(student.fullName).substring(0, 28), colX.name + 2, currentY);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
          doc.text(cleanStringForPDF(student.currentGrade || 'Branca').substring(0, 14), colX.grade, currentY);

          // Render month counts
          student.months.forEach((count, mIdx) => {
            if (count > 0) {
              doc.setTextColor(30, 41, 59);
              doc.setFont('helvetica', 'bold');
              doc.text(String(count), colX.months[mIdx] + 1, currentY);
            } else {
              doc.setTextColor(203, 213, 225);
              doc.setFont('helvetica', 'normal');
              doc.text('-', colX.months[mIdx] + 1, currentY);
            }
          });

          // Total & Average
          doc.setFont('helvetica', 'bold');
          if (student.yearTotal > 0) {
            doc.setTextColor(79, 70, 229); // indigo
            doc.text(String(student.yearTotal), colX.total, currentY);
            doc.setTextColor(15, 23, 42);
            doc.text(String(student.monthlyAverage), colX.avg, currentY);
          } else {
            doc.setTextColor(148, 163, 184);
            doc.text('0', colX.total, currentY);
            doc.text('0.0', colX.avg, currentY);
          }

          currentY += 5.5;
        });

        // Totals Footer Row
        if (currentY > pageHeight - 22) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFillColor(15, 23, 42);
        doc.rect(14, currentY - 3.5, pageWidth - 28, 6.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text('TOTAL MENSAL DO DOJO', colX.name + 2, currentY + 0.5);

        monthlyMatrixData.dojoTotalsPerMonth.forEach((val, idx) => {
          doc.text(String(val), colX.months[idx] + 1, currentY + 0.5);
        });

        doc.text(String(monthlyMatrixData.dojoYearGrandTotal), colX.total, currentY + 0.5);
        doc.text(String((monthlyMatrixData.dojoYearGrandTotal / 12).toFixed(1)), colX.avg, currentY + 0.5);

        doc.save(`Relatorio_Frequencia_Mensal_Alunos_${selectedYear}.pdf`);
      } catch (err) {
        console.error("Erro ao gerar PDF mensal:", err);
      } finally {
        setIsExportingPDF(false);
        setIsExportModalOpen(false);
      }
    }, 400);
  };

  // 2. Download General Presence Report PDF (Portrait A4: Raw check-in logs or overall summary)
  const handleDownloadGeneralPDF = () => {
    setIsExportingPDF(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
        // Header
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 36, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.text('JUDOKA DOJO', 15, 16);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.text(cleanStringForPDF('RELATORIO GERAL CONSOLIDADO DE PRESENCAS'), 15, 23);
        doc.text(cleanStringForPDF(`Filtro: ${range.toUpperCase()} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} | Total Lancamentos: ${filteredPresences.length}`), 15, 29);
        
        // Summary
        doc.setFillColor(248, 250, 252);
        doc.rect(15, 42, 180, 16, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(15, 42, 180, 16, 'S');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(cleanStringForPDF('AUDITORIA GERAL DE CHECK-INS E PARTICIPACAO'), 20, 48);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(cleanStringForPDF(`Total de registros no periodo: ${filteredPresences.length} check-ins | Alunos cadastrados: ${activeStudentsList.length}`), 20, 53.5);
        
        // Table
        const startY = 66;
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        
        doc.text('Data / Hora', 15, startY);
        doc.text('Judoka (Aluno)', 55, startY);
        doc.text('Faixa / Graduacao', 115, startY);
        doc.text('Aula / Treino', 150, startY);
        doc.text('Tipo', 188, startY);
        
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.3);
        doc.line(15, startY + 2.5, 195, startY + 2.5);
        
        let currentY = startY + 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        
        filteredPresences.forEach((p, idx) => {
          if (currentY > 275) {
            doc.addPage();
            currentY = 20;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text('Data / Hora', 15, currentY);
            doc.text('Judoka (Aluno)', 55, currentY);
            doc.text('Faixa / Graduacao', 115, currentY);
            doc.text('Aula / Treino', 150, currentY);
            doc.text('Tipo', 188, currentY);
            doc.line(15, currentY + 2.5, 195, currentY + 2.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            currentY += 8;
          }
          
          const student = profiles.find(pr => pr.id === p.memberId);
          const classInfo = classes.find(c => c.id === p.classId);
          const pDate = getPresenceDate(p);
          
          const pDateStr = pDate 
            ? pDate.toLocaleDateString('pt-BR') + ' ' + pDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : p.checkInDate;
            
          const nameStr = cleanStringForPDF(student?.fullName || 'Participante');
          const gradeStr = cleanStringForPDF(student?.currentGrade || 'Sem Grad.');
          const classTitle = cleanStringForPDF(classInfo?.title || 'Treino Regimental');
          const typeStr = cleanStringForPDF(classInfo?.type || 'Geral');
          
          if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(13, currentY - 4.5, 184, 6.5, 'F');
          }
          
          doc.setTextColor(15, 23, 42);
          doc.text(pDateStr, 15, currentY);
          doc.text(nameStr.substring(0, 30), 55, currentY);
          doc.text(gradeStr, 115, currentY);
          doc.text(classTitle.substring(0, 20), 150, currentY);
          doc.text(typeStr, 188, currentY);
          
          currentY += 6.5;
        });
        
        doc.save(`Relatorio_Geral_Presencas_${range}__${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (err) {
        console.error("Erro ao exportar PDF geral:", err);
      } finally {
        setIsExportingPDF(false);
        setIsExportModalOpen(false);
      }
    }, 400);
  };

  // 3. Download Payments Report PDF
  const handleDownloadPaymentPDF = () => {
    setFinanceLoading(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        
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
        
        const startY = 78;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        
        doc.text('Nome do Aluno (Judoka)', 15, startY);
        doc.text('Graduacao', 85, startY);
        doc.text('Mes de Referencia', 125, startY);
        doc.text('Status', 165, startY);
        
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
            doc.setTextColor(16, 185, 129);
            doc.text('PAGO', 165, currentY);
          } else {
            doc.setTextColor(245, 158, 11);
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
    }, 400);
  };

  // 4. Download Single Student Card Report PDF
  const handleDownloadSingleStudentPDF = () => {
    if (!selectedStudent) return;
    setFinanceLoading(true);
    setTimeout(() => {
      try {
        const doc = new jsPDF();
        const stdName = cleanStringForPDF(selectedStudent.fullName);
        const stdGrade = cleanStringForPDF(selectedStudent.currentGrade || 'Branca');
        
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
        
        doc.setTextColor(15, 23, 42);
        
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
          .slice(0, 18);
          
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
            currentY += 8;
          }
          
          const classInfo = classes.find(c => c.id === p.classId);
          const pDate = getPresenceDate(p);
          const pDateStr = pDate 
            ? pDate.toLocaleDateString('pt-BR') + ' ' + pDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : p.checkInDate;
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
    }, 400);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 pb-px gap-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('attendance')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0 cursor-pointer",
            activeTab === 'attendance'
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <Activity className="w-4 h-4" />
          <span>Frequência & Presença</span>
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0 cursor-pointer",
            activeTab === 'students'
              ? "border-indigo-600 text-indigo-600 font-black"
              : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          <Users className="w-4 h-4" />
          <span>Estatísticas de Alunos</span>
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={cn(
            "flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-widest border-b-2 transition-all shrink-0 cursor-pointer",
            activeTab === 'finance'
              ? "border-indigo-600 text-indigo-600 font-black"
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
            key="attendance-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Header with Title and Unified Export Action Center */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Painel de Frequência</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Relatório geral e divisão mensal das presenças dos alunos, auditoria de check-ins e exportação em PDF e Excel (.xlsx / planilhas).
                </p>
              </div>
              
              {/* Export Buttons Suite */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Direct Excel (.xlsx) Download */}
                <button 
                  onClick={() => handleExportExcel('monthly_all')}
                  disabled={isExportingExcel || presences.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Baixar planilha Excel (.xlsx) com a divisão mensal dos alunos e aba consolidada"
                >
                  {isExportingExcel ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" />
                  )}
                  <span>BAIXAR EXCEL (.XLSX)</span>
                </button>

                {/* Direct PDF Download (Monthly landscape) */}
                <button 
                  onClick={handleDownloadMonthlyPDF}
                  disabled={isExportingPDF || presences.length === 0}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  title="Baixar relatório em PDF com divisão mensal de presenças dos alunos"
                >
                  {isExportingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>BAIXAR PDF (MENSAL)</span>
                </button>

                {/* Export Options Modal Trigger */}
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Mais formatos e relatórios personalizados"
                >
                  <FileDown className="w-4 h-4 text-slate-500" />
                  <span>Mais Opções</span>
                </button>
              </div>
            </div>

            {/* Sub-navigation View Mode Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
              <div className="flex items-center gap-1 overflow-x-auto">
                <button
                  onClick={() => setViewMode('monthly_matrix')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all shrink-0 cursor-pointer",
                    viewMode === 'monthly_matrix'
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Divisão Mensal (Mês a Mês)</span>
                </button>

                <button
                  onClick={() => setViewMode('general_summary')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all shrink-0 cursor-pointer",
                    viewMode === 'general_summary'
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  <BarChart4 className="w-3.5 h-3.5" />
                  <span>Relatório Geral & Gráficos</span>
                </button>

                <button
                  onClick={() => setViewMode('single_month')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all shrink-0 cursor-pointer",
                    viewMode === 'single_month'
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Por Mês Selecionado</span>
                </button>

                <button
                  onClick={() => setViewMode('raw_checkins')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold tracking-wide transition-all shrink-0 cursor-pointer",
                    viewMode === 'raw_checkins'
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                  )}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Histórico de Check-ins</span>
                </button>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-2 px-2 self-end sm:self-auto">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ano:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-800 text-xs font-black rounded-lg px-3 py-1.5 outline-none shadow-xs cursor-pointer focus:border-indigo-500"
                >
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Summary Cards (Annual Reference) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Presenças em {selectedYear}</span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">{monthlyMatrixData.dojoYearGrandTotal}</p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Check-ins registrados no ano</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alunos Ativos no Ano</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 mt-2">
                  {monthlyMatrixData.studentsWithPresenceInYear} <span className="text-sm font-semibold text-slate-400">/ {activeStudentsList.length}</span>
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Treinaram ao menos 1 vez</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Média Mensal do Dojô</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <BarChart4 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 mt-2">
                  {(monthlyMatrixData.dojoYearGrandTotal / 12).toFixed(1)}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">Check-ins por mês</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mês Mais Frequente</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg font-black text-amber-600 mt-2 truncate">
                  {monthlyMatrixData.bestMonth.name}
                </p>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5">{monthlyMatrixData.bestMonth.count} check-ins computados</p>
              </div>
            </div>

            {/* VIEW 1: MONTHLY DIVISION (Mês a Mês Matrix) */}
            {viewMode === 'monthly_matrix' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Table Control Header */}
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">
                      Frequência Dividida Mês a Mês dos Alunos ({selectedYear})
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Visualização completa de presenças em cada mês do ano. Baixe em Excel (.xlsx) ou PDF para impressos.
                    </p>
                  </div>

                  {/* Search and Sort Filter */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar aluno ou faixa..."
                        value={matrixSearch}
                        onChange={(e) => setMatrixSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-500 w-48 transition-all"
                      />
                      {matrixSearch && (
                        <button 
                          onClick={() => setMatrixSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <select
                      value={matrixSort}
                      onChange={(e) => setMatrixSort(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="total_desc">Ordenar: Mais Frequentes</option>
                      <option value="name_asc">Ordenar: Nome (A-Z)</option>
                      <option value="grade">Ordenar: Faixa / Graduação</option>
                    </select>

                    <button
                      onClick={() => handleExportExcel('monthly_all')}
                      disabled={isExportingExcel}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Exportar esta matriz para Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel (.xlsx)</span>
                    </button>

                    <button
                      onClick={handleDownloadMonthlyPDF}
                      disabled={isExportingPDF}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Exportar esta matriz para PDF em modo paisagem"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF Paisagem</span>
                    </button>
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                        <th className="px-4 py-3.5 sticky left-0 bg-slate-50/95 z-10 w-56 min-w-[200px]">Aluno (Judoka)</th>
                        <th className="px-3 py-3.5 w-28 min-w-[100px]">Graduação</th>
                        {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((m) => (
                          <th key={m} className="px-2.5 py-3.5 text-center w-12 min-w-[44px]">
                            {m}
                          </th>
                        ))}
                        <th className="px-3 py-3.5 text-center bg-indigo-50/50 text-indigo-900 w-16">Total</th>
                        <th className="px-3 py-3.5 text-center w-16">Média/m</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyMatrixData.studentRows.map((student, idx) => (
                        <tr 
                          key={`${student.id}-${idx}`}
                          className="hover:bg-indigo-50/30 transition-colors group"
                        >
                          {/* Student name */}
                          <td className="px-4 py-2.5 sticky left-0 bg-white group-hover:bg-slate-50/90 z-10">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0 uppercase">
                                {student.fullName ? student.fullName.substring(0, 2) : 'JD'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate leading-tight">{student.fullName}</p>
                                {student.callNumber && (
                                  <span className="text-[9px] text-slate-400 font-bold">Nº {student.callNumber}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Grade / Belt */}
                          <td className="px-3 py-2.5 text-slate-600 font-medium">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase tracking-tight">
                              {student.currentGrade || 'Branca'}
                            </span>
                          </td>

                          {/* 12 Months Columns */}
                          {student.months.map((count, mIdx) => (
                            <td key={mIdx} className="px-1.5 py-2.5 text-center">
                              {count > 0 ? (
                                <span className={cn(
                                  "inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black transition-transform",
                                  count >= 8 ? "bg-emerald-100 text-emerald-800 font-black" :
                                  count >= 4 ? "bg-indigo-100 text-indigo-800" :
                                  "bg-slate-100 text-slate-800"
                                )}>
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-semibold text-xs">-</span>
                              )}
                            </td>
                          ))}

                          {/* Year Total */}
                          <td className="px-3 py-2.5 text-center bg-indigo-50/40">
                            <span className={cn(
                              "inline-flex items-center justify-center px-2 py-1 rounded-md text-xs font-black",
                              student.yearTotal > 0 ? "bg-indigo-600 text-white" : "text-slate-400 font-bold"
                            )}>
                              {student.yearTotal}
                            </span>
                          </td>

                          {/* Monthly Average */}
                          <td className="px-3 py-2.5 text-center font-bold text-slate-700">
                            {student.monthlyAverage}
                          </td>
                        </tr>
                      ))}

                      {monthlyMatrixData.studentRows.length === 0 && (
                        <tr>
                          <td colSpan={16} className="px-6 py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50/40">
                            Nenhum aluno encontrado para os filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* Footer Row: Monthly Total of the Dojo */}
                    <tfoot>
                      <tr className="bg-slate-900 text-white font-black text-xs">
                        <td className="px-4 py-3 sticky left-0 bg-slate-900 z-10 uppercase tracking-wider">
                          Total do Dojô no Mês
                        </td>
                        <td className="px-3 py-3 text-slate-400 text-[10px] uppercase">
                          Todas Faixas
                        </td>
                        {monthlyMatrixData.dojoTotalsPerMonth.map((val, mIdx) => (
                          <td key={mIdx} className="px-1.5 py-3 text-center">
                            <span className={cn(
                              "font-black text-xs",
                              val > 0 ? "text-amber-300" : "text-slate-500"
                            )}>
                              {val}
                            </span>
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center bg-indigo-700 text-white font-black text-sm">
                          {monthlyMatrixData.dojoYearGrandTotal}
                        </td>
                        <td className="px-3 py-3 text-center text-slate-300">
                          {(monthlyMatrixData.dojoYearGrandTotal / 12).toFixed(1)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Footer Legend */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-bold text-slate-700">Legenda de Assiduidade:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300 inline-block" /> 8+ treinos (Alta)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300 inline-block" /> 4 - 7 treinos (Regular)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" /> 1 - 3 treinos (Baixa)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-slate-300 font-bold">-</span> Sem presenças registradas
                    </span>
                  </div>

                  <span className="font-bold text-slate-400">
                    Total de alunos listados: {monthlyMatrixData.studentRows.length}
                  </span>
                </div>
              </div>
            )}

            {/* VIEW 2: GENERAL SUMMARY & CHARTS */}
            {viewMode === 'general_summary' && (
              <div className="space-y-6">
                {/* Time Range Filter Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Período de Referência:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'today', label: 'Hoje' },
                      { id: 'week', label: 'Esta Semana' },
                      { id: 'month', label: 'Este Mês' },
                      { id: 'year', label: `Ano ${selectedYear}` },
                      { id: 'all', label: 'Todo o Histórico' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setRange(opt.id as TimeRange)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all cursor-pointer",
                          range === opt.id 
                            ? "bg-indigo-600 text-white shadow-xs" 
                            : "bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleDownloadGeneralPDF}
                    disabled={isExportingPDF}
                    className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar PDF Geral</span>
                  </button>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Presences by Student */}
                  <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-xs">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <BarChart4 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 leading-none">Top 10 Alunos Mais Assíduos</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Presenças registradas no período selecionado</p>
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
                                fontWeight: 'bold'
                              }} 
                            />
                            <Bar dataKey="Presenças" fill="#6366f1" radius={[6, 6, 0, 0]}>
                              {studentPresenceData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#4f46e5'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Chart 2: Presences by Class */}
                  <div className="bg-white p-5 border border-slate-200 rounded-3xl shadow-xs">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <PieIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 leading-none">Presenças por Treino / Turma</h4>
                        <p className="text-[10px] text-slate-400 mt-1">Horários com maior engajamento no tatame</p>
                      </div>
                    </div>

                    <div className="h-60 w-full">
                      {classPresenceData.length === 0 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                          <Activity className="w-8 h-8 opacity-30 animate-pulse mb-1.5" />
                          <span className="text-xs font-bold text-slate-400">Nenhuma aula registrada</span>
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
                              width={110}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                borderRadius: '12px', 
                                border: '1px solid #e2e8f0', 
                                fontSize: '11px', 
                                fontWeight: 'bold'
                              }} 
                            />
                            <Bar dataKey="Frequentadores" fill="#10b981" radius={[0, 6, 6, 0]}>
                              {classPresenceData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                </div>

                {/* Consolidated General Ranking Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                        Quadro Geral Consolidado de Alunos
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Frequência acumulada, status e última presença registrada</p>
                    </div>

                    <button
                      onClick={() => handleExportExcel('general')}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-emerald-100"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Exportar Lista no Excel</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                          <th className="px-5 py-3.5">Posição / Aluno</th>
                          <th className="px-5 py-3.5">Graduação</th>
                          <th className="px-5 py-3.5 text-center">Presenças em {selectedYear}</th>
                          <th className="px-5 py-3.5 text-center">Total Histórico</th>
                          <th className="px-5 py-3.5">Último Treino</th>
                          <th className="px-5 py-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {monthlyMatrixData.allStudentRows.map((student, idx) => (
                          <tr key={`${student.id}-gen-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex items-center gap-3">
                                <span className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]",
                                  idx === 0 ? "bg-amber-100 text-amber-800 font-black" :
                                  idx === 1 ? "bg-slate-200 text-slate-700 font-black" :
                                  idx === 2 ? "bg-amber-50 text-amber-900 border border-amber-200 font-black" :
                                  "bg-slate-100 text-slate-500"
                                )}>
                                  {idx + 1}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900">{student.fullName}</p>
                                  {student.email && <p className="text-[10px] text-slate-400">{student.email}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                                {student.currentGrade}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className="font-black text-indigo-600 text-sm">{student.yearTotal}</span>
                            </td>
                            <td className="px-5 py-3 text-center font-bold text-slate-800">
                              {student.allTimeTotal}
                            </td>
                            <td className="px-5 py-3 text-slate-600 font-medium">
                              {student.lastPresence ? student.lastPresence.toLocaleDateString('pt-BR') : 'Sem registros'}
                            </td>
                            <td className="px-5 py-3">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                student.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                              )}>
                                {student.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: SINGLE MONTH BREAKDOWN */}
            {viewMode === 'single_month' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">
                      Relatório Específico: {getMonthName(selectedMonth)} de {selectedYear}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Frequência individual dos alunos no mês selecionado
                    </p>
                  </div>

                  {/* Month Picker Controls */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        {months.map(m => (
                          <option key={m} value={m}>{getMonthName(m)}</option>
                        ))}
                      </select>
                      <span className="text-slate-300">/</span>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-transparent border-none text-xs font-bold text-slate-800 outline-none cursor-pointer"
                      >
                        {availableYears.map(yr => (
                          <option key={yr} value={yr}>{yr}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => handleExportExcel('single_month')}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Baixar Mês no Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* Sub-metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 border-b border-slate-100 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/50">
                  <div className="p-4 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total de Presenças</span>
                    <p className="text-xl font-black text-slate-900 mt-1">{singleMonthData.totalPresences}</p>
                  </div>
                  <div className="p-4 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Alunos que Treinaram</span>
                    <p className="text-xl font-black text-emerald-600 mt-1">{singleMonthData.activeAttendees}</p>
                  </div>
                  <div className="p-4 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taxa de Participação</span>
                    <p className="text-xl font-black text-indigo-600 mt-1">
                      {activeStudentsList.length > 0 ? Math.round((singleMonthData.activeAttendees / activeStudentsList.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Students list for this month */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-3.5">Aluno</th>
                        <th className="px-6 py-3.5">Graduação</th>
                        <th className="px-6 py-3.5 text-center">Presenças em {getMonthName(selectedMonth)}</th>
                        <th className="px-6 py-3.5 text-center">Situação no Mês</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {singleMonthData.studentList.map((student, idx) => (
                        <tr key={`${student.id}-month-${idx}`} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3.5">
                            <span className="font-bold text-slate-900">{student.fullName}</span>
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                              {student.currentGrade || 'Branca'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-xl font-black text-xs",
                              student.monthPresences >= 8 ? "bg-emerald-100 text-emerald-800" :
                              student.monthPresences >= 4 ? "bg-indigo-100 text-indigo-800" :
                              student.monthPresences > 0 ? "bg-slate-100 text-slate-800" :
                              "text-slate-300 font-medium"
                            )}>
                              {student.monthPresences}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            {student.monthPresences > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                                <Check className="w-3 h-3" /> Frequente
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                                Sem Presença
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* VIEW 4: RAW CHECK-IN LOGS TABLE */}
            {viewMode === 'raw_checkins' && (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                      Registro Detalhado de Check-ins ({filteredPresences.length} registros)
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                      Auditoria cronológica das últimas entradas
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadGeneralPDF}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-slate-800"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar Registro PDF</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                        <th className="px-6 py-4">Data / Hora</th>
                        <th className="px-6 py-4">Aluno</th>
                        <th className="px-6 py-4">Graduação</th>
                        <th className="px-6 py-4">Aula / Treino</th>
                        <th className="px-6 py-4">Tipo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPresences.slice(0, 40).map((p, idx) => {
                        const student = profiles.find(pr => pr.id === p.memberId);
                        const classData = classes.find(c => c.id === p.classId);
                        const pDate = getPresenceDate(p);

                        return (
                          <tr key={`${p.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-3.5">
                              <span className="font-bold text-slate-700">
                                {pDate ? formatDate(pDate) + ' ' + pDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : p.checkInDate}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="font-bold text-slate-900">{student?.fullName || 'Visitante'}</span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                {student?.currentGrade || 'Sem faixa'}
                              </span>
                            </td>
                            <td className="px-6 py-3.5">
                              <span className="font-semibold text-slate-700">{classData?.title || 'Treino Regimental'}</span>
                            </td>
                            <td className="px-6 py-3.5">
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
            )}

          </motion.div>
        ) : activeTab === 'students' ? (
          
          <motion.div
            key="students-tab"
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
                              const pDate = getPresenceDate(p);
                              return (
                                <tr key={`${p.id}-${pIdx}`} className="hover:bg-slate-50/20">
                                  <td className="px-5 py-3 font-semibold text-slate-700">
                                    {pDate ? formatDate(pDate) : p.checkInDate}
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
            key="finance-tab"
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
                    {availableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleDownloadPaymentPDF}
                  disabled={financeLoading || activeStudentsList.length === 0}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-md disabled:opacity-50 cursor-pointer"
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

      {/* EXPORT OPTIONS MODAL */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileDown className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">Exportar Relatórios de Frequência</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Escolha o formato e a divisão desejada</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-5 space-y-4 text-xs">
                {/* Reference Year */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-800 text-xs block">Ano de Referência</span>
                    <span className="text-[11px] text-slate-400 font-medium">Os dados serão agregados para o ano:</span>
                  </div>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-white border border-slate-200 text-slate-900 text-xs font-black rounded-lg px-3 py-1.5 shadow-xs outline-none cursor-pointer"
                  >
                    {availableYears.map(yr => (
                      <option key={yr} value={yr}>{yr}</option>
                    ))}
                  </select>
                </div>

                {/* Option 1: Monthly Division in Excel (.xlsx) */}
                <div className="p-4 rounded-2xl border border-emerald-150 bg-emerald-50/40 hover:bg-emerald-50/80 transition-all flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-black text-slate-900 text-xs">Planilha Excel (.xlsx / .xls) Completa</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Gera arquivo .xlsx compatível com Microsoft Excel, LibreOffice Calc e Google Planilhas. Inclui:
                    </p>
                    <ul className="text-[10px] text-slate-600 list-disc list-inside font-medium space-y-0.5 pt-0.5">
                      <li>Aba 1: Matriz de Presenças Mês a Mês (Jan a Dez + Totais)</li>
                      <li>Aba 2: Resumo Geral Consolidado de Alunos</li>
                      <li>Aba 3: Histórico Individual de Check-ins com Data e Turma</li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleExportExcel('monthly_all')}
                    disabled={isExportingExcel}
                    className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    {isExportingExcel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Baixar .xlsx</span>
                  </button>
                </div>

                {/* Option 2: Monthly Division PDF (Landscape) */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-all flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="font-black text-slate-900 text-xs">Relatório em PDF (Mês a Mês / Paisagem)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Documento oficial formatado em folha A4 paisagem com tabela de presenças de cada aluno dividida pelos 12 meses do ano e totais do dojô.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadMonthlyPDF}
                    disabled={isExportingPDF}
                    className="shrink-0 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Baixar PDF</span>
                  </button>
                </div>

                {/* Option 3: General Check-in Records PDF */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition-all flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-600 shrink-0" />
                      <span className="font-black text-slate-900 text-xs">Relatório Geral Cronológico (PDF)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Lista cronológica completa de check-ins registrados, com data, horário, modalidade e aluno.
                    </p>
                  </div>

                  <button
                    onClick={handleDownloadGeneralPDF}
                    disabled={isExportingPDF}
                    className="shrink-0 bg-slate-200 hover:bg-slate-300 text-slate-800 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
