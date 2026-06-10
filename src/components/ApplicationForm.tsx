import React, { useState, useEffect } from 'react';
import { JobApplication, JobStatus, WorkArrangement, Resume, EmploymentType, AdditionalDate } from '../types';
import { X, Send, Briefcase, Link2, DollarSign, MapPin, AlignLeft, Calendar, Clock, ArrowLeft, ClipboardList, Plus, Lock, Unlock, Edit2, ExternalLink, FileText, UploadCloud } from 'lucide-react';

interface ApplicationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (app: Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string; jobDescription?: string; resumeId?: string }) => void;
  initialData: JobApplication | null;
  theme: 'day' | 'night';
  resumes: Resume[];
  onUploadResume: (name: string, type: string, size: number, dataUrl: string) => Promise<any>;
  isGuest?: boolean;
  onGoogleLogin?: () => void;
}

const STATUS_OPTIONS: JobStatus[] = [
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

const ARRANGEMENT_OPTIONS: WorkArrangement[] = ['Unknown', 'Remote', 'Hybrid', 'Onsite'];

const EMPLOYMENT_OPTIONS: EmploymentType[] = [
  'Full-Time',
  'Part-Time',
  'Contract',
  'Casual',
  'Freelance',
  'Internship',
  'Other',
];

export default function ApplicationForm({ isOpen, onClose, onSubmit, initialData, theme, resumes, onUploadResume, isGuest = false, onGoogleLogin }: ApplicationFormProps) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [url, setUrl] = useState('');
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>(() => {
    return (localStorage.getItem('job_tracker_view_mode') as 'basic' | 'advanced') || 'basic';
  });
  const [applicationDate, setApplicationDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [status, setStatus] = useState<JobStatus>('Applied');
  const [workArrangement, setWorkArrangement] = useState<WorkArrangement>('Unknown');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [officeLocation, setOfficeLocation] = useState('');
  const [salaryInformation, setSalaryInformation] = useState('');
  const [targetSalary, setTargetSalary] = useState('');
  const [interviewMethod, setInterviewMethod] = useState('');
  const [interviewRound, setInterviewRound] = useState('');
  const [notes, setNotes] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [requirementsMeta, setRequirementsMeta] = useState<Record<string, { competent?: 'Yes' | 'Maybe' | 'No'; interest?: 'Yes' | 'Maybe' | 'No' }>>({});

  const [interviewDate, setInterviewDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [interviewDates, setInterviewDates] = useState<AdditionalDate[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setCompany(initialData.company || '');
      setUrl(initialData.url || '');
      setApplicationDate(initialData.applicationDate ? initialData.applicationDate.substring(0, 10) : new Date().toISOString().split('T')[0]);
      setStatus(initialData.status || 'Applied');
      setWorkArrangement(initialData.workArrangement || 'Unknown');
      setEmploymentType(initialData.employmentType || '');
      setOfficeLocation(initialData.officeLocation || '');
      setSalaryInformation(initialData.salaryInformation || '');
      setTargetSalary(initialData.targetSalary || '');
      setInterviewMethod(initialData.interviewMethod || '');
      setInterviewRound(initialData.interviewRound || '');
      setNotes(initialData.notes || '');
      setJobDescription(initialData.jobDescription || '');
      setSelectedResumeId(initialData.resumeId || '');
      setInterviewDate(initialData.interviewDate || '');
      setFollowUpDate(initialData.followUpDate || '');
      const parsedDates: AdditionalDate[] = (initialData.interviewDates || []).map((item) => {
        if (typeof item === 'string') {
          return { date: item, title: '' };
        }
        return { date: item.date || '', title: item.title || '' };
      });
      setInterviewDates(parsedDates);
      setIsLocked(true);
      try {
        if (initialData.requirementsMetaJson) {
          setRequirementsMeta(JSON.parse(initialData.requirementsMetaJson));
        } else {
          setRequirementsMeta({});
        }
      } catch (e) {
        setRequirementsMeta({});
      }
    } else {
      // Clear for new entry
      setTitle('');
      setCompany('');
      setUrl('');
      setApplicationDate(new Date().toISOString().split('T')[0]);
      setStatus('Applied');
      setWorkArrangement('Unknown');
      setEmploymentType('');
      setOfficeLocation('');
      setSalaryInformation('');
      setTargetSalary('');
      setInterviewMethod('');
      setInterviewRound('');
      setNotes('');
      setJobDescription('');
      setSelectedResumeId('');
      setInterviewDate('');
      setFollowUpDate('');
      setInterviewDates([]);
      setIsLocked(false);
      setRequirementsMeta({});
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!title.trim()) tempErrors.title = 'Job title is required';
    if (!company.trim()) tempErrors.company = 'Company name is required';
    if (url.trim()) {
      try {
        const urlToTest = url.trim().includes('://') ? url.trim() : `https://${url.trim()}`;
        const parsedUrl = new URL(urlToTest);
        if (!parsedUrl.hostname.includes('.')) {
          tempErrors.url = 'Enter a valid URL (e.g. google.com)';
        }
      } catch (e) {
        tempErrors.url = 'Enter a valid URL (e.g. https://google.com)';
      }
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const updateMeta = (index: number, field: 'competent' | 'interest', value: 'Yes' | 'Maybe' | 'No') => {
    setRequirementsMeta((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      },
    }));
  };

  const calculateJobMatchPercentage = (): number | null => {
    if (jdLines.length === 0) return null;
    
    let competenceSum = 0;
    let interestSum = 0;
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
    
    if (answeredCount === 0) return null;
    
    const compAvg = competenceSum / jdLines.length;
    const intAvg = interestSum / jdLines.length;
    
    const matchScore = (compAvg / 2 + intAvg / 2) * 100;
    return Math.round(matchScore);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      id: initialData?.id,
      title: title.trim(),
      company: company.trim(),
      url: url.trim(),
      applicationDate,
      status,
      workArrangement,
      employmentType: employmentType || undefined,
      officeLocation: officeLocation.trim(),
      salaryInformation: salaryInformation.trim(),
      targetSalary: targetSalary.trim(),
      interviewMethod: interviewMethod,
      interviewRound: interviewRound.trim(),
      notes: notes.trim(),
      jobDescription: jobDescription.trim(),
      resumeId: selectedResumeId,
      requirementsMetaJson: JSON.stringify(requirementsMeta),
      interviewDate,
      followUpDate,
      interviewDates,
    });
    onClose();
  };

  // Extract individual non-empty lines for list numbering preview
  const jdLines = jobDescription
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // ClassName helpers for input size reduction and modularity
  const getInputClass = (hasError?: boolean) => {
    const base = "w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-all";
    if (theme === 'night') {
      if (hasError) return `${base} bg-slate-950 border-rose-500 text-white`;
      if (isLocked) return `${base} bg-slate-950/60 border-slate-900 text-slate-400 cursor-not-allowed`;
      return `${base} bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500`;
    } else {
      if (hasError) return `${base} bg-slate-50 border-rose-300 text-slate-800`;
      if (isLocked) return `${base} bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed`;
      return `${base} bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:border-blue-500`;
    }
  };

  const getSelectClass = () => {
    const base = "w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-all cursor-pointer";
    if (theme === 'night') {
      if (isLocked) return `${base} bg-slate-950/60 border-slate-900 text-slate-400 cursor-not-allowed`;
      return `${base} bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500`;
    } else {
      if (isLocked) return `${base} bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed`;
      return `${base} bg-slate-50 border-slate-200 text-slate-850 focus:bg-white focus:border-blue-500`;
    }
  };

  return (
    <div 
      className={`w-full max-w-4xl mx-auto rounded-2xl border p-5 md:p-8 shadow-sm flex flex-col transition-all duration-200 ${
        theme === 'night' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/95'
      }`}
      id="app-form-view-container"
    >
      {/* Upper bar with Back button & Titles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-center ${
              theme === 'night' 
                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title="Back to pipeline"
            id="back-to-pipeline-btn"
          >
            <ArrowLeft className="w-4.5 h-4.5" />
          </button>
          
          <div>
            <h2 className={`text-xl md:text-2xl font-serif font-bold italic tracking-tight ${
              theme === 'night' ? 'text-white' : 'text-slate-900'
            }`}>
              {initialData ? 'Job Profile Details' : 'Add New Job'}
            </h2>
            <p className={`text-xs mt-0.5 ${theme === 'night' ? 'text-slate-400' : 'text-slate-600'}`}>
              {initialData ? 'Details are locked to read-only by default. Click Edit to unlock.' : 'Fill in the details below and select Add Job.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 self-start sm:self-center">
          {initialData && (
            <button
              type="button"
              onClick={() => setIsLocked(!isLocked)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isLocked
                  ? theme === 'night'
                    ? 'bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-950/60 hover:border-amber-500/50'
                    : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/70'
                  : theme === 'night'
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/60 hover:border-emerald-500/50'
                    : 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100/70 font-bold'
              }`}
              id="btn-edit-unlock-details"
              title="Click this to allow/lock job profile editing"
            >
              {isLocked ? (
                <>
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Fields</span>
                </>
              )}
            </button>
          )}

          {initialData && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isLocked ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <span className="font-mono">
                {isLocked ? 'Locked / Read-Only' : 'Unlocked / Editing Mode'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* View Mode Switcher */}
      <div className={`p-4 rounded-2xl border mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
        theme === 'night' ? 'bg-slate-950/45 border-slate-850' : 'bg-slate-50/60 border-slate-200'
      }`}>
        <div className="space-y-1">
          <span className={`text-[10px] font-mono uppercase tracking-widest font-extrabold ${theme === 'night' ? 'text-indigo-400' : 'text-blue-600'}`}>
            Form View Mode
          </span>
          <p className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-slate-600'}`}>
            Switch view type to simplify or expand options.
          </p>
        </div>
        <div className={`p-1 rounded-xl border flex items-center gap-1 shrink-0 ${
          theme === 'night' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}>
          <button
            type="button"
            onClick={() => {
              setViewMode('basic');
              localStorage.setItem('job_tracker_view_mode', 'basic');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-155 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'basic'
                ? theme === 'night'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                : theme === 'night'
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-800'
            }`}
            id="toggle-view-mode-basic"
          >
            Basic View
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('advanced');
              localStorage.setItem('job_tracker_view_mode', 'advanced');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-155 cursor-pointer flex items-center gap-1.5 ${
              viewMode === 'advanced'
                ? theme === 'night'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                  : 'bg-blue-600 text-white shadow-sm shadow-blue-500/10'
                : theme === 'night'
                  ? 'text-slate-400 hover:text-slate-200'
                  : 'text-slate-600 hover:text-slate-800'
            }`}
            id="toggle-view-mode-advanced"
          >
            Advanced View
          </button>
        </div>
      </div>

      {/* Main Grid form fields */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION 1: Job Basics */}
        <div className={`p-5 md:p-6 rounded-2xl border transition-all space-y-4 ${
          theme === 'night' ? 'bg-slate-950/20 border-slate-850' : 'bg-slate-50/45 border-slate-200'
        }`}>
          <div className="flex items-start gap-3 border-b pb-3 border-dashed dark:border-slate-800 border-slate-200">
            <div className={`p-2 rounded-xl shrink-0 ${theme === 'night' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50/80 text-blue-600'}`}>
              <Briefcase className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'night' ? 'text-slate-100' : 'text-slate-855'}`}>
                1. Job Basics
              </h3>
              <p className={`text-[10px] mt-0.5 ${theme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>
                Captures the main role and company information, including job title, company name, work arrangement, location, and application status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Job Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. UX Designer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLocked}
                className={getInputClass(!!errors.title)}
                id="input-job-title"
              />
              {errors.title && <p className="text-xs text-rose-500 mt-1">{errors.title}</p>}
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Company's Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Google"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={isLocked}
                className={getInputClass(!!errors.company)}
                id="input-company-name"
              />
              {errors.company && <p className="text-xs text-rose-500 mt-1">{errors.company}</p>}
            </div>
          </div>

          {viewMode === 'advanced' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 font-sans transition-colors ${
                  theme === 'night' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Current Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JobStatus)}
                  disabled={isLocked}
                  className={getSelectClass()}
                  id="select-form-status"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-850'}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 font-sans transition-colors ${
                  theme === 'night' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Work Arrangement
                </label>
                <select
                  value={workArrangement}
                  onChange={(e) => setWorkArrangement(e.target.value as WorkArrangement)}
                  disabled={isLocked}
                  className={getSelectClass()}
                  id="select-form-arrangement"
                >
                  <option value="Unknown" disabled className={theme === 'night' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'}>Select Arrangement</option>
                  {ARRANGEMENT_OPTIONS.filter((opt) => opt !== 'Unknown').map((opt) => (
                    <option key={opt} value={opt} className={theme === 'night' ? 'bg-slate-900 text-slate-205' : 'bg-white text-slate-800'}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 font-sans transition-colors ${
                  theme === 'night' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Employment Type
                </label>
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                  disabled={isLocked}
                  className={getSelectClass()}
                  id="select-form-employment"
                >
                  <option value="" className={theme === 'night' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-400'}>Select Type</option>
                  {EMPLOYMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-sans transition-colors ${
                  theme === 'night' ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Office Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bedok, Singapore"
                  value={officeLocation}
                  onChange={(e) => setOfficeLocation(e.target.value)}
                  disabled={isLocked}
                  className={getInputClass()}
                  id="input-location"
                />
              </div>
            </div>
          )}

          <div>
            <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center justify-between font-sans transition-colors ${
              theme === 'night' ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3 h-3 text-slate-400" />
                URL of the Job Description
              </span>
              {url.trim() && (
                <a
                  href={url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="text-xs text-blue-500 hover:text-blue-600 inline-flex items-center gap-1 font-bold lowercase hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Visit Listing
                </a>
              )}
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLocked}
                className={getInputClass(!!errors.url)}
                id="input-listing-url"
              />
              {url.trim() && (
                <a
                  href={url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-500 transition-colors"
                  title="Open active link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            {errors.url && <p className="text-xs text-rose-500 mt-1">{errors.url}</p>}
          </div>

          {viewMode === 'basic' && (
            <div className="space-y-2 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center justify-between font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <span className="flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                  Paste Job Description
                </span>
              </label>
              <textarea
                placeholder="Paste the requirements, responsibilities, and job details here."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isLocked}
                rows={8}
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none transition-all font-sans leading-relaxed ${
                  theme === 'night'
                    ? isLocked
                      ? 'bg-slate-950/60 border-slate-900 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500/85 focus:ring-2 focus:ring-indigo-900/30'
                    : isLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:border-blue-500/85 focus:ring-2 focus:ring-blue-100/40 font-semibold'
                }`}
                id="input-job-description"
              />
              <p className={`text-[10px] italic ${theme === 'night' ? 'text-slate-400' : 'text-slate-555'}`}>
                You can switch to Advanced View at any time to unlock checklists, suitability match ratings, salary trackers, and resume linking.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: Application Timeline */}
        {viewMode === 'advanced' && (
          <div className={`p-5 md:p-6 rounded-2xl border transition-all space-y-4 ${
            theme === 'night' ? 'bg-slate-950/10 border-slate-850' : 'bg-slate-50/30 border-slate-200/90'
          }`}>
          <div className="flex items-start gap-3 border-b pb-3 border-dashed dark:border-slate-800 border-slate-200">
            <div className={`p-2 rounded-xl shrink-0 ${theme === 'night' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'night' ? 'text-slate-100' : 'text-slate-800'}`}>
                2. Application Timeline
              </h3>
              <p className={`text-[10px] mt-0.5 ${theme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>
                Tracks date planned/applied, interview dates, follow-up date, and additional interview or mock-work dates.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Calendar className="w-3 h-3 text-slate-400" />
                Date Planned / Applied
              </label>
              <input
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                disabled={isLocked}
                className={getInputClass()}
                id="input-date-applied"
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Calendar className="w-3 h-3 text-cyan-500" />
                Primary Interview Date
              </label>
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                disabled={isLocked}
                className={getInputClass()}
                id="input-interview-date"
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Calendar className="w-3 h-3 text-amber-600" />
                Follow Up Date
              </label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                disabled={isLocked}
                className={getInputClass()}
                id="input-follow-up-date"
              />
            </div>
          </div>

          {/* Dynamic Additional Dates */}
          <div className={`p-4 border rounded-2xl space-y-3 transition-all ${
            theme === 'night' ? 'bg-slate-950/30 border-slate-850' : 'bg-slate-50/50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 font-sans ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Additional Interview & Assessment/Test ({interviewDates.length})
              </span>
              {!isLocked && (
                <button
                  type="button"
                  onClick={() => setInterviewDates([...interviewDates, { date: '', title: '' }])}
                  className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-102 active:scale-98 ${
                    theme === 'night'
                      ? 'bg-slate-950 border-slate-800 text-indigo-400 hover:bg-slate-800/40 hover:border-slate-700'
                      : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'
                  }`}
                  id="add-extra-interview-date-btn"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Date
                </button>
              )}
            </div>

            {interviewDates.length === 0 ? (
              <p className="text-[11px] italic text-slate-455 dark:text-slate-500">No additional interview dates registered.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {interviewDates.map((item, idx) => (
                  <div key={idx} className={`flex flex-col gap-2 p-3 border rounded-xl relative ${
                    theme === 'night' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex gap-2 items-center justify-between">
                      <input
                        type="text"
                        placeholder="Title (e.g. Assessment, Chat...)"
                        value={typeof item === 'string' ? '' : (item.title || '')}
                        onChange={(e) => {
                          const copy = [...interviewDates];
                          const current = typeof copy[idx] === 'string' ? { date: copy[idx] as string } : copy[idx] as AdditionalDate;
                          copy[idx] = { ...current, title: e.target.value };
                          setInterviewDates(copy);
                        }}
                        disabled={isLocked}
                        className={`flex-1 border-b bg-transparent text-[11px] px-1 py-0.5 focus:outline-none focus:ring-0 ${
                          theme === 'night'
                            ? isLocked 
                              ? 'border-slate-850 text-slate-400 cursor-not-allowed' 
                              : 'border-slate-800 text-slate-200 focus:border-indigo-500'
                            : isLocked 
                              ? 'border-slate-100 text-slate-400 cursor-not-allowed' 
                              : 'border-slate-200 text-slate-800 focus:border-blue-500'
                        }`}
                        id={`extra-interview-title-${idx}`}
                      />
                      {!isLocked && (
                        <button
                          type="button"
                          onClick={() => {
                            const copy = [...interviewDates];
                            copy.splice(idx, 1);
                            setInterviewDates(copy);
                          }}
                          className="p-1 rounded-md transition-colors text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 shrink-0"
                          title="Remove date"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="date"
                      value={typeof item === 'string' ? item : (item.date || '')}
                      onChange={(e) => {
                        const copy = [...interviewDates];
                        const current = typeof copy[idx] === 'string' ? { title: '' } : copy[idx] as AdditionalDate;
                        copy[idx] = { ...current, date: e.target.value };
                        setInterviewDates(copy);
                      }}
                      disabled={isLocked}
                      className={`w-full border-0 bg-transparent text-xs p-1 focus:outline-none focus:ring-0 ${
                        theme === 'night'
                          ? isLocked ? 'text-slate-400 cursor-not-allowed font-medium' : 'text-slate-200'
                          : isLocked ? 'text-slate-400 cursor-not-allowed font-medium' : 'text-slate-800 font-semibold'
                      }`}
                      id={`extra-interview-date-${idx}`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        )}

        {/* SECTION 3: Compensation & Interview Setup */}
        {viewMode === 'advanced' && (
          <div className={`p-5 md:p-6 rounded-2xl border transition-all space-y-4 ${
            theme === 'night' ? 'bg-slate-950/15 border-slate-850' : 'bg-slate-50/40 border-slate-200'
          }`}>
          <div className="flex items-start gap-3 border-b pb-3 border-dashed dark:border-slate-800 border-slate-200">
            <div className={`p-2 rounded-xl shrink-0 ${theme === 'night' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
              <DollarSign className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'night' ? 'text-slate-100' : 'text-slate-800'}`}>
                3. Compensation & Interview Setup
              </h3>
              <p className={`text-[10px] mt-0.5 ${theme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>
                Stores salary expectations, posted salary range, and interview method.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <DollarSign className="w-3 h-3 text-slate-400" />
                My Target Salary
              </label>
              <input
                type="text"
                placeholder="e.g. $6,500/mo"
                value={targetSalary}
                onChange={(e) => setTargetSalary(e.target.value)}
                disabled={isLocked}
                className={getInputClass()}
                id="input-target-salary"
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <DollarSign className="w-3 h-3 text-slate-400" />
                Posted Salary Range
              </label>
              <input
                type="text"
                placeholder="e.g. $5,000 - $7,000/mo"
                value={salaryInformation}
                onChange={(e) => setSalaryInformation(e.target.value)}
                disabled={isLocked}
                className={getInputClass()}
                id="input-salary"
              />
            </div>

            <div>
              <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Interview Method
              </label>
              <select
                value={interviewMethod}
                onChange={(e) => setInterviewMethod(e.target.value)}
                disabled={isLocked}
                className={getSelectClass()}
                id="select-interview-method"
              >
                <option value="" disabled className="text-slate-400">Select Method</option>
                <option value="Online" className={theme === 'night' ? 'bg-slate-900 text-slate-205' : 'bg-white text-slate-800'}>Online</option>
                <option value="Face-to-Face" className={theme === 'night' ? 'bg-slate-900 text-slate-205' : 'bg-white text-slate-800'}>Face-to-Face</option>
                <option value="N/A" className={theme === 'night' ? 'bg-slate-900 text-slate-205' : 'bg-white text-slate-800'}>N/A</option>
              </select>
            </div>
          </div>
        </div>
        )}







        {/* Job Match Percentage Section */}
        {(() => {
          if (viewMode === 'basic') return null;
          const matchPercentage = calculateJobMatchPercentage();
          let matchColorClass = 'text-slate-600 dark:text-slate-400';
          const matchBgClass = theme === 'night' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/75 border-slate-200';
          
          if (matchPercentage !== null) {
            if (matchPercentage >= 70) {
              matchColorClass = 'text-emerald-700 dark:text-emerald-400';
            } else if (matchPercentage >= 50) {
              matchColorClass = 'text-amber-700 dark:text-amber-400';
            } else {
              matchColorClass = 'text-red-650 dark:text-red-400';
            }
          }

          return (
            <div className={`p-4 border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${matchBgClass}`}>
              <div className="space-y-1">
                <span className={`block text-[10px] font-mono uppercase tracking-widest font-extrabold ${matchColorClass}`}>
                  Job Suitability Profile Match
                </span>
                <p className={`text-lg font-sans font-black tracking-wide ${matchColorClass}`}>
                  Job Match: {matchPercentage !== null ? `${matchPercentage}%` : 'N/A'}
                </p>
                <p className={`text-[10px] font-sans leading-relaxed ${matchColorClass}`}>
                  The rating takes a weighted average of competence (50%) and interest (50%) selections across requirements.
                </p>
                {matchPercentage === null && jdLines.length > 0 && (
                  <p className={`text-[11px] italic font-semibold mt-1.5 transition-colors ${
                    theme === 'night' ? 'text-indigo-400/90' : 'text-blue-600/90'
                  }`}>
                    * Choose competent and interest levels in the dropdown boxes below to see the job match percentage.
                  </p>
                )}
              </div>
              
              {matchPercentage !== null && jdLines.length > 0 && (
                <div className="w-full md:w-56 bg-slate-200/80 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden shadow-xs relative">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      matchPercentage >= 70 
                        ? 'bg-emerald-600 dark:bg-emerald-500' 
                        : matchPercentage >= 50 
                          ? 'bg-amber-500 dark:bg-amber-500' 
                          : 'bg-rose-600 dark:bg-rose-500'
                    }`}
                    style={{ width: `${matchPercentage}%` }}
                  />
                </div>
              )}
            </div>
          );
        })()}

        {/* Group: Job Requirements with Paste Textbox */}
        {viewMode === 'advanced' && (
          <div className="space-y-4">
          <label className={`block text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 font-sans transition-colors ${
            theme === 'night' ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <ClipboardList className="w-4.5 h-4.5 text-indigo-500" />
            Job Requirements (Core Checklist)
          </label>

          {/* Core Tasks Numbered Points Live Preview */}
          {jdLines.length > 0 ? (
            <div className={`border rounded-2xl p-5 md:p-6 transition-all duration-200 ${
              theme === 'night' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/75 border-slate-200'
            }`}>
              {/* Header */}
              <div className={`grid grid-cols-12 gap-3 items-center font-mono text-[10px] uppercase font-bold tracking-widest border-b pb-2.5 mb-4 border-dashed border-slate-300 dark:border-slate-800 ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <div className="col-span-12 sm:col-span-1 text-center hidden sm:block">S/N</div>
                <div className="col-span-12 sm:col-span-7 pl-2">Job Task Description</div>
                <div className="col-span-6 sm:col-span-2 text-center sm:text-left sm:pl-3">Competent</div>
                <div className="col-span-6 sm:col-span-2 text-center sm:text-left sm:pl-3">Interest</div>
              </div>

              {/* Rows */}
              <div className="space-y-4">
                {jdLines.map((line, idx) => {
                  const meta = requirementsMeta[idx] || {};
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-3 items-center text-xs leading-relaxed group border-b border-dashed border-slate-150 last:border-0 pb-3 last:pb-0 dark:border-slate-850/60 font-sans">
                      <div className={`col-span-12 sm:col-span-1 font-mono text-center font-bold px-1 py-1 rounded text-[10px] border transition-colors ${
                        theme === 'night'
                          ? 'bg-slate-900 text-slate-200 border-slate-800'
                          : 'bg-slate-105 text-slate-805 border-slate-200'
                      }`}>
                        {String(idx + 1).padStart(2, '0')}
                      </div>
                      
                      <div className={`col-span-12 sm:col-span-7 pl-2 font-sans ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>
                        {line}
                      </div>

                      {/* Competence Select Option */}
                      <div className="col-span-6 sm:col-span-2 sm:px-2">
                        <label className="block sm:hidden text-[9px] font-bold uppercase tracking-wider text-slate-405 mb-1">Competent</label>
                        <select
                          value={meta.competent || ''}
                          onChange={(e) => updateMeta(idx, 'competent', e.target.value as 'Yes' | 'Maybe' | 'No')}
                          disabled={isLocked}
                          className={`w-full border rounded-xl px-2.5 py-2 text-xs focus:outline-none transition-all ${
                            theme === 'night'
                              ? isLocked 
                                ? 'bg-slate-900 border-slate-800 text-slate-400 cursor-not-allowed' 
                                : 'bg-slate-950 border-slate-800 text-slate-250 focus:border-indigo-500'
                              : isLocked
                                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-800 focus:bg-white focus:border-blue-500 font-medium'
                          }`}
                        >
                          <option value="" disabled>Choose...</option>
                          <option value="Yes">Yes</option>
                          <option value="Maybe">Maybe</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      {/* Interest Select Option */}
                      <div className="col-span-6 sm:col-span-2 sm:px-2">
                        <label className="block sm:hidden text-[9px] font-bold uppercase tracking-wider text-slate-405 mb-1">Interest</label>
                        <select
                          value={meta.interest || ''}
                          onChange={(e) => updateMeta(idx, 'interest', e.target.value as 'Yes' | 'Maybe' | 'No')}
                          disabled={isLocked}
                          className={`w-full border rounded-xl px-2.5 py-2 text-xs focus:outline-none transition-all ${
                            theme === 'night'
                              ? isLocked 
                                ? 'bg-slate-900 border-slate-800 text-slate-400 cursor-not-allowed' 
                                : 'bg-slate-950 border-slate-800 text-slate-250 focus:border-indigo-500'
                              : isLocked
                                ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                : 'bg-white border-slate-300 text-slate-805 focus:bg-white focus:border-blue-500 font-medium'
                          }`}
                        >
                          <option value="" disabled>Choose...</option>
                          <option value="Yes">Yes</option>
                          <option value="Maybe">Maybe</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className={`text-xs italic p-4 border border-dashed rounded-xl ${
              theme === 'night' 
                ? 'border-slate-800 text-slate-300 bg-slate-950/20' 
                : 'border-slate-200 text-slate-600 bg-slate-50/40'
            }`}>
              No specifications typed. Enter bullet items in the Job Description parser below.
            </div>
          )}

          {/* Paste Job Description input box */}
          {!isLocked && (
            <div className="space-y-2 pt-2">
              <label className={`block text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 font-sans transition-colors ${
                theme === 'night' ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Paste Job Description
              </label>
              <textarea
                placeholder="Paste the requirements, responsibilities, and job details here. Each line is a bullet point on the list."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isLocked}
                rows={6}
                className={`w-full border rounded-xl p-3 text-xs focus:outline-none transition-all font-sans leading-relaxed ${
                  theme === 'night'
                    ? isLocked
                      ? 'bg-slate-950/60 border-slate-900 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500/85 focus:ring-2 focus:ring-indigo-900/30'
                    : isLocked
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:border-blue-500/85 focus:ring-2 focus:ring-blue-100/40'
                }`}
                id="input-job-description"
              />
              <p className={`text-[10px] italic ${theme === 'night' ? 'text-slate-400' : 'text-slate-655'}`}>
                Each line breaks into its own separate numbered list item automatically in the checklist above.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Tailored Resumes Section */}
        {viewMode === 'advanced' && (
          <div className="space-y-3">
          <label className={`block text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 font-sans transition-colors ${
            theme === 'night' ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <FileText className="w-4 h-4 text-orange-500" />
            <span>Link Tailored Resume</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Selection */}
            <div>
              <span className={`text-[10px] block mb-1 font-sans ${theme === 'night' ? 'text-slate-300 font-semibold' : 'text-slate-700 font-bold'}`}>Select from existing uploads:</span>
              <div className="relative">
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  disabled={isLocked}
                  className={`w-full border rounded-xl pl-3 pr-4 py-2.5 text-xs focus:outline-none transition-all ${
                    theme === 'night'
                      ? isLocked 
                        ? 'bg-slate-950/60 border-slate-900 text-slate-400 cursor-not-allowed' 
                        : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500 cursor-pointer'
                      : isLocked 
                        ? 'bg-slate-105 border-slate-200 text-slate-400 cursor-not-allowed font-medium' 
                        : 'bg-white border-slate-300 text-slate-800 focus:bg-white focus:border-blue-500 font-bold shadow-sm cursor-pointer'
                  }`}
                  id="select-application-resume"
                >
                  <option value="" className={theme === 'night' ? 'bg-slate-900 text-slate-400' : 'bg-white text-slate-500 font-sans'}>No Resume Linked</option>
                  {resumes.map((res) => (
                    <option 
                      key={res.id} 
                      value={res.id} 
                      className={theme === 'night' ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800 font-sans font-semibold'}
                    >
                      {res.displayName || res.name} (Uploaded {new Date(res.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload on-the-fly quick upload option */}
            {!isLocked && (
              <div>
                <span className={`text-[10px] block mb-1 font-sans ${theme === 'night' ? 'text-slate-300 font-semibold' : 'text-slate-700 font-bold'}`}>Or upload a new resume variant:</span>
                {isGuest ? (
                  <div className={`p-3.5 rounded-xl border flex flex-col items-center text-center gap-1.5 ${
                    theme === 'night' ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-400">
                      <Lock className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Upload requires Google Sign-In</span>
                    </div>
                    <p className={`text-[10px] leading-relaxed max-w-[280px] ${theme === 'night' ? 'text-slate-300' : 'text-slate-600'}`}>
                      Authenticating persistent sessions allows you to sync tailored document variants reliably built into your career pipeline.
                    </p>
                    <button
                      type="button"
                      onClick={onGoogleLogin}
                      className="mt-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg cursor-pointer transition-all active:scale-98"
                    >
                      Sign In with Google
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      id="form-resume-quick-upload"
                      accept=".pdf,.docx,.doc"
                      onChange={async (e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          const file = e.target.files[0];
                          const MAX_SIZE = 1048576; // 1MB
                          if (file.size > MAX_SIZE) {
                            alert(`File size too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max supported size is 1MB to enforce database storage limits.`);
                            return;
                          }
                          
                          // Robust mime type fallback for Word documents across browsers
                          const extension = file.name.split('.').pop()?.toLowerCase();
                          let uploadType = file.type;
                          if (!uploadType) {
                            if (extension === 'docx') {
                              uploadType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                            } else if (extension === 'pdf') {
                              uploadType = 'application/pdf';
                            } else if (extension === 'doc') {
                              uploadType = 'application/msword';
                            } else {
                              uploadType = 'application/octet-stream';
                            }
                          }

                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            const dataUrl = event.target?.result as string;
                            if (dataUrl) {
                              try {
                                const uploaded = await onUploadResume(file.name, uploadType, file.size, dataUrl);
                                if (uploaded) {
                                  setSelectedResumeId(uploaded.id);
                                }
                              } catch (err) {
                                console.error(err);
                              }
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('form-resume-quick-upload')?.click()}
                      className={`w-full border rounded-xl py-2.5 px-4 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        theme === 'night'
                          ? 'bg-slate-950 border-slate-800 text-indigo-400 hover:bg-slate-800/40 hover:border-slate-700'
                          : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>Upload PDF/Docx (Max. 1MB)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        )}

        {/* Notes (Private Notes) - ALways active */}
        {viewMode === 'advanced' && (
          <div>
          <label className={`block text-[10px] font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5 font-sans transition-colors ${
            theme === 'night' ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <AlignLeft className="w-3.5 h-3.5 text-blue-500" />
            Private Notes (Always Available)
          </label>
          <textarea
            placeholder="e.g. Key skills highlighted, recruiter details, referral details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={6}
            className={`w-full border rounded-xl p-3 text-xs focus:outline-none transition-all min-h-[140px] leading-relaxed ${
              theme === 'night'
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-950/20'
                : 'bg-slate-50 border-slate-300 text-slate-800 focus:bg-white focus:border-blue-500/80 focus:ring-2 focus:ring-blue-100/30 font-semibold'
            }`}
            id="input-private-notes"
          />
        </div>
        )}

        {/* Buttons Panel */}
        <div className={`pt-6 border-t flex justify-end gap-3 transition-colors duration-200 ${
          theme === 'night' ? 'border-slate-800' : 'border-slate-300'
        }`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 border font-semibold text-xs rounded-xl transition-all shadow-xs cursor-pointer ${
              theme === 'night' 
                ? 'bg-slate-950 border-slate-850 text-slate-300 hover:bg-slate-800' 
                : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            id="cancel-tracker-btn"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            className={`px-6 py-2.5 font-bold text-xs text-white rounded-xl flex items-center gap-2 shadow-lg hover:scale-102 active:scale-95 transition-all cursor-pointer ${
              theme === 'night'
                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/10'
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
            }`}
            id="submit-tracker-btn"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>{initialData ? 'Save Changes' : 'Add Job'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
