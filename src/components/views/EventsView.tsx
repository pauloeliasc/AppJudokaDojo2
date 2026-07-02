import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { EventItem, EventType, UserRole } from '../../types';
import { useAuth } from '../../AuthContext';
import { eventsApi } from '../../services/firestoreService';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  Trophy, 
  GraduationCap, 
  Sparkles, 
  Trash2, 
  Edit3, 
  X, 
  AlertCircle,
  Megaphone,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';

export default function EventsView() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  
  // Safe alert and delete states for iframes
  const [showConfirmDeleteId, setShowConfirmDeleteId] = useState<string | null>(null);

  const canManage = user?.role === UserRole.ADMIN || user?.role === UserRole.PROFESSOR;

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>(EventType.AULA_ESPECIAL);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventItem));
      setEvents(list);
      setLoading(false);
    }, (err) => {
      console.error("Error loading events: ", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openCreateModal = () => {
    setTitle('');
    setType(EventType.AULA_ESPECIAL);
    setDate('');
    setTime('');
    setLocation('');
    setDescription('');
    setEditingEvent(null);
    setError('');
    setShowModal(true);
  };

  const openEditModal = (event: EventItem) => {
    setTitle(event.title);
    setType(event.type);
    setDate(event.date);
    setTime(event.time);
    setLocation(event.location);
    setDescription(event.description);
    setEditingEvent(event);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !time || !location) {
      setError('Por favor, preencha todos os campos obrigatórios (Título, Data, Horário e Local).');
      return;
    }
    setSaving(true);
    setError('');

    const eventData = {
      title,
      type,
      date,
      time,
      location,
      description,
      createdBy: user?.name || 'Instrutor'
    };

    try {
      if (editingEvent) {
        await eventsApi.update(editingEvent.id, eventData);
      } else {
        await eventsApi.create(eventData);
      }
      setShowModal(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o evento.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReal = async (id: string) => {
    try {
      await eventsApi.delete(id);
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const getEventBadgeClass = (eventType: EventType) => {
    switch (eventType) {
      case EventType.CAMPEONATO:
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case EventType.EXAME_FAIXA:
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case EventType.AULA_ESPECIAL:
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    }
  };

  const getEventIcon = (eventType: EventType) => {
    switch (eventType) {
      case EventType.CAMPEONATO:
        return <Trophy className="w-5 h-5 text-amber-500" />;
      case EventType.EXAME_FAIXA:
        return <GraduationCap className="w-5 h-5 text-indigo-500" />;
      case EventType.AULA_ESPECIAL:
      default:
        return <Sparkles className="w-5 h-5 text-emerald-500" />;
    }
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 italic">Mural de Eventos</h2>
          <p className="text-slate-500 text-sm mt-1">Campeonatos, exames de faixa e aulas especiais da nossa academia.</p>
        </div>
        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Evento</span>
          </button>
        )}
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="text-sm font-medium text-slate-400">Carregando eventos...</span>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">Nenhum evento agendado</h3>
          <p className="text-sm text-slate-400 max-w-md mt-1">Fique atento! Novas datas de campeonatos, exames e aulas especiais serão publicadas aqui futuramente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, idx) => (
            <div
              key={`${event.id}-${idx}`}
              className={cn(
                "bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 overflow-hidden flex flex-col justify-between transition-all border-l-4",
                event.type === EventType.CAMPEONATO ? "border-l-amber-500" :
                event.type === EventType.EXAME_FAIXA ? "border-l-indigo-500" : "border-l-emerald-500"
              )}
            >
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border", getEventBadgeClass(event.type))}>
                    {event.type}
                  </span>
                  <div className="w-8 h-8 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                    {getEventIcon(event.type)}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-base leading-snug">{event.title}</h3>
                  {event.description && (
                    <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-3 whitespace-pre-wrap leading-relaxed">{event.description}</p>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{formatDisplayDate(event.date)}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{event.time}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 font-medium">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="truncate">{event.location}</span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="bg-slate-50/50 px-6 py-3.5 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    onClick={() => openEditModal(event)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-all"
                    title="Editar evento"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowConfirmDeleteId(event.id)}
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all cursor-pointer"
                    title="Excluir evento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingEvent ? 'Editar Evento' : 'Novo Evento'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">Título do Evento *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Treino Especial de Páscoa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none text-sm transition-all focus:border-indigo-500 font-medium text-slate-800"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">Tipo de Evento *</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none text-sm transition-all focus:border-indigo-500 font-medium text-slate-800"
                    value={type}
                    onChange={e => setType(e.target.value as EventType)}
                  >
                    <option value={EventType.AULA_ESPECIAL}>Aula Especial</option>
                    <option value={EventType.EXAME_FAIXA}>Exame de Faixa</option>
                    <option value={EventType.CAMPEONATO}>Campeonato</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">Horário *</label>
                  <input
                    required
                    type="time"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none text-sm transition-all focus:border-indigo-500 font-medium text-slate-800"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">Data *</label>
                  <input
                    required
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none text-sm transition-all focus:border-indigo-500 font-medium text-slate-800"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">Local *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Dojô Central"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none text-sm transition-all focus:border-indigo-500 font-medium text-slate-800"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block ml-1">Descrição</label>
                <textarea
                  placeholder="Informações adicionais sobre o custo, regulamentos, requisitos..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 outline-none text-sm transition-all focus:border-indigo-500 min-h-[100px] resize-none font-medium text-slate-800"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 transition-all"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/10 transition-all"
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingEvent ? 'Salvar' : 'Criar Evento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation overlay for iframe/safari compatibility */}
      {showConfirmDeleteId && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col justify-center items-center p-6 z-[200] text-center text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col items-center">
            <Trash2 className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
            <h5 className="font-extrabold text-base uppercase tracking-wider mb-2 text-white">Excluir Evento?</h5>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Tem certeza de que deseja excluir permanentemente este evento do calendário? Esta ação é irreversível.
            </p>
            <div className="flex gap-3 w-full">
              <button 
                type="button"
                onClick={() => setShowConfirmDeleteId(null)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={async () => {
                  const id = showConfirmDeleteId;
                  setShowConfirmDeleteId(null);
                  await handleDeleteReal(id);
                }}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-3 text-xs font-bold transition-all cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
