import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Wallet, FileText, ChevronRight, X, Camera, RefreshCw,
  ArrowUpRight, ArrowDownRight, Activity, Sparkles
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  onQuickAction: (action: string) => void;
  onRefresh?: () => Promise<void>;
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, onQuickAction, onRefresh }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalSales = transactions
    .filter(t => t.type === TransactionType.SALES)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const currentCashBalance = totalSales - totalExpenses;

  // Recent transactions (last 5)
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">Fiscal Year 2083/84</p>
        </div>
        <button 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2.5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={18} className={`text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-8 -mb-8" />
        <div className="absolute top-1/2 right-1/3 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-blue-200" />
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Net Balance</p>
          </div>
          <h3 className="text-3xl font-extrabold mb-5 tracking-tight">
            NPR {currentCashBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}
          </h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpRight size={14} className="text-emerald-300" />
                <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">Income</span>
              </div>
              <p className="text-lg font-bold">+{totalSales.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowDownRight size={14} className="text-red-300" />
                <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider">Expense</span>
              </div>
              <p className="text-lg font-bold">-{totalExpenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onQuickAction('upload')} 
          className="group flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.97] transition-all hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800"
        >
          <div className="p-3.5 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-600 dark:text-blue-400 rounded-2xl mb-2.5 group-hover:scale-105 transition-transform">
            <Camera size={24} />
          </div>
          <span className="font-bold text-sm text-gray-800 dark:text-white">Scan Bill</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Upload receipt</span>
        </button>

        <button 
          onClick={() => onQuickAction('invoice')} 
          className="group flex flex-col items-center justify-center p-5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.97] transition-all hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800"
        >
          <div className="p-3.5 bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/30 dark:to-purple-800/20 text-purple-600 dark:text-purple-400 rounded-2xl mb-2.5 group-hover:scale-105 transition-transform">
            <FileText size={24} />
          </div>
          <span className="font-bold text-sm text-gray-800 dark:text-white">Create Invoice</span>
          <span className="text-[10px] text-gray-400 mt-0.5">Sales billing</span>
        </button>
      </div>

      {/* Recent Transactions */}
      {recentTransactions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex justify-between items-center px-4 pt-4 pb-2">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Activity size={15} className="text-blue-500" />
              Recent Activity
            </h3>
            <button
              onClick={() => onQuickAction('daily')}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              View All →
            </button>
          </div>
          
          <div className="px-4 pb-4 space-y-1">
            {recentTransactions.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTransaction(t)}
                className="flex items-center justify-between py-2.5 border-b border-gray-50 dark:border-gray-700/50 last:border-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 -mx-1 px-1 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.type === TransactionType.SALES
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-500'
                  }`}>
                    {t.type === TransactionType.SALES ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{t.partyName || 'Unknown'}</p>
                      {t.type === TransactionType.EXPENSE && !t.partyPan && (
                        <span title="Missing PAN Number" className="flex shrink-0">
                          <AlertTriangle size={12} className="text-amber-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 truncate">{t.category} • {(t.createdAt || t.date).split('T')[0]}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ml-2 ${
                  t.type === TransactionType.SALES
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {t.type === TransactionType.SALES ? '+' : '-'}{t.amount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedTransaction(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              {/* Handle bar (mobile) */}
              <div className="md:hidden flex justify-center mb-4">
                <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Transaction Details</h3>
                <button onClick={() => setSelectedTransaction(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                  selectedTransaction.type === TransactionType.SALES
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {selectedTransaction.type === TransactionType.SALES ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {selectedTransaction.type}
                </div>
                <p className={`text-2xl font-extrabold ${selectedTransaction.type === TransactionType.SALES ? 'text-emerald-600' : 'text-gray-900 dark:text-white'}`}>
                  NPR {selectedTransaction.amount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-1">{selectedTransaction.category}</p>
              </div>

              <div className="space-y-3 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Date</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{selectedTransaction.date.split('T')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Party</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{selectedTransaction.partyName}</span>
                </div>
                {selectedTransaction.partyPan && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-400">PAN</span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-200 font-mono">{selectedTransaction.partyPan}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-gray-400">Bill No</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200 font-mono">{selectedTransaction.billNumber || 'N/A'}</span>
                </div>
              </div>

              {selectedTransaction.imageUrl && (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Receipt Image</p>
                  <img src={selectedTransaction.imageUrl} alt="Receipt" className="w-full h-48 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;