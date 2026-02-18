import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType } from '../types';
import { 
  Calendar, 
  Download, 
  FileText, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  AlertTriangle, 
  Loader2, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';

// Declare html2pdf for TypeScript
declare var html2pdf: any;

interface DailyTransactionsProps {
  transactions: Transaction[];
}

const DailyTransactions: React.FC<DailyTransactionsProps> = ({ transactions }) => {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAll, setShowAll] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // -- Pagination State --
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Filter transactions (Full list for the selected period)
  const displayedTransactions = transactions.filter(t => {
      if (showAll) return true; 
      if (!t.date) return false;
      const transactionDate = t.date.includes('T') ? t.date.split('T')[0] : t.date;
      return transactionDate === selectedDate;
  });

  // Sort by date desc
  displayedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, showAll]);

  // -- Pagination Logic --
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = displayedTransactions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(displayedTransactions.length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  // Calculate Totals (Based on ALL displayed transactions, not just current page)
  const totalSales = displayedTransactions
    .filter(t => t.type === TransactionType.SALES)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = displayedTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalSales - totalExpenses;

  // --- CSV Export Function ---
  const handleDownloadCSV = () => {
    const headers = ["Date", "Type", "Party Name", "Category", "Bill Number", "Amount"];
    
    // Export ALL transactions in current filter, ignoring pagination
    const rows = displayedTransactions.map(t => {
        const date = t.date ? t.date.split('T')[0] : '';
        const amount = t.type === TransactionType.EXPENSE ? -t.amount : t.amount; 
        const partyName = `"${t.partyName || 'Unknown'}"`; 
        
        return [
            date,
            t.type,
            partyName,
            t.category,
            t.billNumber || '',
            amount
        ].join(",");
    });

    const totalRow = ["Grand Total", "", "", "", "", netBalance].join(",");
    const csvContent = [headers.join(","), ...rows, totalRow].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `MeroHisab_Transactions_${showAll ? 'All' : selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    // Note: This will only print the current visible page of the table. 
    // For full PDF reports, backend generation or a temporary 'view all' render is recommended.
    setIsGeneratingPdf(true);
    const element = document.getElementById('transaction-list-printable');
    
    if (!element) {
        setIsGeneratingPdf(false);
        return;
    }

    const opt = {
      margin: 0.5,
      filename: `MeroHisab_Transactions_${showAll ? 'All' : selectedDate}_Page${currentPage}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    setTimeout(() => {
        try {
             html2pdf().set(opt).from(element).save().then(() => {
                 setIsGeneratingPdf(false);
             });
        } catch (e) {
            console.error("PDF Gen Error:", e);
            alert("Failed to generate PDF");
            setIsGeneratingPdf(false);
        }
    }, 100);
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header & Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transactions</h2>
            <div className="flex space-x-2">
                 <button 
                    onClick={() => setShowAll(!showAll)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${showAll ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                 >
                    {showAll ? 'All Time' : 'Daily'}
                 </button>

                 <button 
                    onClick={handleDownloadCSV}
                    title="Export CSV (Full List)"
                    className="p-2 bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-full hover:bg-green-100 transition-colors"
                 >
                    <FileText size={18} />
                 </button>

                 <button 
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    title="Export PDF (Current View)"
                    className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                 >
                    {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                 </button>
            </div>
        </div>

        {!showAll && (
            <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-2 border border-gray-200 dark:border-gray-700 transition-all">
                <Calendar size={20} className="text-gray-500 ml-2" />
                <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent border-none text-gray-800 dark:text-white text-sm focus:ring-0 w-full"
                />
            </div>
        )}

        {/* Mini Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
                <span className="text-[10px] text-green-600 uppercase font-bold block">In</span>
                <span className="text-sm font-bold text-green-700 dark:text-green-400">{totalSales > 1000 ? `${(totalSales/1000).toFixed(1)}k` : totalSales}</span>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
                <span className="text-[10px] text-red-600 uppercase font-bold block">Out</span>
                <span className="text-sm font-bold text-red-700 dark:text-red-400">{totalExpenses > 1000 ? `${(totalExpenses/1000).toFixed(1)}k` : totalExpenses}</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
                <span className="text-[10px] text-blue-600 uppercase font-bold block">Net</span>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400">{netBalance > 1000 ? `${(netBalance/1000).toFixed(1)}k` : netBalance}</span>
            </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto pb-4" id="transaction-list-printable">
         {displayedTransactions.length > 0 ? (
             <div className="space-y-3">
                 {/* Mobile Card View */}
                 <div className="md:hidden space-y-3">
                     {currentItems.map((t) => (
                         <div key={t.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between active:scale-[0.99] transition-transform break-inside-avoid">
                             <div className="flex items-center space-x-3">
                                 <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                                     t.type === TransactionType.SALES 
                                     ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' 
                                     : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                 }`}>
                                     {t.type === TransactionType.SALES ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                 </div>
                                 <div>
                                     <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{t.partyName || 'Unknown Party'}</h4>
                                     <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        <span className="mr-2">{t.category}</span>
                                        {showAll && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1 rounded">{t.date.split('T')[0]}</span>}
                                     </div>
                                 </div>
                             </div>
                             <div className="text-right">
                                 <span className={`block font-bold text-sm ${
                                     t.type === TransactionType.SALES 
                                     ? 'text-green-600 dark:text-green-400' 
                                     : 'text-red-600 dark:text-red-400'
                                 }`}>
                                     {t.type === TransactionType.EXPENSE ? '-' : '+'}
                                     {t.amount.toLocaleString()}
                                 </span>
                                 <span className="text-[10px] text-gray-400 font-mono">#{t.billNumber || '---'}</span>
                             </div>
                         </div>
                     ))}
                 </div>

                 {/* Desktop Table View */}
                 <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Party</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {currentItems.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {t.date.split('T')[0]}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{t.partyName}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">#{t.billNumber}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {t.category}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${
                                         t.type === TransactionType.SALES 
                                         ? 'text-green-600 dark:text-green-400' 
                                         : 'text-red-600 dark:text-red-400'
                                    }`}>
                                        {t.type === TransactionType.EXPENSE ? '-' : ''}
                                        {t.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        {t.isComplianceIssue && <AlertTriangle size={16} className="text-red-500 inline" />}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {/* Desktop Grand Total Footer (Shows Total of FILTERED PERIOD, not just page) */}
                        <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                            <tr>
                                <td colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white uppercase">
                                    Total ({showAll ? 'All Time' : 'Daily'})
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${
                                     netBalance >= 0 
                                     ? 'text-green-600 dark:text-green-400' 
                                     : 'text-red-600 dark:text-red-400'
                                }`}>
                                    {netBalance.toLocaleString()}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                 </div>
             </div>
         ) : (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                 <Wallet size={48} className="mb-4 opacity-20" />
                 <p className="text-sm">No transactions found</p>
             </div>
         )}
      </div>

      {/* Pagination Controls */}
      {displayedTransactions.length > itemsPerPage && (
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mt-auto">
            <button 
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition-all"
            >
                <ChevronLeft size={20} />
            </button>
            
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Page <span className="text-blue-600 dark:text-blue-400">{currentPage}</span> of {totalPages}
            </span>

            <button 
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-600 dark:text-gray-300 transition-all"
            >
                <ChevronRight size={20} />
            </button>
        </div>
      )}
    </div>
  );
};

export default DailyTransactions;