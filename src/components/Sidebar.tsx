import { useState } from 'react';
import { UserProfile, AuthMode } from '../types';
import {
  Briefcase,
  Compass,
  ListTodo,
  LogOut,
  Calendar,
  CloudLightning,
  CloudOff,
  Plus,
  Menu,
  X,
  Sparkles,
  Sun,
  Moon,
  FileText, // For Resume Vault
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'overview' | 'explorer' | 'resumes' | 'calendar';
  setActiveTab: (tab: 'overview' | 'explorer' | 'resumes' | 'calendar') => void;
  userProfile: UserProfile | null;
  authMode: AuthMode;
  onLogout: () => void;
  onAddClick: () => void;
  theme: 'day' | 'night';
  setTheme: (theme: 'day' | 'night') => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  userProfile,
  authMode,
  onLogout,
  onAddClick,
  theme,
  setTheme,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      id: 'overview' as const,
      label: 'Homepage Overview',
      icon: Compass,
      description: 'Analytics, metrics & status graphs',
    },
    {
      id: 'explorer' as const,
      label: 'Status Explorer',
      icon: ListTodo,
      description: 'Filterable database, tables & list views',
    },
    {
      id: 'calendar' as const,
      label: 'Interactive Calendar',
      icon: Calendar,
      description: 'Applied, Interviews & Custom events',
    },
    {
      id: 'resumes' as const,
      label: 'Resume Vault',
      icon: FileText,
      description: 'Upload, track & link tailored CVs',
    },
  ];

  return (
    <>
      {/* Mobile Top Header */}
      <div
        className={`lg:hidden px-5 py-4 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200 border-b ${
          theme === 'night' ? 'bg-[#0F172A] border-slate-850' : 'bg-white border-slate-200'
        }`}
        id="mobile-top-header"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            theme === 'night' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'
          }`}>
            <Compass className="w-5 h-5" />
          </div>
          <span className={`font-serif italic font-bold tracking-tight text-lg transition-colors ${
            theme === 'night' ? 'text-white' : 'text-slate-900'
          }`}>
            JobCompass
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={onAddClick}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-md shadow-blue-500/10"
            id="mobile-add-btn"
          >
            <Plus className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`p-1.5 rounded-lg transition-colors border ${
              theme === 'night' 
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border-slate-805' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border-slate-200'
            }`}
            id="mobile-hamburger-btn"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Sidebar (Desktop / Collapsible Canvas on Mobile) */}
      <div
        className={`fixed inset-y-0 left-0 border-r w-64 lg:w-72 flex flex-col justify-between z-50 transform lg:transform-none transition-all duration-200 lg:sticky lg:top-0 lg:h-screen shrink-0 ${
          theme === 'night' ? 'bg-[#0F172A] border-slate-850' : 'bg-white border-slate-200'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        id="app-sidebar-container"
      >
        <div>
          {/* Logo Brand Header */}
          <div className={`p-6 border-b flex items-center justify-between ${
            theme === 'night' ? 'border-slate-850' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold transition-all ${
                theme === 'night' 
                  ? 'bg-blue-500 shadow-md shadow-blue-500/10 border border-blue-400/20' 
                  : 'bg-blue-600 shadow-sm shadow-blue-600/10'
              }`}>
                <Compass className="w-5.5 h-5.5" />
              </div>
              <div>
                <span className={`font-serif font-bold italic tracking-tight text-xl block leading-none ${
                  theme === 'night' ? 'text-white' : 'text-slate-900'
                }`}>
                  JobCompass
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-widest mt-1.5 block ${
                  theme === 'night' ? 'text-slate-400' : 'text-slate-620 font-semibold'
                }`}>
                  Job Tracker Dashboard
                </span>
              </div>
            </div>
            {/* Close button for mobile slide-out */}
            <button
              onClick={() => setMobileOpen(false)}
              className={`lg:hidden p-1.5 rounded-lg transition-colors ${
                theme === 'night' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              id="sidebar-close-btn"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Action Button */}
          <div className="px-5 pt-6 pb-2">
            <button
              onClick={() => {
                onAddClick();
                setMobileOpen(false);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 active:scale-95 transition-all text-center cursor-pointer font-sans"
              id="sidebar-add-application-btn"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add New Job</span>
            </button>
          </div>

          {/* Navigation Menus */}
          <nav className="p-4 space-y-1.5" id="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              let buttonStyle = '';
              let iconStyle = '';
              let labelStyle = '';
              let descStyle = '';

              if (theme === 'night') {
                buttonStyle = isActive
                  ? 'bg-slate-800 text-white border-slate-700 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/40 border-transparent';
                iconStyle = isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300';
                labelStyle = isActive ? 'text-white' : 'text-slate-300';
                descStyle = 'text-slate-400';
              } else {
                buttonStyle = isActive
                  ? 'bg-blue-50/60 text-blue-600 border-blue-100/80 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 border-transparent';
                iconStyle = isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-600';
                labelStyle = isActive ? 'text-blue-900 font-bold' : 'text-slate-700';
                descStyle = isActive ? 'text-blue-700/90' : 'text-slate-600';
              }

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileOpen(false); // Close slider on mobile click
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-start gap-3.5 group cursor-pointer border ${buttonStyle}`}
                  id={`sidebar-tab-${item.id}`}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 shrink-0 transition-transform group-hover:scale-110 ${iconStyle}`}
                  />
                  <div>
                    <span className={`font-semibold text-xs leading-none block ${labelStyle}`}>
                      {item.label}
                    </span>
                    <span className={`text-[10px] font-normal leading-relaxed mt-1 block ${descStyle}`}>
                      {item.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Area: Profile, Theme Toggle & Account info */}
        <div className={`p-4 border-t transition-all ${
          theme === 'night' ? 'border-slate-850 bg-slate-950/20' : 'border-slate-200 bg-slate-50/40'
        }`}>
          
          {/* Theme Toggle Pill */}
          <div className={`mb-3.5 p-1 rounded-xl flex items-center border transition-all duration-200 ${
            theme === 'night' ? 'bg-slate-950/70 border-slate-850' : 'bg-slate-100/80 border-slate-200'
          }`}>
            <button
              onClick={() => setTheme('day')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                theme === 'day'
                  ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sun className={`w-3.5 h-3.5 ${theme === 'day' ? 'text-amber-600' : 'text-slate-500'}`} />
              <span>Day</span>
            </button>
            <button
              onClick={() => setTheme('night')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                theme === 'night'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700/50'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Moon className={`w-3.5 h-3.5 ${theme === 'night' ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>Night</span>
            </button>
          </div>

          {/* Active Mode Indicator */}
          <div className={`mb-3 px-2.5 py-2 rounded-xl flex items-center justify-between text-[10px] border ${
            theme === 'night' ? 'bg-slate-950/40 border-slate-850' : 'bg-white border-slate-200/80 shadow-xs'
          }`}>
            <span className={theme === 'night' ? 'text-slate-400 font-semibold' : 'text-slate-600 font-semibold'}>Sync Mode:</span>
            {authMode === 'firebase' ? (
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md">
                <CloudLightning className="w-2.5 h-2.5" />
                Live Sync
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded-md">
                <CloudOff className="w-2.5 h-2.5" />
                Guest
              </span>
            )}
          </div>

          {/* User Information */}
          {userProfile && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border mb-3 ${
              theme === 'night' ? 'bg-slate-800/40 border-slate-800/80' : 'bg-white border-slate-200 shadow-xs'
            }`} id="sidebar-profile-card">
              <img
                src={userProfile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userProfile.displayName)}`}
                alt={userProfile.displayName}
                referrerPolicy="no-referrer"
                className={`w-10 h-10 rounded-lg object-cover shrink-0 border ${
                  theme === 'night' ? 'border-slate-700' : 'border-slate-200'
                }`}
                id="profile-avatar-img"
              />
              <div className="min-w-0 flex-1">
                <span className={`font-sans font-bold text-xs truncate block leading-none ${
                  theme === 'night' ? 'text-white' : 'text-slate-800'
                }`}>
                  {userProfile.displayName}
                </span>
                {authMode === 'firebase' && userProfile.email && (
                  <span className={`text-[10px] font-sans truncate block mt-1 leading-none ${
                    theme === 'night' ? 'text-slate-400' : 'text-slate-600 shadow-none'
                  }`}>
                    {userProfile.email}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={onLogout}
            className={`w-full border font-bold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all ${
              theme === 'night'
                ? 'border-slate-805 hover:bg-slate-800 hover:border-slate-700 hover:text-white text-slate-400'
                : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 text-slate-600 shadow-xs'
            }`}
            id="sidebar-logout-btn"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </div>

      {/* Backdrop overlay strictly when mobile sidebar is open */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-40 lg:hidden cursor-pointer"
          id="mobile-drawer-backdrop"
        />
      )}
    </>
  );
}
