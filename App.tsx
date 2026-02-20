
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import BillUpload from './components/BillUpload';
import InvoiceGenerator from './components/InvoiceGenerator';
import Reports from './components/Reports';
import UserManagement from './components/UserManagement';
import AdminDashboard from './components/AdminDashboard';
import AdminUsers from './components/AdminUsers';
import ProfileSettings from './components/ProfileSettings';
import DailyTransactions from './components/DailyTransactions';
import { BusinessProfile, Transaction, TransactionType, ExpenseCategory, UserRole, User } from './types';
import { Loader2 } from 'lucide-react';
import { api } from './services/api';
import { Preferences } from '@capacitor/preferences';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<BusinessProfile | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [token, setToken] = useState<string>('');
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  
  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Local State for Staff
  const [staffList, setStaffList] = useState<User[]>([]);

  // --- LOGOUT LOGIC ---
  // Defined early so it can be used by fetchers upon 401 error
const handleLogout = useCallback(async () => {
  console.log("Logging out...");
  await Preferences.remove({ key: 'token' });
  await Preferences.remove({ key: 'userProfile' });
  setIsAuthenticated(false);
  setUserProfile(null);
  setToken('');
  setTransactions([]);
  setStaffList([]);
}, []);

  // --- DATA FETCHING ---

  // Fetch Transactions from API
  const fetchTransactions = useCallback(async (authToken: string) => {
      try {
          const data = await api.getTransactions(authToken);
          setTransactions(data);
      } catch (e: any) {
          console.error("Error fetching transactions:", e);
          // Auto-Logout on Auth Failure
          if (e.status === 401 || e.status === 403) {
             handleLogout();
          }
      }
  }, [handleLogout]);

  // Fetch Staff from API
  const fetchStaff = useCallback(async (authToken: string) => {
    try {
        const data = await api.getStaff(authToken);
        setStaffList(data);
    } catch (e: any) {
        console.error("Error fetching staff:", e);
        if (e.status === 401 || e.status === 403) {
             handleLogout();
        }
    }
  }, [handleLogout]);

  // --- LIFECYCLE HOOKS ---

  // 1. Restore session on load
  useEffect(() => {
    const restoreSession = async () => {
const { value: storedToken } = await Preferences.get({ key: 'token' });
const { value: storedProfile } = await Preferences.get({ key: 'userProfile' });

        if (storedToken && storedProfile) {
            try {
                const parsedProfile = JSON.parse(storedProfile);
                setUserProfile(parsedProfile);
                setToken(storedToken);
                setIsAuthenticated(true);
                
                // Set initial view based on role
                if (parsedProfile.role === UserRole.ADMIN) {
                    setCurrentView('admin_dashboard');
                } else if (parsedProfile.role === UserRole.STAFF) {
                    setCurrentView('upload');
                } else {
                    setCurrentView('dashboard');
                }
                
                // Initial Data Fetch
                if (parsedProfile.role !== UserRole.ADMIN) {
                    fetchTransactions(storedToken);
                    if (parsedProfile.role === UserRole.OWNER) {
                        fetchStaff(storedToken);
                    }
                }

            } catch (e) {
                console.error("Failed to restore session", e);
                handleLogout(); // Clear invalid data
            }
        }
        setIsCheckingSession(false);
    };

    restoreSession();
  }, [fetchTransactions, fetchStaff, handleLogout]);

  // 2. Auto-Refresh Data on Window Focus (Mobile App Resume)
  useEffect(() => {
      const handleFocus = () => {
          if (isAuthenticated && token && userProfile?.role !== UserRole.ADMIN) {
              console.log("App resumed/focused. Refreshing data...");
              fetchTransactions(token);
              if (userProfile?.role === UserRole.OWNER) {
                  fetchStaff(token);
              }
          }
      };

      window.addEventListener('focus', handleFocus);
      // Optional: Add visibilitychange for broader browser support
      document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') handleFocus();
      });

      return () => {
          window.removeEventListener('focus', handleFocus);
          document.removeEventListener('visibilitychange', handleFocus);
      };
  }, [isAuthenticated, token, userProfile, fetchTransactions, fetchStaff]);

  const handleLogin = (profile: BusinessProfile, authToken: string) => {
    setUserProfile(profile);
    setToken(authToken);
    setIsAuthenticated(true);
    
    if (profile.role === UserRole.ADMIN) {
      setCurrentView('admin_dashboard');
    } else {
      if (profile.role === UserRole.STAFF) {
         setCurrentView('upload');
      } else {
         setCurrentView('dashboard');
      }
      // Fetch Data
      fetchTransactions(authToken);
      if (profile.role === UserRole.OWNER) {
          fetchStaff(authToken);
      }
    }
  };

  const handleProfileUpdate = (updatedProfile: BusinessProfile) => {
    setUserProfile(updatedProfile);
  };

  const addTransaction = async (t: Transaction) => {
    try {
        const savedTransaction = await api.createTransaction(t, token);
        setTransactions(prev => [savedTransaction, ...prev]);
        alert("Transaction Saved!");
    } catch (e: any) {
        if (e.status === 401 || e.status === 403 || (e.message && e.message.includes('Invalid token'))) {
            alert("Your session has expired. Please login again.");
            handleLogout();
            return;
        }
        alert(`Failed to save transaction: ${e.message}`);
    }
  };

  const deleteTransaction = async (id: string) => {
      try {
          await api.deleteTransaction(id, token);
          setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (e: any) {
          if (e.status === 401 || e.status === 403) {
               handleLogout();
               return;
          }
          alert("Failed to delete transaction: " + e.message);
      }
  };

  const handleAddStaff = async (userData: any) => {
      try {
          await api.createStaff(userData, token);
          fetchStaff(token);
      } catch (error: any) {
          if (error.status === 401 || error.status === 403) {
              handleLogout();
              return;
          }
          throw error;
      }
  };

  const handleRemoveStaff = async (id: string) => {
      try {
        await api.deleteStaff(id, token);
        fetchStaff(token);
      } catch (error: any) {
        if (error.status === 401 || error.status === 403) {
            handleLogout();
            return;
        }
        throw error;
      }
  };

  if (isCheckingSession) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">Loading session...</p>
            </div>
        </div>
    );
  }

  if (!isAuthenticated || !userProfile) {
    return <Auth onLogin={handleLogin} />;
  }

  const renderView = () => {
    // 1. Handle Admin-Specific Views
    if (currentView === 'admin_dashboard') {
        return <AdminDashboard token={token} />;
    }
    if (currentView === 'admin_users') {
        return <AdminUsers token={token} />;
    }

    // 2. Handle Standard Views (Accessible by Owner, Staff only)
    switch (currentView) {
      case 'dashboard':
        if (userProfile.role === UserRole.STAFF) return <BillUpload onAddTransaction={addTransaction} onCancel={() => {}} transactions={transactions} />;
        return <Dashboard transactions={transactions} onQuickAction={setCurrentView} />;
      case 'upload':
        return <BillUpload 
            onAddTransaction={addTransaction} 
            onCancel={() => {
                if (userProfile.role === UserRole.STAFF) {
                    setCurrentView('invoice');
                } else {
                    setCurrentView('dashboard');
                }
            }}
            transactions={transactions} 
        />;
      case 'invoice':
        return <InvoiceGenerator 
            businessProfile={userProfile} 
            onSaveInvoice={addTransaction} 
            transactions={transactions} 
        />;
      case 'daily':
        return <DailyTransactions 
            transactions={transactions} 
        />;
      case 'reports':
        if (userProfile.role === UserRole.STAFF) return <InvoiceGenerator businessProfile={userProfile} onSaveInvoice={addTransaction} transactions={transactions} />;
        return <Reports transactions={transactions} />;
      case 'users':
        if (userProfile.role !== UserRole.OWNER) return <Dashboard transactions={transactions} onQuickAction={setCurrentView} />;
        return <UserManagement staffList={staffList} onAddStaff={handleAddStaff} onRemoveStaff={handleRemoveStaff} />;
      case 'profile':
        if (userProfile.role !== UserRole.OWNER) return <Dashboard transactions={transactions} onQuickAction={setCurrentView} />;
        return <ProfileSettings userProfile={userProfile} token={token} onUpdate={handleProfileUpdate} />;
      default:
        // Default fallback
        if (userProfile.role === UserRole.STAFF) return <BillUpload onAddTransaction={addTransaction} onCancel={() => {}} transactions={transactions} />;
        return <Dashboard transactions={transactions} onQuickAction={setCurrentView} />;
    }
  };

  return (
    <Layout 
      currentView={currentView} 
      setView={setCurrentView} 
      userProfile={userProfile}
      logout={handleLogout}
    >
      {renderView()}
    </Layout>
  );
};

export default App;
