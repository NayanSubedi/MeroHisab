import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  memo,
} from 'react';
import {
  FileText,
  PieChart,
  Users,
  LogOut,
  X,
  Building2,
  ShieldCheck,
  Settings,
  Moon,
  Sun,
  Calendar,
  Home,
  PlusCircle,
  MoreHorizontal,
  Activity
} from 'lucide-react';
import { BusinessProfile, UserRole } from '../types';
import type { LucideIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: string) => void;
  userProfile: BusinessProfile;
  logout: () => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  isFab?: boolean;
};

const THEME_KEY = 'theme';

/* ================= THEME ================= */

function getInitialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  const html = document.documentElement;
  if (theme === 'dark') html.classList.add('dark');
  else html.classList.remove('dark');
  localStorage.setItem(THEME_KEY, theme);
}

/* ================= NAV HELPERS ================= */

function buildNavItems(role: UserRole): NavItem[] {
  const businessItems: NavItem[] = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'daily', label: 'Daily Transaction', icon: Calendar },
    { id: 'upload', label: 'Scan', icon: PlusCircle },
    { id: 'invoice', label: 'Invoice', icon: FileText },
    { id: 'reports', label: 'Reports', icon: PieChart },
  ];

  if (role === UserRole.ADMIN) {
    return [
      { id: 'admin_dashboard', label: 'Registry', icon: ShieldCheck },
      { id: 'admin_users', label: 'Users', icon: Users },
      { id: 'admin_logs', label: 'Activity Log', icon: Activity },
    ];
  }

  if (role === UserRole.STAFF) {
    return [
      { id: 'upload', label: 'Scan', icon: PlusCircle },
      { id: 'invoice', label: 'Invoice', icon: FileText },
      { id: 'daily', label: 'History', icon: Calendar },
    ];
  }

  const items = [...businessItems];
  if (role === UserRole.OWNER) {
    items.push({ id: 'users', label: 'Staff', icon: Users });
    items.push({ id: 'profile', label: 'Settings', icon: Settings });
  }
  return items;
}

function buildBottomNavItems(role: UserRole, navItems: NavItem[]): NavItem[] {
  if (role === UserRole.ADMIN) return navItems.slice(0, 4);
  return [
    { id: 'dashboard', icon: Home, label: 'Home' },
    { id: 'daily', icon: Calendar, label: 'History' },
    { id: 'upload', icon: PlusCircle, label: 'Scan', isFab: true },
    { id: 'invoice', icon: FileText, label: 'Invoice' },
    { id: 'menu', icon: MoreHorizontal, label: 'More' },
  ];
}

/* ================= DESKTOP SIDEBAR ================= */

const DesktopSidebar = memo(function DesktopSidebar(props: {
  navItems: NavItem[];
  currentView: string;
  onNav: (id: string) => void;
  onLogout: () => void;
  userName: string;
  role: UserRole;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}) {
  const { navItems, currentView, onNav, onLogout, userName, role, isDarkMode, onToggleTheme } = props;
  const isAdmin = role === UserRole.ADMIN;

  return (
    <aside className={`hidden md:flex flex-col w-64 text-white shadow-xl ${isAdmin ? 'bg-gradient-to-b from-slate-950 to-slate-900' : 'bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950'}`}>
      {/* Logo */}
      <div className="p-5 border-b border-white/10 flex items-center space-x-3">
        <div className={`p-2.5 rounded-xl shadow-lg ${isAdmin ? 'bg-gradient-to-br from-red-500 to-red-700' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
          {isAdmin ? <ShieldCheck size={22} /> : <Building2 size={22} />}
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">Dainikhisab</h1>
          <p className="text-[10px] text-slate-400 font-medium">
            {isAdmin ? 'Admin Console' : 'Nepal MSME Tool'}
          </p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-blue-600/30 to-indigo-600/20 text-white shadow-sm border border-blue-500/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon size={18} className={`mr-3 ${active ? 'text-blue-400' : ''}`} />
              {item.label}
              {active && <div className="ml-auto w-1.5 h-1.5 bg-blue-400 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-2">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 rounded-xl">
          <span className="text-xs text-slate-400 font-medium">Theme</span>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-full bg-slate-700/80 text-yellow-400 hover:bg-slate-600 transition-colors"
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
        >
          <LogOut size={18} className="mr-3" />
          Sign Out
        </button>
      </div>
    </aside>
  );
});

/* ================= MAIN LAYOUT ================= */

const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  setView,
  userProfile,
  logout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useLayoutEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  const navItems = useMemo(() => buildNavItems(userProfile.role), [userProfile.role]);
  const bottomNavItems = useMemo(() => buildBottomNavItems(userProfile.role, navItems), [userProfile.role, navItems]);

  const onNav = useCallback((id: string) => {
    setView(id);
    setIsMobileMenuOpen(false);
  }, [setView]);

  const onMobileNavClick = useCallback((id: string) => {
    if (id === 'menu') setIsMobileMenuOpen(true);
    else onNav(id);
  }, [onNav]);

  const onLogout = useCallback(() => {
    setIsMobileMenuOpen(false);
    logout();
  }, [logout]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <DesktopSidebar
        navItems={navItems}
        currentView={currentView}
        onNav={onNav}
        onLogout={onLogout}
        userName={userProfile.name}
        role={userProfile.role}
        isDarkMode={theme === 'dark'}
        onToggleTheme={toggleTheme}
      />

      <div className="flex-1 flex flex-col relative">
        {/* MAIN SCROLL AREA */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pb-28 md:pb-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        {/* FIXED BOTTOM NAV — Mobile Only */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-t border-gray-300/50 dark:border-gray-700/50 pb-[env(safe-area-inset-bottom)] z-40">
          <div className="flex justify-around items-end h-16 px-2">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id || (item.id === 'menu' && isMobileMenuOpen);

              // FAB (center scan button)
              if (item.isFab) {
                return (
                  <button
                    key={item.id}
                    onClick={() => onMobileNavClick(item.id)}
                    className="flex flex-col items-center -mt-5"
                  >
                    <div className={`p-3.5 rounded-2xl shadow-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 scale-110'
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <span className={`text-[9px] mt-1 font-semibold ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              }

              return (
                <button
                  key={item.id}
                  onClick={() => onMobileNavClick(item.id)}
                  className="flex flex-col items-center py-2 min-w-[48px] transition-all duration-200"
                >
                  <div className={`p-1 rounded-xl transition-all duration-200 ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                  }`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </div>
                  <span className={`text-[9px] mt-0.5 transition-colors ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-gray-400 font-medium'
                  }`}>
                    {item.label}
                  </span>
                  {isActive && item.id !== 'menu' && (
                    <div className="w-1 h-1 bg-blue-500 rounded-full mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* OVERLAY MENU — Full screen slide-up */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <div className="relative mt-auto bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden"
                 style={{ animation: 'slideUp 0.3s ease-out' }}>
              
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              {/* Close */}
              <div className="flex justify-between items-center px-6 py-3">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Menu</h3>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Navigation */}
              <div className="px-4 pb-4 space-y-1.5 overflow-y-auto max-h-[60vh]">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = currentView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNav(item.id)}
                      className={`w-full p-3.5 rounded-2xl flex items-center gap-3 transition-all ${
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${
                        active
                          ? 'bg-blue-100 dark:bg-blue-900/40'
                          : 'bg-white dark:bg-gray-700'
                      }`}>
                        <Icon size={18} className={active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'} />
                      </div>
                      <span className={`text-sm ${active ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
                      {active && <div className="ml-auto w-2 h-2 bg-blue-500 rounded-full" />}
                    </button>
                  );
                })}

                {/* Divider */}
                <div className="border-t border-gray-300 dark:border-gray-800 my-2" />

                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-between text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white dark:bg-gray-700">
                      {theme === 'dark' ? <Sun size={18} className="text-yellow-500" /> : <Moon size={18} className="text-blue-400" />}
                    </div>
                    <span className="text-sm font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                  <div className={`w-11 h-6 rounded-full flex items-center px-0.5 transition-colors ${theme === 'dark' ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </button>

                {/* Logout */}
                <button
                  onClick={onLogout}
                  className="w-full p-3.5 bg-red-50 dark:bg-red-900/15 rounded-2xl flex items-center gap-3 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/25 transition-colors"
                >
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                    <LogOut size={18} />
                  </div>
                  <span className="text-sm font-semibold">Sign Out</span>
                </button>
              </div>

              {/* Safe area padding */}
              <div className="pb-[env(safe-area-inset-bottom)]" />
            </div>
          </div>
        )}

        {/* Slide-up animation */}
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default Layout;