import { useMemo } from 'react';
import { JobApplication, JobStatus } from '../types';
import {
  FileCheck,
  TrendingUp,
  Award,
  Video,
  Clock,
  Sparkles,
} from 'lucide-react';

interface DashboardStatsProps {
  applications: JobApplication[];
  theme: 'day' | 'night';
}

export default function DashboardStats({ applications, theme }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const total = applications.length;
    
    // Status aggregates
    const interviews = applications.filter(
      (a) => a.status === 'Interviewing' || a.status === 'Awaiting Interview'
    ).length;
    
    const offers = applications.filter((a) => a.status === 'Offered').length;
    
    const applied = applications.filter(
      (a) => a.status === 'Applied'
    ).length;
    
    const planned = applications.filter(
      (a) => a.status === "Haven't Applied"
    ).length;

    // Offer Conversion success rate (Offers divided by all applied/interviewed, i.e., non-planned)
    const activeHunt = applications.filter((a) => a.status !== "Haven't Applied").length;
    const conversionRate = activeHunt > 0 ? Math.round((offers / activeHunt) * 100) : 0;

    return {
      total,
      interviews,
      offers,
      applied,
      planned,
      conversionRate,
    };
  }, [applications]);

  const cards = [
    {
      title: 'Tracked Opportunities',
      value: stats.total,
      icon: TrendingUp,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100/80',
      description: 'Logged job listing positions',
    },
    {
      title: 'Active Applications',
      value: stats.applied,
      icon: FileCheck,
      color: 'text-amber-600 bg-amber-50 border-amber-100/80',
      description: 'Applications submitted & pending',
    },
    {
      title: 'Interview Pipeline',
      value: stats.interviews,
      icon: Video,
      color: 'text-cyan-600 bg-cyan-50 border-cyan-100/80',
      description: 'Assessments & video interviews',
    },
    {
      title: 'Job Offers',
      value: stats.offers,
      icon: Award,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100/80',
      description: 'Accepted or pending job offers',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        
        let iconBgStyle = card.color;
        if (theme === 'night') {
          if (card.color.includes('indigo')) iconBgStyle = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
          else if (card.color.includes('amber')) iconBgStyle = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          else if (card.color.includes('cyan')) iconBgStyle = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
          else iconBgStyle = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
        }

        return (
          <div
            key={card.title}
            className={`rounded-2xl p-5 shadow-sm transition-all flex items-start gap-4 border ${
              theme === 'night'
                ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:shadow-lg'
                : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className={`p-2.5 rounded-xl border shrink-0 ${iconBgStyle}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className={`text-[10px] font-bold uppercase tracking-widest block font-sans ${
                theme === 'night' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                {card.title}
              </span>
              <span className={`text-3xl font-serif font-bold block mt-1 leading-none italic ${
                theme === 'night' ? 'text-white' : 'text-slate-900'
              }`}>
                {card.value}
              </span>
              <span className={`text-xs block mt-2 truncate font-sans ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                {card.description}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
