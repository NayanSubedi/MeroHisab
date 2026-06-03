import React, { useState, useEffect } from 'react';
import { Transaction, TransactionType, BusinessProfile } from '../types';
import { InvoicePreviewModal } from './InvoiceGenerator';
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
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  X // Used for closing modals
} from 'lucide-react';

declare var html2pdf: any;

interface DailyTransactionsProps {
  transactions: Transaction[];
  business: BusinessProfile | null;
}

const DailyTransactions: React.FC<DailyTransactionsProps> = ({ transactions, business }) => {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showAll, setShowAll] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const displayedTransactions = transactions.filter(t => {
    if (showAll) return true;
    const baseDate = t.createdAt || t.date;
    if (!baseDate) return false;
    const transactionDate = baseDate.includes('T') ? baseDate.split('T')[0] : baseDate;
    return transactionDate === selectedDate;
  });

  displayedTransactions.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());

  useEffect(() => { setCurrentPage(1); }, [selectedDate, showAll]);

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

  const totalSales = displayedTransactions
    .filter(t => t.type === TransactionType.SALES)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = displayedTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalSales - totalExpenses;

  const fmtShort = (n: number) => {
    if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(1)}L`;
    if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const handleDownloadCSV = () => {
    const headers = ["Date", "Type", "Party Name", "Category", "Bill Number", "Amount"];
    const rows = displayedTransactions.map(t => {
      const baseDate = t.createdAt || t.date;
      const date = baseDate ? baseDate.split('T')[0] : '';
      const amount = t.type === TransactionType.EXPENSE ? -t.amount : t.amount;
      const partyName = `"${t.partyName || 'Unknown'}"`;
      return [date, t.type, partyName, t.category, t.billNumber || '', amount].join(",");
    });
    const totalRow = ["Grand Total", "", "", "", "", netBalance].join(",");
    const csvContent = [headers.join(","), ...rows, totalRow].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Dainikhisab_Transactions_${showAll ? 'All' : selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    const element = document.getElementById('transaction-list-printable');
    if (!element) { setIsGeneratingPdf(false); return; }
    const opt = {
      margin: 0.5,
      filename: `Dainikhisab_Transactions_${showAll ? 'All' : selectedDate}_Page${currentPage}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    setTimeout(() => {
      try {
        html2pdf().set(opt).from(element).save().then(() => { setIsGeneratingPdf(false); });
      } catch (e) {
        console.error("PDF Gen Error:", e);
        alert("Failed to generate PDF");
        setIsGeneratingPdf(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-4 h-full flex flex-col pb-20 md:pb-0">

      {/* ═══════ HEADER ═══════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Top bar */}
        <div className="px-4 pt-4 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Calendar size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Transactions</h2>
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => setShowAll(!showAll)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                showAll
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
              }`}
            >
              {showAll ? '✓ All Time' : 'Daily'}
            </button>
            <button 
              onClick={handleDownloadCSV}
              title="Export CSV"
              className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <FileText size={16} />
            </button>
            <button 
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              title="Export PDF"
              className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            </button>
          </div>
        </div>

        {/* Date picker */}
        {!showAll && (
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 rounded-xl p-2.5 border border-gray-100 dark:border-gray-700">
              <Calendar size={16} className="text-gray-400 ml-1" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-gray-800 dark:text-white text-sm focus:ring-0 focus:outline-none w-full font-medium"
              />
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 border-t border-gray-100 dark:border-gray-700">
          <div className="p-3 text-center border-r border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <ArrowUpRight size={10} className="text-emerald-500" />
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-bold tracking-wider">Income</span>
            </div>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{fmtShort(totalSales)}</span>
          </div>
          <div className="p-3 text-center border-r border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <ArrowDownRight size={10} className="text-red-500" />
              <span className="text-[9px] text-red-500 uppercase font-bold tracking-wider">Expense</span>
            </div>
            <span className="text-sm font-extrabold text-red-500 dark:text-red-400">{fmtShort(totalExpenses)}</span>
          </div>
          <div className="p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Wallet size={10} className={netBalance >= 0 ? 'text-blue-500' : 'text-orange-500'} />
              <span className={`text-[9px] uppercase font-bold tracking-wider ${netBalance >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>Net</span>
            </div>
            <span className={`text-sm font-extrabold ${netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}`}>{fmtShort(netBalance)}</span>
          </div>
        </div>
      </div>

      {/* ═══════ TRANSACTION LIST ═══════ */}
      <div className="flex-1 overflow-y-auto" id="transaction-list-printable">
        {displayedTransactions.length > 0 ? (
          <div className="space-y-2">

            {/* Mobile Card View */}
            <div className="md:hidden space-y-2">
              {currentItems.map((t) => (
                <div key={t.id} className="bg-white dark:bg-gray-800 p-3.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-3 active:scale-[0.99] transition-transform">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.type === TransactionType.SALES 
                      ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                    {t.type === TransactionType.SALES 
                      ? <ArrowUpRight size={18} className="text-emerald-500" /> 
                      : <ArrowDownRight size={18} className="text-red-500" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 mr-2">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                          {t.partyName || 'Unknown Party'}
                        </h4>
                        {t.type === TransactionType.EXPENSE && !t.partyPan && (
                          <span title="Missing PAN Number" className="flex shrink-0">
                            <AlertTriangle size={12} className="text-amber-500" />
                          </span>
                        )}
                      </div>
                      <span className={`text-sm font-extrabold flex-shrink-0 ${
                        t.type === TransactionType.SALES 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        {t.type === TransactionType.EXPENSE ? '-' : '+'}
                        {t.amount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-2">
                      <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md font-medium">{t.category}</span>
                      {showAll && <span>{(t.createdAt || t.date).split('T')[0]}</span>}
                      {t.billNumber && <span className="font-mono">#{t.billNumber}</span>}
                      <button onClick={() => setSelectedTransaction(t)} className="ml-auto flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md active:scale-95 transition-transform"><Search size={10} /> View</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/50">
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Party</th>
                    <th className="px-5 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                    <th className="px-5 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-5 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {currentItems.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-gray-400 font-medium">
                        {(t.createdAt || t.date).split('T')[0]}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                            t.type === TransactionType.SALES 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20' 
                              : 'bg-red-50 dark:bg-red-900/20'
                          }`}>
                            {t.type === TransactionType.SALES 
                              ? <ArrowUpRight size={12} className="text-emerald-500" />
                              : <ArrowDownRight size={12} className="text-red-500" />
                            }
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white">{t.partyName}</p>
                              {t.type === TransactionType.EXPENSE && !t.partyPan && (
                                <span title="Missing PAN Number" className="flex shrink-0">
                                  <AlertTriangle size={12} className="text-amber-500" />
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 font-mono">#{t.billNumber || '---'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                          {t.category}
                        </span>
                      </td>
                      <td className={`px-5 py-3.5 whitespace-nowrap text-right text-sm font-bold ${
                        t.type === TransactionType.SALES 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-red-500 dark:text-red-400'
                      }`}>
                        {t.type === TransactionType.EXPENSE ? '-' : '+'}
                        {t.amount.toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap text-center">
                        <button onClick={() => setSelectedTransaction(t)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 mx-auto">
                          <Search size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50/80 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-600">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right text-xs font-bold text-gray-500 uppercase">
                      Total ({showAll ? 'All' : 'Daily'})
                    </td>
                    <td className={`px-5 py-3 whitespace-nowrap text-right text-sm font-extrabold ${
                      netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}>
                      {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    </td>
                    <td className="px-5 py-3"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-gray-300 dark:text-gray-600">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-3">
              <Wallet size={32} className="opacity-30" />
            </div>
            <p className="text-sm font-medium text-gray-400">No transactions found</p>
            <p className="text-[10px] text-gray-300 mt-0.5">
              {showAll ? 'Add transactions to see them here' : 'Try selecting a different date'}
            </p>
          </div>
        )}
      </div>

      {/* ═══════ PAGINATION ═══════ */}
      {displayedTransactions.length > itemsPerPage && (
        <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <button 
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed text-gray-500 transition-all active:scale-95"
          >
            <ChevronLeft size={18} />
          </button>
          
          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let page: number;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button 
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 disabled:cursor-not-allowed text-gray-500 transition-all active:scale-95"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ═══════ MODAL ═══════ */}
      {selectedTransaction && selectedTransaction.invoiceDetails && business ? (
        <InvoicePreviewModal
          invoice={selectedTransaction}
          business={business}
          onClose={() => setSelectedTransaction(null)}
          onDownload={() => { /* Download functionality handled directly if needed, or disabled in history */ }}
          isGenerating={false}
        />
      ) : selectedTransaction ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setSelectedTransaction(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-500"><FileText size={16} /></div> Transaction Record
              </h3>
              <button onClick={() => setSelectedTransaction(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 md:p-6 overflow-y-auto space-y-5">
              <div className="flex flex-col md:flex-row gap-5 items-start">
                  <div className="flex-1 w-full space-y-3">
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-3">
                          <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Amount</span>
                              <span className={`text-lg font-extrabold ${selectedTransaction.type === TransactionType.SALES ? 'text-emerald-600' : 'text-red-500'}`}>
                                  NPR {selectedTransaction.amount.toLocaleString()}
                              </span>
                          </div>
                          <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Date</span>
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedTransaction.date.split('T')[0]}</span>
                          </div>
                          {selectedTransaction.createdAt && (
                              <div className="flex justify-between items-center">
                                  <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Uploaded</span>
                                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedTransaction.createdAt.split('T')[0]}</span>
                              </div>
                          )}
                          <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Category</span>
                              <span className="text-xs font-bold text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-gray-200 px-2 py-0.5 rounded-md">{selectedTransaction.category}</span>
                          </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-3">
                          <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Party</span>
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{selectedTransaction.partyName || 'N/A'}</span>
                          </div>
                          {selectedTransaction.partyPan && (
                          <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">PAN</span>
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">{selectedTransaction.partyPan}</span>
                          </div>
                          )}
                          {selectedTransaction.billNumber && (
                          <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Ref/Bill #</span>
                              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">{selectedTransaction.billNumber}</span>
                          </div>
                          )}
                      </div>
                  </div>

                  <div className="w-full md:w-[200px] shrink-0 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 h-[280px] flex items-center justify-center overflow-hidden flex-col">
                      {selectedTransaction.imageUrl ? (
                          <img src={selectedTransaction.imageUrl} alt="Receipt" className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform" title="Click to open" onClick={() => window.open(selectedTransaction.imageUrl, '_blank')} />
                      ) : (
                          <div className="flex flex-col items-center justify-center opacity-40 text-gray-500">
                             <FileText size={32} className="mb-2" />
                             <p className="text-[10px] uppercase font-bold tracking-widest">No Receipt</p>
                          </div>
                      )}
                  </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
};

export default DailyTransactions;