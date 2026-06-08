import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import BillUpload from './components/BillUpload';
import InvoiceGenerator from './components/InvoiceGenerator';
import Reports from './components/Reports';
import CustomConfirm from './components/CustomConfirm';
import UserManagement from './components/UserManagement';
import AdminDashboard from './components/AdminDashboard';
import AdminUsers from './components/AdminUsers';
import AdminAuditLogs from './components/AdminAuditLogs';
import ProfileSettings from './components/ProfileSettings';
import DailyTransactions from './components/DailyTransactions';
// import PredictiveAnalysis from './components/PredictiveAnalysis';
import { BusinessProfile, Transaction, UserRole, User } from './types';
import { Loader2 } from 'lucide-react';
import { api } from './services/api';
import { Preferences } from '@capacitor/preferences';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [sessionExpiredAlert, setSessionExpiredAlert] = useState(false);
  const [genericAlert, setGenericAlert] = useState<{isOpen: boolean, message: string, title?: string, type?: 'danger'|'warning'|'info'}>({ isOpen: false, message: '' });
  const [userProfile, setUserProfile] = useState<BusinessProfile | null>(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [token, setToken] = useState<string>('');

  // Transactions & Staff State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);

  // --- LOGOUT LOGIC ---
  const handleLogout = useCallback(async () => {
    console.log("Logging out & clearing session...");
    await Preferences.remove({ key: 'token' });
    await Preferences.remove({ key: 'userProfile' });

    setIsAuthenticated(false);
    setUserProfile(null);
    setToken('');
    setTransactions([]);
    setStaffList([]);
    setCurrentView('dashboard');
    Preferences.remove({ key: 'lastView' });
    // NOTE: We intentionally do NOT clear biometric credentials here.
    // The user can log back in with fingerprint on the next launch.
  }, []);

  // --- GLOBAL AUTH EXPIRATION LISTENER ---
  useEffect(() => {
    const handleAuthExpire = () => {
      handleLogout();
      setSessionExpiredAlert(true);
    };
    window.addEventListener('auth-expired', handleAuthExpire);
    return () => window.removeEventListener('auth-expired', handleAuthExpire);
  }, [handleLogout]);

  // --- DATA FETCHING ---
  const fetchTransactions = useCallback(async (authToken: string) => {
    try {
      const data = await api.getTransactions(authToken);
      setTransactions(data);
    } catch (e: any) {
      console.error("Error fetching transactions:", e);
    }
  }, []);

  const fetchStaff = useCallback(async (authToken: string) => {
    try {
      const data = await api.getStaff(authToken);
      setStaffList(data);
    } catch (e: any) {
      console.error("Error fetching staff:", e);
    }
  }, []);

  // --- MANUAL REFRESH (Triggered by Dashboard Button) ---
  const handleManualRefresh = async () => {
    if (token && userProfile?.role !== UserRole.ADMIN) {
      await fetchTransactions(token);
      if (userProfile?.role === UserRole.OWNER) {
        await fetchStaff(token);
      }
    }
  };

  // --- LIFECYCLE HOOKS ---

  // 1. Restore session on load
  useEffect(() => {
    const restoreSession = async () => {
      try {
        let finalToken = null;
        let finalProfileString = null;

        const { value: storedToken } = await Preferences.get({ key: 'token' });
        const { value: storedProfile } = await Preferences.get({ key: 'userProfile' });
        finalToken = storedToken;
        finalProfileString = storedProfile;

        if (finalToken && finalProfileString) {
          let latestProfile = JSON.parse(finalProfileString);
          
          // Verify with backend to get fresh data and catch deleted/invalid users
          try {
             const freshData = await api.getProfile(finalToken);
             latestProfile = freshData.profile;
             await Preferences.set({ key: 'userProfile', value: JSON.stringify(latestProfile) });
          } catch (profileErr) {
             console.error("Session verification failed on mount:", profileErr);
             handleLogout();
             return;
          }

          setUserProfile(latestProfile);
          setToken(finalToken);
          setIsAuthenticated(true);

          const { value: storedView } = await Preferences.get({ key: 'lastView' });
          if (storedView) {
            setCurrentView(storedView);
          } else if (latestProfile.role === UserRole.ADMIN) {
            setCurrentView('admin_dashboard');
          } else if (latestProfile.role === UserRole.STAFF) {
            setCurrentView('upload');
          } else {
            setCurrentView('dashboard');
          }

          if (latestProfile.role !== UserRole.ADMIN) {
            fetchTransactions(finalToken);
            if (latestProfile.role === UserRole.OWNER) {
              fetchStaff(finalToken);
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore session", e);
        handleLogout();
      } finally {
        setIsCheckingSession(false);
      }
    };

    restoreSession();
  }, [fetchTransactions, fetchStaff, handleLogout]);

  // --- EVENT HANDLERS ---
  const handleSetView = useCallback((view: string) => {
    setCurrentView(view);
    Preferences.set({ key: 'lastView', value: view });
  }, []);

  const handleLogin = (profile: BusinessProfile, authToken: string) => {
    setUserProfile(profile);
    setToken(authToken);
    setIsAuthenticated(true);

    let defaultView = 'dashboard';
    if (profile.role === UserRole.ADMIN) {
      defaultView = 'admin_dashboard';
    } else if (profile.role === UserRole.STAFF) {
      defaultView = 'upload';
    }
    handleSetView(defaultView);

    if (profile.role !== UserRole.ADMIN) {
      fetchTransactions(authToken);
      if (profile.role === UserRole.OWNER) fetchStaff(authToken);
    }
  };

  const handleProfileUpdate = (updatedProfile: BusinessProfile) => {
    setUserProfile(updatedProfile);
  };

  const addTransaction = async (t: Transaction) => {
    try {
      const savedTransaction = await api.createTransaction(t, token);
      setTransactions(prev => [savedTransaction, ...prev]);
    } catch (e: any) {
      setGenericAlert({ isOpen: true, title: "Failed to Save", message: e.message || 'Unknown error', type: 'danger' });
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      await api.deleteTransaction(id, token);
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      setGenericAlert({ isOpen: true, title: "Failed to Delete", message: e.message || 'Unknown error', type: 'danger' });
    }
  };

  const updateTransaction = async (data: any) => {
    try {
      const updated = await api.updateTransaction(data.id, data, token);
      setTransactions(prev => prev.map(t => t.id === data.id ? { ...t, ...updated } : t));
    } catch (e: any) {
      setGenericAlert({ isOpen: true, title: "Failed to Update", message: e.message || 'Unknown error', type: 'danger' });
    }
  };

  const handleAddStaff = async (userData: any) => {
    await api.createStaff(userData, token);
    fetchStaff(token);
  };

  const handleRemoveStaff = async (id: string) => {
    await api.deleteStaff(id, token);
    fetchStaff(token);
  };

  // --- RENDER LOGIC ---
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading your session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !userProfile) {
    return (
      <>
        <Auth onLogin={handleLogin} />
        <CustomConfirm
          isOpen={sessionExpiredAlert}
          title="Session Expired"
          message="Your session has expired or your account was disconnected. Please log in again."
          type="warning"
          confirmText="Okay"
          onConfirm={() => setSessionExpiredAlert(false)}
          onCancel={() => setSessionExpiredAlert(false)}
        />
      </>
    );
  }

  const renderView = () => {
    if (currentView === 'admin_dashboard') return <AdminDashboard token={token} />;
    if (currentView === 'admin_users') return <AdminUsers token={token} />;
    if (currentView === 'admin_logs') return <AdminAuditLogs token={token} />;

    switch (currentView) {
      case 'dashboard':
        return userProfile.role === UserRole.STAFF
          ? <BillUpload onAddTransaction={addTransaction} onCancel={() => { }} transactions={transactions} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} onReload={() => fetchTransactions(token)} />
          : <Dashboard transactions={transactions} onQuickAction={handleSetView} onRefresh={handleManualRefresh} />;
      case 'upload':
        return <BillUpload onAddTransaction={addTransaction} onCancel={() => handleSetView(userProfile.role === UserRole.STAFF ? 'invoice' : 'dashboard')} transactions={transactions} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} onReload={() => fetchTransactions(token)} />;
      case 'invoice':
        return <InvoiceGenerator businessProfile={userProfile} onSaveInvoice={addTransaction} transactions={transactions} />;
      case 'daily':
        return <DailyTransactions transactions={transactions} business={userProfile} />;
      case 'reports':
        return userProfile.role === UserRole.STAFF
          ? <InvoiceGenerator businessProfile={userProfile} onSaveInvoice={addTransaction} transactions={transactions} />
          : <Reports transactions={transactions} />;
      case 'users':
        return userProfile.role !== UserRole.OWNER
          ? <Dashboard transactions={transactions} onQuickAction={handleSetView} onRefresh={handleManualRefresh} />
          : <UserManagement staffList={staffList} onAddStaff={handleAddStaff} onRemoveStaff={handleRemoveStaff} />;
      case 'profile':
        return userProfile.role !== UserRole.OWNER
          ? <Dashboard transactions={transactions} onQuickAction={handleSetView} onRefresh={handleManualRefresh} />
          : <ProfileSettings userProfile={userProfile} token={token} onUpdate={handleProfileUpdate} />;
      default:
        return userProfile.role === UserRole.STAFF
          ? <BillUpload onAddTransaction={addTransaction} onCancel={() => { }} transactions={transactions} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} onReload={() => fetchTransactions(token)} />
          : <Dashboard transactions={transactions} onQuickAction={handleSetView} onRefresh={handleManualRefresh} />;
    }
  };

  return (
    <>
      <Layout currentView={currentView} setView={handleSetView} userProfile={userProfile} logout={handleLogout}>
        {renderView()}
      </Layout>
      <CustomConfirm
        isOpen={sessionExpiredAlert}
        title="Session Expired"
        message="Your session has expired or your account was disconnected. Please log in again."
        type="warning"
        confirmText="Okay"
        onConfirm={() => setSessionExpiredAlert(false)}
        onCancel={() => setSessionExpiredAlert(false)}
      />
      <CustomConfirm
        isOpen={genericAlert.isOpen}
        title={genericAlert.title || "Notice"}
        message={genericAlert.message}
        type={genericAlert.type || "info"}
        confirmText="Okay"
        onConfirm={() => setGenericAlert({ ...genericAlert, isOpen: false })}
        onCancel={() => setGenericAlert({ ...genericAlert, isOpen: false })}
      />
    </>
  );
};

export default App;