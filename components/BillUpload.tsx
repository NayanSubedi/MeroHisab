import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, Check, AlertTriangle, X, Loader2, History, FileText, Eye, Calendar, Image as ImageIcon, Trash2, Aperture, UploadCloud, Edit, CheckCircle, XCircle, Info, Search, Sparkles, ChevronRight, Shield, Tag, Building2, Hash, CreditCard, ArrowLeft } from 'lucide-react';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { analyzeBillImage, getConvertedDate } from '../services/aiService';
import { Transaction, TransactionType, ExpenseCategory } from '../types';
import CustomSelect from './CustomSelect';

// --- Premium CSS Keyframes ---
const billStyles = `
@keyframes gradient-border { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
@keyframes pulse-glow { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.05)} }
@keyframes scan-line { 0%{top:-2px} 100%{top:calc(100% + 2px)} }
@keyframes float-up { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes check-pop { 0%{transform:scale(0) rotate(-45deg);opacity:0} 50%{transform:scale(1.2) rotate(0deg)} 100%{transform:scale(1) rotate(0deg);opacity:1} }
.bill-float-up { animation: float-up 0.4s ease-out both; }
.bill-scan-line { animation: scan-line 2s ease-in-out infinite; }
.bill-shimmer { background: linear-gradient(90deg,transparent 30%,rgba(255,255,255,0.08) 50%,transparent 70%); background-size: 200% 100%; animation: shimmer 2s infinite; }
.bill-gradient-border { background: linear-gradient(135deg,#3b82f6,#8b5cf6,#06b6d4,#3b82f6); background-size: 300% 300%; animation: gradient-border 4s ease infinite; }
.bill-check-pop { animation: check-pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both; }
`;

interface BillUploadProps {
    onAddTransaction: (transaction: Transaction) => void;
    onCancel: () => void;
    transactions?: Transaction[];
    onUpdateTransaction?: (transaction: any) => Promise<void> | void;
    onDeleteTransaction?: (id: string) => Promise<void> | void;
    onReload?: () => void;
}

const BillUpload: React.FC<BillUploadProps> = ({
    onAddTransaction,
    onCancel,
    transactions = [],
    onUpdateTransaction,
    onDeleteTransaction,
    onReload
}) => {
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Stepper State
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isDragOver, setIsDragOver] = useState(false);

    // History & Modal State
    const [historyDate, setHistoryDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedBill, setSelectedBill] = useState<Transaction | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    // Toast Notification State
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ message, type });
    }, []);

    // Form Fields
    const [vendorName, setVendorName] = useState('');
    const [billNumber, setBillNumber] = useState('');
    const [vendorPan, setVendorPan] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.MISC);
    const [isSubmitted, setIsSubmitted] = useState(false);

    // History Filter with Search
    const historyData = transactions.filter(t => {
        if (t.type !== TransactionType.EXPENSE) return false;
        if (historyDate !== 'all') {
            const tDate = (t.createdAt || t.date).split('T')[0];
            if (tDate !== historyDate) return false;
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return (t.partyName?.toLowerCase().includes(q) || t.billNumber?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q));
        }
        return true;
    });

    // Compliance helper
    const getMissingFields = (t: Transaction) => {
        const missing: string[] = [];
        if (!t.billNumber) missing.push('Bill No.');
        if (!t.partyPan) missing.push('PAN');
        return missing;
    };

    // Drag handlers
    const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDragIn = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true); };
    const handleDragOut = (e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => { const b64 = reader.result as string; setImagePreview(b64); processImage(b64.split(',')[1]); };
            reader.readAsDataURL(file);
        }
    };

    // Action Handlers
    const normalizeDateStr = (dateStr: string): string => {
        if (!dateStr) return dateStr;
        const parts = dateStr.match(/\d+/g);
        if (parts && parts.length >= 3) {
            const yIdx = parts.findIndex(p => p.length === 4);
            if (yIdx !== -1) {
                const y = parts[yIdx];
                let m = '01', d = '01';
                if (yIdx === 0) {
                    m = parts[1].padStart(2, '0');
                    d = parts[2].padStart(2, '0');
                } else if (yIdx === 2) {
                    d = parts[0].padStart(2, '0');
                    m = parts[1].padStart(2, '0');
                }
                return `${y}-${m}-${d}`;
            }
        }
        return dateStr;
    };

    const ensureAdDate = async (rawDate: string) => {
        const norm = normalizeDateStr(rawDate);
        if (!norm) return norm;
        const yMatch = norm.match(/^(\d{4})/);
        if (yMatch) {
            const year = parseInt(yMatch[1], 10);
            if (year >= 2070) {
                return await getConvertedDate(norm);
            }
        }
        return norm;
    };

    const handleEditClick = (bill?: Transaction) => {
        const target = bill || selectedBill;
        if (!target) return;
        setEditForm({ ...target });
        setSelectedBill(target);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedBill || !onUpdateTransaction) return;

        const finalDate = await ensureAdDate(editForm.date);
        const formattedEdit = { ...editForm, date: finalDate };
        try {
            await onUpdateTransaction(formattedEdit);
            if (onReload) onReload();
            setSelectedBill(null);
            setIsEditing(false);
            showToast('Bill updated successfully!', 'success');
        } catch (e) {
            showToast('Failed to update bill. Please try again.', 'error');
        }
    };

    const handleDelete = async (bill?: Transaction) => {
        const target = bill || selectedBill;
        if (!target || !onDeleteTransaction) return;

        setConfirmDialog({
            message: `Are you sure you want to delete this bill from "${target.partyName}" permanently?`,
            onConfirm: async () => {
                setConfirmDialog(null);
                try {
                    await onDeleteTransaction(target.id);
                    if (onReload) onReload();
                    if (selectedBill?.id === target.id) setSelectedBill(null);
                    showToast('Bill deleted successfully.', 'success');
                } catch (e) {
                    showToast('Failed to delete bill.', 'error');
                }
            }
        });
    };

    const handleTakePhoto = async () => {
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
                processImage(base64.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };

    const processImage = async (base64Data: string) => {
        setStep(2);
        setIsAnalyzing(true);
        try {
            const result = await analyzeBillImage(base64Data);
            setAnalysisResult(result);

            if (result.vendorName) setVendorName(result.vendorName);
            if (result.billNumber) setBillNumber(result.billNumber);
            if (result.vendorPan) setVendorPan(result.vendorPan);
            if (result.amount) setAmount(result.amount.toString());
            if (result.date) setDate(result.date);

            const matchedCat = Object.values(ExpenseCategory).find(c => c.toLowerCase() === result.category?.toLowerCase());
            if (matchedCat) setCategory(matchedCat);

        } catch (error) {
            console.error("Analysis Failed", error);
            showToast('AI Analysis failed or data was unreadable. Please enter details manually.', 'warning');
        } finally {
            setIsAnalyzing(false);
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitted(true);
        if (!e.currentTarget.checkValidity()) {
           showToast('Please properly fill out the highlighted fields.', 'error');
           return;
        }

        const numAmount = parseFloat(amount);

        if (isNaN(numAmount) || numAmount < 0) {
            showToast('Please enter a valid amount.', 'error');
            return;
        }

        const uploadTimestamp = new Date().toISOString();

        const finalDate = await ensureAdDate(date);

        const newTransaction: Transaction = {
            id: Date.now().toString(),
            date: finalDate,
            createdAt: new Date().toISOString(),
            type: TransactionType.EXPENSE,
            category,
            amount: numAmount,
            partyName: vendorName,
            partyPan: vendorPan,
            billNumber,
            imageUrl: imagePreview || undefined
        };

        onAddTransaction(newTransaction);

        // Show success step briefly
        setStep(3);
        setTimeout(() => {
            setImagePreview(null);
            setVendorName('');
            setBillNumber('');
            setVendorPan('');
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setCategory(ExpenseCategory.MISC);
            setStep(1);
        }, 1500);
    };

    // Stepper labels
    const steps = [
        { num: 1, label: 'Capture', icon: Camera },
        { num: 2, label: 'Review', icon: Edit },
        { num: 3, label: 'Saved', icon: CheckCircle },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <style>{billStyles}</style>

            {/* --- Stepper Header --- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                <div className="px-6 pt-5 pb-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white"><FileText size={18} /></div>
                            Upload Bill
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">Scan, review, and save your receipts</p>
                    </div>
                    <button onClick={onCancel} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all"><X size={20} /></button>
                </div>

                {/* Stepper Bar */}
                <div className="px-6 pb-5">
                    <div className="flex items-center justify-between max-w-xs mx-auto">
                        {steps.map((s, i) => (
                            <React.Fragment key={s.num}>
                                <div className="flex flex-col items-center gap-1">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 ${
                                        step >= s.num
                                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                    }`}>
                                        {step > s.num ? <Check size={16} /> : <s.icon size={16} />}
                                    </div>
                                    <span className={`text-[10px] font-semibold tracking-wide uppercase ${step >= s.num ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>{s.label}</span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div className="flex-1 h-0.5 mx-2 mb-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                                        <div className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ${step > s.num ? 'w-full' : 'w-0'}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
                {/* === STEP 3: SUCCESS === */}
                {step === 3 && (
                    <div className="p-12 flex flex-col items-center justify-center text-center bill-float-up">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-green-500/30 mb-4 bill-check-pop">
                            <CheckCircle size={40} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Saved!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your bill has been recorded successfully.</p>
                    </div>
                )}

                {/* === STEP 1: CAPTURE === */}
                {step === 1 && !imagePreview && (
                    <div className="p-6 bill-float-up">
                        <div
                            className={`relative rounded-2xl p-8 transition-all duration-300 overflow-hidden ${
                                isDragOver
                                    ? 'bg-blue-50 dark:bg-blue-900/20 scale-[1.02]'
                                    : 'bg-gray-50/80 dark:bg-gray-800/50'
                            }`}
                            onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} onDrop={handleDrop}
                        >
                            {/* Gradient border */}
                            <div className="absolute inset-0 rounded-2xl bill-gradient-border opacity-30" />
                            <div className="absolute inset-[2px] rounded-[14px] bg-gray-50 dark:bg-gray-800" />

                            <div className="relative z-10">
                                <div className="flex flex-col items-center justify-center text-center mb-8">
                                    <div className="relative p-5 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-2xl mb-4">
                                        <FileText size={36} className="text-blue-600 dark:text-blue-400" />
                                        <div className="absolute -top-1 -right-1 p-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full bill-check-pop" style={{animationDelay: '0.3s'}}>
                                            <Sparkles size={10} className="text-white" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Receipt</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">Take a photo or upload an image — our AI will extract the details</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
                                    <button
                                        onClick={handleTakePhoto}
                                        className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700/80 border-2 border-gray-300 dark:border-gray-600 rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300 active:scale-95 group"
                                    >
                                        <div className="p-3.5 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl mb-3 shadow-md group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all">
                                            <Camera size={22} />
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white text-sm">Take Photo</span>
                                        <span className="text-[11px] text-gray-400 mt-0.5">Use Camera</span>
                                    </button>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-700/80 border-2 border-gray-300 dark:border-gray-600 rounded-2xl hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 active:scale-95 group"
                                    >
                                        <div className="p-3.5 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl mb-3 shadow-md group-hover:shadow-lg group-hover:shadow-purple-500/30 transition-all">
                                            <UploadCloud size={22} />
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white text-sm">Upload File</span>
                                        <span className="text-[11px] text-gray-400 mt-0.5">From Gallery</span>
                                    </button>
                                </div>

                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                                <input type="file" ref={cameraInputRef} onChange={handleFileChange} className="hidden" accept="image/*" capture="environment" />

                                <div className="mt-6 flex justify-center items-center gap-2 text-xs text-gray-400">
                                    <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700/50">
                                        <Sparkles size={11} className="text-amber-500" />
                                        <span>Powered by HisabAI</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* === STEP 1.5: AI ANALYZING LOAD SCREEN === */}
                {step === 2 && isAnalyzing && imagePreview && (
                    <div className="p-10 flex flex-col items-center justify-center min-h-[450px] bill-float-up text-center">
                        <div className="relative w-56 h-56 mb-8 rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(59,130,246,0.2)] border-2 border-blue-400/30 group bg-black">
                            <img src={imagePreview} className="w-full h-full object-cover blur-[3px] opacity-60" alt="Scanning" />
                            <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay"></div>
                            <div className="absolute inset-x-0 h-1 bg-blue-500 bill-scan-line shadow-[0_0_20px_rgba(59,130,246,1)]"></div>
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <Loader2 size={48} className="animate-spin text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                            </div>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Analyzing Receipt</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm text-sm">
                            HisabAI is reading the vendor name, date, quantity, and amounts...
                        </p>
                        
                        <div className="w-48 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-8 overflow-hidden relative">
                            <div className="absolute top-0 bottom-0 left-0 bg-blue-500 w-1/2 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_10px_rgba(59,130,246,0.8)]"></div>
                        </div>
                    </div>
                )}

                {/* === STEP 2: REVIEW & EDIT === */}
                {step === 2 && !isAnalyzing && imagePreview && (
                    <div className="p-6 bill-float-up">
                        {/* Compliance Alert */}
                        {(!billNumber || !vendorPan) && (
                            <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 bill-float-up">
                                <Shield size={18} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Compliance Notice</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Missing: {!billNumber && 'Bill Number'}{!billNumber && !vendorPan && ', '}{!vendorPan && 'Vendor PAN'}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Image Preview */}
                            <div className="space-y-3">
                                <div className="relative rounded-2xl overflow-hidden border-2 border-gray-300 dark:border-gray-700 bg-black group">
                                    <img src={imagePreview} alt="Receipt Preview" className="w-full h-auto object-contain max-h-96" />
                                </div>
                                <button onClick={() => { setImagePreview(null); setStep(1); }} className="flex items-center justify-center w-full py-2.5 text-sm text-red-500 hover:text-red-600 font-medium border border-red-200 dark:border-red-900/50 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-[0.98]">
                                    <Trash2 size={14} className="mr-2" /> Retake / Re-upload
                                </button>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} noValidate className={`space-y-4 ${isSubmitted ? 'was-validated' : ''}`}>
                                {/* Vendor Card */}
                                <div className="p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-3">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Building2 size={12} /> Vendor Info</p>
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor Name *</label>
                                        <input required type="text" value={vendorName} onChange={e => setVendorName(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. Himalayan Mart" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Hash size={10} /> Bill No.</label>
                                            <input type="text" value={billNumber} onChange={e => setBillNumber(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Shield size={10} /> PAN (9 digits)</label>
                                            <input type="text" maxLength={9} value={vendorPan} onChange={e => setVendorPan(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                        </div>
                                    </div>
                                </div>

                                {/* Financials Card */}
                                <div className="p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 space-y-3">
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><CreditCard size={12} /> Financials</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount (NPR) *</label>
                                            <input required type="number" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Date</label>
                                            <input required type="text" placeholder="e.g. 11/11/2082" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1"><Tag size={10} /> Category</label>
                                        <div className="mt-1">
                                          <CustomSelect
                                            value={category}
                                            onChange={(val) => setCategory(val as ExpenseCategory)}
                                            options={Object.values(ExpenseCategory).map(cat => ({ value: cat, label: cat }))}
                                          />
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" disabled={isAnalyzing} className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none disabled:opacity-50 active:scale-[0.98] transition-all shadow-blue-600/20">
                                    <Check size={18} className="mr-2" /> Save Transaction
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>

            {/* --- History Section --- */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-300 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-300 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700"><History size={16} className="text-gray-500 dark:text-gray-400" /></div>
                            Upload History
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">{historyData.length}</span>
                        </h3>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            {/* Search */}
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search vendor, bill..." className="pl-9 pr-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm w-full sm:w-48 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                            </div>
                            {/* Date Filter */}
                            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700 p-1.5 rounded-xl border border-gray-300 dark:border-gray-600">
                                <CustomSelect
                                    value={historyDate === 'all' ? 'all' : 'custom'}
                                    onChange={(val) => { if (val === 'all') setHistoryDate('all'); else setHistoryDate(new Date().toISOString().split('T')[0]); }}
                                    compact
                                    options={[
                                        { value: 'custom', label: 'Date' },
                                        { value: 'all', label: 'All' },
                                    ]}
                                />
                                {historyDate !== 'all' && (
                                    <input type="date" value={historyDate} onChange={(e) => setHistoryDate(e.target.value || 'all')} className="bg-transparent border-none text-xs text-gray-700 dark:text-gray-200 focus:ring-0 p-0.5 outline-none w-28" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile: Card List */}
                <div className="md:hidden divide-y divide-gray-300 dark:divide-gray-700/50">
                    {historyData.length > 0 ? historyData.map((t, index) => {
                        const missing = getMissingFields(t);
                        return (
                            <div key={t.id} className="p-4 flex items-center gap-3 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors bill-float-up" style={{animationDelay: `${index * 0.05}s`}}>
                                {/* Thumbnail or number */}
                                <div className="shrink-0">
                                    {t.imageUrl ? (
                                        <img src={t.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-300 dark:border-gray-600" />
                                    ) : (
                                        <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold text-gray-400">{index+1}</div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{t.partyName}</p>
                                        {missing.length === 0 ? (
                                            <span className="shrink-0 w-2 h-2 rounded-full bg-green-500" title="Complete" />
                                        ) : (
                                            <span className="shrink-0 w-2 h-2 rounded-full bg-amber-500" title={`Missing: ${missing.join(', ')}`} />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-500">{(t.createdAt || t.date).split('T')[0]} · {t.category}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-bold text-gray-900 dark:text-white text-sm">NPR {t.amount.toLocaleString()}</p>
                                    <div className="flex items-center justify-end gap-2.5 mt-1">
                                        <button onClick={() => { setSelectedBill(t); setIsEditing(false); }} className="text-blue-500 hover:text-blue-700 transition-colors"><Eye size={15} /></button>
                                        <button onClick={() => handleEditClick(t)} className="text-gray-400 hover:text-indigo-500 transition-colors"><Edit size={15} /></button>
                                        <button onClick={() => handleDelete(t)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={15} /></button>
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-10 text-center">
                            <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                            <p className="text-sm text-gray-400">{historyDate === 'all' ? 'No uploaded bills found.' : 'No bills found for this date.'}</p>
                        </div>
                    )}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SN</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Upload Date</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-5 py-3 text-center text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300 dark:divide-gray-700/50">
                            {historyData.length > 0 ? (
                                historyData.map((t, index) => {
                                    const missing = getMissingFields(t);
                                    return (
                                        <tr key={t.id} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-5 py-3.5 text-sm text-gray-400 font-medium">{index + 1}</td>
                                            <td className="px-5 py-3.5 text-sm text-gray-500 dark:text-gray-400">{(t.createdAt || t.date).split('T')[0]}</td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    {t.imageUrl && <img src={t.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover border border-gray-300 dark:border-gray-600" />}
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.partyName}</p>
                                                        <p className="text-[11px] text-gray-400">{t.billNumber || 'No Ref'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{t.category}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                {missing.length === 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle size={10} /> Complete</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" title={`Missing: ${missing.join(', ')}`}><AlertTriangle size={10} /> Incomplete</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-right text-sm font-bold text-gray-900 dark:text-white">NPR {t.amount.toLocaleString()}</td>
                                            <td className="px-5 py-3.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button onClick={() => { setSelectedBill(t); setIsEditing(false); }} className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/20 text-blue-500 transition-colors" title="View"><Eye size={16} /></button>
                                                    <button onClick={() => handleEditClick(t)} className="p-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-500 transition-colors" title="Edit"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center">
                                        <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                                        <p className="text-sm text-gray-400">{historyDate === 'all' ? 'No uploaded bills found.' : `No bills found for ${historyDate}.`}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- Detail / Edit Modal --- */}
            {selectedBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={() => setSelectedBill(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] bill-float-up" onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-5 border-b border-gray-300 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {isEditing ? 'Edit Transaction' : 'Bill Details'}
                                </h3>
                                {!isEditing && <p className="text-xs text-gray-400 mt-0.5 font-mono">Ref: {selectedBill.billNumber || 'N/A'}</p>}
                            </div>
                            <button onClick={() => setSelectedBill(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {isEditing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor Name</label>
                                            <input type="text" value={editForm.partyName || ''} onChange={e => setEditForm({ ...editForm, partyName: e.target.value })} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Bill Number</label>
                                            <input type="text" value={editForm.billNumber || ''} onChange={e => setEditForm({ ...editForm, billNumber: e.target.value })} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor PAN</label>
                                            <input type="text" maxLength={9} value={editForm.partyPan || ''} onChange={e => setEditForm({ ...editForm, partyPan: e.target.value })} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount (NPR)</label>
                                            <input type="number" value={editForm.amount || ''} onChange={e => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-semibold" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</label>
                                            <input type="text" placeholder="e.g. 11/11/2082" value={editForm.date || ''} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="mt-1 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</label>
                                            <div className="mt-1">
                                              <CustomSelect
                                                value={editForm.category || ''}
                                                onChange={(val) => setEditForm({ ...editForm, category: val as ExpenseCategory })}
                                                options={Object.values(ExpenseCategory).map(cat => ({ value: cat, label: cat }))}
                                              />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        {/* Amount Card */}
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800/50">
                                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">NPR {selectedBill.amount.toLocaleString()}</p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                                <Building2 size={14} className="text-gray-400 shrink-0" />
                                                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Vendor</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBill.partyName}</p></div>
                                            </div>
                                            {selectedBill.partyPan && (
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                                    <Shield size={14} className="text-gray-400 shrink-0" />
                                                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">PAN</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBill.partyPan}</p></div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                                <Calendar size={14} className="text-gray-400 shrink-0" />
                                                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Bill Date</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBill.date.includes('T') ? selectedBill.date.split('T')[0] : selectedBill.date}</p></div>
                                            </div>
                                            {selectedBill.createdAt && (
                                                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                                    <Calendar size={14} className="text-gray-400 shrink-0" />
                                                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Upload Date</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedBill.createdAt.split('T')[0]}</p></div>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                                                <Tag size={14} className="text-gray-400 shrink-0" />
                                                <div><p className="text-[10px] text-gray-400 uppercase tracking-wider">Category</p><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{selectedBill.category}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5"><ImageIcon size={14} /> Bill Image</label>
                                        <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-2xl border border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden min-h-[200px]">
                                            {selectedBill.imageUrl ? (
                                                <img src={selectedBill.imageUrl} alt="Bill Receipt" className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => window.open(selectedBill.imageUrl, '_blank')} title="Click to open full size" />
                                            ) : (
                                                <div className="text-center text-gray-400 py-8">
                                                    <ImageIcon size={40} className="mx-auto mb-2 opacity-40" />
                                                    <p className="text-xs">No image attached</p>
                                                </div>
                                            )}
                                        </div>
                                        {selectedBill.imageUrl && <p className="text-center text-[11px] text-gray-400 mt-2">Click image to view full size</p>}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-300 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 flex justify-end items-center gap-3">
                            {!isEditing ? (
                                <button onClick={() => setSelectedBill(null)} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-600/20 active:scale-[0.98]">Close</button>
                            ) : (
                                <>
                                    <button onClick={() => setIsEditing(false)} className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-all">Cancel</button>
                                    <button onClick={handleSaveEdit} className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md shadow-green-600/20 active:scale-[0.98] flex items-center gap-1.5"><Check size={16} /> Save</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- Toast Notification --- */}
            {toast && (
                <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold bill-float-up backdrop-blur-sm max-w-md
                    ${toast.type === 'success' ? 'bg-green-600/95 text-white shadow-green-600/30' : ''}
                    ${toast.type === 'error' ? 'bg-red-600/95 text-white shadow-red-600/30' : ''}
                    ${toast.type === 'warning' ? 'bg-amber-500/95 text-white shadow-amber-500/30' : ''}
                `}>
                    {toast.type === 'success' && <CheckCircle size={18} />}
                    {toast.type === 'error' && <XCircle size={18} />}
                    {toast.type === 'warning' && <AlertTriangle size={18} />}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} className="ml-auto opacity-70 hover:opacity-100 transition-opacity p-1">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* --- Confirm Dialog --- */}
            {confirmDialog && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden bill-float-up">
                        <div className="p-7 text-center">
                            <div className="mx-auto w-14 h-14 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/20 rounded-2xl flex items-center justify-center mb-4">
                                <Trash2 size={26} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Confirm Delete</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{confirmDialog.message}</p>
                        </div>
                        <div className="flex border-t border-gray-300 dark:border-gray-700">
                            <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button onClick={confirmDialog.onConfirm} className="flex-1 py-3.5 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-l border-gray-300 dark:border-gray-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillUpload;