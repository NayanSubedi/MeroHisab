import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
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
  icon: LucideIcon;   // ✅ correct type
  isFab?: boolean;
};

const THEME_KEY = 'theme';

// ---------- iOS-safe Scroll Lock (prevents background scroll + preserves position) ----------
function useBodyScrollLock(locked: boolean) {
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (!locked) return;

    const body = document.body;
    scrollYRef.current = window.scrollY || 0;

    // Lock technique that works reliably on iOS Safari
    body.style.position = 'fixed';
    body.style.top = `-${scrollYRef.current}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    return () => {
      // Restore
      const y = scrollYRef.current;
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.right = '';
      body.style.width = '';
      window.scrollTo(0, y);
    };
  }, [locked]);
}

// ---------- Optional: PWA/iOS safer dynamic height var (helps older Safari) ----------
function useAppHeightCssVar() {
  useEffect(() => {
    const set = () => {
      // 1% of viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--app-height', `${vh * 100}px`);
    };
    set();
    window.addEventListener('resize', set);
    window.addEventListener('orientationchange', set);
    return () => {
      window.removeEventListener('resize', set);
      window.removeEventListener('orientationchange', set);
    };
  }, []);
}

// ---------- Theme ----------
function getInitialTheme(): 'light' | 'dark' {
  // 1) localStorage
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;

  // 2) system preference
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

function applyTheme(theme: 'light' | 'dark') {
  const html = document.documentElement;
  if (theme === 'dark') html.classList.add('dark');
  else html.classList.remove('dark');
  localStorage.setItem(THEME_KEY, theme);
}

// ---------- Pure helpers ----------
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

// ---------- Memoized UI pieces ----------
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
    <aside
      className={[
        'hidden md:flex flex-col w-64 text-white shadow-xl',
        isAdmin ? 'bg-slate-950' : 'bg-slate-900',
      ].join(' ')}
    >
      <div className="p-6 border-b border-slate-700 flex items-center space-x-2">
        <div className={['p-2 rounded-lg', isAdmin ? 'bg-red-600' : 'bg-blue-600'].join(' ')}>
          {isAdmin ? <ShieldCheck size={24} /> : <Building2 size={24} />}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">MeroHisab</h1>
          <p className="text-xs text-slate-400">{isAdmin ? 'Admin Console' : 'Nepal MSME Tool'}</p>
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
              className={[
                'flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                active
                  ? 'bg-white/20 text-white shadow-md border-l-4 border-blue-400'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              ].join(' ')}
            >
              <Icon size={20} className="mr-3" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 space-y-4">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 rounded-lg select-none">
          <span className="text-xs text-slate-400 font-medium">Appearance</span>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-full bg-slate-700 text-yellow-400 hover:bg-slate-600 transition"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        <div className="px-4">
          <p className="text-sm font-semibold text-white truncate">{userName}</p>
          <div className="flex items-center mt-1">
            <span
              className={[
                'text-[10px] uppercase font-bold px-1.5 py-0.5 rounded',
                isAdmin ? 'bg-red-500' : 'bg-blue-500',
              ].join(' ')}
            >
              {role}
            </span>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          Sign Out
        </button>
      </div>
    </aside>
  );
});

const MobileHeader = memo(function MobileHeader(props: {
  role: UserRole;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}) {
  const { role, isDarkMode, onToggleTheme } = props;
  const isAdmin = role === UserRole.ADMIN;

  return (
    <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 px-4 py-3 flex justify-between items-center z-20 pt-[env(safe-area-inset-top)]">
      <div className="flex items-center space-x-2">
        <div className={['p-1.5 rounded text-white', isAdmin ? 'bg-red-600' : 'bg-blue-600'].join(' ')}>
          {isAdmin ? <ShieldCheck size={18} /> : <Building2 size={18} />}
        </div>
        <span className="font-bold text-lg text-gray-800 dark:text-white tracking-tight">MeroHisab</span>
      </div>

      <button
        onClick={onToggleTheme}
        className="text-gray-500 dark:text-gray-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
      </button>
    </header>
  );
});

const MobileBottomNav = memo(function MobileBottomNav(props: {
  items: NavItem[];
  currentView: string;
  onClick: (id: string) => void;
}) {
  const { items, currentView, onClick } = props;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)] z-40">
      <div className="flex justify-around items-end h-16">
        {items.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;

          if (item.isFab) {
            return (
              <button
                key={item.id}
                onClick={() => onClick(item.id)}
                className="relative -top-5 bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
                aria-label={item.label}
              >
                <Icon size={28} />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onClick(item.id)}
              className={[
                'flex flex-col items-center justify-center w-full h-full py-2 space-y-1 active:scale-95 transition-transform',
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500',
              ].join(' ')}
              aria-label={item.label}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

const MobileOverlayMenu = memo(function MobileOverlayMenu(props: {
  open: boolean;
  navItems: NavItem[];
  currentView: string;
  userName: string;
  role: UserRole;
  onClose: () => void;
  onNav: (id: string) => void;
  onLogout: () => void;
}) {
  const { open, navItems, currentView, userName, role, onClose, onNav, onLogout } = props;

  // Close on ESC (nice for iPad + keyboards)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="md:hidden fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-10 duration-200 flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex justify-end p-6 pt-12">
        <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white" aria-label="Close menu">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 px-6 space-y-6 overflow-y-auto overscroll-contain">
        <div className="flex items-center space-x-4 mb-8">
          <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {userName.charAt(0)}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{userName}</h2>
            <p className="text-gray-400 text-sm">{role}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {navItems.map((item) => {
            const active = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                className={[
                  'flex flex-col items-center justify-center p-4 rounded-xl space-y-2 transition-colors',
                  active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 active:bg-gray-700',
                ].join(' ')}
              >
                <Icon size={24} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center p-4 bg-red-500/10 text-red-500 rounded-xl font-bold mt-4 active:bg-red-500/20"
        >
          <LogOut size={20} className="mr-2" /> Sign Out
        </button>
      </div>
    </div>
  );
});

// ---------- Main Layout ----------
const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, userProfile, logout }) => {
  // Helps older iOS + PWA standalone behave better
  useAppHeightCssVar();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // iOS-safe background scroll lock when overlay is open
  useBodyScrollLock(isMobileMenuOpen);

  // Theme init + keep DOM in sync
  useLayoutEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  // Optional: follow system changes if user hasn't explicitly chosen
  // (If you want "user choice wins forever", remove this effect.)
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return;

    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;

    const handler = () => {
      const t = mq.matches ? 'dark' : 'light';
      setTheme(t);
      applyTheme(t);
    };

    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return next;
    });
  }, []);

  // Build menus once per role change
  const navItems = useMemo(() => buildNavItems(userProfile.role), [userProfile.role]);
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

  const onMobileNavClick = useCallback((id: string) => {
    if (id === 'menu') setIsMobileMenuOpen(true);
    else onNav(id);
  }, [onNav]);

  const onLogout = useCallback(() => {
    setIsMobileMenuOpen(false);
    logout();
  }, [logout]);

  // PWA + iOS safe height:
  // - Prefer 100dvh (modern)
  // - Fallback to CSS var --app-height (older Safari) set by useAppHeightCssVar()
  const rootHeightClass =
    'min-h-[100dvh] supports-[height:100dvh]:min-h-[100dvh] min-h-[var(--app-height)]';

  return (
    <div className={`flex ${rootHeightClass} bg-gray-50 dark:bg-gray-900 transition-colors duration-200`}>
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
        <MobileHeader role={userProfile.role} isDarkMode={theme === 'dark'} onToggleTheme={toggleTheme} />

        {/* Main scroll area (kept simple; bottom nav is fixed) */}
        <main
          className={[
            'flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200',
            // Extra bottom padding so content never hides behind fixed bottom bar + safe area + FAB
            'pb-28 md:pb-8',
            // Prevent rubber-band scroll chaining
            'overscroll-contain',
          ].join(' ')}
        >
          <div className="max-w-6xl mx-auto">{children}</div>
        </main>

        <MobileBottomNav items={bottomNavItems} currentView={currentView} onClick={onMobileNavClick} />

        <MobileOverlayMenu
          open={isMobileMenuOpen}
          navItems={navItems}
          currentView={currentView}
          userName={userProfile.name}
          role={userProfile.role}
          onClose={() => setIsMobileMenuOpen(false)}
          onNav={onNav}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
};

export default Layout;