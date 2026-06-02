// import React, { useState, useMemo, useRef } from 'react';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
// import { Transaction } from '../types';
// import { predictCashFlow, aggregateByMonth, PredictionResult } from '../services/predictionService';
// import {
//   AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
//   ReferenceLine
// } from 'recharts';
// import {
//   BrainCircuit, TrendingUp, TrendingDown, Loader2, Sparkles,
//   ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Lightbulb, BarChart3, Download
// } from 'lucide-react';

// interface PredictiveAnalysisProps {
//   transactions: Transaction[];
// }

// const PredictiveAnalysis: React.FC<PredictiveAnalysisProps> = ({ transactions }) => {
//   const [prediction, setPrediction] = useState<PredictionResult | null>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [isExporting, setIsExporting] = useState(false);
//   const reportRef = useRef<HTMLDivElement>(null);

//   const historical = useMemo(() => aggregateByMonth(transactions), [transactions]);

//   const handlePredict = async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const result = await predictCashFlow(transactions);
//       setPrediction(result);
//     } catch (err: any) {
//       setError(err.message || 'Prediction failed. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleDownloadPDF = async () => {
//     if (!reportRef.current || !prediction) return;
//     setIsExporting(true);
//     try {
//       const canvas = await html2canvas(reportRef.current, {
//         scale: 2,
//         useCORS: true,
//         backgroundColor: '#ffffff',
//         logging: false,
//       });
//       const imgData = canvas.toDataURL('image/png');
//       const pdf = new jsPDF({
//         orientation: 'portrait',
//         unit: 'mm',
//         format: 'a4',
//       });
//       const pageWidth = pdf.internal.pageSize.getWidth();
//       const pageHeight = pdf.internal.pageSize.getHeight();
//       const margin = 10;
//       const usableWidth = pageWidth - margin * 2;
//       const imgWidth = usableWidth;
//       const imgHeight = (canvas.height * imgWidth) / canvas.width;

//       // Add title header
//       pdf.setFontSize(18);
//       pdf.setTextColor(88, 28, 135); // Purple
//       pdf.text('Dainikhisab — Cash Flow Forecast', margin, 15);
//       pdf.setFontSize(9);
//       pdf.setTextColor(120, 120, 120);
//       pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, 21);

//       const yStart = 26;

//       // Handle multi-page if content is tall
//       let remainingHeight = imgHeight;
//       let sourceY = 0;
//       let currentPage = 0;

//       while (remainingHeight > 0) {
//         if (currentPage > 0) pdf.addPage();
//         const sliceHeight = Math.min(remainingHeight, pageHeight - (currentPage === 0 ? yStart + margin : margin));
//         const yPos = currentPage === 0 ? yStart : margin;

//         pdf.addImage(
//           imgData, 'PNG',
//           margin, yPos,
//           imgWidth, imgHeight,
//           undefined, 'FAST',
//           0
//         );

//         // For multi-page, we just let the image overflow and clip
//         // jsPDF handles page boundaries
//         remainingHeight -= sliceHeight;
//         sourceY += sliceHeight;
//         currentPage++;

//         // Safety: max 5 pages
//         if (currentPage >= 5) break;
//       }

//       pdf.save('Dainikhisab_CashFlow_Forecast.pdf');
//     } catch (err) {
//       console.error('PDF export failed:', err);
//       alert('Failed to export PDF. Please try again.');
//     } finally {
//       setIsExporting(false);
//     }
//   };

//   // Build chart data: historical + predicted
//   const chartData = useMemo(() => {
//     if (!prediction) return [];
//     const hist = prediction.historical.map(h => ({
//       month: h.label,
//       income: h.income,
//       expense: h.expense,
//       net: h.net,
//       type: 'historical' as const,
//     }));
//     const pred = prediction.predictions.map(p => ({
//       month: p.month,
//       income: p.predictedIncome,
//       expense: p.predictedExpense,
//       net: p.predictedNet,
//       type: 'predicted' as const,
//     }));
//     // Add a bridge point (last historical = first predicted point for smooth line)
//     if (hist.length > 0 && pred.length > 0) {
//       const bridge = { ...hist[hist.length - 1], type: 'predicted' as const };
//       return [...hist, bridge, ...pred];
//     }
//     return [...hist, ...pred];
//   }, [prediction]);

//   // Separator index for reference line
//   const separatorIndex = prediction
//     ? prediction.historical.length
//     : 0;

//   const formatNPR = (val: number) =>
//     `NPR ${Math.abs(val).toLocaleString()}`;

//   const getNetIcon = (val: number) => {
//     if (val > 0) return <ArrowUpRight size={16} className="text-green-500" />;
//     if (val < 0) return <ArrowDownRight size={16} className="text-red-500" />;
//     return <Minus size={16} className="text-gray-400" />;
//   };

//   const getConfidenceColor = (c: number) => {
//     if (c >= 0.7) return 'text-green-500';
//     if (c >= 0.5) return 'text-yellow-500';
//     return 'text-red-400';
//   };

//   return (
//     <div className="space-y-6 pb-20 md:pb-0">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//         <div className="flex items-center gap-3">
//           <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl text-white shadow-lg shadow-purple-500/25">
//             <BrainCircuit size={28} />
//           </div>
//           <div>
//             <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
//               AI Cash Flow Forecast
//             </h2>
//             <p className="text-sm text-gray-500 dark:text-gray-400">
//               Predict your next 3 months based on transaction history
//             </p>
//           </div>
//         </div>
//         <button
//           onClick={handlePredict}
//           disabled={isLoading}
//           className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
//         >
//           {isLoading ? (
//             <>
//               <Loader2 size={18} className="animate-spin" />
//               Analyzing...
//             </>
//           ) : prediction ? (
//             <>
//               <RefreshCw size={18} />
//               Regenerate
//             </>
//           ) : (
//             <>
//               <Sparkles size={18} />
//               Generate Prediction
//             </>
//           )}
//         </button>
//       </div>

//       {/* Error State */}
//       {error && (
//         <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl">
//           <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
//         </div>
//       )}

//       {/* Empty State */}
//       {!prediction && !isLoading && (
//         <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-10 text-center shadow-sm">
//           <div className="mx-auto w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-5">
//             <BarChart3 size={36} className="text-violet-600 dark:text-violet-400" />
//           </div>
//           <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
//             Ready to Predict
//           </h3>
//           <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-1">
//             Click <span className="font-semibold text-violet-600 dark:text-violet-400">"Generate Prediction"</span> to analyze your {transactions.length} transactions and forecast the next 3 months.
//           </p>
//           {transactions.length < 5 && (
//             <p className="text-xs text-amber-600 dark:text-amber-400 mt-3">
//               ⚡ Tip: More transaction data = more accurate predictions
//             </p>
//           )}
//         </div>
//       )}

//       {/* Loading Skeleton */}
//       {isLoading && (
//         <div className="space-y-4 animate-pulse">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             {[1, 2, 3].map(i => (
//               <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
//                 <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 mb-3" />
//                 <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
//                 <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
//               </div>
//             ))}
//           </div>
//           <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
//             <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
//           </div>
//         </div>
//       )}

//       {/* Results */}
//       {prediction && !isLoading && (
//         <div ref={reportRef} className="space-y-6">

//           {/* Source Badge + Download Button */}
//           <div className="flex items-center justify-between">
//             <div className="flex items-center gap-2">
//               <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
//                 prediction.source === 'ai'
//                   ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
//                   : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
//               }`}>
//                 {prediction.source === 'ai' ? <BrainCircuit size={12} /> : <Sparkles size={12} />}
//                 {prediction.source === 'ai' ? 'AI Generated' : 'Trend Analysis (Local)'}
//               </span>
//               <span className="text-xs text-gray-400">
//                 Generated {new Date(prediction.generatedAt).toLocaleTimeString()}
//               </span>
//             </div>
//             <button
//               onClick={handleDownloadPDF}
//               disabled={isExporting}
//               className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 shadow-sm disabled:opacity-50"
//             >
//               {isExporting ? (
//                 <><Loader2 size={16} className="animate-spin" /> Exporting...</>
//               ) : (
//                 <><Download size={16} /> Download PDF</>
//               )}
//             </button>
//           </div>

//           {/* Forecast Cards */}
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             {prediction.predictions.map((p, i) => (
//               <div
//                 key={i}
//                 className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
//               >
//                 {/* Subtle gradient accent */}
//                 <div className={`absolute top-0 left-0 right-0 h-1 ${
//                   p.predictedNet >= 0
//                     ? 'bg-gradient-to-r from-green-400 to-emerald-500'
//                     : 'bg-gradient-to-r from-red-400 to-rose-500'
//                 }`} />

//                 <div className="flex items-center justify-between mb-3">
//                   <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
//                     {p.month}
//                   </h4>
//                   <span className={`text-xs font-semibold ${getConfidenceColor(p.confidence)}`}>
//                     {Math.round(p.confidence * 100)}% conf.
//                   </span>
//                 </div>

//                 <div className="space-y-2">
//                   <div className="flex items-center justify-between">
//                     <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
//                       <TrendingUp size={12} className="text-green-500" /> Income
//                     </span>
//                     <span className="text-sm font-bold text-green-600 dark:text-green-400">
//                       +{p.predictedIncome.toLocaleString()}
//                     </span>
//                   </div>
//                   <div className="flex items-center justify-between">
//                     <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
//                       <TrendingDown size={12} className="text-red-500" /> Expense
//                     </span>
//                     <span className="text-sm font-bold text-red-500">
//                       -{p.predictedExpense.toLocaleString()}
//                     </span>
//                   </div>
//                   <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
//                     <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
//                       {getNetIcon(p.predictedNet)} Net Flow
//                     </span>
//                     <span className={`text-lg font-bold ${
//                       p.predictedNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
//                     }`}>
//                       {p.predictedNet >= 0 ? '+' : ''}{p.predictedNet.toLocaleString()}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Chart */}
//           <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
//             <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
//               <BarChart3 size={16} className="text-violet-500" />
//               Historical + Predicted Trend
//             </h3>

//             {chartData.length > 0 ? (
//               <div className="h-72 w-full">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
//                     <defs>
//                       <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
//                         <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
//                       </linearGradient>
//                       <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
//                         <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
//                       </linearGradient>
//                       <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
//                         <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
//                         <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
//                       </linearGradient>
//                     </defs>
//                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
//                     <XAxis dataKey="month" tick={{ fontSize: 10 }} />
//                     <YAxis tick={{ fontSize: 10 }} />
//                     <Tooltip
//                       contentStyle={{
//                         backgroundColor: '#1f2937',
//                         border: 'none',
//                         borderRadius: '12px',
//                         color: '#fff',
//                         fontSize: '12px',
//                       }}
//                       formatter={(value: number, name: string) => [
//                         `NPR ${value.toLocaleString()}`,
//                         name.charAt(0).toUpperCase() + name.slice(1),
//                       ]}
//                     />
//                     <Legend wrapperStyle={{ fontSize: '11px' }} />
//                     {separatorIndex > 0 && (
//                       <ReferenceLine
//                         x={chartData[separatorIndex]?.month}
//                         stroke="#8B5CF6"
//                         strokeDasharray="5 5"
//                         label={{ value: '← Actual | Predicted →', fontSize: 10, fill: '#8B5CF6' }}
//                       />
//                     )}
//                     <Area
//                       type="monotone"
//                       dataKey="income"
//                       stroke="#10B981"
//                       fill="url(#colorIncome)"
//                       strokeWidth={2}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="expense"
//                       stroke="#EF4444"
//                       fill="url(#colorExpense)"
//                       strokeWidth={2}
//                     />
//                     <Area
//                       type="monotone"
//                       dataKey="net"
//                       stroke="#8B5CF6"
//                       fill="url(#colorNet)"
//                       strokeWidth={2.5}
//                       strokeDasharray="5 3"
//                     />
//                   </AreaChart>
//                 </ResponsiveContainer>
//               </div>
//             ) : (
//               <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
//                 No data to display
//               </div>
//             )}
//           </div>

//           {/* AI Insights */}
//           {prediction.insights.length > 0 && (
//             <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-5 border border-violet-200 dark:border-violet-800/50">
//               <h3 className="text-sm font-bold text-violet-800 dark:text-violet-300 mb-3 flex items-center gap-2">
//                 <Lightbulb size={16} className="text-violet-500" />
//                 AI Insights & Recommendations
//               </h3>
//               <div className="space-y-3">
//                 {prediction.insights.map((insight, i) => (
//                   <div
//                     key={i}
//                     className="bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm p-3 rounded-xl text-sm text-gray-700 dark:text-gray-300"
//                   >
//                     {insight}
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}

//           {/* Summary Bar */}
//           <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
//             <div className="grid grid-cols-3 gap-4 text-center">
//               <div>
//                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">3-Month Projected Income</p>
//                 <p className="text-lg font-bold text-green-600 dark:text-green-400">
//                   +{prediction.predictions.reduce((s, p) => s + p.predictedIncome, 0).toLocaleString()}
//                 </p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">3-Month Projected Expense</p>
//                 <p className="text-lg font-bold text-red-500">
//                   -{prediction.predictions.reduce((s, p) => s + p.predictedExpense, 0).toLocaleString()}
//                 </p>
//               </div>
//               <div>
//                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">3-Month Net Forecast</p>
//                 {(() => {
//                   const total = prediction.predictions.reduce((s, p) => s + p.predictedNet, 0);
//                   return (
//                     <p className={`text-lg font-bold ${total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
//                       {total >= 0 ? '+' : ''}{total.toLocaleString()}
//                     </p>
//                   );
//                 })()}
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default PredictiveAnalysis;
