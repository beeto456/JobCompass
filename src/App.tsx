import { useState, useEffect } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDocFromServer,
  getDocs,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import { JobApplication, UserProfile, AuthMode, JobStatus, normalizeStatus, Resume, CalendarEvent } from './types';
import Sidebar from './components/Sidebar';
import DashboardStats from './components/DashboardStats';
import JobStatusGraph from './components/JobStatusGraph';
import ApplicationList, { getStatusBadgeStyles } from './components/ApplicationList';
import ApplicationForm from './components/ApplicationForm';
import ResumeVault from './components/ResumeVault';
import CalendarView from './components/CalendarView';
import {
  Compass,
  Briefcase,
  Layers,
  Sparkles,
  Zap,
  ArrowUpRight,
  ShieldAlert,
  Pencil,
  AlertTriangle,
  Trash2,
  FileText, // For Resume Vault
  ChevronDown,
} from 'lucide-react';

export default function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'resumes' | 'calendar'>('overview');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<JobApplication | null>(null);
  const [connectionError, setConnectionError] = useState(false);
  const [deleteConfirmTargetId, setDeleteConfirmTargetId] = useState<string | null>(null);
  const [isPrivacyInfoOpen, setIsPrivacyInfoOpen] = useState(false);
  const [visibleRecentCount, setVisibleRecentCount] = useState(9);

  // Day vs Night theme toggle (default being 'day')
  const [theme, setTheme] = useState<'day' | 'night'>(() => {
    const saved = localStorage.getItem('jobcompass:theme');
    return (saved === 'night' || saved === 'day') ? saved : 'day';
  });

  useEffect(() => {
    localStorage.setItem('jobcompass:theme', theme);
  }, [theme]);

  // 1. Connection Validation at boot (Prerequisites guideline)
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. Client is offline.");
          setConnectionError(true);
        }
      }
    }
    testConnection();
  }, []);

  // 2. Auth State Sync
  useEffect(() => {
    // Check if there was an active guest session or firebase session
    const savedAuthMode = localStorage.getItem('jobcompass:auth_mode');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || undefined,
        };
        setUser(profile);
        setAuthMode('firebase');
        localStorage.setItem('jobcompass:auth_mode', 'firebase');

        // Capture/sync profile in users collection
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), profile, { merge: true });
        } catch (err) {
          console.error('Quietly failed to register profile in DB:', err);
        }
      } else {
        if (savedAuthMode === 'guest') {
          setAuthMode('guest');
          setUser({
            uid: 'guest_user',
            displayName: 'Guest Member',
            email: 'offline-guest@jobcompass.local',
          });
        } else {
          setAuthMode('loading');
          // If no guest fallback is active, reset to prompt login
          setUser(null);
          setAuthMode('loading');
          setTimeout(() => {
            setAuthMode((prev) => (prev === 'loading' ? 'loading' : prev));
          }, 500);
          setAuthMode('loading');
          // Truly set to unsigned if not initialized as guest
          if (savedAuthMode !== 'guest') {
            setUser(null);
            // transition out of loading
            setAuthMode('loading');
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Transition helper when nothing is logged in
  useEffect(() => {
    if (authMode === 'loading' && !user) {
      const timer = setTimeout(() => {
        const savedAuthMode = localStorage.getItem('jobcompass:auth_mode');
        if (savedAuthMode !== 'guest') {
          // Change to offline loading done (nothing signed in)
          // We can represent this with a neutral state
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [authMode, user]);

  // 3. Applications Listener (Firebase real-time query vs Guest local storage)
  useEffect(() => {
    if (authMode === 'firebase' && user) {
      const q = query(collection(db, 'applications'), where('userId', '==', user.uid));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loadedApps: JobApplication[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            loadedApps.push({
              id: doc.id,
              ...data,
              status: normalizeStatus(data.status || ''),
            } as JobApplication);
          });
          setApplications(loadedApps);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'applications');
        }
      );

      return () => unsubscribe();
    } else if (authMode === 'guest') {
      const loadGuestData = () => {
        const stored = localStorage.getItem('jobcompass:guest:applications');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as JobApplication[];
            const normalized = parsed.map(app => ({
              ...app,
              status: normalizeStatus(app.status || '')
            }));
            setApplications(normalized);
          } catch (e) {
            console.error('Failed to parse local storage guest data:', e);
            setApplications([]);
          }
        } else {
          setApplications([]);
        }
      };

      loadGuestData();
      // Listen to storage events to keep in sync across tabs if open
      window.addEventListener('storage', loadGuestData);
      return () => window.removeEventListener('storage', loadGuestData);
    } else {
      setApplications([]);
    }
  }, [authMode, user]);

  // 3b. Resumes Listener (Firebase real-time query vs Guest local storage)
  useEffect(() => {
    if (authMode === 'firebase' && user) {
      const q = query(collection(db, 'resumes'), where('userId', '==', user.uid));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loadedResumes: Resume[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            loadedResumes.push({
              id: doc.id,
              ...data,
            } as Resume);
          });
          setResumes(loadedResumes);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'resumes');
        }
      );

      return () => unsubscribe();
    } else if (authMode === 'guest') {
      const loadGuestResumes = () => {
        const stored = localStorage.getItem('jobcompass:guest:resumes');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Resume[];
            setResumes(parsed);
          } catch (e) {
            console.error('Failed to parse local storage guest resumes data:', e);
            setResumes([]);
          }
        } else {
          setResumes([]);
        }
      };

      loadGuestResumes();
      window.addEventListener('storage', loadGuestResumes);
      return () => window.removeEventListener('storage', loadGuestResumes);
    } else {
      setResumes([]);
    }
  }, [authMode, user]);

  // 3c. Calendar Events Listener (Firebase real-time query vs Guest local storage)
  useEffect(() => {
    if (authMode === 'firebase' && user) {
      const q = query(collection(db, 'calendar_events'), where('userId', '==', user.uid));
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loadedEvents: CalendarEvent[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            loadedEvents.push({
              id: doc.id,
              ...data,
            } as CalendarEvent);
          });
          setCalendarEvents(loadedEvents);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'calendar_events');
        }
      );

      return () => unsubscribe();
    } else if (authMode === 'guest') {
      const loadGuestEvents = () => {
        const stored = localStorage.getItem('jobcompass:guest:calendar_events');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as CalendarEvent[];
            setCalendarEvents(parsed);
          } catch (e) {
            console.error('Failed to parse local storage guest calendar_events data:', e);
            setCalendarEvents([]);
          }
        } else {
          setCalendarEvents([]);
        }
      };

      loadGuestEvents();
      window.addEventListener('storage', loadGuestEvents);
      return () => window.removeEventListener('storage', loadGuestEvents);
    } else {
      setCalendarEvents([]);
    }
  }, [authMode, user]);

  // 4. Session Action Handlers
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem('jobcompass:auth_mode', 'guest');
    setUser({
      uid: 'guest_user',
      displayName: 'Guest Member',
      email: 'offline-guest@jobcompass.local',
    });
    setAuthMode('guest');
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('jobcompass:auth_mode');
      setUser(null);
      setAuthMode('loading');
      await signOut(auth);
    } catch (error) {
      console.error('Sign-Out failed:', error);
    }
  };

  // 5. CRUD Application Handlers
  const handleFormSubmit = async (formData: Omit<JobApplication, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    if (!user) return;

    if (formData.id) {
      // UPDATE Operation
      if (authMode === 'firebase') {
        const docId = formData.id;
        const appPayload: Partial<JobApplication> = {
          title: formData.title,
          company: formData.company,
          url: formData.url,
          applicationDate: formData.applicationDate,
          status: formData.status,
          workArrangement: formData.workArrangement,
          officeLocation: formData.officeLocation,
          salaryInformation: formData.salaryInformation,
          targetSalary: formData.targetSalary,
          interviewMethod: formData.interviewMethod,
          interviewRound: formData.interviewRound,
          notes: formData.notes,
          jobDescription: formData.jobDescription,
          resumeId: formData.resumeId || '',
          requirementsMetaJson: formData.requirementsMetaJson || '',
          interviewDate: formData.interviewDate || '',
          followUpDate: formData.followUpDate || '',
          interviewDates: formData.interviewDates || [],
          updatedAt: Date.now(),
        };

        try {
          await setDoc(doc(db, 'applications', docId), appPayload, { merge: true });
        } catch (e) {
          handleFirestoreError(e, OperationType.UPDATE, `applications/${docId}`);
        }
      } else {
        // Guest Update
        const updated = applications.map((app) => 
          app.id === formData.id 
            ? { ...app, ...formData, updatedAt: Date.now() } as JobApplication
            : app
        );
        setApplications(updated);
        localStorage.setItem('jobcompass:guest:applications', JSON.stringify(updated));
      }
    } else {
      // CREATE Operation
      const newId = authMode === 'firebase' 
        ? doc(collection(db, 'applications')).id 
        : 'guest_' + Math.random().toString(36).substring(2, 11);

      const newApp: JobApplication = {
        id: newId,
        userId: user.uid,
        title: formData.title,
        company: formData.company,
        url: formData.url,
        applicationDate: formData.applicationDate,
        status: formData.status,
        workArrangement: formData.workArrangement,
        officeLocation: formData.officeLocation,
        salaryInformation: formData.salaryInformation,
        targetSalary: formData.targetSalary || '',
        interviewMethod: formData.interviewMethod || '',
        interviewRound: formData.interviewRound || '',
        notes: formData.notes,
        jobDescription: formData.jobDescription || '',
        resumeId: formData.resumeId || '',
        requirementsMetaJson: formData.requirementsMetaJson || '',
        interviewDate: formData.interviewDate || '',
        followUpDate: formData.followUpDate || '',
        interviewDates: formData.interviewDates || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      if (authMode === 'firebase') {
        try {
          await setDoc(doc(db, 'applications', newId), newApp);
        } catch (e) {
          handleFirestoreError(e, OperationType.CREATE, `applications/${newId}`);
        }
      } else {
        // Guest Create
        const updated = [newApp, ...applications];
        setApplications(updated);
        localStorage.setItem('jobcompass:guest:applications', JSON.stringify(updated));
      }
    }
  };

  const handleDeleteApplication = (id: string) => {
    setDeleteConfirmTargetId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmTargetId) return;
    const id = deleteConfirmTargetId;

    if (authMode === 'firebase') {
      try {
        await deleteDoc(doc(db, 'applications', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `applications/${id}`);
      }
    } else {
      // Guest Delete
      const updated = applications.filter((app) => app.id !== id);
      setApplications(updated);
      localStorage.setItem('jobcompass:guest:applications', JSON.stringify(updated));
    }
    setDeleteConfirmTargetId(null);
  };

  const handleStatusChangeInline = async (id: string, nextStatus: JobStatus) => {
    if (authMode === 'firebase') {
      try {
        await setDoc(doc(db, 'applications', id), { status: nextStatus, updatedAt: Date.now() }, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `applications/${id}`);
      }
    } else {
      // Guest Status Sync
      const updated = applications.map((app) => 
        app.id === id 
          ? { ...app, status: nextStatus, updatedAt: Date.now() }
          : app
      );
      setApplications(updated);
      localStorage.setItem('jobcompass:guest:applications', JSON.stringify(updated));
    }
  };

  const chunkString = (str: string, length: number): string[] => {
    const size = Math.ceil(str.length / length);
    const r: string[] = new Array(size);
    let offset = 0;
    for (let i = 0; i < size; i++) {
      r[i] = str.substring(offset, offset + length);
      offset += length;
    }
    return r;
  };

  const handleResumeUpload = async (name: string, type: string, size: number, fileData: string) => {
    if (!user) return null;

    const newId = authMode === 'firebase'
      ? doc(collection(db, 'resumes')).id
      : 'guest_resume_' + Math.random().toString(36).substring(2, 11);

    const isLarge = fileData.length > 800000;

    const newResume: Resume = {
      id: newId,
      userId: user.uid,
      name,
      type,
      size,
      fileData: isLarge ? '__chunked__' : fileData,
      createdAt: Date.now()
    };

    if (authMode === 'firebase') {
      try {
        await setDoc(doc(db, 'resumes', newId), newResume);

        if (isLarge) {
          const chunks = chunkString(fileData, 800000);
          for (let i = 0; i < chunks.length; i++) {
            const chunkDocRef = doc(db, 'resumes', newId, 'chunks', `chunk_${i}`);
            await setDoc(chunkDocRef, {
              userId: user.uid,
              resumeId: newId,
              chunkIndex: i,
              content: chunks[i]
            });
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `resumes/${newId}`);
        return null;
      }
    } else {
      const guestResume = { ...newResume, fileData };
      const updated = [guestResume, ...resumes];
      setResumes(updated);
      localStorage.setItem('jobcompass:guest:resumes', JSON.stringify(updated));
    }
    return newResume;
  };

  const handleResumeDelete = async (id: string) => {
    if (!user) return;

    if (authMode === 'firebase') {
      try {
        // Delete nested chunks first
        const chunksCollection = collection(db, 'resumes', id, 'chunks');
        const chunksSnap = await getDocs(query(chunksCollection, where('userId', '==', user.uid)));
        const deletePromises = chunksSnap.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);

        // Delete parent resume
        await deleteDoc(doc(db, 'resumes', id));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `resumes/${id}`);
      }
    } else {
      const updated = resumes.filter(r => r.id !== id);
      setResumes(updated);
      localStorage.setItem('jobcompass:guest:resumes', JSON.stringify(updated));
    }
  };

  const handleUpdateResume = async (id: string, updates: Partial<Resume>) => {
    if (authMode === 'firebase') {
      try {
        await setDoc(doc(db, 'resumes', id), updates, { merge: true });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `resumes/${id}`);
      }
    } else {
      const updated = resumes.map((r) => r.id === id ? { ...r, ...updates } : r);
      setResumes(updated);
      localStorage.setItem('jobcompass:guest:resumes', JSON.stringify(updated));
    }
  };

  const handleResumeReplace = async (id: string, name: string, type: string, size: number, fileData: string) => {
    if (!user) return null;

    const isLarge = fileData.length > 800000;

    const updates: Partial<Resume> = {
      name,
      type,
      size,
      fileData: isLarge ? '__chunked__' : fileData,
    };

    if (authMode === 'firebase') {
      try {
        // Delete old chunks if any
        const chunksCollection = collection(db, 'resumes', id, 'chunks');
        const chunksSnap = await getDocs(query(chunksCollection, where('userId', '==', user.uid)));
        for (const docObj of chunksSnap.docs) {
          await deleteDoc(docObj.ref);
        }

        // Set the new file details
        await setDoc(doc(db, 'resumes', id), updates, { merge: true });

        // Save new chunks if needed
        if (isLarge) {
          const chunks = chunkString(fileData, 800000);
          for (let i = 0; i < chunks.length; i++) {
            const chunkDocRef = doc(db, 'resumes', id, 'chunks', `chunk_${i}`);
            await setDoc(chunkDocRef, {
              userId: user.uid,
              resumeId: id,
              chunkIndex: i,
              content: chunks[i]
            });
          }
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `resumes/${id}`);
        return null;
      }
    } else {
      const updated = resumes.map((resume) => {
        if (resume.id === id) {
          return {
            ...resume,
            name,
            type,
            size,
            fileData,
          };
        }
        return resume;
      });
      setResumes(updated);
      localStorage.setItem('jobcompass:guest:resumes', JSON.stringify(updated));
    }
  };

  const handleGetResumeFileContent = async (resume: Resume): Promise<string> => {
    if (resume.fileData !== '__chunked__') {
      return resume.fileData;
    }

    if (authMode === 'firebase' && user) {
      try {
        const chunksCollection = collection(db, 'resumes', resume.id, 'chunks');
        const chunksSnap = await getDocs(query(chunksCollection, where('userId', '==', user.uid)));
        const docs = chunksSnap.docs.map(d => ({
          chunkIndex: d.data().chunkIndex as number,
          content: d.data().content as string,
        }));
        
        docs.sort((a, b) => a.chunkIndex - b.chunkIndex);
        return docs.map(d => d.content).join('');
      } catch (e) {
        console.error('Failed to reconstruct resume from chunks:', e);
        throw e;
      }
    } else {
      return resume.fileData;
    }
  };

  const handleAddCalendarEvent = async (eventData: Omit<CalendarEvent, 'id' | 'userId' | 'createdAt'>) => {
    if (!user) return;

    const newId = authMode === 'firebase'
      ? doc(collection(db, 'calendar_events')).id
      : 'guest_event_' + Math.random().toString(36).substring(2, 11);

    const newEvent: CalendarEvent = {
      id: newId,
      userId: user.uid,
      title: eventData.title,
      date: eventData.date,
      type: eventData.type,
      notes: eventData.notes || '',
      createdAt: Date.now(),
    };

    if (authMode === 'firebase') {
      try {
        await setDoc(doc(db, 'calendar_events', newId), newEvent);
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, `calendar_events/${newId}`);
      }
    } else {
      const updated = [newEvent, ...calendarEvents];
      setCalendarEvents(updated);
      localStorage.setItem('jobcompass:guest:calendar_events', JSON.stringify(updated));
    }
  };

  const handleDeleteCalendarEvent = async (eventId: string) => {
    if (!user) return;

    if (authMode === 'firebase') {
      try {
        await deleteDoc(doc(db, 'calendar_events', eventId));
      } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `calendar_events/${eventId}`);
      }
    } else {
      const updated = calendarEvents.filter(e => e.id !== eventId);
      setCalendarEvents(updated);
      localStorage.setItem('jobcompass:guest:calendar_events', JSON.stringify(updated));
    }
  };

  const handleEditTrigger = (app: JobApplication) => {
    setEditTarget(app);
    setIsFormOpen(true);
  };

  const handleCreateTrigger = () => {
    setEditTarget(null);
    setIsFormOpen(true);
  };

  // Render Section
  const isUserAuthenticated = user !== null && authMode !== 'loading';

  if (!isUserAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden px-4" id="landing-page-root">
        {/* Glow circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-10 left-1/4 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10 text-center" id="landing-card-container">
          {/* Brand Icon Header */}
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-6 border border-indigo-400/20">
            <Compass className="w-9 h-9 text-white animate-spin-slow" style={{ animationDuration: '24s' }} />
          </div>

          {/* Titles */}
          <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight mb-2">
            JobCompass
          </h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed mb-8">
            Intelligently track and organize your application pipeline in real-time.
          </p>

          {/* Connection warning in footer if config issue detected */}
          {connectionError && (
            <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-center gap-2 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Firebase is offline. Local sandboxes will remain operational.</span>
            </div>
          )}

          {/* Buttons Panel */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-3.5">
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 active:scale-98 transition-all shadow-md cursor-pointer"
              id="google-login-btn"
            >
              <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Login with Google</span>
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-slate-400 bg-slate-900/60 inset-y-0 px-2 max-w-max mx-auto leading-none">
                or sandbox
              </div>
            </div>

            <button
              onClick={handleGuestLogin}
              className="w-full bg-slate-800 hover:bg-slate-750 hover:border-slate-700/80 hover:text-slate-100 text-slate-300 font-bold text-xs py-3 px-4 rounded-xl border border-slate-800 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
              id="guest-login-btn"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Try as Guest (Local Fallback)</span>
            </button>

            {/* Privacy & Login Info Dropdown Accordion */}
            <div className="mt-4 border-t border-slate-800/80 pt-4 text-left" id="privacy-explanation-dropdown">
              <button
                type="button"
                onClick={() => setIsPrivacyInfoOpen(!isPrivacyInfoOpen)}
                className="w-full flex items-center justify-between text-[11px] font-bold text-slate-400 hover:text-slate-300 transition-colors focus:outline-none"
              >
                <span>Why Google Login vs. Guest Mode?</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isPrivacyInfoOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isPrivacyInfoOpen && (
                <div className="mt-2.5 space-y-3 text-[11.5px] text-slate-400 leading-relaxed bg-slate-950/40 p-3 rounded-xl border border-slate-850">
                  <div>
                    <h4 className="font-bold text-slate-300 mb-0.5">Why Google Login is Required:</h4>
                    <p>
                      Logging in with Google securely stores your personal dashboard, job tracking pipelines, and uploaded resumes in our Cloud Database (Firestore). This ensures you can access your private job tracking dashboard on any desktop or mobile device.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-500/90 mb-0.5">
                      Guest Mode Limitations & Privacy Risks:
                    </h4>
                    <p>
                      Guest mode behaves as a temporary sandbox stored inside your current browser's local cache. This approach has critical data sensitivity limitations:
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-slate-400 pl-1">
                      <li>
                        <strong className="text-slate-300">Privacy Risk:</strong> All saved job pipelines and private profile information can be easily cleared or viewed by others utilizing the same browser.
                      </li>
                      <li>
                        <strong className="text-slate-300">Permanent Loss:</strong> Clearing browser data, cookies, or local cache will permanently delete your entire job tracker progress.
                      </li>
                      <li>
                        <strong className="text-slate-300">No Backup or Portability:</strong> Your track record is restricted to this one browser, preventing multi-device access and restore capabilities.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400 mt-8 font-sans">
            JobCompass Platform • App is Currently in Development (2026)
          </p>
        </div>
      </div>
    );
  }

  // Dashboard Interface (A user session is logged in, either Google or Guest)
  return (
    <div className={`min-h-screen flex flex-col lg:flex-row transition-colors duration-200 ${
      theme === 'night' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`} id="app-workspace-root">
      {/* Sidebar navigation */}
      <Sidebar
        theme={theme}
        setTheme={setTheme}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsFormOpen(false);
        }}
        userProfile={user}
        authMode={authMode}
        onLogout={handleLogout}
        onAddClick={handleCreateTrigger}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden min-h-screen p-5 md:p-8 lg:p-10 flex flex-col justify-between">
        
        <div className="flex-1">
          {isFormOpen ? (
            <ApplicationForm
              isOpen={isFormOpen}
              onClose={() => setIsFormOpen(false)}
              onSubmit={handleFormSubmit}
              initialData={editTarget}
              theme={theme}
              resumes={resumes}
              onUploadResume={handleResumeUpload}
              isGuest={authMode === 'guest'}
              onGoogleLogin={handleGoogleLogin}
            />
          ) : (
            <div className="space-y-6">
              {/* Dynamic Header */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6 transition-colors duration-250 ${
                theme === 'night' ? 'border-slate-900' : 'border-slate-200/90'
              }`}>
                <div>
                  <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
                    theme === 'night' ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    {activeTab === 'overview' && 'Homepage Overview'}
                    {activeTab === 'explorer' && 'Status Explorer'}
                    {activeTab === 'calendar' && 'Interactive Calendar'}
                    {activeTab === 'resumes' && 'Resume Vault'}
                  </h1>
                  <p className={`text-xs mt-1 ${theme === 'night' ? 'text-slate-400' : 'text-slate-500'}`}>
                    {activeTab === 'overview' && 'Overview of your personal metrics, visual status trends, and a timeline of recent tracking entries'}
                    {activeTab === 'explorer' && 'Search, filter, update statuses, and keep detailed records of various job applications'}
                    {activeTab === 'calendar' && 'Plan upcoming interviews, schedule preparatory notes, and track key custom event milestones'}
                    {activeTab === 'resumes' && 'Securely manage, store, and organize multiple key resumes for targeted job roles'}
                  </p>
                </div>
              </div>

              {/* Tab content switching */}
              {activeTab === 'overview' ? (
                <div className="space-y-6" id="overview-tab-content">
                  {/* 1. Aggregated Cards */}
                  <DashboardStats applications={applications} theme={theme} />

                  {/* 2. Recharts Bar Graphic */}
                  <JobStatusGraph applications={applications} theme={theme} />

                  {/* 3. Quick items list preview */}
                  <div className={`rounded-xl p-6 shadow-sm border transition-all duration-200 ${
                    theme === 'night' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200/90'
                  }`} id="recent-activities-list">
                    <div className={`flex items-center justify-between border-b pb-4 mb-4 ${
                      theme === 'night' ? 'border-slate-900' : 'border-slate-150'
                    }`}>
                      <div>
                        <h3 className={`text-sm font-bold ${theme === 'night' ? 'text-slate-200' : 'text-slate-800'}`}>Recent Tracking Entries</h3>
                        <p className="text-[11px] text-slate-500">Fast lookup of newly logged job applications</p>
                      </div>
                      <button
                        onClick={() => setActiveTab('explorer')}
                        className={`text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                          theme === 'night' ? 'text-indigo-400 hover:text-indigo-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                        id="view-all-pipeline-btn"
                      >
                        <span>Explore Database</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {applications.length === 0 ? (
                      <div className="py-8 text-center text-slate-500">
                        <Briefcase className="w-5 h-5 mx-auto text-slate-600 mb-2" />
                        <p className="text-xs">No opportunities added yet</p>
                        <button
                          onClick={handleCreateTrigger}
                          className={`text-xs underline mt-1 cursor-pointer ${
                            theme === 'night' ? 'text-indigo-400' : 'text-blue-600'
                          }`}
                        >
                          Log your first job entry
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="recent-apps-preview-grid">
                          {[...applications]
                            .sort((a, b) => {
                              const timeA = a.updatedAt || a.createdAt || 0;
                              const timeB = b.updatedAt || b.createdAt || 0;
                              return timeB - timeA;
                            })
                            .slice(0, visibleRecentCount)
                            .map((app) => (
                            <div
                              key={app.id}
                              className={`p-4 border rounded-lg flex items-center justify-between gap-4 transition-colors ${
                                theme === 'night'
                                  ? 'bg-slate-950/40 border-slate-850 hover:border-slate-800'
                                  : 'bg-slate-50 border-slate-200/80 hover:border-slate-300'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <span className={`font-bold text-xs truncate block leading-tight ${
                                  theme === 'night' ? 'text-slate-200' : 'text-slate-800'
                                }`}>
                                  {app.title}
                                </span>
                                <span className={`text-[10px] mt-1 block font-medium ${
                                  theme === 'night' ? 'text-indigo-400' : 'text-blue-600'
                                }`}>
                                  {app.company}
                                </span>
                                <span className={`text-[10px] mt-0.5 block ${
                                  theme === 'night' ? 'text-slate-500' : 'text-slate-400 font-medium'
                                }`}>
                                  Last updated: {new Date(app.updatedAt || app.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-[10px] font-mono px-2 py-1 rounded font-bold ${getStatusBadgeStyles(app.status)}`}>
                                  {app.status}
                                </span>
                                <button
                                  onClick={() => handleEditTrigger(app)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                                    theme === 'night'
                                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-indigo-500 hover:bg-indigo-600 shadow-sm'
                                      : 'bg-white border-slate-250 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/40'
                                  }`}
                                  title="Edit application"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteApplication(app.id)}
                                  className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                                    theme === 'night'
                                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white hover:border-rose-500 hover:bg-rose-600 shadow-sm'
                                      : 'bg-white border-slate-250 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/45'
                                  }`}
                                  title="Delete application"
                                  id={`btn-delete-recent-${app.id}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {applications.length > visibleRecentCount && (
                          <div className="flex justify-center pt-2">
                            <button
                              onClick={() => setVisibleRecentCount((prev) => prev + 9)}
                              className={`px-5 py-2 text-xs font-semibold rounded-xl border shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 ${
                                theme === 'night'
                                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-indigo-400'
                                  : 'bg-white border-slate-200 hover:border-slate-350 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>Load More Entries</span>
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'explorer' ? (
                <div id="explorer-tab-content">
                  {/* Status Explorer View */}
                  <ApplicationList
                    applications={applications}
                    onEdit={handleEditTrigger}
                    onDelete={handleDeleteApplication}
                    onStatusChange={handleStatusChangeInline}
                    theme={theme}
                    resumes={resumes}
                    onDownloadResumeContent={handleGetResumeFileContent}
                  />
                </div>
              ) : activeTab === 'calendar' ? (
                <div id="calendar-tab-content">
                  {/* Interaction Calendar View */}
                  <CalendarView
                    applications={applications}
                    calendarEvents={calendarEvents}
                    onAddEvent={handleAddCalendarEvent}
                    onDeleteEvent={handleDeleteCalendarEvent}
                    onEditApplication={handleEditTrigger}
                    theme={theme}
                  />
                </div>
              ) : (
                <div id="resumes-tab-content">
                  {/* Resume Vault View */}
                  <ResumeVault
                    resumes={resumes}
                    applications={applications}
                    onUpload={handleResumeUpload}
                    onDelete={handleResumeDelete}
                    onDownloadContent={handleGetResumeFileContent}
                    onUpdateResume={handleUpdateResume}
                    onReplaceResume={handleResumeReplace}
                    theme={theme}
                    isGuest={authMode === 'guest'}
                    onGoogleLogin={handleGoogleLogin}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Page Footnote */}
        <footer className={`mt-12 pt-6 border-t text-center text-[11px] leading-relaxed transition-all duration-250 ${
          theme === 'night' ? 'border-slate-900/60 text-slate-500' : 'border-slate-200 text-slate-400'
        }`}>
          <div>
            Made by{' '}
            <strong className={`font-semibold ${theme === 'night' ? 'text-slate-400' : 'text-slate-600'}`}>Merlin Cheng</strong>{' '}
            (<a href="https://www.linkedin.com/in/merlinkun/" target="_blank" rel="noopener noreferrer" className={`hover:underline font-medium ${theme === 'night' ? 'text-indigo-400' : 'text-blue-600'}`}>LinkedIn</a>{' | '}
            <a href="https://merlinkun.figma.site/" target="_blank" rel="noopener noreferrer" className={`hover:underline font-medium ${theme === 'night' ? 'text-indigo-400' : 'text-blue-600'}`}>Portfolio</a>), 2026.
            <span className="mx-2.5">•</span>
            Created using Google AI Studio.
            <span className="mx-2.5">•</span>
            App is in development (V0.35)
            <span className="mx-2.5">•</span>
            <a href="https://forms.gle/AxTW26wChoRpCc429" target="_blank" rel="noopener noreferrer" className={`font-semibold hover:underline ${theme === 'night' ? 'text-indigo-400' : 'text-blue-600'}`}>Feedback Form</a>
          </div>
        </footer>
      </main>

      {/* Delete Confirmation Modal */}
      {deleteConfirmTargetId && (() => {
        const targetApp = applications.find(app => app.id === deleteConfirmTargetId);
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div 
              className={`w-full max-w-md rounded-2xl shadow-xl p-6 transition-all border transform scale-100 animate-scale-in ${
                theme === 'night' 
                  ? 'bg-slate-900 border-slate-800 text-white' 
                  : 'bg-white border-slate-200 text-slate-900'
              }`}
              id="delete-confirmation-dialog"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl shrink-0 ${
                  theme === 'night' ? 'bg-rose-955/40 text-rose-400' : 'bg-rose-50 text-rose-600'
                }`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold font-sans tracking-tight">
                    Delete Job Application?
                  </h3>
                  <p className={`text-xs mt-1 leading-relaxed ${
                    theme === 'night' ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    Are you sure you want to delete this job application entry? This action is permanent and cannot be undone.
                  </p>

                  {targetApp && (
                    <div className={`mt-3.5 p-3.5 rounded-xl border ${
                      theme === 'night' 
                        ? 'bg-slate-950/60 border-slate-850' 
                        : 'bg-slate-50 border-slate-200/60'
                    }`}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Record</p>
                      <p className="text-xs font-semibold font-sans mt-0.5 truncate">
                        {targetApp.title}
                      </p>
                      <p className={`text-[11px] font-mono mt-0.5 ${
                        theme === 'night' ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        {targetApp.company}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTargetId(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    theme === 'night'
                      ? 'bg-transparent border-slate-800 text-slate-300 hover:bg-slate-800/55'
                      : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'
                  }`}
                  id="btn-confirm-delete-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                  id={`btn-confirm-delete-execute-${deleteConfirmTargetId}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Record</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
