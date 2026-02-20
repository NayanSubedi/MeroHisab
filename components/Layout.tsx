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

/* ================= COMPONENTS ================= */

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
    <aside className={`hidden md:flex flex-col w-64 text-white shadow-xl ${isAdmin ? 'bg-slate-950' : 'bg-slate-900'}`}>
      <div className="p-6 border-b border-slate-700 flex items-center space-x-2">
        <div className={`p-2 rounded-lg ${isAdmin ? 'bg-red-600' : 'bg-blue-600'}`}>
          {isAdmin ? <ShieldCheck size={24} /> : <Building2 size={24} />}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">MeroHisab</h1>
          <p className="text-xs text-slate-400">
            {isAdmin ? 'Admin Console' : 'Nepal MSME Tool'}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = currentView === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNav(item.id)}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                active
                  ? 'bg-white/20 text-white border-l-4 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className="mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-4">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 rounded-lg">
          <span className="text-xs text-slate-400 font-medium">Appearance</span>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-full bg-slate-700 text-yellow-400"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 rounded-lg"
        >
          <LogOut size={20} className="mr-3" />
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

  const navItems = useMemo(
    () => buildNavItems(userProfile.role),
    [userProfile.role]
  );

  const bottomNavItems = useMemo(
    () => buildBottomNavItems(userProfile.role, navItems),
    [userProfile.role, navItems]
  );

  const onNav = useCallback(
    (id: string) => {
      setView(id);
      setIsMobileMenuOpen(false);
    },
    [setView]
  );

  const onMobileNavClick = useCallback(
    (id: string) => {
      if (id === 'menu') setIsMobileMenuOpen(true);
      else onNav(id);
    },
    [onNav]
  );

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

        {/* FIXED BOTTOM NAV */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t pb-[env(safe-area-inset-bottom)] z-40">
          <div className="flex justify-around items-center h-16">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onMobileNavClick(item.id)}
                  className="flex flex-col items-center text-gray-500"
                >
                  <Icon size={22} />
                  <span className="text-[10px]">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* OVERLAY MENU */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-gray-900/95 flex flex-col">
            <div className="flex justify-end p-6">
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} className="text-white" />
              </button>
            </div>

            <div className="flex-1 px-6 space-y-6 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNav(item.id)}
                    className="w-full p-4 bg-gray-800 text-white rounded-xl flex items-center gap-3"
                  >
                    <Icon size={20} />
                    {item.label}
                  </button>
                );
              })}

              <button
                onClick={onLogout}
                className="w-full p-4 bg-red-500/20 text-red-500 rounded-xl"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;