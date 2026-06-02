import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  if (typeof date === 'string') {
    // Prevent timezone shift on 'YYYY-MM-DD' strings in browsers like Safari (iOS & Android WebViews)
    if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
  }
  return new Date(date).toLocaleDateString('pt-BR');
}

export function getMonthName(month: number) {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1];
}
