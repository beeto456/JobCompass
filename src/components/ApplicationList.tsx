import React, { useState, useMemo, Fragment } from 'react';
import { JobApplication, JobStatus, Resume } from '../types';
import {
  LayoutGrid,
  Table as TableIcon,
  Search,
  ExternalLink,
  MapPin,
  DollarSign,
  Calendar,
  Pencil,
  Trash2,
  SlidersHorizontal,
  ChevronDown,
  ClipboardList,
  FileText, // For showing linked resumes
} from 'lucide-react';

interface ApplicationListProps {
  applications: JobApplication[];
  onEdit: (app: JobApplication) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, nextStatus: JobStatus) => void;
  theme: 'day' | 'night';
  resumes: Resume[];
  onDownloadResumeContent?: (resume: Resume) => Promise<string>;
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

// Badge styles based on specific prompt request (soft pastel colored borders and backgrounds with high contrast text)
export const getStatusBadgeStyles = (status: JobStatus): string => {
  switch (status) {
    case 'Applied':
      return 'bg-[#f59e0b] text-slate-950 border border-[#d97706]/60 shadow-xs font-semibold';
    case 'Awaiting Interview':
      return 'bg-[#06b6d4] text-slate-950 border border-[#0891b2]/60 shadow-xs font-semibold';
    case 'Assessment/Test':
      return 'bg-[#8b5cf6] text-white border border-[#7c3aed]/60 shadow-xs font-semibold';
    case 'Interviewing':
      return 'bg-[#3b82f6] text-white border border-[#2563eb]/60 shadow-xs font-semibold';
    case 'Offer Negotiation':
      return 'bg-[#f97316] text-white border border-[#ea580c]/60 shadow-xs font-semibold';
    case 'Offered':
      return 'bg-[#10b981] text-white border border-[#059669]/60 shadow-xs font-semibold';
    case 'Rejected':
      return 'bg-[#ef4444] text-white border border-[#dc2626]/60 shadow-xs font-semibold';
    case "Haven't Applied":
      return 'bg-[#64748b] text-white border border-[#475569]/60 shadow-xs font-semibold';
    case 'No Longer Interested':
      return 'bg-[#71717a] text-white border border-[#52525b]/60 shadow-xs font-semibold';
    case 'Ghosted (> 2 Weeks)':
      return 'bg-[#d946ef] text-white border border-[#c084fc]/60 shadow-xs font-semibold';
    default:
      return 'bg-[#64748b] text-white border border-[#475569]/60 shadow-xs font-semibold';
  }
};

export const getJobMatchScoreObj = (app: JobApplication) => {
  const jdLines = app.jobDescription
    ? app.jobDescription.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
  
  if (jdLines.length === 0) return { score: null, count: 0, colorClass: 'text-slate-500 bg-slate-100/80 border-slate-200/60 dark:text-slate-400 dark:bg-slate-900 dark:border-slate-800' };
  
  let competenceSum = 0;
  let interestSum = 0;
  let requirementsMeta: Record<string, { competent?: string; interest?: string }> = {};
  
  try {
    if (app.requirementsMetaJson) {
      requirementsMeta = JSON.parse(app.requirementsMetaJson);
    }
  } catch (e) {
    // ignore
  }
  
  let answeredCount = 0;
  jdLines.forEach((_, idx) => {
    const meta = requirementsMeta[idx] || {};
    if (meta.competent || meta.interest) {
      answeredCount++;
    }
    
    const compVal = meta.competent || 'No';
    if (compVal === 'Yes') competenceSum += 1;
    else if (compVal === 'Maybe') competenceSum += 0.5;
    
    const intVal = meta.interest || 'No';
    if (intVal === 'Yes') interestSum += 1;
    else if (intVal === 'Maybe') interestSum += 0.5;
  });
  
  if (answeredCount === 0) {
    return {
      score: null,
      count: jdLines.length,
      colorClass: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-200 dark:bg-slate-800 dark:border-slate-700'
    };
  }
  
  const compAvg = competenceSum / jdLines.length;
  const intAvg = interestSum / jdLines.length;
  const matchScore = (compAvg / 2 + intAvg / 2) * 100;
  const score = Math.round(matchScore);
  
  let colorClass = 'text-red-650 bg-slate-100/80 border-slate-200 dark:text-red-400 dark:bg-slate-900 dark:border-slate-850';
  if (score >= 70) {
    colorClass = 'text-emerald-700 bg-slate-100/80 border-slate-200 dark:text-emerald-400 dark:bg-slate-900 dark:border-slate-850';
  } else if (score >= 50) {
    colorClass = 'text-amber-700 bg-slate-100/80 border-slate-200 dark:text-amber-400 dark:bg-slate-900 dark:border-slate-850';
  }
  
  return { score, count: jdLines.length, colorClass };
};

export default function ApplicationList({
  applications,
  onEdit,
  onDelete,
  onStatusChange,
  theme,
  resumes,
  onDownloadResumeContent,
}: ApplicationListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'title-asc' | 'title-desc' | 'company-asc' | 'company-desc' | 'date-new' | 'date-old'>('date-new');
  const [expandedAppId, setExpandedAppId] = useState<string | null>(null);
  const [downloadingResumeId, setDownloadingResumeId] = useState<string | null>(null);

  const handleDownloadResume = async (e: React.MouseEvent, resume: Resume) => {
    e.stopPropagation();
    if (!onDownloadResumeContent) return;
    try {
      setDownloadingResumeId(resume.id);
      const fileData = await onDownloadResumeContent(resume);
      const link = document.createElement('a');
      link.href = fileData;
      link.download = resume.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download resume:', err);
      alert('Could not download file. The content might be unavailable or chunked improperly.');
    } finally {
      setDownloadingResumeId(null);
    }
  };

  // Filter and sort items
  const sortedAndFilteredApps = useMemo(() => {
    let result = [...applications];

    // Status Filter
    if (filterStatus !== 'All') {
      result = result.filter((app) => app.status === filterStatus);
    }

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (app) =>
          app.title.toLowerCase().includes(q) ||
          app.company.toLowerCase().includes(q) ||
          app.officeLocation.toLowerCase().includes(q) ||
          app.notes.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'title-asc') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'title-desc') {
        return b.title.localeCompare(a.title);
      } else if (sortBy === 'company-asc') {
        return a.company.localeCompare(b.company);
      } else if (sortBy === 'company-desc') {
        return b.company.localeCompare(a.company);
      } else if (sortBy === 'date-new') {
        return new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime();
      } else if (sortBy === 'date-old') {
        return new Date(a.applicationDate).getTime() - new Date(b.applicationDate).getTime();
      }
      return 0;
    });

    return result;
  }, [applications, filterStatus, searchQuery, sortBy]);

  const stats = useMemo(() => {
    return {
      total: sortedAndFilteredApps.length,
      offers: sortedAndFilteredApps.filter((a) => a.status === 'Offered').length,
      interviews: sortedAndFilteredApps.filter((a) => a.status === 'Interviewing' || a.status === 'Awaiting Interview').length,
    };
  }, [sortedAndFilteredApps]);

  return (
    <div className="space-y-6" id="job-status-explorer-view">
      {/* Search, Filter, layout toggle BAR */}
      <div className={`border rounded-2xl p-4 md:p-5 shadow-sm space-y-4 transition-colors duration-200 ${
        theme === 'night' ? 'bg-slate-900/60 border-slate-800' : 'bg-white/95 border-slate-200/90'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left items: Search and filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 lg:max-w-4xl">
            {/* Search Input */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                theme === 'night' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <input
                type="text"
                placeholder="Search job title, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-all duration-200 ${
                  theme === 'night' 
                    ? 'bg-slate-950/70 border-slate-850 text-slate-200 focus:border-indigo-500/80 focus:bg-slate-950' 
                    : 'bg-slate-50 border-slate-200/80 text-slate-700 focus:border-blue-500/80 focus:bg-white'
                }`}
                id="search-input"
              />
            </div>

            {/* Status Dropdown */}
            <div className="relative">
              <SlidersHorizontal className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${
                theme === 'night' ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full appearance-none border rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none cursor-pointer transition-all duration-200 ${
                  theme === 'night' 
                    ? 'bg-slate-950/70 border-slate-850 text-slate-200 focus:border-indigo-500/80 focus:bg-slate-950' 
                    : 'bg-slate-50 border-slate-200/80 text-slate-700 focus:border-blue-500/80 focus:bg-white'
                }`}
                id="filter-status-select"
              >
                <option value="All">All Statuses (Filter)</option>
                {STATUS_KEYS.map((st) => (
                  <option key={st} value={st} className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-805'}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${
                theme === 'night' ? 'text-slate-450' : 'text-slate-500'
              }`} />
            </div>

            {/* Sorting */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`w-full appearance-none border rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none cursor-pointer transition-all duration-200 ${
                  theme === 'night' 
                    ? 'bg-slate-950/70 border-slate-850 text-slate-200 focus:border-indigo-500/80 focus:bg-slate-950' 
                    : 'bg-slate-50 border-slate-200/80 text-slate-700 focus:border-blue-500/80 focus:bg-white'
                }`}
                id="sorting-select"
              >
                <option value="date-new" className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>Date: Newest First</option>
                <option value="date-old" className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>Date: Oldest First</option>
                <option value="title-asc" className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>Job Title: A - Z</option>
                <option value="title-desc" className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>Job Title: Z - A</option>
                <option value="company-asc" className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>Company's Name: A - Z</option>
                <option value="company-desc" className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>Company's Name: Z - A</option>
              </select>
              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none ${
                theme === 'night' ? 'text-slate-400' : 'text-slate-500'
              }`} />
            </div>
          </div>

          {/* Right items: Layout controls */}
          <div className="flex items-center justify-between sm:justify-end gap-3 border-t lg:border-t-0 border-slate-100 pt-3 lg:pt-0 shrink-0">
          <span className={`text-[11px] block sm:hidden ${theme === 'night' ? 'text-slate-400' : 'text-slate-705 font-bold'}`}>Layout:</span>
            <div className={`border p-1 rounded-xl flex items-center transition-all duration-200 ${
              theme === 'night' ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'
            }`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs cursor-pointer ${
                  viewMode === 'grid'
                    ? theme === 'night'
                      ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                      : 'bg-white text-blue-600 font-bold shadow-xs border border-slate-200/60'
                    : theme === 'night'
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                title="Grid Collection"
                id="toggle-grid-btn"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs cursor-pointer ${
                  viewMode === 'table'
                    ? theme === 'night'
                      ? 'bg-slate-800 text-white font-bold shadow-sm border border-slate-700'
                      : 'bg-white text-blue-600 font-bold shadow-xs border border-slate-200/60'
                    : theme === 'night'
                      ? 'text-slate-400 hover:text-slate-200'
                      : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
                title="Database Table"
                id="toggle-table-btn"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Database View</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic sub-header feedback */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 text-xs pt-1 ${
          theme === 'night' ? 'text-slate-400' : 'text-slate-600'
        }`}>
          <p>
            Showing <strong className={`font-semibold ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>{sortedAndFilteredApps.length}</strong> job entries{' '}
            {filterStatus !== 'All' && <span>filtered by <strong className={`font-semibold ${theme === 'night' ? 'text-indigo-400' : 'text-blue-600'}`}>{filterStatus}</strong></span>}
          </p>
          <div className={`flex items-center gap-4 text-[11px] divide-x ${
            theme === 'night' ? 'text-slate-400 divide-slate-800' : 'text-slate-600 divide-slate-200'
          }`}>
            {stats.interviews > 0 && (
              <span className="pl-0">Interviews Planned: <strong className={`font-semibold ${theme === 'night' ? 'text-cyan-400' : 'text-cyan-700'}`}>{stats.interviews}</strong></span>
            )}
            {stats.offers > 0 && (
              <span className="pl-4">Offers Received: <strong className={`font-semibold ${theme === 'night' ? 'text-emerald-400' : 'text-emerald-700'}`}>{stats.offers}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* Grid Cards Mode */}
      {viewMode === 'grid' ? (
        sortedAndFilteredApps.length === 0 ? (
          <div className={`border border-dashed rounded-2xl p-12 text-center transition-all ${
            theme === 'night' ? 'bg-slate-900/40 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
          }`} id="empty-state-card">
            <SlidersHorizontal className="w-8 h-8 text-slate-350 mx-auto mb-3" />
            <p className={`text-sm font-bold ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>No matching applications found</p>
            <p className={`text-xs mt-1.5 max-w-sm mx-auto ${
              theme === 'night' ? 'text-slate-300' : 'text-slate-700 font-medium'
            }`}>
              Refine your filters, search syntax, or record a new entry to expand your tracker database.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="applications-grid-layout">
            {sortedAndFilteredApps.map((app) => (
              <div
                key={app.id}
                className={`border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-all duration-200 ${
                  theme === 'night' 
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700/80 hover:shadow-lg' 
                    : 'bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-md'
                }`}
                id={`app-card-${app.id}`}
              >
                <div>
                  {/* Title & Company */}
                  {(() => {
                    const matchObj = getJobMatchScoreObj(app);
                    const hasJd = app.jobDescription && app.jobDescription.trim().length > 0;
                    return (
                      <div className="flex items-start justify-between gap-1 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-2xl font-bold tracking-tight leading-snug line-clamp-1 ${
                            theme === 'night' ? 'text-slate-100' : 'text-slate-800'
                          }`}>
                            {app.title}
                          </h3>
                          <p className={`text-lg font-serif font-bold italic tracking-wide ${
                            theme === 'night' ? 'text-indigo-400' : 'text-blue-600'
                          }`}>{app.company}</p>
                        </div>
                        {hasJd && (
                          <div className={`px-2 py-0.5 rounded-xl border text-[10px] font-mono font-bold tracking-wider shrink-0 shadow-xs ${matchObj.colorClass}`}>
                            {matchObj.score !== null ? `${matchObj.score}% Match` : 'N/A Match'}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Metadata: Location, Salary, Applied Date */}
                  <div className={`space-y-2 mb-4 text-xs font-sans ${theme === 'night' ? 'text-slate-350' : 'text-slate-700'}`}>
                    {app.officeLocation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{app.officeLocation}</span>
                      </div>
                    )}
                    {app.salaryInformation && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                        <span className={`font-semibold ${theme === 'night' ? 'text-slate-300' : 'text-slate-800'}`}>
                          Range: {app.salaryInformation}
                        </span>
                      </div>
                    )}
                    {app.targetSalary && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-555 dark:text-emerald-400 shrink-0" />
                        <span className={`font-semibold ${theme === 'night' ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          Target: {app.targetSalary}
                        </span>
                      </div>
                    )}
                    {(app.interviewMethod || app.interviewRound) && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400">
                          {app.interviewMethod || 'Interview'}{app.interviewRound ? ` - Rd ${app.interviewRound}` : ''}
                        </span>
                      </div>
                    )}
                    {app.resumeId && (() => {
                      const linkedResume = resumes.find(r => r.id === app.resumeId);
                      return (
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={(e) => linkedResume && handleDownloadResume(e, linkedResume)}
                            disabled={!linkedResume || downloadingResumeId === linkedResume.id}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] uppercase tracking-wider font-extrabold cursor-pointer transition-all hover:scale-102 active:scale-98 ${
                              theme === 'night'
                                ? 'bg-orange-95/40 border-orange-500/30 text-orange-400 hover:bg-orange-900/30 hover:border-orange-400/45'
                                : 'bg-orange-50/90 border-orange-200/90 text-orange-800 hover:bg-orange-100 hover:border-orange-300 shadow-xs'
                            }`}
                            title={linkedResume ? `Click to download: ${linkedResume.displayName || linkedResume.name}` : 'Resume file linked'}
                          >
                            <FileText className={`w-3 h-3 shrink-0 ${downloadingResumeId === linkedResume?.id ? 'animate-bounce' : ''}`} />
                            <span className="truncate max-w-[120px]">{linkedResume?.displayName || linkedResume?.name || 'Resume'}</span>
                          </button>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Applied:</span>
                      <strong className={`font-semibold ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {app.applicationDate}
                      </strong>
                    </div>
                    {app.interviewDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                        <span>Interview:</span>
                        <strong className={`font-semibold ${theme === 'night' ? 'text-cyan-400' : 'text-cyan-700'}`}>
                          {app.interviewDate}
                        </strong>
                      </div>
                    )}
                    {app.followUpDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>Follow Up:</span>
                        <strong className={`font-semibold ${theme === 'night' ? 'text-amber-400' : 'text-amber-700'}`}>
                          {app.followUpDate}
                        </strong>
                      </div>
                    )}
                    {app.interviewDates && app.interviewDates.filter(Boolean).length > 0 && (
                      <div className="flex flex-col gap-1 mt-1 pl-5 border-l-2 border-indigo-505/25">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Additional Round Dates:</span>
                        <div className="flex flex-wrap gap-1">
                          {app.interviewDates.filter(Boolean).map((d, i) => (
                            <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                              theme === 'night'
                                ? 'bg-indigo-950/20 border-indigo-900/40 text-indigo-300'
                                : 'bg-slate-50 border-slate-200 text-slate-705 font-semibold'
                            }`}>
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {app.url && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a
                          href={app.url.startsWith('http') ? app.url : `https://${app.url}`}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className={`underline font-bold transition-all hover:opacity-80 ${
                            theme === 'night'
                              ? 'text-indigo-400 hover:text-indigo-300'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                          title="View job description listing"
                        >
                          Link to JD
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Private notes preview */}
                  {app.notes && (
                    <div className={`p-3 rounded-xl border text-[11px] italic mb-4 line-clamp-2 leading-relaxed ${
                      theme === 'night' 
                        ? 'bg-slate-950/50 border-slate-850/60 text-slate-300' 
                        : 'bg-slate-50/55 border-slate-200/50 text-slate-700'
                    }`}>
                      {app.notes}
                    </div>
                  )}

                  {/* Paste Job Description parsing checklist */}
                  {app.jobDescription && (
                    <div className="mb-4">
                      <button
                        type="button"
                        onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                        className={`w-full py-2 px-3 rounded-xl text-[10px] font-bold border transition-all flex items-center justify-between gap-1.5 cursor-pointer ${
                          theme === 'night'
                            ? expandedAppId === app.id
                              ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-400'
                              : 'bg-slate-950/40 border-slate-850/80 text-slate-400 hover:text-white hover:bg-slate-950'
                            : expandedAppId === app.id
                              ? 'bg-blue-50/50 border-blue-200 text-blue-600'
                              : 'bg-slate-50 border-slate-250/75 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                        id={`btn-toggle-jd-${app.id}`}
                      >
                        <span className="flex items-center gap-1.5">
                          <ClipboardList className="w-3.5 h-3.5" />
                          <span>{expandedAppId === app.id ? 'Hide Job Description' : 'View Job Description'}</span>
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedAppId === app.id ? 'rotate-180' : ''}`} />
                      </button>

                      {expandedAppId === app.id && (
                        <div className={`mt-2 border rounded-xl p-3.5 space-y-3 max-h-56 overflow-y-auto transition-all duration-200 ${
                          theme === 'night' ? 'bg-slate-950/80 border-slate-850' : 'bg-slate-50 border-slate-200/60'
                        }`} id={`jd-expanded-overlay-${app.id}`}>
                          <div className={`grid grid-cols-12 gap-2 font-mono text-[8px] uppercase tracking-wider font-bold border-b pb-1 dark:border-slate-800 ${
                            theme === 'night' ? 'text-slate-400' : 'text-slate-600'
                          }`}>
                            <div className="col-span-12 sm:col-span-1 text-center hidden sm:block">S/N</div>
                            <div className="col-span-12 sm:col-span-7 pl-1">Requirement (Core Tasks)</div>
                            <div className="col-span-6 sm:col-span-2 text-center sm:text-left sm:pl-3">Competent</div>
                            <div className="col-span-6 sm:col-span-2 text-center sm:text-left sm:pl-3">Interest</div>
                          </div>
                          <div className="space-y-2.5">
                            {(() => {
                              let requirementsMeta: Record<string, { competent?: string; interest?: string }> = {};
                              try {
                                if (app.requirementsMetaJson) {
                                  requirementsMeta = JSON.parse(app.requirementsMetaJson);
                                }
                              } catch (e) {}

                              return app.jobDescription.split('\n').map((line) => line.trim()).filter(Boolean).map((line, idx) => {
                                const meta = requirementsMeta[idx] || {};
                                const compVal = meta.competent || 'No';
                                const intVal = meta.interest || 'No';

                                const getBadgeColor = (val: string) => {
                                  if (val === 'Yes') return 'bg-emerald-100 text-emerald-950 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/65';
                                  if (val === 'Maybe') return 'bg-amber-100 text-amber-950 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/65';
                                  return 'bg-slate-105 text-slate-705 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-805';
                                };

                                return (
                                  <div key={idx} className="grid grid-cols-12 gap-2 items-center text-[11px] leading-relaxed border-b border-dashed border-slate-150 last:border-0 pb-2 last:pb-0 dark:border-slate-850/60 font-sans">
                                    <div className={`col-span-12 sm:col-span-1 font-mono text-center font-bold px-0.5 py-0.5 rounded text-[9px] shrink-0 border transition-colors ${
                                      theme === 'night'
                                        ? 'bg-slate-900 text-slate-300 border-slate-800'
                                        : 'bg-slate-105 text-slate-705 border-slate-200'
                                    }`}>
                                      {String(idx + 1).padStart(2, '0')}
                                    </div>
                                    <div className={`col-span-12 sm:col-span-7 pl-1 font-sans text-left ${theme === 'night' ? 'text-slate-200' : 'text-slate-700'}`}>
                                      {line}
                                    </div>
                                    
                                    {/* Competent Indicator */}
                                    <div className="col-span-6 sm:col-span-2 sm:px-2 flex items-center gap-1.5">
                                      <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400 sm:hidden">Comp:</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(compVal)}`}>
                                        {compVal}
                                      </span>
                                    </div>

                                    {/* Interest Indicator */}
                                    <div className="col-span-6 sm:col-span-2 sm:px-2 flex items-center gap-1.5">
                                      <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400 sm:hidden">Int:</span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(intVal)}`}>
                                        {intVal}
                                      </span>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer status picker & controls */}
                <div className={`border-t pt-4 mt-auto flex items-center justify-between gap-2.5 ${
                  theme === 'night' ? 'border-slate-850' : 'border-slate-100'
                }`}>
                  <div className="relative flex-1">
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange(app.id, e.target.value as JobStatus)}
                      className={`w-full appearance-none pl-3 pr-8 py-2 rounded-xl text-xs font-bold focus:outline-none cursor-pointer transition-all border ${getStatusBadgeStyles(
                        app.status
                      )}`} 
                      id={`status-inline-select-${app.id}`}
                    >
                      {STATUS_KEYS.map((opt) => (
                        <option key={opt} value={opt} className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onEdit(app)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        theme === 'night'
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 shadow-sm'
                          : 'bg-white border-slate-250 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/40'
                      }`}
                      title="Edit Application Properties"
                      id={`edit-app-${app.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(app.id)}
                      className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                        theme === 'night'
                          ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-rose-500 hover:bg-rose-600 shadow-sm'
                          : 'bg-white border-slate-250 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/45'
                      }`}
                      title="Delete Application Entry"
                      id={`delete-app-${app.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Database Table view Mode */
        <div className={`border rounded-2xl overflow-hidden shadow-xs transition-colors duration-200 ${
          theme === 'night' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`} id="applications-table-view">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]" id="db-list-table">
              <thead>
                <tr className={`text-[10px] font-bold uppercase tracking-widest border-b ${
                  theme === 'night' ? 'bg-slate-950/60 border-slate-850 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <th className="py-4 px-5">Job Title & Company</th>
                  <th className="py-4 px-4">Date Applied</th>
                  <th className="py-4 px-4">Current Status</th>
                  <th className="py-4 px-4">Work Arrangement</th>
                  <th className="py-4 px-4">Location</th>
                  <th className="py-4 px-4">Posted Salary Range</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                theme === 'night' ? 'divide-slate-850 text-slate-350' : 'divide-slate-100 text-slate-600'
              }`}>
                {sortedAndFilteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={`py-12 px-5 text-center ${theme === 'night' ? 'text-slate-400' : 'text-slate-600'}`}>
                      <SlidersHorizontal className="w-6 h-6 text-slate-350 mx-auto mb-2" />
                      <p className="font-semibold text-xs">No matching applications</p>
                      <span className={`text-[10px] ${theme === 'night' ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>Amend filters to inspect entries</span>
                    </td>
                  </tr>
                ) : (
                  sortedAndFilteredApps.map((app) => (
                    <Fragment key={app.id}>
                      <tr
                        className={`transition-colors ${
                          theme === 'night' ? 'hover:bg-slate-950/60' : 'hover:bg-slate-50/50'
                        } ${expandedAppId === app.id ? (theme === 'night' ? 'bg-slate-950/40' : 'bg-slate-55/65') : ''}`}
                        id={`table-row-${app.id}`}
                      >
                        {/* Job Title & Company */}
                        <td className="py-3 px-5">
                          <div className="flex flex-col max-w-[200px]">
                            <span className={`font-bold truncate flex items-center gap-1.5 ${
                              theme === 'night' ? 'text-slate-100' : 'text-slate-800'
                            }`}>
                              {app.title}
                              {app.url && (
                                <a
                                  href={app.url.startsWith('http') ? app.url : `https://${app.url}`}
                                  target="_blank"
                                  referrerPolicy="no-referrer"
                                  className="text-slate-400 hover:text-blue-600 inline-block shrink-0"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </span>
                            <span className={`text-[11px] font-serif font-bold italic truncate mt-0.5 ${
                              theme === 'night' ? 'text-indigo-400' : 'text-blue-600'
                            }`}>{app.company}</span>
                            {app.jobDescription && (() => {
                              const matchObj = getJobMatchScoreObj(app);
                              const hasJd = app.jobDescription.trim().length > 0;
                              if (!hasJd) return null;
                              return (
                                <span className={`inline-block w-fit px-2 py-0.5 rounded-xl border text-[9px] font-mono font-bold tracking-wider mt-1.5 shadow-xs ${matchObj.colorClass}`}>
                                  {matchObj.score !== null ? `${matchObj.score}% Match` : 'N/A Match'}
                                </span>
                              );
                            })()}
                            {app.resumeId && (() => {
                              const linkedResume = resumes.find(r => r.id === app.resumeId);
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => linkedResume && handleDownloadResume(e, linkedResume)}
                                  disabled={!linkedResume || downloadingResumeId === linkedResume.id}
                                  className={`text-[10px] flex items-center gap-1.5 mt-1.5 font-bold truncate max-w-[180px] cursor-pointer hover:underline text-left ${
                                    theme === 'night' ? 'text-orange-400' : 'text-orange-700'
                                  }`}
                                  title={linkedResume ? `Click to download: ${linkedResume.displayName || linkedResume.name}` : 'Resume'}
                                >
                                  <FileText className={`w-3.5 h-3.5 shrink-0 ${downloadingResumeId === linkedResume?.id ? 'animate-bounce' : ''}`} />
                                  <span className="truncate">{linkedResume?.displayName || linkedResume?.name || 'Resume'}</span>
                                </button>
                              );
                            })()}
                          </div>
                        </td>

                        {/* Date Applied */}
                        <td className={`py-3 px-4 font-mono text-[11px] ${
                          theme === 'night' ? 'text-slate-400' : 'text-slate-700 font-semibold'
                        }`}>
                          {app.applicationDate}
                        </td>

                        {/* Current Status Badge with select box */}
                        <td className="py-2 px-4 whitespace-nowrap">
                          <div className="relative inline-block w-40">
                            <select
                              value={app.status}
                              onChange={(e) => onStatusChange(app.id, e.target.value as JobStatus)}
                              className={`w-full appearance-none pl-2.5 pr-8 py-1 rounded-lg text-[11px] font-bold focus:outline-none cursor-pointer border ${getStatusBadgeStyles(
                                app.status
                              )}`}
                              id={`status-table-select-${app.id}`}
                            >
                              {STATUS_KEYS.map((opt) => (
                                <option key={opt} value={opt} className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-850 text-xs'}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none opacity-80" />
                          </div>
                        </td>

                        {/* Work Style */}
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                            theme === 'night' ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {app.workArrangement}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="py-3 px-4 truncate max-w-[150px]" title={app.officeLocation}>
                          {app.officeLocation ? (
                            <span className="flex items-center gap-1">
                              <MapPin className={`w-3 h-3 shrink-0 ${theme === 'night' ? 'text-slate-500' : 'text-slate-400'}`} />
                              {app.officeLocation}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Salary */}
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-0.5">
                            {app.salaryInformation ? (
                              <span className={`flex items-center gap-0.5 font-medium ${
                                theme === 'night' ? 'text-slate-350' : 'text-slate-800'
                              }`} title={`Posted: ${app.salaryInformation}`}>
                                <DollarSign className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                                {app.salaryInformation}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">—</span>
                            )}
                            {app.targetSalary && (
                              <span className={`flex items-center gap-0.5 text-[10px] font-bold ${
                                theme === 'night' ? 'text-emerald-400' : 'text-emerald-600'
                              }`} title={`Target: ${app.targetSalary}`}>
                                <DollarSign className="w-2.5 h-2.5" />
                                Tar: {app.targetSalary}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Row Actions */}
                        <td className="py-3 px-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {app.jobDescription && (
                              <button
                                onClick={() => setExpandedAppId(expandedAppId === app.id ? null : app.id)}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  theme === 'night'
                                    ? expandedAppId === app.id
                                      ? 'bg-indigo-950/50 text-indigo-400 border-indigo-900/60'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950/80 border-slate-800'
                                    : expandedAppId === app.id
                                      ? 'bg-blue-50 text-blue-600 border-blue-250'
                                      : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100 border-slate-200'
                                }`}
                                title="View requirements core list"
                                id={`table-toggle-jd-${app.id}`}
                              >
                                <ClipboardList className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onEdit(app)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                                theme === 'night'
                                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 shadow-sm'
                                  : 'bg-white border-slate-250 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/40'
                              }`}
                              title="Edit properties"
                              id={`table-edit-${app.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDelete(app.id)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                                theme === 'night'
                                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-rose-500 hover:bg-rose-600 shadow-sm'
                                  : 'bg-white border-slate-250 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/45'
                              }`}
                              title="Delete record"
                              id={`table-delete-${app.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expandedAppId === app.id && app.jobDescription && (
                        <tr className={theme === 'night' ? 'bg-slate-950/40' : 'bg-slate-50/45'}>
                          <td colSpan={7} className="py-4 px-6">
                            <div className={`border rounded-2xl p-5 max-w-4xl transition-all duration-200 ${
                              theme === 'night' ? 'bg-slate-950/90 border-slate-850 animate-fade-in' : 'bg-white border-slate-205 shadow-xs'
                            }`}>
                              {/* Expanded interview & follow up details */}
                              {(app.interviewDate || app.followUpDate || (app.interviewDates && app.interviewDates.filter(Boolean).length > 0) || app.notes) && (
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-5 pb-5 border-b ${
                                  theme === 'night' ? 'border-slate-800' : 'border-slate-200'
                                }`}>
                                  <div className="space-y-3">
                                    <h5 className={`text-[10px] font-mono uppercase tracking-widest font-bold ${
                                      theme === 'night' ? 'text-indigo-400' : 'text-blue-600'
                                    }`}>
                                      Scheduled Interactions & Follow-Ups
                                    </h5>
                                    <div className="space-y-2 text-xs">
                                      {app.interviewDate && (
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                                          <span className="opacity-80">Primary Interview Date:</span>
                                          <strong className={theme === 'night' ? 'text-cyan-400' : 'text-cyan-700'}>{app.interviewDate}</strong>
                                        </div>
                                      )}
                                      {app.followUpDate && (
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                          <span className="opacity-80">Follow-Up Target Date:</span>
                                          <strong className={theme === 'night' ? 'text-amber-400' : 'text-amber-705'}>{app.followUpDate}</strong>
                                        </div>
                                      )}
                                      {app.interviewDates && app.interviewDates.filter(Boolean).length > 0 && (
                                        <div className="mt-1.5 space-y-1">
                                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Additional Rounds & Mock Dates:</span>
                                          <div className="flex flex-wrap gap-1.5">
                                            {app.interviewDates.filter(Boolean).map((d, i) => (
                                              <span key={i} className={`px-2 py-0.5 rounded font-mono font-bold border text-[10px] ${
                                                theme === 'night'
                                                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                                              }`}>
                                                {d}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {app.notes && (
                                    <div className="space-y-1.5">
                                      <h5 className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-400">
                                        Private Tracker Notes
                                      </h5>
                                      <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                                        theme === 'night' ? 'bg-slate-905 bg-opacity-40 text-slate-300 border border-slate-800' : 'bg-slate-50 text-slate-705 border border-slate-200'
                                      }`}>
                                        {app.notes}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              <h4 className={`text-[10px] font-mono uppercase tracking-widest font-bold mb-4 flex items-center gap-2 ${
                                theme === 'night' ? 'text-slate-400' : 'text-slate-600 font-semibold'
                              }`}>
                                <ClipboardList className="w-4 h-4 text-indigo-500" />
                                Job Requirements Core Checklist (Pasted Lines Parsing)
                              </h4>
                                                     <div className="space-y-3 max-h-72 overflow-y-auto pr-3">
                                <div className={`grid grid-cols-12 gap-3 font-mono text-[9px] uppercase font-bold tracking-wider border-b pb-2 dark:border-slate-800 ${
                                  theme === 'night' ? 'text-slate-400' : 'text-slate-700'
                                }`}>
                                  <div className="col-span-12 sm:col-span-1 text-center hidden sm:block">S/N</div>
                                  <div className="col-span-12 sm:col-span-1 text-center sm:hidden font-bold px-1 py-0.5 rounded border border-transparent">S/N</div>
                                  <div className="col-span-12 sm:col-span-7 pl-2">Job Task Description</div>
                                  <div className="col-span-6 sm:col-span-2 text-center sm:text-left sm:pl-3">Competent</div>
                                  <div className="col-span-6 sm:col-span-2 text-center sm:text-left sm:pl-3">Interest</div>
                                </div>
                                <div className="space-y-3">
                                  {(() => {
                                    let requirementsMeta: Record<string, { competent?: string; interest?: string }> = {};
                                    try {
                                      if (app.requirementsMetaJson) {
                                        requirementsMeta = JSON.parse(app.requirementsMetaJson);
                                      }
                                    } catch (e) {}

                                    return app.jobDescription.split('\n').map((line) => line.trim()).filter(Boolean).map((line, idx) => {
                                      const meta = requirementsMeta[idx] || {};
                                      const compVal = meta.competent || 'No';
                                      const intVal = meta.interest || 'No';

                                      const getBadgeColor = (val: string) => {
                                        if (val === 'Yes') return 'bg-emerald-100 text-emerald-950 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/65';
                                        if (val === 'Maybe') return 'bg-amber-100 text-amber-950 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/65';
                                        return 'bg-slate-105 text-slate-705 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-805';
                                      };

                                      return (
                                        <div key={idx} className="grid grid-cols-12 gap-3 items-center text-xs leading-relaxed border-b border-dashed border-slate-150 last:border-0 pb-2.5 last:pb-0 dark:border-slate-850/60 font-sans">
                                          <div className={`col-span-12 sm:col-span-1 font-mono text-center font-bold px-0.5 py-0.5 rounded text-[10px] shrink-0 border transition-colors ${
                                            theme === 'night'
                                              ? 'bg-slate-900 text-slate-300 border-slate-800'
                                              : 'bg-slate-105 text-slate-705 border-slate-200'
                                          }`}>
                                            {String(idx + 1).padStart(2, '0')}
                                          </div>
                                          <div className={`col-span-12 sm:col-span-7 pl-2 font-sans text-left ${theme === 'night' ? 'text-slate-200' : 'text-slate-700'}`}>
                                            {line}
                                          </div>
                                          
                                          {/* Competent Indicator */}
                                          <div className="col-span-6 sm:col-span-2 sm:px-2 flex items-center gap-1.5">
                                            <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400 sm:hidden">Comp:</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(compVal)}`}>
                                              {compVal}
                                            </span>
                                          </div>

                                          {/* Interest Indicator */}
                                          <div className="col-span-6 sm:col-span-2 sm:px-2 flex items-center gap-1.5">
                                            <span className="font-mono text-[8px] uppercase tracking-wider text-slate-405 sm:hidden">Int:</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(intVal)}`}>
                                              {intVal}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
