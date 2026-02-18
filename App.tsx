import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import BillUpload from './components/BillUpload';
import InvoiceGenerator from './components/InvoiceGenerator';
import Reports from './components/Reports';
import UserManagement from './components/UserManagement';
import AdminDashboard from './components/AdminDashboard';
import AdminUsers from './components/AdminUsers'; // Import new component
import ProfileSettings from './components/ProfileSettings';
import DailyTransactions from './components/DailyTransactions';
import { BusinessProfile, Transaction, TransactionType, ExpenseCategory, UserRole, User } from './types';
import { Loader2 } from 'lucide-react';
import { api } from './services/api';

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

  // Fetch Transactions from API
  const fetchTransactions = async (authToken: string) => {
      try {
          const data = await api.getTransactions(authToken);
          setTransactions(data);
      } catch (e) {
          console.error("Error fetching transactions:", e);
      }
  };

  // Fetch Staff from API
  const fetchStaff = async (authToken: string) => {
    try {
        const data = await api.getStaff(authToken);
        setStaffList(data);
    } catch (e) {
        console.error("Error fetching staff:", e);
    }
  };

  // Restore session on load
  useEffect(() => {
    const restoreSession = async () => {
        const storedToken = localStorage.getItem('token');
        const storedProfile = localStorage.getItem('userProfile');

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
                
                // Fetch Data only if NOT Admin (Admins use specific endpoints in their components)
                if (parsedProfile.role !== UserRole.ADMIN) {
                    fetchTransactions(storedToken);
                    if (parsedProfile.role === UserRole.OWNER) {
                        fetchStaff(storedToken);
                    }
                }

            } catch (e) {
                console.error("Failed to restore session", e);
                localStorage.clear();
            }
        }
        setIsCheckingSession(false);
    };

    restoreSession();
  }, []);

  const handleLogin = (profile: BusinessProfile, authToken: string) => {
    setUserProfile(profile);
    setToken(authToken);
    setIsAuthenticated(true);
    
    if (profile.role === UserRole.ADMIN) {
      setCurrentView('admin_dashboard');
      // Admin doesn't need to fetch standard transactions/staff list
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userProfile');
    setIsAuthenticated(false);
    setUserProfile(null);
    setToken('');
    setTransactions([]);
    setStaffList([]);
  };

  const handleProfileUpdate = (updatedProfile: BusinessProfile) => {
    setUserProfile(updatedProfile);
  };

  const addTransaction = async (t: Transaction) => {
    try {
        const savedTransaction = await api.createTransaction(t, token);
        setTransactions(prev => [savedTransaction, ...prev]);
        
        if (userProfile?.role === UserRole.STAFF) {
            alert("Transaction Saved!");
        } else {
             alert("Transaction Saved!");
        }

    } catch (e: any) {
        if (e.status === 403 || (e.message && e.message.includes('Invalid token'))) {
            alert("Your session has expired or is invalid. Please login again.");
            handleLogout();
            return;
        }
        alert(`Failed to save transaction: ${e.message}`);
        console.error(e);
    }
  };

  const deleteTransaction = async (id: string) => {
      try {
          await api.deleteTransaction(id, token);
          setTransactions(prev => prev.filter(t => t.id !== id));
      } catch (e: any) {
          alert("Failed to delete transaction: " + e.message);
      }
  };

  const handleAddStaff = async (userData: any) => {
      try {
          await api.createStaff(userData, token);
          fetchStaff(token);
      } catch (error) {
          throw error;
      }
  };

  const handleRemoveStaff = async (id: string) => {
      try {
        await api.deleteStaff(id, token);
        fetchStaff(token);
      } catch (error) {
        console.error(error);
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