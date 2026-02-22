import React, { useState } from 'react';
import { Transaction, TransactionType } from '../types';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Wallet, FileText, ChevronRight, X, Camera, RefreshCw
} from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  onQuickAction: (action: string) => void;
  onRefresh?: () => Promise<void>; // Add this prop
}

const Dashboard: React.FC<DashboardProps> = ({ transactions, onQuickAction, onRefresh }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calls the refresh function from App.tsx and waits for it to finish
  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculations
  const totalSales = transactions
    .filter(t => t.type === TransactionType.SALES)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const currentCashBalance = 50000 + totalSales - totalExpenses;
  const complianceIssues = transactions.filter(t => t.isComplianceIssue);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Overview</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Fiscal Year: 2080/81</p>
        </div>
        <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
            className="p-2.5 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95 disabled:opacity-50 flex items-center justify-center"
        >
            <RefreshCw size={20} className={`text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Stats Card */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <Wallet size={120} />
          </div>
          <div className="relative z-10">
              <p className="text-blue-100 text-sm font-medium mb-1">Net Balance</p>
              <h3 className="text-4xl font-bold mb-6">NPR {currentCashBalance.toLocaleString()}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <div className="flex items-center text-green-300 mb-1">
                          <TrendingUp size={16} className="mr-1"/> <span className="text-xs font-bold uppercase">Income</span>
                      </div>
                      <p className="text-lg font-bold">+{totalSales.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                      <div className="flex items-center text-red-300 mb-1">
                          <TrendingDown size={16} className="mr-1"/> <span className="text-xs font-bold uppercase">Expense</span>
                      </div>
                      <p className="text-lg font-bold">-{totalExpenses.toLocaleString()}</p>
                  </div>
              </div>
          </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => onQuickAction('upload')} 
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
          >
              <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3">
                  <Camera size={28} />
              </div>
              <span className="font-bold text-gray-800 dark:text-white">Scan Bill</span>
          </button>

          <button 
            onClick={() => onQuickAction('invoice')} 
            className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition-transform"
          >
              <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full mb-3">
                  <FileText size={28} />
              </div>
              <span className="font-bold text-gray-800 dark:text-white">Create Invoice</span>
          </button>
      </div>

      {/* Compliance Alerts */}
      {complianceIssues.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-100 dark:border-red-900/50">
             <div className="flex items-center mb-3">
                <AlertTriangle className="text-red-600 dark:text-red-400 mr-2" size={24} />
                <h3 className="font-bold text-red-800 dark:text-red-300">Compliance Action Needed</h3>
             </div>
             <div className="space-y-3">
                {complianceIssues.slice(0, 3).map((issue) => (
                  <div key={issue.id} onClick={() => setSelectedTransaction(issue)} className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm flex justify-between items-center active:bg-gray-50 cursor-pointer">
                     <div className="flex-1">
                        <p className="text-xs font-bold text-red-600 dark:text-red-400">{issue.complianceMessage}</p>
                        <p className="text-xs text-gray-500 mt-1">{issue.date.split('T')[0]} • NPR {issue.amount.toLocaleString()}</p>
                     </div>
                     <ChevronRight size={16} className="text-gray-400" />
                  </div>
                ))}
             </div>
          </div>
      )}

      {/* Transaction Modal */}
      {selectedTransaction && (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setSelectedTransaction(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-3xl md:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in slide-in-from-bottom-10 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Transaction Details</h3>
                        <button onClick={() => setSelectedTransaction(null)} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition">
                            <X size={20} className="text-gray-600 dark:text-gray-300"/>
                        </button>
                    </div>

                    <div className="text-center mb-8">
                        <span className={`text-3xl font-bold ${selectedTransaction.type === TransactionType.SALES ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>
                            NPR {selectedTransaction.amount.toLocaleString()}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">{selectedTransaction.category}</p>
                    </div>

                    <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-700">
                         <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Date</span>
                            <span className="text-sm font-medium dark:text-gray-200">{selectedTransaction.date.split('T')[0]}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Party</span>
                            <span className="text-sm font-medium dark:text-gray-200">{selectedTransaction.partyName}</span>
                         </div>
                         {selectedTransaction.partyPan && (
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">PAN</span>
                                <span className="text-sm font-medium dark:text-gray-200">{selectedTransaction.partyPan}</span>
                            </div>
                         )}
                         <div className="flex justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Bill No</span>
                            <span className="text-sm font-medium dark:text-gray-200 font-mono">{selectedTransaction.billNumber || 'N/A'}</span>
                         </div>
                    </div>

                    {selectedTransaction.imageUrl && (
                        <div className="mt-6">
                            <p className="text-sm font-semibold mb-2 dark:text-gray-300">Receipt Image</p>
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