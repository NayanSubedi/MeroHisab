
import React, { useState, useRef } from 'react';
import { Camera, Upload, Check, AlertTriangle, X, Loader2, History, FileText, Eye, Calendar, Image as ImageIcon, Trash2, Aperture, UploadCloud } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { analyzeBillImage } from '../services/geminiService';
import { Transaction, TransactionType, ExpenseCategory } from '../types';

interface BillUploadProps {
  onAddTransaction: (transaction: Transaction) => void;
  onCancel: () => void;
  transactions?: Transaction[]; // For showing history
}

const BillUpload: React.FC<BillUploadProps> = ({ onAddTransaction, onCancel, transactions = [] }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // History & Modal State
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBill, setSelectedBill] = useState<Transaction | null>(null);

  // Form Fields
  const [vendorName, setVendorName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [vendorPan, setVendorPan] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.PURCHASE);

  // Filter History based on selected date
  const historyData = transactions.filter(t => {
      if (t.type !== TransactionType.EXPENSE) return false;
      const tDate = t.date.includes('T') ? t.date.split('T')[0] : t.date;
      return tDate === historyDate;
  });

  const handleTakePhoto = async () => {
    // Check if running on native device (Android/iOS)
    if (Capacitor.isNativePlatform()) {
        try {
            const image = await CapacitorCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Camera
            });

            if (image.base64String) {
                const base64 = `data:image/${image.format};base64,${image.base64String}`;
                setImagePreview(base64);
                processImage(image.base64String);
            }
        } catch (e) {
            console.error('Camera cancelled or failed', e);
        }
    } else {
        // Fallback for Web/Browser: Use HTML5 input with capture="environment"
        cameraInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        processImage(base64.split(',')[1]); // Send only base64 data
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64Data: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeBillImage(base64Data);
      setAnalysisResult(result);
      
      // Auto-fill form
      if (result.vendorName) setVendorName(result.vendorName);
      if (result.billNumber) setBillNumber(result.billNumber);
      if (result.vendorPan) setVendorPan(result.vendorPan);
      if (result.amount) setAmount(result.amount.toString());
      if (result.date) setDate(result.date);
      // Attempt to map category
      const matchedCat = Object.values(ExpenseCategory).find(c => c.toLowerCase() === result.category?.toLowerCase());
      if (matchedCat) setCategory(matchedCat);

    } catch (error) {
      console.error("Analysis Failed", error);
      alert("AI Analysis failed. Please enter details manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    
    // Validation
    if (isNaN(numAmount) || numAmount < 0) {
        alert("Please enter a valid amount.");
        return;
    }
    
    // Compliance Logic
    let isComplianceIssue = false;
    let complianceMessage = '';

    // Rule: PAN missing on High Value
    if (numAmount > 20000 && (!vendorPan || vendorPan.length < 9)) {
        isComplianceIssue = true;
        complianceMessage = "Purchase bill above NPR 20,000 without valid vendor PAN.";
    }
    // Rule: Invalid PAN Format
    else if (vendorPan && (vendorPan.length !== 9 || isNaN(Number(vendorPan)))) {
        isComplianceIssue = true;
        complianceMessage = "Invalid PAN format. Must be 9 digits.";
    }

    const newTransaction: Transaction = {
        id: Date.now().toString(),
        date,
        type: TransactionType.EXPENSE,
        category,
        amount: numAmount,
        partyName: vendorName,
        partyPan: vendorPan,
        billNumber,
        imageUrl: imagePreview || undefined,
        isComplianceIssue,
        complianceMessage
    };

    onAddTransaction(newTransaction);
    // Reset Form
    setImagePreview(null);
    setVendorName('');
    setBillNumber('');
    setVendorPan('');
    setAmount('');
    setCategory(ExpenseCategory.PURCHASE);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Upload Bill</h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"><X size={24} /></button>
      </div>

      {!imagePreview ? (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex flex-col items-center justify-center text-center mb-6">
                <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3">
                    <FileText size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Expense Receipt</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Choose how you want to add the bill</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                <button 
                    onClick={handleTakePhoto}
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition active:scale-95 group"
                >
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition">
                        <Camera size={24} />
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-white">Take Photo</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use Camera</span>
                </button>

                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 hover:shadow-md transition active:scale-95 group"
                >
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition">
                        <UploadCloud size={24} />
                    </div>
                    <span className="font-semibold text-gray-800 dark:text-white">Upload File</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">From Gallery</span>
                </button>
            </div>
            
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <input type="file" ref={cameraInputRef} onChange={handleFileChange} className="hidden" accept="image/*" capture="environment" />
            
            <div className="mt-6 flex justify-center items-center space-x-2 text-xs text-gray-400">
                <Aperture size={12}/>
                <span>Powered by Gemini AI for Auto-Extraction</span>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-black">
                    <img src={imagePreview} alt="Receipt Preview" className="w-full h-auto object-contain max-h-96" />
                    {isAnalyzing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center flex-col text-white">
                             <Loader2 size={32} className="animate-spin mb-2" />
                             <p className="text-sm font-medium">Analyzing with Gemini...</p>
                        </div>
                    )}
                </div>
                <button onClick={() => setImagePreview(null)} className="flex items-center justify-center w-full py-3 text-sm text-red-600 hover:text-red-700 dark:text-red-400 font-medium border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    <Trash2 size={16} className="mr-2" /> Retake
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor Name</label>
                    <input required type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bill Number</label>
                    <input type="text" value={billNumber} onChange={e => setBillNumber(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor PAN (9 Digits)</label>
                    <input type="text" maxLength={9} value={vendorPan} onChange={e => setVendorPan(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount (NPR)</label>
                         <input required type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                         <input required type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:ring-blue-500 focus:border-blue-500">
                        {Object.values(ExpenseCategory).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="pt-4">
                     <button type="submit" disabled={isAnalyzing} className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50">
                        <Check size={18} className="mr-2" /> Save Transaction
                    </button>
                </div>
            </form>
        </div>
      )}
    </div>

    {/* Uploaded Bills History */}
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                <History size={20} className="mr-2 text-gray-500"/> Upload History
            </h3>
            <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                <span className="text-sm text-gray-500 dark:text-gray-300 pl-2 flex items-center"><Calendar size={14} className="mr-1"/> Filter:</span>
                <input 
                    type="date" 
                    value={historyDate} 
                    onChange={(e) => setHistoryDate(e.target.value)} 
                    className="bg-transparent border-none text-sm text-gray-800 dark:text-white focus:ring-0 p-1"
                />
            </div>
        </div>
        
        {/* Mobile: Card List */}
        <div className="md:hidden space-y-4">
             {historyData.length > 0 ? historyData.map((t) => (
                 <div key={t.id} className="border border-gray-100 dark:border-gray-700 rounded-xl p-4 flex justify-between items-center active:bg-gray-50 dark:active:bg-gray-700/50">
                     <div className="flex items-center">
                         <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full mr-3 text-gray-600 dark:text-gray-300">
                             <FileText size={20}/>
                         </div>
                         <div>
                             <p className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">{t.partyName}</p>
                             <p className="text-xs text-gray-500">{t.date.split('T')[0]}</p>
                         </div>
                     </div>
                     <div className="text-right">
                         <p className="font-bold text-gray-900 dark:text-white text-sm">NPR {t.amount.toLocaleString()}</p>
                         <button onClick={() => setSelectedBill(t)} className="text-blue-600 text-xs mt-1 font-medium">View</button>
                     </div>
                 </div>
             )) : (
                 <p className="text-center text-gray-500 text-sm py-4">No bills found for this date.</p>
             )}
        </div>

        {/* Desktop: Table */}
        <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">View</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {historyData.length > 0 ? (
                        historyData.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                    {t.date.includes('T') ? t.date.split('T')[0] : t.date}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{t.partyName}</div>
                                        {t.isComplianceIssue && (
                                            <div className="ml-2 relative group" title={t.complianceMessage}>
                                                <AlertTriangle size={16} className="text-red-500 dark:text-red-400 cursor-help" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.billNumber || 'No Ref'}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                        {t.category}
                                     </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
                                    NPR {t.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <button 
                                        onClick={() => setSelectedBill(t)}
                                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        <Eye size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400 italic">
                                No bills found for {historyDate}.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>

    {/* Bill Details Modal */}
    {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedBill(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Bill Details</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ref: {selectedBill.billNumber || 'N/A'}</p>
                    </div>
                    <button onClick={() => setSelectedBill(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Info Section */}
                        <div className="space-y-4">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900">
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">Total Amount</p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">NPR {selectedBill.amount.toLocaleString()}</p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block">Vendor</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{selectedBill.partyName}</p>
                                </div>
                                {selectedBill.partyPan && (
                                    <div>
                                        <label className="text-xs text-gray-500 dark:text-gray-400 block">Vendor PAN</label>
                                        <p className="font-medium text-gray-900 dark:text-white">{selectedBill.partyPan}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block">Date</label>
                                    <p className="font-medium text-gray-900 dark:text-white">{selectedBill.date.includes('T') ? selectedBill.date.split('T')[0] : selectedBill.date}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500 dark:text-gray-400 block">Category</label>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                        {selectedBill.category}
                                    </span>
                                </div>
                            </div>
                            
                            {selectedBill.isComplianceIssue && (
                                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-sm mb-1">
                                        <AlertTriangle size={16}/> Compliance Issue
                                    </div>
                                    <p className="text-xs text-red-600 dark:text-red-300">{selectedBill.complianceMessage}</p>
                                </div>
                            )}
                        </div>

                        {/* Image Section */}
                        <div className="flex flex-col">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                                <ImageIcon size={16} className="mr-1"/> Bill Image
                            </label>
                            <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden min-h-[200px]">
                                {selectedBill.imageUrl ? (
                                    <img 
                                        src={selectedBill.imageUrl} 
                                        alt="Bill Receipt" 
                                        className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
                                        onClick={() => window.open(selectedBill.imageUrl, '_blank')}
                                        title="Click to open full size"
                                    />
                                ) : (
                                    <div className="text-center text-gray-400">
                                        <ImageIcon size={48} className="mx-auto mb-2 opacity-50"/>
                                        <p className="text-sm">No image attached</p>
                                    </div>
                                )}
                            </div>
                            {selectedBill.imageUrl && (
                                <p className="text-center text-xs text-gray-500 mt-2">Click image to view full size</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-end">
                    <button 
                        onClick={() => setSelectedBill(null)}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )}
    </div>
  );
};

export default BillUpload;
