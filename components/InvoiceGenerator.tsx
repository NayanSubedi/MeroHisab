import React, { useState, useEffect } from 'react';
import { Printer, Download, Eye, QrCode, CreditCard, Banknote, Loader2, CheckSquare, Square, Search, FileText, AlertCircle, Trash2, X, Percent, Calendar, User, Phone, Plus, RefreshCw, MapPin, Hash, ChevronLeft, ChevronRight } from 'lucide-react';
import { InvoiceItem, BusinessProfile, Transaction, TransactionType, UnitType, InvoiceDetails, PaymentMethod } from '../types';

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
  
  // UI State
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const isVatRegistered = businessProfile.taxSystem === 'VAT';

  // --- Create Mode Form States ---
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState(''); // Added Address
  const [customerPan, setCustomerPan] = useState('');         // Added PAN
  
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discountPercentage, setDiscountPercentage] = useState<string>(''); 
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', unit: 'pcs', quantity: 1, rate: 0, amount: 0 }
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
    setCustomerAddress(''); // Reset Address
    setCustomerPan('');     // Reset PAN
    setItems([{ id: Date.now().toString(), description: '', unit: 'pcs', quantity: 1, rate: 0, amount: 0 }]);
    setDiscountPercentage('');
    generateNewInvoiceNumber();
  };

  // Unit Options
  const unitOptions: UnitType[] = ['pcs', 'kg', 'ltr', 'meter', 'box', 'dozen', 'set'];

  // --- Item Management ---
  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', unit: 'pcs', quantity: 1, rate: 0, amount: 0 }]);
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
  
  // Discount Logic
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
    // UPDATED: Only Name is required now. Phone is optional.
    if (!customerName) { alert("Customer Name is required"); return; }
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
        customerAddress, // Added to details
        customerPan,     // Added to details
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
    
    // Show preview, reset form, and jump to first page of history to see new item
    setSelectedInvoice(transaction);
    setShowPreviewModal(true);
    setCurrentPage(1); 
    resetForm();
  };

  const downloadPDF = () => {
    setIsGeneratingPdf(true);
    const element = document.getElementById('invoice-preview-content');
    if (!element) return;
    
    const opt = {
      margin: 0.5,
      filename: `Invoice_${selectedInvoice?.billNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save().then(() => setIsGeneratingPdf(false));
  };

  // --- Pagination Logic ---
  const invoiceHistory = transactions
    .filter(t => t.type === TransactionType.SALES)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort Newest First

  const totalPages = Math.ceil(invoiceHistory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentInvoices = invoiceHistory.slice(indexOfFirstItem, indexOfLastItem);

  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  
  return (
      <div className="h-[calc(100vh-100px)] w-full flex gap-6 p-2">
          
          {/* Internal Style to remove number spinners */}
          <style>{`
            input[type=number]::-webkit-inner-spin-button, 
            input[type=number]::-webkit-outer-spin-button { 
              -webkit-appearance: none; 
              margin: 0; 
            }
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}</style>

          {/* --- LEFT COLUMN: HISTORY LIST --- */}
          <div className="w-1/3 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                  <h2 className="font-bold text-gray-800 dark:text-white">History</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
                     {invoiceHistory.length}
                  </span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {currentInvoices.length > 0 ? (
                      currentInvoices.map((inv) => (
                          <div key={inv.id} className="bg-white dark:bg-gray-700/50 p-3 rounded-lg border border-gray-100 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer transition-colors" onClick={() => { setSelectedInvoice(inv); setShowPreviewModal(true); }}>
                              <div className="flex justify-between items-start mb-1">
                                  <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate pr-2">{inv.partyName}</h4>
                                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{inv.billNumber}</span>
                              </div>
                              <div className="flex justify-between items-end">
                                  <span className="text-xs text-gray-400">{inv.date.split('T')[0]}</span>
                                  <span className="font-bold text-green-600 dark:text-green-400 text-sm">Rs. {inv.amount.toLocaleString()}</span>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                          <p className="text-sm">No recent invoices.</p>
                      </div>
                  )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center text-sm">
                    <button 
                        onClick={prevPage} 
                        disabled={currentPage === 1}
                        className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-gray-600 dark:text-gray-400 font-medium text-xs">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button 
                        onClick={nextPage} 
                        disabled={currentPage === totalPages}
                        className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400 transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
              )}
          </div>

          {/* --- RIGHT COLUMN: CREATE INVOICE WORKSPACE --- */}
          <div className="w-2/3 flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                
                {/* Workspace Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Invoice</h2>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono tracking-wider">{invoiceNumber}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isVatRegistered && (
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button 
                                    onClick={() => setIsTaxInclusive(true)} 
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${isTaxInclusive ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Inclusive
                                </button>
                                <button 
                                    onClick={() => setIsTaxInclusive(false)} 
                                    className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${!isTaxInclusive ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Exclusive
                                </button>
                            </div>
                        )}
                        <button onClick={resetForm} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors" title="Reset Form">
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-900/20">
                    
                    {/* Row 1: Client & Meta */}
                    <div className="grid grid-cols-12 gap-6">
                        <div className="col-span-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                             <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-semibold text-sm">
                                <User size={16} className="text-blue-500"/> Client Details
                             </div>
                             
                             {/* UPDATED: Input Grid for Name, Phone, Address, PAN */}
                             <div className="grid grid-cols-2 gap-4">
                                <input 
                                    type="text" 
                                    value={customerName} 
                                    onChange={e => setCustomerName(e.target.value)} 
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                    placeholder="Customer Name *" 
                                />
                                <input 
                                    type="tel" 
                                    value={customerPhone} 
                                    onChange={e => setCustomerPhone(e.target.value)} 
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                    placeholder="Phone Number (Optional)" 
                                />
                                <input 
                                    type="text" 
                                    value={customerAddress} 
                                    onChange={e => setCustomerAddress(e.target.value)} 
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                    placeholder="Address (Optional)" 
                                />
                                <input 
                                    type="text" 
                                    value={customerPan} 
                                    onChange={e => setCustomerPan(e.target.value)} 
                                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" 
                                    placeholder="PAN Number (Optional)" 
                                />
                             </div>
                        </div>
                        <div className="col-span-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white font-semibold text-sm">
                                <Calendar size={16} className="text-blue-500"/> Date
                             </div>
                            <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 text-sm outline-none" />
                        </div>
                    </div>

                    {/* Row 2: Items Table */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    {/* Added S.N Column */}
                                    <th className="px-4 py-3 w-[5%] text-center">S.N</th>
                                    <th className="px-4 py-3 w-[35%]">Description</th>
                                    <th className="px-4 py-3 w-[15%] text-center">Qty</th>
                                    <th className="px-4 py-3 w-[15%] text-center">Unit</th>
                                    <th className="px-4 py-3 w-[20%] text-right">Rate</th>
                                    <th className="px-4 py-3 w-[10%]"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                        {/* Added S.N Cell */}
                                        <td className="px-4 py-2 text-center text-gray-500 dark:text-gray-400">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-2">
                                            <input 
                                                type="text" 
                                                value={item.description} 
                                                onChange={e => updateItem(item.id, 'description', e.target.value)} 
                                                className="w-full bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400 text-gray-900 dark:text-white font-medium" 
                                                placeholder="Item name"
                                            />
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="number" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', e.target.valueAsNumber)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-center py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                                        </td>
                                        <td className="px-4 py-2">
                                             <select value={item.unit} onChange={e => updateItem(item.id, 'unit', e.target.value)} className="w-full bg-transparent border-none text-center p-0 text-xs text-gray-500 focus:ring-0 cursor-pointer">
                                                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.valueAsNumber)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded text-right py-1 text-xs focus:ring-1 focus:ring-blue-500" />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {items.length > 1 && (
                                                <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                                    <Trash2 size={16}/>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={addItem} className="w-full py-2 bg-gray-50 dark:bg-gray-700/30 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center border-t border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <Plus size={14} className="mr-1" /> Add New Item
                        </button>
                    </div>

                    {/* Row 3: Totals Section */}
                    <div className="flex justify-end">
                         <div className="w-full md:w-1/2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-3">
                             
                             <div className="flex justify-between text-sm">
                                 <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                                 <span className="font-semibold text-gray-900 dark:text-white">{displaySubtotal.toLocaleString()}</span>
                             </div>
                             
                             <div className="flex items-center justify-between">
                                 <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                     <Percent size={14} className="mr-1.5"/> Discount %
                                 </div>
                                 <input 
                                    type="number" 
                                    placeholder="0" 
                                    value={discountPercentage} 
                                    onChange={e => setDiscountPercentage(e.target.value)}
                                    className="w-20 py-1 px-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-right text-sm focus:ring-1 focus:ring-blue-500"
                                 />
                             </div>

                             {isVatRegistered && (
                                 <div className="pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span>Taxable</span>
                                        <span>{taxableAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                                        <span>VAT (13%)</span>
                                        <span>{vatAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    </div>
                                 </div>
                             )}

                             <div className="pt-3 mt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                 <span className="font-bold text-lg text-gray-900 dark:text-white">Total</span>
                                 <span className="font-bold text-2xl text-blue-600 dark:text-blue-400">NPR {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                             </div>

                             <button 
                                onClick={handleSave} 
                                className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center"
                            >
                                <Printer size={18} className="mr-2"/> Save Invoice
                            </button>
                         </div>
                    </div>
                </div>
          </div>

          {/* Save Confirmation Modal */}
          {showSaveConfirmation && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="text-lg font-bold mb-2 dark:text-white">Confirm Save</h3>
                        <p className="text-gray-500 mb-6 text-sm">Complete invoice for <span className="font-bold">{customerName}</span>?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setShowSaveConfirmation(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-medium dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600">Cancel</button>
                            <button onClick={confirmSave} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700">Confirm</button>
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

const InvoicePreviewModal: React.FC<InvoicePreviewProps> = ({ invoice, business, onClose, onDownload, isGenerating }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                    <h3 className="font-bold text-gray-800 dark:text-white">Invoice Preview</h3>
                    <div className="flex space-x-2">
                        <button onClick={onDownload} disabled={isGenerating} className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50">
                            {isGenerating ? <Loader2 size={20} className="animate-spin"/> : <Download size={20}/>}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-500">
                            <X size={20}/>
                        </button>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 bg-white text-gray-900" id="invoice-preview-content">
                    {/* Invoice Header */}
                    <div className="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-6">
                        <div>
                             {business.logo && <img src={business.logo} alt="Logo" className="h-16 mb-2 object-contain" />}
                             <h1 className="text-2xl font-bold uppercase tracking-wide">{business.name}</h1>
                             <p className="text-sm text-gray-600">{business.address}</p>
                             <p className="text-sm text-gray-600">PAN: {business.pan} | Phone: {business.phone}</p>
                        </div>
                        <div className="text-right">
                             <h2 className="text-3xl font-bold text-gray-800">INVOICE</h2>
                             <p className="text-sm font-medium mt-2">Inv No: {invoice.billNumber}</p>
                             <p className="text-sm text-gray-500">Date: {invoice.date}</p>
                        </div>
                    </div>

                    {/* Customer Info (Updated to show optional fields) */}
                    <div className="mb-8">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Bill To:</p>
                        <h3 className="text-lg font-bold">{invoice.partyName}</h3>
                        
                        {invoice.invoiceDetails?.customerAddress && (
                            <p className="text-sm text-gray-600">Address: {invoice.invoiceDetails.customerAddress}</p>
                        )}
                        {invoice.invoiceDetails?.customerPan && (
                            <p className="text-sm text-gray-600">PAN: {invoice.invoiceDetails.customerPan}</p>
                        )}
                        {invoice.invoiceDetails?.customerPhone && (
                            <p className="text-sm text-gray-600">Phone: {invoice.invoiceDetails.customerPhone}</p>
                        )}
                    </div>

                    {/* Table */}
                    <table className="w-full mb-8">
                        <thead>
                            <tr className="bg-gray-100 border-b border-gray-300">
                                {/* Added S.N Header */}
                                <th className="text-center py-2 px-3 font-bold text-sm border-r border-gray-300 w-12">S.N</th>
                                <th className="text-left py-2 px-3 font-bold text-sm">Description</th>
                                <th className="text-center py-2 px-3 font-bold text-sm">Qty</th>
                                <th className="text-center py-2 px-3 font-bold text-sm">Unit</th>
                                <th className="text-right py-2 px-3 font-bold text-sm">Rate</th>
                                <th className="text-right py-2 px-3 font-bold text-sm">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.invoiceDetails?.items.map((item, idx) => (
                                <tr key={idx} className="border-b border-gray-200">
                                    {/* Added S.N Data */}
                                    <td className="py-3 px-3 text-sm text-center border-r border-gray-200">{idx + 1}</td>
                                    <td className="py-3 px-3 text-sm">{item.description}</td>
                                    <td className="py-3 px-3 text-sm text-center">{item.quantity}</td>
                                    <td className="py-3 px-3 text-sm text-center">{item.unit}</td>
                                    <td className="py-3 px-3 text-sm text-right">{item.rate.toLocaleString()}</td>
                                    <td className="py-3 px-3 text-sm text-right font-medium">{item.amount.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">{invoice.invoiceDetails?.subtotal.toLocaleString()}</span>
                            </div>
                            {invoice.invoiceDetails?.discount ? (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Discount ({invoice.invoiceDetails.discountPercentage}%):</span>
                                    <span>- {invoice.invoiceDetails?.discount.toLocaleString()}</span>
                                </div>
                            ) : null}
                            {invoice.vatAmount ? (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Taxable Amount:</span>
                                    <span>{invoice.invoiceDetails?.taxableAmount.toLocaleString()}</span>
                                </div>
                            ) : null}
                             {invoice.vatAmount ? (
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>VAT (13%):</span>
                                    <span>{invoice.vatAmount.toLocaleString()}</span>
                                </div>
                            ) : null}
                            <div className="flex justify-between text-lg font-bold border-t border-gray-800 pt-2 mt-2">
                                <span>Total:</span>
                                <span>NPR {invoice.amount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 text-center text-xs text-gray-400 pt-6 border-t border-gray-200">
                        <p>Thank you for doing business with us.</p>
                        <p>Generated by MeroHisab</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceGenerator;