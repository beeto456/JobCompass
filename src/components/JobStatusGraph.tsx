import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { JobApplication, JobStatus } from '../types';
import { Layers } from 'lucide-react';

interface JobStatusGraphProps {
  applications: JobApplication[];
  theme: 'day' | 'night';
}

const STATUS_KEYS: JobStatus[] = [
  "Haven't Applied",
  'Applied',
  'Awaiting Interview',
  'Assessment/Test',
  'Interviewing',
  'Offer Negotiation',
  'Offered',
  'Rejected',
  'No Longer Interested',
  'Ghosted (> 2 Weeks)',
];

const STATUS_COLORS: Record<JobStatus, string> = {
  "Haven't Applied": '#64748b',       // Slate
  'Applied': '#f59e0b',                // Amber
  'Awaiting Interview': '#06b6d4',     // Cyan
  'Assessment/Test': '#8b5cf6',        // Violet
  'Interviewing': '#3b82f6',           // Blue
  'Offer Negotiation': '#f97316',      // Orange
  'Offered': '#10b981',                // Emerald
  'Rejected': '#ef4444',               // Red
  'No Longer Interested': '#71717a',    // Zinc
  'Ghosted (> 2 Weeks)': '#d946ef',    // Fuchsia
};

export default function JobStatusGraph({ applications, theme }: JobStatusGraphProps) {
  // Compute counts for each status
  const counts = STATUS_KEYS.reduce((acc, status) => {
    acc[status] = 0;
    return acc;
  }, {} as Record<JobStatus, number>);

  applications.forEach((app) => {
    if (counts[app.status] !== undefined) {
      counts[app.status] += 1;
    }
  });

  const chartData = STATUS_KEYS.map((status) => ({
    name: status,
    Count: counts[status],
    fill: STATUS_COLORS[status],
  }));

  const totalApplications = applications.length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`border p-3 rounded-xl shadow-xl text-xs font-sans transition-all ${
          theme === 'night' 
            ? 'bg-slate-900 border-slate-800 text-slate-300' 
            : 'bg-white border-slate-200/90 text-slate-700'
        }`}>
          <p className={`font-bold mb-1 ${
            theme === 'night' ? 'text-white' : 'text-slate-800'
          }`} id={`tooltip-name-${data.name.replace(/\s+/g, '-')}`}>{data.name}</p>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: data.fill }}
            />
            <span>
              Applications: <strong className={`font-mono font-bold ${
                theme === 'night' ? 'text-white' : 'text-slate-900'
              }`}>{data.Count}</strong>
            </span>
          </div>
          {totalApplications > 0 && (
            <p className={`text-[10px] mt-1 ${
              theme === 'night' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Percentage: {((data.Count / totalApplications) * 100).toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`rounded-2xl p-5 md:p-6 shadow-sm backdrop-blur-sm border transition-all duration-200 ${
      theme === 'night' 
        ? 'bg-slate-900/60 border-slate-800 shadow-slate-950/40' 
        : 'bg-white/90 border-slate-200/90 shadow-slate-100/50'
    }`} id="job-status-graph-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className={`flex items-center gap-2 font-semibold text-xs tracking-[0.1em] uppercase mb-1 ${
            theme === 'night' ? 'text-indigo-400' : 'text-indigo-600'
          }`}>
            <Layers className="w-3.5 h-3.5" />
            <span>Metrics Engine</span>
          </div>
          <h2 className={`text-xl font-serif font-bold tracking-tight italic ${
            theme === 'night' ? 'text-slate-100' : 'text-slate-900'
          }`}>
            Pipeline Distribution
          </h2>
        </div>
        <div className={`text-xs px-3 py-1.5 rounded-xl border transition-colors duration-200 ${
          theme === 'night' 
            ? 'text-slate-300 bg-slate-950/40 border-slate-800' 
            : 'text-slate-600 bg-slate-50 border-slate-200/80'
        }`}>
          Active Pipeline: <span className={`font-serif italic font-bold ${
            theme === 'night' ? 'text-indigo-400' : 'text-indigo-600'
          }`}>{totalApplications}</span> entries
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800" id="recharts-container">
        {totalApplications === 0 ? (
          <div className={`w-full h-72 md:h-80 flex flex-col items-center justify-center border border-dashed rounded-2xl transition-colors duration-200 ${
            theme === 'night' 
              ? 'text-slate-400 border-slate-800 bg-slate-950/10' 
              : 'text-slate-600 border-slate-200 bg-slate-50/50'
          }`}>
            <p className="text-xs font-semibold uppercase tracking-wider">No application data logged yet</p>
            <p className={`text-xs mt-1 ${theme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>Add jobs to visualize your pipeline dashboard</p>
          </div>
        ) : (
          <div className="h-72 md:h-80 min-w-[650px] lg:min-w-0" id="scrollable-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'night' ? 'rgba(71, 85, 105, 0.15)' : '#f1f5f9'} 
                  vertical={false} 
                />
                <XAxis
                  dataKey="name"
                  stroke={theme === 'night' ? '#94a3b8' : '#475569'}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => {
                    if (val === "Haven't Applied") return "Haven't Applied";
                    if (val === 'Awaiting Interview') return 'Awaiting Int';
                    if (val === 'Assessment/Test') return 'Assessment';
                    if (val === 'Offer Negotiation') return 'Negotiation';
                    if (val === 'No Longer Interested') return 'No Interest';
                    if (val === 'Ghosted (> 2 Weeks)') return 'Ghosted';
                    return val;
                  }}
                />
                <YAxis
                  stroke={theme === 'night' ? '#94a3b8' : '#475569'}
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  content={<CustomTooltip />} 
                  cursor={{ fill: theme === 'night' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)' }} 
                />
                <Bar dataKey="Count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                  {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-4 pt-4 border-t transition-colors ${
        theme === 'night' ? 'border-slate-850' : 'border-slate-150'
      }`}>
        {chartData.map((item) => (
          <div 
            key={item.name} 
            className={`flex flex-col items-start p-1.5 rounded-xl transition-colors ${
              theme === 'night' ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
            }`}
          >
            <span className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
              theme === 'night' ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: item.fill }}
              />
              <span className="truncate max-w-[85px]" title={item.name}>
                {item.name}
              </span>
            </span>
            <span className={`text-base font-serif font-bold mt-0.5 ml-3 italic ${
              theme === 'night' ? 'text-slate-100' : 'text-slate-800'
            }`}>
              {item.Count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
