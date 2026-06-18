export enum UserRole {
  ADMIN = 'admin',
  PROFESSOR = 'professor',
  STUDENT = 'student'
}

export interface User {
  uid: string;
  id?: string; // profile document ID
  email: string;
  name: string;
  role: UserRole;
  username: string;
  isApproved: boolean;
  status: 'active' | 'pending' | 'blocked' | 'inactive';
}

export interface Profile {
  id: string; // matches User.uid if it's a registered user
  fullName: string;
  email: string;
  birthDate: string;
  enrollmentDate: string;
  lastPromotionDate: string;
  currentGrade: string;
  medications: string;
  healthInsurance: string;
  bloodType: string;
  conditions: string;
  phoneNumber?: string;
  emergencyContact?: string;
  address?: string;
  points: number;
  photoUrl?: string;
  role: UserRole;
  userId?: string; 
  isApproved: boolean;
  status: 'active' | 'pending' | 'blocked' | 'inactive';
  responsibleName?: string; // Name of a parent or guardian
  responsiblePhone?: string; // Phone number of the parent/guardian
  responsibleEmail?: string; // Email of the parent/guardian
  responsibleId?: string; // ID of the responsible profile for this student
  callNumber?: string; // Student roll call number
  isStudent?: boolean; // Responsible profile can also be a student too
  isPointer?: boolean; // Indicates if this profile is just a pointer reference
  isPrivateProfile?: boolean; // Matches user requested privacy setting
}

export enum ClassType {
  JUDO = 'Judô',
  KATA = 'Judô (Kata)',
  NE_WAZA = 'Judô (Ne-Waza)',
  SPECIAL = 'Especial'
}

export interface ClassSession {
  id: string;
  title: string;
  date: string;
  time: string;
  professorId: string;
  type: ClassType;
  isSpecial?: boolean;
  maxStudents?: number;
  description?: string;
  scheduleId?: string; // Reference to fixed schedule slot
  isCanceled?: boolean;
  cancelReason?: string;
}

export interface Schedule {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  time: string;
  type: ClassType;
  professorId: string;
}

export interface Presence {
  id: string;
  memberId: string;
  classId: string;
  timestamp: string;
  checkInDate: string; // YYYY-MM-DD local
  pointsAwarded: number;
}

export interface Payment {
  id: string;
  memberId: string;
  month: number;
  year: number;
  status: 'pending' | 'paid';
  pixTimestamp?: string;
  dueDate: string;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'attendance' | 'finance' | 'special';
  dateEarned: string;
}

export interface Settings {
  pixKey: string;
  monthlyValue: number;
  defaultDueDate: string;
}

export enum EventType {
  CAMPEONATO = 'Campeonato',
  EXAME_FAIXA = 'Exame de Faixa',
  AULA_ESPECIAL = 'Aula Especial'
}

export interface EventItem {
  id: string;
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  description: string;
  createdBy: string;
}
