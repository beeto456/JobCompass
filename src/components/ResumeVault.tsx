import React, { useState, useRef, useEffect } from 'react';
import { Resume, JobApplication } from '../types';
import {
  UploadCloud,
  FileText,
  Trash2,
  Download,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Calendar,
  Lock,
  Loader2,
  Plus,
  X,
  Pencil,
  Check,
  ArrowUpDown,
  RefreshCw,
  StickyNote,
} from 'lucide-react';

interface ResumeVaultProps {
  resumes: Resume[];
  applications: JobApplication[];
  onUpload: (name: string, type: string, size: number, dataUrl: string) => Promise<any>;
  onDelete: (id: string) => void;
  onDownloadContent: (resume: Resume) => Promise<string>;
  onUpdateResume: (id: string, updates: Partial<Resume>) => Promise<any>;
  onReplaceResume: (id: string, name: string, type: string, size: number, fileData: string) => Promise<any>;
  theme: 'day' | 'night';
  isGuest?: boolean;
  onGoogleLogin?: () => void;
}

export default function ResumeVault({
  resumes,
  applications,
  onUpload,
  onDelete,
  onDownloadContent,
  onUpdateResume,
  onReplaceResume,
  theme,
  isGuest = false,
  onGoogleLogin,
}: ResumeVaultProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingResumeId, setDownloadingResumeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sorting and editing states
  const [sortBy, setSortBy] = useState<'dateDesc' | 'dateAsc' | 'fileNameAZ' | 'fileNameZA' | 'nameAZ' | 'nameZA' | 'tagAZ' | 'tagZA' | 'linkedDesc' | 'linkedAsc'>('dateDesc');
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null);
  const [editingNameText, setEditingNameText] = useState<string>('');
  const [addingTagResumeId, setAddingTagResumeId] = useState<string | null>(null);
  const [newTagText, setNewTagText] = useState<string>('');
  
  // File replacing and customized notes states
  const [replacingResumeId, setReplacingResumeId] = useState<string | null>(null);
  const [editingNotesResumeId, setEditingNotesResumeId] = useState<string | null>(null);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const [notesDraftText, setNotesDraftText] = useState<string>('');
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = replaceFileInputRef.current;
    if (!el) return;

    const handleCancel = () => {
      setReplacingResumeId(null);
    };

    el.addEventListener('cancel', handleCancel);
    return () => {
      el.removeEventListener('cancel', handleCancel);
    };
  }, []);

  // Helper: Format bytes to human readable format
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Process selected file
  const processFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isGuest) {
      setErrorMsg('Uploading is disabled in sandbox guest mode. Please sign in with Google to upload files.');
      return;
    }

    // Validate size (Firestore document maximum is 1MB, keeping it at 1MB for safety)
    const MAX_SIZE = 1048576; // 1MB
    if (file.size > MAX_SIZE) {
      setErrorMsg(`File is too large (${formatBytes(file.size)}). Max allowed size is 1MB.`);
      return;
    }

    // Validate type (must be PDF or Docx)
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'docx', 'doc'];
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension || '')) {
      setErrorMsg('Invalid file format. Only PDF and Word (.docx, .doc) documents are supported.');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) {
        setErrorMsg('Failed to process file contents.');
        setIsUploading(false);
        return;
      }

      try {
        await onUpload(file.name, file.type || 'application/octet-stream', file.size, dataUrl);
        setSuccessMsg(`"${file.name}" uploaded successfully to your resume vault!`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err) {
        setErrorMsg('Failed to upload file to database.');
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading file contents.');
      setIsUploading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const handleDownload = async (resume: Resume) => {
    try {
      setDownloadingResumeId(resume.id);
      setErrorMsg(null);
      
      const fileData = await onDownloadContent(resume);
      
      const link = document.createElement('a');
      link.href = fileData;
      link.download = resume.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setErrorMsg('Could not trigger download. The file data is corrupted or could not be loaded.');
      console.error(err);
    } finally {
      setDownloadingResumeId(null);
    }
  };

  // Map resumes to lists of linked applications
  const getLinkedApplications = (resumeId: string) => {
    return applications.filter((app) => app.resumeId === resumeId);
  };

  const startEditingName = (resume: Resume) => {
    setEditingResumeId(resume.id);
    setEditingNameText(resume.displayName || resume.name);
  };

  const handleSaveName = async (resumeId: string) => {
    const trimmed = editingNameText.trim();
    await onUpdateResume(resumeId, { displayName: trimmed || undefined });
    setEditingResumeId(null);
  };

  const handleAddTag = async (resume: Resume) => {
    const trimmed = newTagText.trim();
    if (trimmed) {
      const currentTags = resume.tags || [];
      if (!currentTags.includes(trimmed)) {
        await onUpdateResume(resume.id, { tags: [...currentTags, trimmed] });
      }
    }
    setAddingTagResumeId(null);
    setNewTagText('');
  };

  const handleRemoveTag = async (resume: Resume, tagToRemove: string) => {
    const currentTags = resume.tags || [];
    await onUpdateResume(resume.id, { tags: currentTags.filter((t) => t !== tagToRemove) });
  };

  const startEditingNotes = (resume: Resume) => {
    setEditingNotesResumeId(resume.id);
    setNotesDraftText(resume.notes || '');
  };

  const handleSaveNotes = async (resumeId: string) => {
    await onUpdateResume(resumeId, { notes: notesDraftText.trim() });
    setEditingNotesResumeId(null);
  };

  const triggerReplaceFileInput = (resumeId: string) => {
    setReplacingResumeId(resumeId);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!replacingResumeId) return;
    if (!e.target.files || e.target.files.length === 0) {
      setReplacingResumeId(null);
      return;
    }
    const file = e.target.files[0];
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    const resumeId = replacingResumeId;

    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setErrorMsg('Failed to process replaced file contents.');
        setReplacingResumeId(null);
        return;
      }

      try {
        await onReplaceResume(resumeId, file.name, file.type || 'application/octet-stream', file.size, dataUrl);
        setSuccessMsg(`"${file.name}" replaced successfully!`);
      } catch (err) {
        setErrorMsg('Failed to replace file in database.');
        console.error(err);
      } finally {
        setReplacingResumeId(null);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Error reading replacement file contents.');
      setReplacingResumeId(null);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6" id="resume-vault-root">
      {/* Hidden inputs outside clickable containers to prevent event bubbling issues */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.doc"
        className="hidden"
      />
      <input
        type="file"
        ref={replaceFileInputRef}
        onChange={handleReplaceFileChange}
        onCancel={() => setReplacingResumeId(null)}
        accept=".pdf,.docx,.doc"
        className="hidden"
      />

      {/* Introduction Card */}
      <div className={`p-5 rounded-xl border leading-relaxed ${
        theme === 'night' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h2 className="text-sm font-bold flex items-center gap-2 mb-1.5">
          <Lock className={`w-4 h-4 ${theme === 'night' ? 'text-indigo-400' : 'text-blue-600'}`} />
          <span>Resume & Document Vault</span>
        </h2>
        <p className={`text-xs ${theme === 'night' ? 'text-slate-400' : 'text-slate-600'}`}>
          People tend to tailor completely different resumes for different job descriptions. Upload and safely log all variants of your specialized CVs and cover letters here. Once uploaded, you can link them directly to individual job applications for precise, granular tracking.
        </p>
      </div>

      {/* Uploader Section or Locked Showcase Banner */}
      {isGuest ? (
        <div
          className={`border border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center relative overflow-hidden ${
            theme === 'night' 
              ? 'border-slate-805 bg-slate-900/40' 
              : 'border-slate-250 bg-slate-50/50'
          }`}
          id="resume-disabled-panel"
        >
          {/* Subtle glowing abstract element in night mode */}
          {theme === 'night' && (
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          )}

          <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center transition-colors ${
            theme === 'night' ? 'bg-slate-950/80 text-indigo-400' : 'bg-white text-blue-600 border'
          }`}>
            <Lock className="w-5.5 h-5.5" />
          </div>

          <h3 className={`text-xs font-bold font-sans tracking-tight ${theme === 'night' ? 'text-slate-200' : 'text-slate-850'}`}>
            Resume Vault Uploads Locked
          </h3>
          <p className={`text-[10px] mt-2 max-w-md leading-relaxed ${
            theme === 'night' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Uploading and linking tailored CVs requires Cloud Sync to run securely on Firestore. Sign in with Google to enable resume document synchronization and live application pairing.
          </p>

          <button
            onClick={onGoogleLogin}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/15 cursor-pointer flex items-center gap-2 transition-all active:scale-98"
            id="locked-upload-google-login-btn"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </button>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
            isDragging
              ? theme === 'night'
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-blue-500 bg-blue-50'
              : theme === 'night'
              ? 'border-slate-800 bg-slate-900/40 hover:border-slate-750 hover:bg-slate-900/60'
              : 'border-slate-250 bg-slate-50/50 hover:border-slate-350 hover:bg-slate-50'
          }`}
          id="resume-dropzone"
        >
          <div className={`w-12 h-12 rounded-full mb-4 flex items-center justify-center transition-colors ${
            theme === 'night' ? 'bg-slate-950/80 text-indigo-400' : 'bg-white text-blue-600 border'
          }`}>
            <UploadCloud className={`w-6 h-6 ${isUploading ? 'animate-bounce' : ''}`} />
          </div>

          <h3 className={`text-xs font-bold font-sans ${theme === 'night' ? 'text-slate-200' : 'text-slate-755'}`}>
            {isUploading ? 'Encoding document content...' : 'Upload Specialized Resume'}
          </h3>
          <p className={`text-[10px] mt-1 max-w-sm ${
            theme === 'night' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Drag and drop your tailored PDF or Microsoft Word file here, or click to browse. Max size 1MB (enforced for reliable database storage syncing).
          </p>
        </div>
      )}

      {/* Feedbacks / Banners */}
      {errorMsg && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Vault List */}
      <div className={`rounded-xl border shadow-xs overflow-hidden ${
        theme === 'night' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className={`px-5 py-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
          theme === 'night' ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <h3 className={`text-xs font-bold uppercase tracking-widest ${theme === 'night' ? 'text-slate-400' : 'text-slate-600'}`}>
            My Active Resume Portfolio ({resumes.length})
          </h3>

          <div className="flex items-center gap-2 text-xs">
            <span className={`font-medium flex items-center gap-1 ${theme === 'night' ? 'text-slate-450' : 'text-slate-500'}`}>
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sort by:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className={`px-2 py-1.5 rounded-lg border text-xs font-bold focus:outline-none cursor-pointer ${
                theme === 'night'
                  ? 'bg-slate-950 border-slate-800 text-slate-300 focus:border-indigo-500'
                  : 'bg-white border-slate-200 text-slate-700 focus:border-blue-500'
              }`}
              id="resume-sort-select"
            >
              <option value="dateDesc">Date Uploaded (Newest First)</option>
              <option value="dateAsc">Date Uploaded (Oldest First)</option>
              <option value="fileNameAZ">Original File Name (A-Z)</option>
              <option value="fileNameZA">Original File Name (Z-A)</option>
              <option value="nameAZ">Resume Name (A-Z)</option>
              <option value="nameZA">Resume Name (Z-A)</option>
              <option value="tagAZ">Tag Name (A-Z)</option>
              <option value="tagZA">Tag Name (Z-A)</option>
              <option value="linkedDesc">Linked Applications (Highest First)</option>
              <option value="linkedAsc">Linked Applications (Lowest First)</option>
            </select>
          </div>
        </div>

        {(() => {
          const sortedResumes = [...resumes].sort((a, b) => {
            if (sortBy === 'dateDesc') {
              return b.createdAt - a.createdAt;
            }
            if (sortBy === 'dateAsc') {
              return a.createdAt - b.createdAt;
            }
            if (sortBy === 'fileNameAZ') {
              return a.name.localeCompare(b.name);
            }
            if (sortBy === 'fileNameZA') {
              return b.name.localeCompare(a.name);
            }
            if (sortBy === 'nameAZ') {
              const nameA = a.displayName || a.name;
              const nameB = b.displayName || b.name;
              return nameA.localeCompare(nameB);
            }
            if (sortBy === 'nameZA') {
              const nameA = a.displayName || a.name;
              const nameB = b.displayName || b.name;
              return nameB.localeCompare(nameA);
            }
            if (sortBy === 'tagAZ') {
              const tagA = (a.tags && a.tags.length > 0) ? a.tags[0] : 'zzzzzzzz';
              const tagB = (b.tags && b.tags.length > 0) ? b.tags[0] : 'zzzzzzzz';
              return tagA.localeCompare(tagB);
            }
            if (sortBy === 'tagZA') {
              const tagA = (a.tags && a.tags.length > 0) ? a.tags[0] : '';
              const tagB = (b.tags && b.tags.length > 0) ? b.tags[0] : '';
              return tagB.localeCompare(tagA);
            }
            if (sortBy === 'linkedDesc') {
              return getLinkedApplications(b.id).length - getLinkedApplications(a.id).length;
            }
            if (sortBy === 'linkedAsc') {
              return getLinkedApplications(a.id).length - getLinkedApplications(b.id).length;
            }
            return 0;
          });

          if (sortedResumes.length === 0) {
            return (
              <div className={`p-12 text-center flex flex-col items-center justify-center ${
                theme === 'night' ? 'text-slate-400' : 'text-slate-600'
              }`}>
                <FileText className={`w-8 h-8 mb-3 ${theme === 'night' ? 'text-slate-400' : 'text-slate-500'}`} />
                <p className="text-xs font-bold">Your Resume Vault is empty</p>
                <p className={`text-[10px] mt-0.5 ${theme === 'night' ? 'text-slate-400' : 'text-slate-600'}`}>Upload dynamic variants above to track tailored submissions securely.</p>
              </div>
            );
          }

          return (
            <div className="divide-y divide-slate-200 dark:divide-slate-850">
              {sortedResumes.map((resume) => {
                const linkedApps = getLinkedApplications(resume.id);
                const displayName = resume.displayName || resume.name;
                const hasCustomName = !!resume.displayName;

                return (
                  <div
                    key={resume.id}
                    className="p-5 flex flex-col gap-4 border-b last:border-b-0 transition-all hover:bg-slate-50/10 dark:hover:bg-slate-900/5"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* File Metadata */}
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 flex items-center justify-center shrink-0 mt-0.5 animate-pulse-slow">
                          <FileText className="w-5.5 h-5.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Title Renaming Section */}
                          {editingResumeId === resume.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSaveName(resume.id);
                              }}
                              className="flex items-center gap-1.5 mt-0.5 mb-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={editingNameText}
                                onChange={(e) => setEditingNameText(e.target.value)}
                                placeholder="Enter modern resume name..."
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border focus:outline-none w-full max-w-sm ${
                                  theme === 'night'
                                    ? 'bg-slate-950 border-slate-750 text-white focus:border-indigo-500'
                                    : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
                                }`}
                                autoFocus
                                id={`rename-input-${resume.id}`}
                              />
                              <button
                                type="submit"
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer shrink-0"
                                title="Save display name"
                                id={`rename-save-btn-${resume.id}`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingResumeId(null)}
                                className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer shrink-0"
                                title="Cancel"
                                id={`rename-cancel-btn-${resume.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-1.5 group max-w-xl">
                              <span
                                className={`font-semibold md:font-bold text-sm md:text-base truncate leading-tight ${
                                  theme === 'night' ? 'text-slate-200' : 'text-slate-800'
                                }`}
                                title={displayName}
                                id={`resume-name-text-${resume.id}`}
                              >
                                {displayName}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingName(resume);
                                }}
                                className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center shrink-0 ${
                                  theme === 'night' ? 'hover:bg-slate-800 text-slate-450' : 'hover:bg-slate-100 text-slate-500'
                                }`}
                                title="Rename resume"
                                id={`rename-trigger-btn-${resume.id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          <span className={`text-[10px] block font-mono font-medium truncate max-w-xs mt-0.5 ${
                            theme === 'night' ? 'text-slate-450' : 'text-slate-500'
                          }`} title={`Original Filename: ${resume.name}`}>
                            File: {resume.name}
                          </span>

                          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                            <span className={`text-[10px] font-mono ${
                              theme === 'night' ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              Size: {formatBytes(resume.size)}
                            </span>
                            <span className="text-slate-400 dark:text-slate-705 text-[10px]">•</span>
                            <span className={`text-[10px] flex items-center gap-1 ${
                              theme === 'night' ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {new Date(resume.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Tags section inline under subtitle info */}
                          <div className="mt-3 flex items-center gap-1.5 flex-wrap" id={`tag-section-${resume.id}`}>
                            {(resume.tags || []).map((tag, tagIdx) => (
                              <span
                                key={tagIdx}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border transition-all ${
                                  theme === 'night'
                                    ? 'bg-indigo-950/40 border-indigo-900/40 text-indigo-300 hover:bg-indigo-950/60'
                                    : 'bg-indigo-50/50 border-indigo-100/60 text-indigo-650 hover:bg-indigo-100/30'
                                }`}
                                id={`tag-pill-${resume.id}-${tag}`}
                              >
                                <span>{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTag(resume, tag)}
                                  className="hover:scale-110 transition-transform text-indigo-400 hover:text-rose-500 cursor-pointer p-0 shrink-0"
                                  title={`Remove tag: ${tag}`}
                                  id={`remove-tag-btn-${resume.id}-${tag}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}

                            {addingTagResumeId === resume.id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleAddTag(resume);
                                }}
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="text"
                                  value={newTagText}
                                  onChange={(e) => setNewTagText(e.target.value)}
                                  placeholder="New Tag..."
                                  className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border focus:outline-none w-24 ${
                                    theme === 'night'
                                      ? 'bg-slate-950 border-slate-750 text-white focus:border-indigo-500'
                                      : 'bg-white border-slate-250 text-slate-850 focus:border-blue-500'
                                  }`}
                                  autoFocus
                                  id={`tag-input-${resume.id}`}
                                />
                                <button
                                  type="submit"
                                  className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-md cursor-pointer shrink-0"
                                  id={`tag-save-btn-${resume.id}`}
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAddingTagResumeId(null)}
                                  className={`p-0.5 rounded-md cursor-pointer ${
                                    theme === 'night' ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-505'
                                  }`}
                                  id={`tag-cancel-btn-${resume.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </form>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingTagResumeId(resume.id);
                                  setNewTagText('');
                                }}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 border border-dashed rounded-md text-[9.5px] font-bold transition-all shrink-0 ${
                                  theme === 'night'
                                    ? 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-900/50'
                                    : 'border-slate-250 bg-slate-50/50 text-slate-500 hover:text-slate-800 hover:border-slate-350 hover:bg-slate-100/50'
                                }`}
                                id={`add-tag-trigger-${resume.id}`}
                              >
                                <Plus className="w-2.5 h-2.5" />
                                <span>Add Tag</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Links / Mappings */}
                      <div className="flex-1 max-w-md md:px-4 mt-1 md:mt-0">
                        <span className={`text-[9.5px] font-bold tracking-wider uppercase block mb-1.5 ${
                          theme === 'night' ? 'text-slate-450' : 'text-slate-500'
                        }`}>
                          Linked To ({linkedApps.length})
                        </span>
                        {linkedApps.length === 0 ? (
                          <span className={`text-[10px] italic block ${
                            theme === 'night' ? 'text-slate-500' : 'text-slate-500'
                          }`}>Unlinked. Assign this resume in a job edit form.</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {linkedApps.map((app) => (
                              <div
                                key={app.id}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1.5 transition-all ${
                                  theme === 'night'
                                    ? 'bg-slate-950 border-slate-800 text-slate-350'
                                    : 'bg-slate-50 border-slate-200 text-slate-650'
                                }`}
                              >
                                <Briefcase className="w-2.5 h-2.5 text-indigo-505" />
                                <span className="truncate max-w-36">{app.company}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-start mt-2 md:mt-0">
                        <button
                          onClick={() => handleDownload(resume)}
                          disabled={downloadingResumeId !== null}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                            theme === 'night'
                              ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                              : 'bg-white border-slate-200 text-slate-605 hover:text-slate-800 hover:border-slate-300'
                          } ${downloadingResumeId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Download file"
                          id={`download-resume-btn-${resume.id}`}
                        >
                          {downloadingResumeId === resume.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {downloadingResumeId === resume.id ? 'Loading...' : 'Download'}
                          </span>
                        </button>

                        {/* Upload and Replace Button */}
                        <button
                          onClick={() => triggerReplaceFileInput(resume.id)}
                          disabled={replacingResumeId !== null}
                          className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                            theme === 'night'
                              ? 'bg-slate-950 border-slate-800 text-amber-400 hover:text-amber-300 hover:border-amber-700/60 hover:bg-amber-500/10'
                              : 'bg-white border-slate-200 text-amber-600 hover:text-amber-800 hover:border-amber-305 hover:bg-amber-50/50'
                          } ${replacingResumeId !== null ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Upload and replace file"
                          id={`replace-resume-btn-${resume.id}`}
                        >
                          {replacingResumeId === resume.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">
                            {replacingResumeId === resume.id ? 'Replacing...' : 'Upload & Replace'}
                          </span>
                        </button>

                        {deletingResumeId === resume.id ? (
                          <div className="flex items-center gap-1.5 animate-fade-in" id={`delete-confirm-container-${resume.id}`}>
                            <span className="text-[10px] font-bold tracking-wider uppercase text-rose-500 mr-1 animate-pulse">
                              Are you sure?
                            </span>
                            <button
                              onClick={async () => {
                                try {
                                  await onDelete(resume.id);
                                } finally {
                                  setDeletingResumeId(null);
                                }
                              }}
                              className="px-2.5 py-1.5 text-xs font-bold leading-none text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer shrink-0 shadow-sm transition-colors"
                              id={`confirm-delete-btn-${resume.id}`}
                            >
                              Yes, Delete
                            </button>
                            <button
                              onClick={() => setDeletingResumeId(null)}
                              className={`px-2.5 py-1.5 text-xs font-semibold leading-none rounded-lg border cursor-pointer shrink-0 transition-colors ${
                                theme === 'night'
                                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                              id={`cancel-delete-btn-${resume.id}`}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingResumeId(resume.id)}
                            className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                              theme === 'night'
                                ? 'bg-slate-950 border-slate-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-905/50'
                                : 'bg-white border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300'
                            }`}
                            title="Delete resume"
                            id={`delete-resume-btn-${resume.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Resume Custom Notes panel */}
                    <div className={`p-4 rounded-xl border mt-1.5 transition-all ${
                      theme === 'night'
                        ? 'bg-slate-950/60 border-slate-800/70 text-slate-300'
                        : 'bg-slate-50/66 border-slate-200/80 text-slate-700'
                    }`} id={`resume-notes-panel-${resume.id}`}>
                      <div className="flex items-center justify-between gap-4 mb-2">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
                          <StickyNote className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Custom Notes for tailored CV variant</span>
                        </div>
                        {editingNotesResumeId !== resume.id && (
                          <button
                            onClick={() => startEditingNotes(resume)}
                            className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border cursor-pointer flex items-center gap-1.5 transition-all ${
                              theme === 'night'
                                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                                : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-100 hover:text-slate-850'
                            }`}
                            id={`edit-notes-btn-${resume.id}`}
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Edit Notes</span>
                          </button>
                        )}
                      </div>

                      {editingNotesResumeId === resume.id ? (
                        <div className="space-y-2 mt-1">
                          <textarea
                            value={notesDraftText}
                            onChange={(e) => setNotesDraftText(e.target.value)}
                            placeholder="Add customizable notes, tailored metrics, alignment highlights or notes for this CV draft..."
                            rows={3}
                            className={`w-full p-2.5 text-xs rounded-lg border font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed ${
                              theme === 'night'
                                ? 'bg-slate-900 border-slate-800 text-white focus:border-indigo-500 placeholder-slate-600'
                                : 'bg-white border-slate-200 text-slate-850 focus:border-blue-500 placeholder-slate-400'
                            }`}
                            id={`notes-textarea-${resume.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveNotes(resume.id)}
                              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold rounded-lg shadow-sm cursor-pointer flex items-center gap-1"
                              id={`save-notes-btn-${resume.id}`}
                            >
                              <Check className="w-3 h-3" />
                              <span>Save Note</span>
                            </button>
                            <button
                              onClick={() => setEditingNotesResumeId(null)}
                              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                                theme === 'night'
                                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                                  : 'bg-white border-slate-250 text-slate-600 hover:bg-slate-50'
                              }`}
                              id={`cancel-notes-btn-${resume.id}`}
                            >
                              <span>Cancel</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs leading-relaxed font-sans select-text whitespace-pre-wrap pl-1">
                          {resume.notes ? (
                            resume.notes
                          ) : (
                            <span className={`italic ${theme === 'night' ? 'text-slate-500' : 'text-slate-400'}`}>
                              No custom notes added for this resume version yet. Click edit to record relevant keywords, submission reminders or core strengths.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
