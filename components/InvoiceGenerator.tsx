import React, { useState, useEffect } from 'react';
import { Printer, Download, Eye, QrCode, CreditCard, Banknote, Loader2, CheckSquare, Square, Search, FileText, AlertCircle, Trash2, X, Percent, Calendar, User, Phone, Plus, RefreshCw, MapPin, Hash, ChevronLeft, ChevronRight, ArrowLeft, Wallet, CheckCircle, Sparkles, Building2, ShoppingCart } from 'lucide-react';
import { InvoiceItem, BusinessProfile, Transaction, TransactionType, UnitType, InvoiceDetails, PaymentMethod } from '../types';

// --- Premium CSS ---
const invoiceStyles = `
@keyframes inv-float-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes inv-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
@keyframes inv-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
.inv-float-up { animation: inv-float-up 0.35s ease-out both; }
.inv-shimmer-btn { background: linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%); background-size: 200% 100%; }
.inv-shimmer-btn:hover { animation: inv-shimmer 1.5s infinite; }
`;

// Declare html2pdf
declare var html2pdf: any;

interface InvoiceGeneratorProps {
  businessProfile: BusinessProfile;
  onSaveInvoice: (transaction: Transaction) => void;
  transactions?: Transaction[]; 
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({ businessProfile, onSaveInvoice, transactions = [] }) => {
  // View State
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  
  // Mobile Popup State
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  
  // UI State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  
  // Toast Notification State
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Search State
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const isVatRegistered = businessProfile.taxSystem === 'VAT';

  // --- Create Mode Form States ---
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPan, setCustomerPan] = useState('');
  
  // Validation State
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discountPercentage, setDiscountPercentage] = useState<string>(''); 
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', unit: 'pcs', quantity: 1, rate: '', amount: 0 }
  ]);

  // Generate Invoice Number on mount
  useEffect(() => {
    generateNewInvoiceNumber();
  }, []);

  const generateNewInvoiceNumber = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,'');
    setInvoiceNumber(`INV-${dateStr}-${randomNum}`);
  };

  const resetForm = () => {
    setCustomerName(''); 
    setCustomerPhone(''); 
    setCustomerAddress(''); 
    setCustomerPan('');    
    setItems([{ id: Date.now().toString(), description: '', unit: 'pcs', quantity: 1, rate: '', amount: 0 }]);
    setDiscountPercentage('');
    setPaymentMethod('Cash');
    setErrors({}); 
    generateNewInvoiceNumber();
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Unit Options
  const unitOptions: UnitType[] = ['pcs', 'kg', 'ltr', 'meter', 'box', 'dozen', 'set'];

  // --- Item Management ---
  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', unit: 'pcs', quantity: 1, rate: '', amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
        setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
        if (item.id === id) {
            const updated = { ...item, [field]: value };
            if (field === 'quantity' || field === 'rate') {
                const q = Number(updated.quantity);
                const r = Number(updated.rate);
                updated.amount = (isNaN(q) ? 0 : q) * (isNaN(r) ? 0 : r);
            }
            return updated;
        }
        return item;
    }));
  };

  // --- Calculations ---
  const rawSubtotal = items.reduce((sum, item) => sum + (isNaN(item.amount) ? 0 : item.amount), 0);
  const displaySubtotal = rawSubtotal;
  
  const discPercent = parseFloat(discountPercentage) || 0;
  const discountAmount = (displaySubtotal * discPercent) / 100;
  
  let taxableAmount = 0, vatAmount = 0, total = 0;

  if (isVatRegistered) {
      if (isTaxInclusive) {
          const totalAfterDiscount = Math.max(0, displaySubtotal - discountAmount);
          total = totalAfterDiscount;
          taxableAmount = total / 1.13;
          vatAmount = total - taxableAmount;
      } else {
          taxableAmount = Math.max(0, displaySubtotal - discountAmount);
          vatAmount = taxableAmount * 0.13;
          total = taxableAmount + vatAmount;
      }
  } else {
      taxableAmount = Math.max(0, displaySubtotal - discountAmount);
      total = taxableAmount; 
  }

  // --- Actions ---
  const handleSave = () => {
    const newErrors: { [key: string]: string } = {};
    if (!customerName.trim()) {
        newErrors.customerName = "Customer Name is required";
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return; 
    }

    setErrors({});
    setShowSaveConfirmation(true);
  };

  const confirmSave = () => {
    const invoiceDetails: InvoiceDetails = {
        items, 
        subtotal: displaySubtotal, 
        discount: discountAmount, 
        discountPercentage: discPercent, 
        taxableAmount, 
        vatAmount, 
        grandTotal: total,
        invoiceNumber, 
        customerName, 
        customerPhone,
        customerAddress, 
        customerPan,
        date: invoiceDate, 
        paymentMethod 
    };
    
    const transaction: Transaction = {
        id: invoiceNumber, 
        date: invoiceDate, 
        type: TransactionType.SALES, 
        category: 'Sales Revenue', 
        amount: total, 
        vatAmount,
        partyName: customerName, 
        billNumber: invoiceNumber, 
        invoiceDetails: invoiceDetails
    };

    onSaveInvoice(transaction);
    setShowSaveConfirmation(false);
    setIsMobileFormOpen(false);
    setSelectedInvoice(transaction);
    setShowPreviewModal(true);
    setCurrentPage(1); 
    resetForm();
    showToast("Transaction Saved Successfully!", "success");
  };

  const downloadPDF = async () => {
      setIsGeneratingPdf(true);
      
      try {
          const element = document.getElementById('invoice-preview-content');
          if (!element) throw new Error("Invoice content not found");

          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

          if (isMobile) {
              // Mobile: use print dialog instead of html2pdf
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                  showToast("Please allow popups to download the invoice.", "error");
                  return;
              }

              printWindow.document.write(`
                  <!DOCTYPE html>
                  <html>
                  <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <title>Invoice_${selectedInvoice?.billNumber}</title>
                      <style>
                          body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                          th { background: #f5f5f5; font-weight: bold; }
                          @media print {
                              body { margin: 0; }
                              button { display: none; }
                          }
                      </style>
                  </head>
                  <body>
                      ${element.innerHTML}
                      <br/>
                      <button onclick="window.print()" style="padding:12px 24px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:16px;width:100%">
                          Save as PDF / Print
                      </button>
                  </body>
                  </html>
              `);
              printWindow.document.close();

          } else {
              // Desktop: Rely entirely on html2pdf using the live visible element.
              // No manual cloning needed, avoiding blank coordinates/rendering issues.
              const opt = {
                  margin: 0.3,
                  filename: `Invoice_${selectedInvoice?.billNumber}.pdf`,
                  image: { type: 'jpeg', quality: 1 },
                  html2canvas: { 
                      scale: 2, 
                      useCORS: true, 
                      logging: false,
                      backgroundColor: '#ffffff'
                  },
                  jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
              };

              await html2pdf().set(opt).from(element).save();
              showToast("PDF Downloaded Successfully!", "success");
          }

      } catch (error: any) {
          console.error("PDF Generation failed:", error);
          showToast("Download failed: " + (error.message || "Unknown error"), "error");
      } finally {
          setIsGeneratingPdf(false);
      }
  };

  // --- Pagination Logic ---
  const invoiceHistory = transactions
    .filter(t => t.type === TransactionType.SALES)
    .filter(t => {
      if (!invoiceSearch.trim()) return true;
      const q = invoiceSearch.toLowerCase();
      return (t.partyName?.toLowerCase().includes(q) || t.billNumber?.toLowerCase().includes(q));
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalPages = Math.ceil(invoiceHistory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = invoiceHistory.slice(indexOfFirstItem, indexOfLastItem);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  
  return (
      <div className="flex flex-col h-full lg:h-[calc(100vh-100px)] w-full gap-4 lg:gap-6 p-2 lg:flex-row relative">
          <style>{invoiceStyles}</style>
          <style>{`
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
            input[type=number] { -moz-appearance: textfield; }
          `}</style>

          {/* --- TOAST --- */}
          {toast && (
              <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white inv-float-up backdrop-blur-sm ${
                  toast.type === 'success' ? 'bg-green-600/95 shadow-green-600/30' : 'bg-red-600/95 shadow-red-600/30'
              }`}>
                  {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                  <span className="font-semibold text-sm pr-2">{toast.message}</span>
                  <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition-opacity p-1">
                      <X size={16} />
                  </button>
              </div>
          )}

          {/* --- MOBILE: CREATE INVOICE --- */}
          <div className="lg:hidden shrink-0">
              <button 
                onClick={() => setIsMobileFormOpen(true)}
                className="w-full py-5 border-2 border-dashed border-blue-300 dark:border-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl flex flex-col items-center justify-center gap-2.5 active:scale-[0.98] transition-all"
              >
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-3 rounded-xl shadow-lg shadow-blue-600/30">
                      <Plus size={22} strokeWidth={3} />
                  </div>
                  <span className="font-bold text-blue-700 dark:text-blue-300 text-sm tracking-wide">Create New Invoice</span>
              </button>
          </div>

          {/* --- LEFT: HISTORY --- */}
          <div className="w-full lg:w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden h-[calc(100vh-220px)] lg:h-auto">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 space-y-3">
                  <div className="flex justify-between items-center">
                      <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"><FileText size={14} className="text-blue-600 dark:text-blue-400" /></div>
                          Invoices
                      </h2>
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                         {invoiceHistory.length}
                      </span>
                  </div>
                  <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input type="text" value={invoiceSearch} onChange={e => { setInvoiceSearch(e.target.value); setCurrentPage(1); }} placeholder="Search customer, invoice..." className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {currentInvoices.length > 0 ? (
                      currentInvoices.map((inv, idx) => {
                          const pm = (inv.invoiceDetails as any)?.paymentMethod || 'Cash';
                          const borderColor = pm === 'Credit' ? 'border-l-amber-500' : 'border-l-green-500';
                          return (
                              <div key={inv.id} className={`bg-white dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-100 dark:border-gray-600 border-l-[3px] ${borderColor} hover:shadow-md hover:-translate-y-0.5 cursor-pointer transition-all duration-200 inv-float-up`} style={{animationDelay: `${idx * 0.04}s`}} onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}>
                                  <div className="flex justify-between items-start mb-1.5">
                                      <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2">{inv.partyName}</h4>
                                      <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500 shrink-0">{inv.billNumber}</span>
                                  </div>
                                  <div className="flex justify-between items-end">
                                      <span className="text-[11px] text-gray-400">{inv.date.split('T')[0]}</span>
                                      <div className="flex flex-col items-end">
                                          <span className="font-bold text-green-600 dark:text-green-400 text-sm">Rs. {inv.amount.toLocaleString()}</span>
                                          <span className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 px-1.5 py-0.5 rounded ${pm === 'Credit' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400'}`}>
                                              {pm}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                          );
                      })
                  ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                          <FileText size={28} className="mb-2 opacity-40" />
                          <p className="text-sm">{invoiceSearch ? 'No matches found.' : 'No invoices yet.'}</p>
                      </div>
                  )}
              </div>

              {totalPages > 1 && (
                <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex justify-between items-center text-sm">
                    <button onClick={prevPage} disabled={currentPage === 1} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-500 transition-colors"><ChevronLeft size={16} /></button>
                    <span className="text-gray-400 font-medium text-xs">{currentPage} / {totalPages}</span>
                    <button onClick={nextPage} disabled={currentPage === totalPages} className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 text-gray-500 transition-colors"><ChevronRight size={16} /></button>
                </div>
              )}
          </div>

          {/* --- RIGHT COLUMN: CREATE INVOICE WORKSPACE (Responsive Logic) --- */}
          <div className={`
              flex-col bg-white dark:bg-gray-800 overflow-hidden transition-all duration-300
              ${isMobileFormOpen 
                  ? 'fixed inset-0 z-50 w-full h-full rounded-none flex animate-in slide-in-from-bottom-5' // Mobile Open
                  : 'hidden lg:flex lg:w-2/3 lg:static lg:h-auto lg:rounded-xl lg:shadow-sm lg:border lg:border-gray-100 lg:dark:border-gray-700' // Desktop or Hidden
              }
          `}>
                
                {/* Workspace Header */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 z-10 gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsMobileFormOpen(false)} className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-600/20 hidden sm:flex items-center justify-center">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Invoice</h2>
                            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-mono font-semibold tracking-wider mt-0.5">{invoiceNumber}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                        {isVatRegistered && (
                            <div className="flex bg-gray-100 dark:bg-gray-700/50 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
                                <button onClick={() => setIsTaxInclusive(true)} className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${isTaxInclusive ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Incl.</button>
                                <button onClick={() => setIsTaxInclusive(false)} className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all ${!isTaxInclusive ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-700 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Excl.</button>
                            </div>
                        )}
                        <button onClick={resetForm} className="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-all shadow-sm active:scale-95" title="Reset Form">
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-gray-50/30 dark:bg-gray-900/10 pb-24 lg:pb-6">
                    
                    {/* Row 1: Client & Meta */}
                    <div className="flex flex-col md:grid md:grid-cols-12 gap-5">
                        <div className="col-span-12 md:col-span-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><User size={14} className="text-blue-600 dark:text-blue-400"/></div>
                                <span className="text-gray-800 dark:text-white font-bold text-sm">Client Details</span>
                             </div>
                             
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="w-full">
                                    <input 
                                        type="text" 
                                        value={customerName} 
                                        onChange={e => {
                                            setCustomerName(e.target.value);
                                            if (errors.customerName) setErrors({ ...errors, customerName: '' });
                                        }} 
                                        className={`w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border text-sm outline-none transition-all
                                            ${errors.customerName 
                                                ? 'border-red-400 focus:ring-2 focus:ring-red-500/20 bg-red-50/30 dark:bg-red-900/10' 
                                                : 'border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50'
                                            }`}
                                        placeholder="Customer Name *" 
                                    />
                                    {errors.customerName && (
                                        <div className="flex items-center mt-1.5 text-red-500 text-[11px] font-medium inv-float-up">
                                            <AlertCircle size={12} className="mr-1" />
                                            <span>{errors.customerName}</span>
                                        </div>
                                    )}
                                </div>
                                <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all" placeholder="Phone (Optional)" />
                                <input type="text" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all" placeholder="Address (Optional)" />
                                <input type="text" value={customerPan} onChange={e => setCustomerPan(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all" placeholder="PAN (Optional)" />
                             </div>
                        </div>
                        <div className="col-span-12 md:col-span-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Calendar size={14} className="text-indigo-600 dark:text-indigo-400"/></div>
                                <span className="text-gray-800 dark:text-white font-bold text-sm">Invoice Date</span>
                             </div>
                            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50/50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium text-gray-700 dark:text-gray-200" />
                        </div>
                    </div>

                    {/* Row 2: Items Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left min-w-[600px]">
                                <thead className="bg-gray-50/80 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold text-[11px] uppercase tracking-wider border-b border-gray-100 dark:border-gray-700">
                                    <tr>
                                        <th className="px-4 py-3.5 w-[5%] text-center">#</th>
                                        <th className="px-4 py-3.5 w-[35%]">Item Description</th>
                                        <th className="px-4 py-3.5 w-[15%] text-center">Qty</th>
                                        <th className="px-4 py-3.5 w-[15%] text-center">Unit</th>
                                        <th className="px-4 py-3.5 w-[20%] text-right">Rate</th>
                                        <th className="px-4 py-3.5 w-[10%]"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors group">
                                            <td className="px-4 py-2.5 text-center text-gray-400 dark:text-gray-500 font-medium">{index + 1}</td>
                                            <td className="px-4 py-2.5">
                                                <input type="text" value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 placeholder-gray-300 dark:placeholder-gray-600 text-gray-900 dark:text-white font-medium outline-none" placeholder="What are you selling?" />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.valueAsNumber)} className="w-full bg-gray-50/50 dark:bg-gray-900/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg text-center py-1.5 focus:bg-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium" />
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="w-full bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 border-none rounded-lg text-center p-1.5 text-xs text-gray-500 font-medium focus:ring-0 cursor-pointer outline-none transition-colors">
                                                    {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <input type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.valueAsNumber)} className="w-full bg-gray-50/50 dark:bg-gray-900/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 rounded-lg text-right py-1.5 focus:bg-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium" />
                                            </td>
                                            <td className="px-4 py-2.5 text-center">
                                                {items.length > 1 && (
                                                    <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <button onClick={addItem} className="w-full py-3 bg-gray-50/50 dark:bg-gray-700/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center border-t border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 transition-colors">
                            <Plus size={14} className="mr-1" /> ADD NEW ITEM
                        </button>
                    </div>

                    {/* Row 3: Totals Section */}
                    <div className="flex justify-end">
                         <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm space-y-4">
                             <div className="flex justify-between text-sm">
                                 <span className="text-gray-500 dark:text-gray-400 font-medium">Subtotal</span>
                                 <span className="font-bold text-gray-900 dark:text-white">Rs. {displaySubtotal.toLocaleString()}</span>
                             </div>
                             
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                     <Percent size={14} className="mr-1.5 text-indigo-400"/> Discount %
                                 </div>
                                 <input type="number" placeholder="0" value={discountPercentage} onChange={e => setDiscountPercentage(e.target.value)} className="w-20 py-1.5 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-right text-sm font-semibold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 outline-none transition-all" />
                             </div>

                             {/* --- Payment Method Dropdown --- */}
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                     <Wallet size={14} className="mr-1.5 text-emerald-400"/> Payment
                                 </div>
                                 <select 
                                    value={paymentMethod} 
                                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                                    className="py-1.5 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none w-32 text-right transition-all"
                                 >
                                     <option value="Cash">Cash</option>
                                     <option value="QR">QR / Digital</option>
                                     <option value="Credit">Credit/Due</option>
                                     <option value="Card">Bank Card</option>
                                 </select>
                             </div>

                             {isVatRegistered && (
                                 <div className="pt-3 border-t border-dashed border-gray-200 dark:border-gray-700 space-y-2.5">
                                    <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400"><span>Taxable Amount</span><span>Rs. {taxableAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                                    <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-gray-400"><span>VAT (13%)</span><span>Rs. {vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                                 </div>
                             )}
                             
                             <div className="pt-4 mt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 -mx-6 -mb-6 p-6 rounded-b-2xl flex-col">
                                 <div className="flex justify-between items-center w-full mb-5">
                                    <span className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[11px]">Total Net Amount</span>
                                    <span className="font-bold text-2xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">NPR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                 </div>
                                 <button onClick={handleSave} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center inv-shimmer-btn">
                                    <Sparkles size={16} className="mr-2"/> Generate Invoice
                                </button>
                             </div>
                         </div>
                    </div>
                </div>
          </div>

          {/* --- SAVE CONFIRMATION MODAL --- */}
          {showSaveConfirmation && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-gray-800 p-7 rounded-3xl w-full max-w-sm inv-float-up shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-4">
                            <CheckSquare size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 dark:text-white">Confirm Save</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm leading-relaxed">Are you sure you want to finalize the invoice for <span className="font-bold text-gray-900 dark:text-gray-200">{customerName || 'Walk-in Customer'}</span>?</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowSaveConfirmation(false)} className="flex-1 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Review</button>
                            <button onClick={confirmSave} className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all active:scale-95">Save Now</button>
                        </div>
                    </div>
                </div>
          )}

          {/* Invoice Preview Modal */}
          {showPreviewModal && selectedInvoice && (
                <InvoicePreviewModal 
                    invoice={selectedInvoice} 
                    business={businessProfile} 
                    onClose={() => setShowPreviewModal(false)} 
                    onDownload={downloadPDF}
                    isGenerating={isGeneratingPdf}
                />
          )}
      </div>
  )
};

// --- Sub-Component for Invoice Preview ---
interface InvoicePreviewProps {
    invoice: Transaction;
    business: BusinessProfile;
    onClose: () => void;
    onDownload: () => void;
    isGenerating: boolean;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewProps> = ({ invoice, business, onClose, onDownload, isGenerating }) => {
    
    // Fallbacks to securely capture customer details if older databases mapped it differently 
    const details = invoice.invoiceDetails as any;
    const customerAddress = details?.customerAddress || details?.address || (invoice as any)?.partyAddress;
    const customerPan = details?.customerPan || details?.pan || (invoice as any)?.partyPan;
    const customerPhone = details?.customerPhone || details?.phone || (invoice as any)?.partyPhone;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-6 lg:p-8 animate-in fade-in duration-300">
            <div className="bg-gray-100 dark:bg-gray-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[95vh] inv-float-up">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white/50 dark:bg-gray-800/50 shrink-0 backdrop-blur-sm z-10">
                    <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600"><FileText size={18} /></span> Invoice Preview
                    </h3>
                    <div className="flex space-x-3">
                        <button onClick={onDownload} disabled={isGenerating} className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 shadow-md shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 text-sm">
                            {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                            <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Download PDF'}</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-500 dark:text-gray-400 transition-colors">
                            <X size={20}/>
                        </button>
                    </div>
                </div>
                
                {/* Scrollable Canvas for PDF Generation */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 w-full flex justify-center">
                    
                    {/* A4 Target Element for html2pdf */}
                    <div id="invoice-preview-content" className="bg-white text-gray-900 p-8 sm:p-12 w-full max-w-[800px] shadow-2xl rounded-sm print-exact-size min-h-[1100px] flex flex-col relative mx-auto">
                        
                        {/* Elegant Invoice Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-10 pb-8 border-b-2 border-gray-100">
                            <div className="max-w-[60%]">
                                 {business.logo ? (
                                    <img src={business.logo} alt="Logo" className="h-16 md:h-20 mb-4 object-contain" />
                                 ) : (
                                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">{business.name}</h1>
                                 )}
                                 {business.logo && <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">{business.name}</h1>}
                                 <p className="text-sm text-gray-500 font-medium">{business.address}</p>
                                 <div className="text-sm text-gray-500 mt-1 flex flex-wrap gap-x-4">
                                     {business.pan && <span>PAN: <span className="font-semibold text-gray-700">{business.pan}</span></span>}
                                     {business.phone && <span>Phone: <span className="font-semibold text-gray-700">{business.phone}</span></span>}
                                 </div>
                            </div>
                            <div className="mt-6 sm:mt-0 text-left sm:text-right bg-blue-50/50 p-5 rounded-2xl border border-blue-100/50">
                                <span className="inline-block px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg mb-3 shadow-md shadow-blue-600/20">INVOICE</span>
                                <p className="font-mono font-bold text-gray-900 text-lg">#{invoice.billNumber}</p>
                                <p className="text-sm text-gray-500 mt-1 font-medium">Date: <span className="font-bold text-gray-700">{invoice.date.split('T')[0]}</span></p>
                            </div>
                        </div>

                            {/* Bill To & QR */}
                        <div className="flex justify-between items-end mb-10 bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Billed To</h3>
                                <p className="font-bold text-xl text-gray-900">{invoice.partyName}</p>
                                {customerAddress && <p className="text-sm text-gray-600 mt-1.5 font-medium">{customerAddress}</p>}
                                <div className="mt-2 space-y-1 block">
                                    {customerPan && <p className="text-sm text-gray-500">PAN: <span className="font-medium text-gray-700">{customerPan}</span></p>}
                                    {customerPhone && <p className="text-sm text-gray-500">Phone: <span className="font-medium text-gray-700">{customerPhone}</span></p>}
                                </div>
                            </div>
                            {(business as any).qrCodeUrl && (
                                <div className="text-center flex flex-col items-center">
                                    <div className="bg-white p-2 border border-gray-200 rounded-xl shadow-sm mb-2">
                                        <img src={(business as any).qrCodeUrl} alt="Scan to Pay" className="h-[88px] w-[88px] object-cover rounded-md" />
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Scan to Pay</span>
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="mb-10 w-full rounded-xl border border-gray-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-3.5 px-4 w-[8%] text-center text-gray-500 font-bold uppercase text-[10px] tracking-wider">#</th>
                                        <th className="py-3.5 px-4 w-[42%] text-gray-500 font-bold uppercase text-[10px] tracking-wider">Description</th>
                                        <th className="py-3.5 px-4 w-[15%] text-center text-gray-500 font-bold uppercase text-[10px] tracking-wider">Qty (Unit)</th>
                                        <th className="py-3.5 px-4 w-[15%] text-right text-gray-500 font-bold uppercase text-[10px] tracking-wider">Rate</th>
                                        <th className="py-3.5 px-4 w-[20%] text-right text-gray-900 font-bold uppercase text-[10px] tracking-wider bg-gray-100/50">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoice.invoiceDetails?.items.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-4 text-center text-gray-400 font-medium text-sm">{idx + 1}</td>
                                            <td className="py-4 px-4 text-gray-800 font-semibold text-sm">{item.description}</td>
                                            <td className="py-4 px-4 text-center text-gray-600 font-medium text-sm">{item.quantity} <span className="text-gray-400 text-xs ml-0.5">{item.unit}</span></td>
                                            <td className="py-4 px-4 text-right text-gray-600 font-medium text-sm">{item.rate.toLocaleString()}</td>
                                            <td className="py-4 px-4 text-right font-bold text-gray-900 border-l border-gray-50 bg-gray-50/30 text-sm">{(Number(item.quantity) * Number(item.rate)).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary & Totals */}
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 flex-grow">
                             <div className="w-full sm:w-1/2 mt-4 text-sm text-gray-500 italic">
                                 {/* Notes or Terms can go here */}
                             </div>
                             
                             <div className="w-full sm:w-[300px] shrink-0 bg-gray-50/80 rounded-2xl p-6 border border-gray-100 ml-auto">
                                <div className="space-y-3.5 mb-5 relative">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Subtotal</span>
                                        <span className="font-bold text-gray-900">{invoice.invoiceDetails?.subtotal.toLocaleString()}</span>
                                    </div>
                                    {invoice.invoiceDetails?.discount ? (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">Discount ({invoice.invoiceDetails.discountPercentage}%)</span>
                                            <span className="font-bold text-red-500">- {invoice.invoiceDetails?.discount.toLocaleString()}</span>
                                        </div>
                                    ) : null}
                                     {invoice.vatAmount ? (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 font-medium">VAT (13%)</span>
                                            <span className="font-bold text-gray-900">{invoice.vatAmount.toLocaleString()}</span>
                                        </div>
                                    ) : null}
                                    <div className="w-full h-px border-b border-dashed border-gray-300"></div>
                                </div>
                                
                                <div className="flex justify-between items-center text-lg font-bold text-gray-900">
                                    <span className="uppercase text-xs font-bold tracking-widest text-gray-400">Total</span>
                                    <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">NPR {invoice.amount.toLocaleString()}</span>
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-6 mt-6 border-t border-gray-200">
                                    <span className="font-bold uppercase tracking-widest">Payment Mode</span>
                                    <span className="font-bold text-gray-800 bg-white px-2.5 py-1 rounded-md shadow-sm border border-gray-100 uppercase tracking-widest">{(invoice.invoiceDetails as any)?.paymentMethod || 'Cash'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-8 text-center pt-8 border-t border-gray-100 absolute bottom-12 left-12 right-12 flex justify-between items-center">
                            <p className="text-gray-800 font-bold text-sm tracking-wide">Thank you for doing business with us.</p>
                            <p className="text-gray-400 font-semibold text-xs flex items-center justify-center gap-1">Generated by <span className="text-blue-500 font-bold underline decoration-wavy decoration-blue-200">Dainikhisab</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceGenerator;