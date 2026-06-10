import React, { useState, useMemo } from 'react';
import { JobApplication, CalendarEvent } from '../types';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  Briefcase,
  Layers,
  MapPin,
  Tag,
  X,
  Sparkles,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CalendarViewProps {
  applications: JobApplication[];
  calendarEvents: CalendarEvent[];
  onAddEvent: (event: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>) => Promise<void> | void;
  onDeleteEvent: (eventId: string) => Promise<void> | void;
  onEditApplication?: (app: JobApplication) => void;
  theme: 'day' | 'night';
}

interface ProcessedEvent {
  id: string; // unique key (combination of app_id/event_id + type)
  sourceId: string; // actual application id or custom event id
  title: string;
  subtitle: string;
  date: string; // YYYY-MM-DD
  type: 'Applied' | 'Interview' | 'Follow Up' | 'Additional Round' | 'Custom';
  notes?: string;
  appRef?: JobApplication;
}

export default function CalendarView({
  applications,
  calendarEvents,
  onAddEvent,
  onDeleteEvent,
  onEditApplication,
  theme,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form input states
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<CalendarEvent['type']>('Custom');
  const [newNotes, setNewNotes] = useState('');
  const [formDate, setFormDate] = useState('');

  // 1. Process and combine all events dynamically
  const allEvents = useMemo<ProcessedEvent[]>(() => {
    const list: ProcessedEvent[] = [];

    // Synthesize events from Job Applications
    applications.forEach((app) => {
      // Applied Event
      if (app.applicationDate) {
        list.push({
          id: `applied-${app.id}`,
          sourceId: app.id,
          title: `Applied to ${app.company}`,
          subtitle: app.title,
          date: app.applicationDate,
          type: 'Applied',
          notes: '',
          appRef: app,
        });
      }

      // Interview Event
      if (app.interviewDate) {
        list.push({
          id: `interview-${app.id}`,
          sourceId: app.id,
          title: `Interview with ${app.company}`,
          subtitle: `${app.title} (${app.interviewMethod || 'Standard Round'})`,
          date: app.interviewDate,
          type: 'Interview',
          notes: app.notes,
          appRef: app,
        });
      }

      // Follow Up Event
      if (app.followUpDate) {
        list.push({
          id: `followup-${app.id}`,
          sourceId: app.id,
          title: `Follow up with ${app.company}`,
          subtitle: `Tracker: ${app.title}`,
          date: app.followUpDate,
          type: 'Follow Up',
          notes: `Prepare and verify details for follow up.`,
          appRef: app,
        });
      }

      // Additional rounds dates
      if (app.interviewDates && app.interviewDates.length > 0) {
        app.interviewDates.forEach((date, index) => {
          if (date) {
            list.push({
              id: `add-round-${app.id}-${index}`,
              sourceId: app.id,
              title: `Ad-hoc round with ${app.company}`,
              subtitle: `Round #${index + 2} - ${app.title}`,
              date: date,
              type: 'Additional Round',
              notes: app.notes,
              appRef: app,
            });
          }
        });
      }
    });

    // Custom Calendar Events registered by user
    calendarEvents.forEach((evt) => {
      list.push({
        id: `custom-${evt.id}`,
        sourceId: evt.id,
        title: evt.title,
        subtitle: 'Custom Event',
        date: evt.date,
        type: evt.type,
        notes: evt.notes,
      });
    });

    return list;
  }, [applications, calendarEvents]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map: Record<string, ProcessedEvent[]> = {};
    allEvents.forEach((evt) => {
      if (!map[evt.date]) {
        map[evt.date] = [];
      }
      map[evt.date].push(evt);
    });
    return map;
  }, [allEvents]);

  // Calendar calendar helper calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays = useMemo(() => {
    const days: Array<{ dayNum: number; dateStr: string; isCurrentMonth: boolean }> = [];
    
    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const str = prevDate.toISOString().split('T')[0];
      days.push({ dayNum: daysInPrevMonth - i, dateStr: str, isCurrentMonth: false });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i, 12, 0, 0); // avoid date shift on timezone
      const str = currDate.toISOString().split('T')[0];
      days.push({ dayNum: i, dateStr: str, isCurrentMonth: true });
    }

    // Next month padding to fill grid matching multi-weeks (usually multiple of 7, let's complete to multiple of 7)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const str = nextDate.toISOString().split('T')[0];
      days.push({ dayNum: i, dateStr: str, isCurrentMonth: false });
    }

    return days;
  }, [year, month, firstDayOfMonth, daysInMonth, daysInPrevMonth]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    const todayStr = new Date().toISOString().split('T')[0];
    setSelectedDateStr(todayStr);
  };

  // Trigger form popup
  const openAddEventForm = (dateString: string) => {
    setFormDate(dateString);
    setNewTitle('');
    setNewNotes('');
    setNewType('Custom');
    setErrorMessage(null);
    setIsAddEventOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !formDate) return;

    setErrorMessage(null);
    try {
      await onAddEvent({
        title: newTitle.trim(),
        date: formDate,
        type: newType,
        notes: newNotes.trim(),
      });
      setIsAddEventOpen(false);
    } catch (err: any) {
      console.error('Error adding calendar event:', err);
      let msg = 'Failed to save event. Please check your network connection or try again.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && typeof parsed === 'object' && parsed.error) {
            msg = `Firebase error: ${parsed.error}`;
          } else {
            msg = err.message;
          }
        } catch (e) {
          msg = err.message;
        }
      }
      setErrorMessage(msg);
    }
  };

  // Helper theme-based badge style getter
  const getBadgeStyle = (type: ProcessedEvent['type']) => {
    switch (type) {
      case 'Applied':
        return theme === 'night' 
          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60' 
          : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Interview':
        return theme === 'night' 
          ? 'bg-cyan-950/40 text-cyan-400 border-cyan-900/60' 
          : 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'Follow Up':
        return theme === 'night' 
          ? 'bg-amber-955/40 text-amber-400 border-amber-900/60' 
          : 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Additional Round':
        return theme === 'night' 
          ? 'bg-indigo-950/40 text-indigo-400 border-indigo-900/60' 
          : 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return theme === 'night' 
          ? 'bg-purple-950/40 text-purple-400 border-purple-900/60' 
          : 'bg-stone-50 text-stone-600 border-stone-200';
    }
  };

  // Helper colors for calendar dots or indicators
  const getDotStyle = (type: ProcessedEvent['type']) => {
    switch (type) {
      case 'Applied': return 'bg-emerald-500';
      case 'Interview': return 'bg-cyan-450';
      case 'Follow Up': return 'bg-amber-500';
      case 'Additional Round': return 'bg-indigo-500';
      default: return 'bg-purple-500';
    }
  };

  const getCardBorder = (type: ProcessedEvent['type']) => {
    switch (type) {
      case 'Applied': return 'border-l-4 border-l-emerald-500';
      case 'Interview': return 'border-l-4 border-l-cyan-400';
      case 'Follow Up': return 'border-l-4 border-l-amber-500';
      case 'Additional Round': return 'border-l-4 border-l-indigo-500';
      default: return 'border-l-4 border-l-purple-500';
    }
  };

  // Agenda / List format events sorted chronologically
  const sortedAgendaEvents = useMemo(() => {
    return [...allEvents].sort((a, b) => a.date.localeCompare(b.date));
  }, [allEvents]);

  const selectedDayEvents = eventsByDate[selectedDateStr] || [];

  return (
    <div className="space-y-6" id="calendar-workspace-panel">
      {/* Calendar Tab Header Utilities */}
      <div className={`p-4 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        theme === 'night' ? 'bg-slate-900/50 border-slate-850' : 'bg-white border-slate-200/90 shadow-2xs'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            theme === 'night' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <CalendarIcon className="w-5.5 h-5.5" />
          </div>
          <div>
            <h4 className={`text-sm font-bold ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>Job Application Log</h4>
            <p className="text-[11px] text-slate-500">Visual calendar synchronizing application milestones and self-scheduled preparatory milestones</p>
          </div>
        </div>

        {/* View togglers & quick today action */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            onClick={handleToday}
            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer shadow-2xs ${
              theme === 'night' 
                ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Today
          </button>

          <div className={`p-1 rounded-xl flex border gap-1 transition-all ${
            theme === 'night' ? 'bg-slate-950/50 border-slate-850' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? theme === 'night' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-850 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                viewMode === 'agenda'
                  ? theme === 'night' ? 'bg-slate-800 text-white shadow-xs' : 'bg-white text-slate-850 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              Agenda List
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Main interactive area */}
        <div className="xl:col-span-3 space-y-4">
          
          {/* Calendar visual grid logic */}
          {viewMode === 'grid' ? (
            <div className={`border rounded-2xl overflow-hidden transition-all duration-200 ${
              theme === 'night' ? 'bg-slate-900/40 border-slate-85 */0' : 'bg-white border-slate-200/95 shadow-sm'
            }`}>
              
              {/* Grid month title bar controls */}
              <div className={`px-6 py-4 flex items-center justify-between border-b ${
                theme === 'night' ? 'border-slate-850 bg-slate-950/40' : 'border-slate-150 bg-slate-50/50'
              }`}>
                <h3 className={`text-base font-extrabold tracking-tight font-sans ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>
                  {monthNames[month]} {year}
                </h3>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePrevMonth}
                    className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                      theme === 'night' 
                        ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                        : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                      theme === 'night' 
                        ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                        : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Day headers Sun - Sat */}
              <div className="grid grid-cols-7 border-b border-slate-150 dark:border-slate-850 text-center font-sans">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className={`py-3 text-[10px] font-bold uppercase tracking-widest ${
                    theme === 'night' ? 'text-slate-450 border-r border-slate-900/60' : 'text-slate-500 border-r border-slate-100'
                  }`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar Days blocks */}
              <div className={`grid grid-cols-7 grid-rows-6 ${
                theme === 'night' ? 'bg-slate-950/20' : 'bg-slate-50/10'
              }`}>
                {calendarDays.map((calDay, index) => {
                  const dayEvts = eventsByDate[calDay.dateStr] || [];
                  const isSelected = selectedDateStr === calDay.dateStr;
                  const isToday = new Date().toISOString().split('T')[0] === calDay.dateStr;

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedDateStr(calDay.dateStr)}
                      className={`min-h-16 md:min-h-24 p-2 flex flex-col justify-between border-r border-b transition-all duration-150 cursor-pointer text-left relative overflow-hidden group ${
                        theme === 'night' 
                          ? 'border-slate-900' 
                          : 'border-slate-200'
                      } ${
                        !calDay.isCurrentMonth 
                          ? theme === 'night' ? 'bg-slate-950/20 opacity-30' : 'bg-slate-100/40 text-slate-400'
                          : ''
                      } ${
                        isSelected 
                          ? theme === 'night' ? 'bg-indigo-950/30 ring-1 ring-inset ring-indigo-500' : 'bg-blue-50/75 ring-1 ring-inset ring-blue-400' 
                          : ''
                      } hover:bg-slate-100/20 dark:hover:bg-slate-900/40`}
                    >
                      {/* Day Number and status badge */}
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold leading-none select-none rounded w-5 h-5 flex items-center justify-center font-mono ${
                          isToday
                            ? 'bg-blue-600 text-white font-bold'
                            : isSelected
                              ? 'text-indigo-650'
                              : theme === 'night' ? 'text-slate-300' : 'text-slate-700'
                        }`}>
                          {calDay.dayNum}
                        </span>

                        {calDay.isCurrentMonth && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAddEventForm(calDay.dateStr);
                            }}
                            className={`p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-100 dark:hover:bg-slate-800 cursor-pointer`}
                            title="Add custom event"
                          >
                            <Plus className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                        )}
                      </div>

                      {/* Display events indicators */}
                      <div className="mt-1.5 space-y-1 block max-14 flex-1">
                        {/* Desktop: list first few events compactly */}
                        <div className="hidden md:block space-y-0.5">
                          {dayEvts.slice(0, 3).map((evt) => (
                            <div
                              key={evt.id}
                              className={`text-[9px] font-medium py-0.5 px-1 rounded truncate border font-sans select-none ${getBadgeStyle(evt.type)}`}
                              title={`${evt.title} (${evt.subtitle})`}
                            >
                              {evt.type === 'Applied' && '📩 '}
                              {evt.type === 'Interview' && '💬 '}
                              {evt.type === 'Follow Up' && '📞 '}
                              {evt.type === 'Additional Round' && '🤝 '}
                              {evt.type === 'Custom' && '📌 '}
                              {evt.title.replace('Applied to ', '').replace('Interview with ', '').replace('Follow up with ', '')}
                            </div>
                          ))}
                          {dayEvts.length > 3 && (
                            <div className="text-[8px] font-mono font-bold text-center text-slate-500 leading-none py-0.5 uppercase tracking-wider block">
                              + {dayEvts.length - 3} more entry
                            </div>
                          )}
                        </div>

                        {/* Mobile: simple colored dot list */}
                        <div className="flex md:hidden flex-wrap gap-1 mt-auto">
                          {dayEvts.map((evt) => (
                            <span
                              key={evt.id}
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotStyle(evt.type)}`}
                              title={evt.title}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Agenda List Timeline representation */
            <div className="space-y-4" id="agenda-timeline-view">
              {sortedAgendaEvents.length === 0 ? (
                <div className={`border rounded-2xl p-12 text-center ${
                  theme === 'night' ? 'bg-slate-900/20 border-slate-850' : 'bg-white border-slate-205 shadow-xs'
                }`}>
                  <Briefcase className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                  <p className="text-slate-400 font-medium text-xs">No dates or interaction points registered across any opportunities yet.</p>
                  <p className="text-[11px] text-slate-550 mt-1 max-w-sm mx-auto">Dates populated dynamically here once you add Application Dates, Interviews, or Scheduled follow-ups in the Pipeline!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedAgendaEvents.map((evt) => {
                    // Check if is dynamic today
                    const isToday = new Date().toISOString().split('T')[0] === evt.date;
                    // Format elegant readable date
                    const [y, m, d] = evt.date.split('-');
                    const formattedDateStr = evt.date ? new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : '';

                    return (
                      <div
                        key={evt.id}
                        className={`p-4 border rounded-2xl flex items-center justify-between gap-4 transition-all duration-150 relative ${getCardBorder(evt.type)} ${
                          theme === 'night' 
                            ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/60' 
                            : evt.type === 'Custom'
                              ? 'bg-stone-50/60 border-stone-200/80 shadow-3xs hover:bg-stone-50/80'
                              : 'bg-white border-slate-200/90 shadow-2xs hover:bg-slate-50/50'
                        }`}
                      >
                        {/* Main Agenda content columns */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-widest uppercase font-mono leading-none ${getBadgeStyle(evt.type)}`}>
                              {evt.type === 'Custom' ? 'Custom Event' : evt.type}
                            </span>
                            <span className={`text-[10px] font-mono flex items-center gap-1 ${theme === 'night' ? 'text-slate-400' : 'text-slate-520 font-semibold'}`}>
                              <Clock className="w-3 h-3" />
                              {formattedDateStr}
                            </span>
                            {isToday && (
                              <span className="bg-rose-500/10 text-rose-500 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                                Today
                              </span>
                            )}
                          </div>

                          <h3 className={`text-sm font-bold tracking-tight mt-1.5 truncate ${theme === 'night' ? 'text-slate-100' : 'text-slate-900'}`}>
                            {evt.title}
                          </h3>
                          <p className={`text-xs truncate ${theme === 'night' ? 'text-slate-400' : 'text-slate-650'}`}>
                            {evt.subtitle}
                          </p>
                          {evt.notes && (
                            <p className="text-[10px] italic mt-1 font-mono text-slate-500 max-w-2xl truncate">
                              "{evt.notes}"
                            </p>
                          )}
                        </div>

                        {/* Calendar event quick actions */}
                        <div className="shrink-0 flex items-center gap-2">
                          {evt.type === 'Custom' ? (
                            <button
                              onClick={() => onDeleteEvent(evt.sourceId)}
                              className={`p-2 rounded-xl transition-colors cursor-pointer text-slate-400 hover:text-rose-500 hover:bg-rose-550/10`}
                              title="Delete custom event"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              {evt.appRef && onEditApplication && (
                                <button
                                  onClick={() => onEditApplication(evt.appRef!)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-bold transition-all border cursor-pointer ${
                                    theme === 'night'
                                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-800'
                                      : 'bg-white border-slate-200 text-slate-650 hover:text-blue-600 hover:bg-slate-50'
                                  }`}
                                  title="Edit Application Details"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit Application</span>
                                </button>
                              )}
                              {evt.appRef?.url && (
                                <a
                                  href={evt.appRef.url.trim().startsWith('http') ? evt.appRef.url.trim() : `https://${evt.appRef.url.trim()}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-sans font-bold hover:underline transition-all ${
                                    theme === 'night'
                                      ? 'text-blue-400 hover:bg-blue-500/10'
                                      : 'text-blue-600 hover:bg-blue-50'
                                  }`}
                                >
                                  <span>View JD</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Day Agenda Detail panel (Calendar Side bar block) */}
        <div className="space-y-4 xl:col-span-1">
          <div className={`p-5 border rounded-2xl h-full flex flex-col justify-between gap-4 ${
            theme === 'night' ? 'bg-slate-900/20 border-slate-850' : 'bg-white border-slate-201/90 shadow-2xs'
          }`}>
            <div className="flex flex-col flex-1 min-h-0">
              {/* Sidebar Header */}
              <div className="border-b pb-4 mb-4 shrink-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block font-mono">Selected Day Agenda</span>
                <h3 className={`text-sm font-extrabold tracking-tight mt-1 ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>
                  {(() => {
                    const [y, m, d] = selectedDateStr.split('-');
                    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  })()}
                </h3>
              </div>

              {/* Event items listed for day */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
                {selectedDayEvents.length === 0 ? (
                  <div className="py-10 text-center space-y-1.5">
                    <Layers className="w-6 h-6 text-slate-600 mx-auto" />
                    <p className="text-slate-400 text-xs italic">No actions scheduled for this day.</p>
                    <p className="text-[10px] text-slate-500">Perfect time to construct a practice test routine or follow up!</p>
                  </div>
                ) : (
                  selectedDayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`p-3 border rounded-xl space-y-1 transition-all ${getCardBorder(evt.type)} ${
                        theme === 'night' 
                          ? 'bg-slate-950/40 border-slate-850' 
                          : evt.type === 'Custom'
                            ? 'bg-stone-50/60 border-stone-200/80 shadow-3xs'
                            : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getBadgeStyle(evt.type)}`}>
                          {evt.type === 'Custom' ? 'Custom Event' : evt.type}
                        </span>
                        {evt.type === 'Custom' && (
                          <button
                            onClick={() => onDeleteEvent(evt.sourceId)}
                            className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-slate-850 cursor-pointer"
                            title="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <h4 className={`text-xs font-bold ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {evt.title}
                      </h4>
                      <p className="text-[10px] text-slate-550 leading-relaxed truncate">
                        {evt.subtitle}
                      </p>
                      {(evt.appRef?.url || (evt.appRef && onEditApplication)) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {evt.appRef?.url && (
                            <a
                              href={evt.appRef.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 text-[10px] font-sans font-semibold hover:underline ${
                                theme === 'night' ? 'text-blue-400' : 'text-blue-600'
                              }`}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Job Posting</span>
                            </a>
                          )}
                          {evt.appRef?.url && evt.appRef && onEditApplication && (
                            <span className="text-slate-500 font-mono text-[9px] select-none">•</span>
                          )}
                          {evt.appRef && onEditApplication && (
                            <button
                              onClick={() => onEditApplication(evt.appRef!)}
                              className={`inline-flex items-center gap-1.5 text-[10px] font-sans font-bold hover:underline cursor-pointer ${
                                theme === 'night' ? 'text-indigo-400' : 'text-blue-600'
                              }`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit Application</span>
                            </button>
                          )}
                        </div>
                      )}
                      {evt.notes ? (
                        <p className={`text-[10px] leading-relaxed italic p-2 rounded border mt-1 font-mono text-slate-450 truncate whitespace-normal ${
                          theme === 'night'
                            ? 'bg-slate-950/60 border-slate-850'
                            : 'bg-stone-50 border-stone-200/60'
                        }`}>
                          "{evt.notes}"
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Actions for Selected Day */}
            <div className="pt-4 border-t border-slate-150 dark:border-slate-850 shrink-0">
              <button
                type="button"
                onClick={() => openAddEventForm(selectedDateStr)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 active:scale-95 transition-all text-center cursor-pointer"
                id="agenda-add-event-btn"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Create Custom Event</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pop up form for creating custom events */}
      <AnimatePresence>
        {isAddEventOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`w-full max-w-md rounded-2xl border p-6 shadow-xl relative ${
                theme === 'night' 
                  ? 'bg-slate-900 border-slate-800 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
              id="add-custom-event-modal"
            >
              <button
                type="button"
                onClick={() => setIsAddEventOpen(false)}
                className={`absolute top-4 right-4 p-1.5 rounded-lg border transition-all cursor-pointer ${
                  theme === 'night' 
                    ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs hover:bg-slate-50'
                }`}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">Create Custom Calendar Event</h3>
                  <p className="text-[10px] text-slate-500">Scheduled on selected date: {formDate}</p>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Event Title</label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Prep meeting, follow up trigger"
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none transition-all ${
                      theme === 'night'
                        ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                        : 'bg-slate-50 border-slate-300 focus:bg-white focus:border-blue-500 text-slate-800'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Selected Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none transition-all ${
                        theme === 'night'
                          ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                          : 'bg-slate-50 border-slate-300 focus:bg-white focus:border-blue-500 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Event Category</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as CalendarEvent['type'])}
                      className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none transition-all ${
                        theme === 'night'
                          ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                          : 'bg-slate-50 border-slate-300 focus:bg-white focus:border-blue-500 text-slate-705 font-medium'
                      }`}
                    >
                      <option value="Custom">Custom</option>
                      <option value="Applied">Applied</option>
                      <option value="Interview">Interview</option>
                      <option value="Follow Up">Follow Up</option>
                      <option value="Additional Round">Additional Round</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notes (Optional)</label>
                  <textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Provide additional details or checklists..."
                    rows={3}
                    maxLength={1000}
                    className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none transition-all ${
                      theme === 'night'
                        ? 'bg-slate-950 border-slate-800 focus:border-indigo-500 text-slate-200'
                        : 'bg-slate-50 border-slate-300 focus:bg-white focus:border-blue-500 text-slate-800'
                    }`}
                  />
                </div>

                {errorMessage && (
                  <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-sans break-words select-text">
                    {errorMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddEventOpen(false)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      theme === 'night'
                        ? 'bg-transparent border-slate-800 text-slate-300 hover:bg-slate-800'
                        : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Event</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
