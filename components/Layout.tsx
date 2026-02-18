
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  PieChart, 
  Users, 
  LogOut, 
  Menu,
  X,
  Building2,
  ShieldCheck,
  Settings,
  Moon,
  Sun,
  Calendar,
  Home,
  PlusCircle,
  MoreHorizontal
} from 'lucide-react';
import { BusinessProfile, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: string) => void;
  userProfile: BusinessProfile;
  logout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, userProfile, logout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Sync state with DOM on mount
  useLayoutEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setIsDarkMode(false);
    } else {
        html.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setIsDarkMode(true);
    }
  };

  // Define Menu Items based on Role
  const getNavItems = () => {
    // Standard Business Features
    const businessItems = [
      { id: 'dashboard', label: 'Home', icon: Home },
      { id: 'daily', label: 'Daily Transcation', icon: Calendar },
      { id: 'upload', label: 'Scan', icon: PlusCircle }, 
      { id: 'invoice', label: 'Invoice', icon: FileText },
      { id: 'reports', label: 'Reports', icon: PieChart },
    ];

    if (userProfile.role === UserRole.ADMIN) {
      return [
        { id: 'admin_dashboard', label: 'Registry', icon: ShieldCheck },
        { id: 'admin_users', label: 'Users', icon: Users },
      ];
    }

    if (userProfile.role === UserRole.STAFF) {
      return [
        { id: 'upload', label: 'Scan', icon: PlusCircle },
        { id: 'invoice', label: 'Invoice', icon: FileText },
        { id: 'daily', label: 'History', icon: Calendar },
      ];
    }

    const items = [...businessItems];

    if (userProfile.role === UserRole.OWNER) {
      items.push({ id: 'users', label: 'Staff', icon: Users });
      items.push({ id: 'profile', label: 'Settings', icon: Settings });
    }

    return items;
  };

  const navItems = getNavItems();

  // Mobile Bottom Nav Items (Subset for cleaner UI)
  const bottomNavItems = userProfile.role === UserRole.ADMIN 
    ? navItems.slice(0, 4)
    : [
        { id: 'dashboard', icon: Home, label: 'Home' },
        { id: 'daily', icon: Calendar, label: 'History' },
        { id: 'upload', icon: PlusCircle, label: 'Scan', isFab: true },
        { id: 'invoice', icon: FileText, label: 'Invoice' },
        { id: 'menu', icon: MoreHorizontal, label: 'More' }
      ];

  const handleMobileNavClick = (id: string) => {
    if (id === 'menu') {
      setIsMobileMenuOpen(true);
    } else {
      setView(id);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      {/* Sidebar - Desktop Only */}
      <aside className={`hidden md:flex flex-col w-64 ${userProfile.role === UserRole.ADMIN ? 'bg-slate-950' : 'bg-slate-900'} text-white shadow-xl`}>
        <div className="p-6 border-b border-slate-700 flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${userProfile.role === UserRole.ADMIN ? 'bg-red-600' : 'bg-blue-600'}`}>
                {userProfile.role === UserRole.ADMIN ? <ShieldCheck size={24} /> : <Building2 size={24} />}
            </div>
            <div>
                <h1 className="text-xl font-bold tracking-tight">MeroHisab</h1>
                <p className="text-xs text-slate-400">
                  {userProfile.role === UserRole.ADMIN ? 'Admin Console' : 'Nepal MSME Tool'}
                </p>
            </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto no-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                currentView === item.id 
                  ? 'bg-opacity-20 bg-white text-white shadow-md border-l-4 border-blue-400' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={20} className="mr-3" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 space-y-4">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-800 rounded-lg select-none">
                <span className="text-xs text-slate-400 font-medium">Appearance</span>
                <button 
                    onClick={toggleTheme}
                    className="p-1.5 rounded-full bg-slate-700 text-yellow-400 hover:bg-slate-600 transition"
                >
                    {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
            </div>
            <div className="px-4">
                <p className="text-sm font-semibold text-white truncate">{userProfile.name}</p>
                <div className="flex items-center mt-1">
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    userProfile.role === UserRole.ADMIN ? 'bg-red-500' : 'bg-blue-500'
                  }`}>
                    {userProfile.role}
                  </span>
                </div>
            </div>
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Top Header */}
        <header className="md:hidden bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 px-4 py-3 flex justify-between items-center z-20 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center space-x-2">
                 <div className={`p-1.5 rounded text-white ${userProfile.role === UserRole.ADMIN ? 'bg-red-600' : 'bg-blue-600'}`}>
                    {userProfile.role === UserRole.ADMIN ? <ShieldCheck size={18} /> : <Building2 size={18} />}
                </div>
                <span className="font-bold text-lg text-gray-800 dark:text-white tracking-tight">MeroHisab</span>
            </div>
            <button 
                onClick={toggleTheme}
                className="text-gray-500 dark:text-gray-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200 pb-24 md:pb-8">
            <div className="max-w-6xl mx-auto">
                {children}
            </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)] z-30">
            <div className="flex justify-around items-end h-16">
                {bottomNavItems.map((item) => {
                    const isActive = currentView === item.id;
                    if (item.isFab) {
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleMobileNavClick(item.id)}
                                className="relative -top-5 bg-blue-600 text-white p-4 rounded-full shadow-lg shadow-blue-600/30 active:scale-95 transition-transform"
                            >
                                <item.icon size={28} />
                            </button>
                        )
                    }
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleMobileNavClick(item.id)}
                            className={`flex flex-col items-center justify-center w-full h-full py-2 space-y-1 active:scale-95 transition-transform ${
                                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
                            }`}
                        >
                            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    )
                })}
            </div>
        </div>

        {/* Mobile Full Screen Menu Overlay (The "More" tab) */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-gray-900/95 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-10 duration-200 flex flex-col">
             <div className="flex justify-end p-6 pt-12">
                 <button onClick={() => setIsMobileMenuOpen(false)} className="bg-white/10 p-2 rounded-full text-white">
                     <X size={24} />
                 </button>
             </div>
             
             <div className="flex-1 px-6 space-y-6 overflow-y-auto">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                        {userProfile.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{userProfile.name}</h2>
                        <p className="text-gray-400 text-sm">{userProfile.role}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setView(item.id);
                                setIsMobileMenuOpen(false);
                            }}
                            className={`flex flex-col items-center justify-center p-4 rounded-xl space-y-2 transition-colors ${
                                currentView === item.id 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-800 text-gray-300 active:bg-gray-700'
                            }`}
                        >
                            <item.icon size={24} />
                            <span className="text-sm font-medium">{item.label}</span>
                        </button>
                    ))}
                </div>

                <button
                    onClick={logout}
                    className="w-full flex items-center justify-center p-4 bg-red-500/10 text-red-500 rounded-xl font-bold mt-4 active:bg-red-500/20"
                >
                    <LogOut size={20} className="mr-2" /> Sign Out
                </button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Layout;
