
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Calendar, Filter } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
}

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'year';

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [activeTab, setActiveTab] = useState<'pnl' | 'cashflow' | 'charts'>('charts');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  // Filter Logic (Same as before)
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      const tDateStr = t.date.includes('T') ? t.date.split('T')[0] : t.date;

      switch(dateFilter) {
        case 'today':
            return tDateStr === todayStr;
        case 'week': {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0,0,0,0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);
            endOfWeek.setHours(23,59,59,999);
            return tDate >= startOfWeek && tDate <= endOfWeek;
        }
        case 'month':
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
        case 'year':
            return tDate.getFullYear() === now.getFullYear();
        case 'all':
        default:
            return true;
      }
    });
  }, [transactions, dateFilter]);

  const sales = filteredTransactions.filter(t => t.type === TransactionType.SALES);
  const expenses = filteredTransactions.filter(t => t.type === TransactionType.EXPENSE);

  const totalRevenue = sales.reduce((sum, t) => sum + t.amount, 0);
  const totalOperatingExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const grossProfit = totalRevenue; 
  const netProfit = grossProfit - totalOperatingExpenses;
  const cashInflow = totalRevenue;
  const cashOutflow = totalOperatingExpenses;

  // Chart Data Preparation (Same Logic)
  const monthlyDataMap = new Map<string, { month: string, income: number, expense: number }>();

  filteredTransactions.forEach(t => {
      const dateObj = new Date(t.date);
      const monthKey = dateObj.toLocaleString('default', { month: 'short' });
      if (!monthlyDataMap.has(monthKey)) {
          monthlyDataMap.set(monthKey, { month: monthKey, income: 0, expense: 0 });
      }
      const entry = monthlyDataMap.get(monthKey)!;
      if (t.type === TransactionType.SALES) {
          entry.income += t.amount;
      } else {
          entry.expense += t.amount;
      }
  });
  
  if (monthlyDataMap.size === 0 && dateFilter === 'all') {
      const currentMonth = new Date().toLocaleString('default', { month: 'short' });
      monthlyDataMap.set(currentMonth, { month: currentMonth, income: 0, expense: 0 });
  }

  const barChartData = Array.from(monthlyDataMap.values());
  const expenseByCategory = expenses.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(expenseByCategory).map(key => ({
      name: key,
      value: expenseByCategory[key]
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff6b6b'];

  const filterOptions: { id: DateFilterType, label: string }[] = [
      { id: 'all', label: 'All Time' },
      { id: 'today', label: 'Today' },
      { id: 'week', label: 'Week' }, // Shortened for mobile
      { id: 'month', label: 'Month' },
      { id: 'year', label: 'Year' },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Filter Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-4 md:mb-0">
             <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 mr-3">
                 <Filter size={20} />
             </div>
             <div>
                 <h2 className="text-lg font-bold text-gray-800 dark:text-white">Reports</h2>
                 <p className="text-xs text-gray-500 dark:text-gray-400">
                     Showing: <span className="font-medium text-gray-700 dark:text-gray-300">{filterOptions.find(f => f.id === dateFilter)?.label}</span>
                 </p>
             </div>
          </div>
          
          <div className="flex space-x-2 overflow-x-auto w-full md:w-auto no-scrollbar pb-1">
              {filterOptions.map((option) => (
                  <button
                      key={option.id}
                      onClick={() => setDateFilter(option.id)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap border transition-all ${
                          dateFilter === option.id 
                          ? 'bg-blue-600 text-white border-blue-600' 
                          : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                      }`}
                  >
                      {option.label}
                  </button>
              ))}
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
             <button 
                onClick={() => setActiveTab('charts')}
                className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'charts' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
                Visuals
            </button>
            <button 
                onClick={() => setActiveTab('pnl')}
                className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'pnl' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
                P&L
            </button>
            <button 
                onClick={() => setActiveTab('cashflow')}
                className={`flex-1 py-3 text-sm font-medium text-center ${activeTab === 'cashflow' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            >
                Cash Flow
            </button>
        </div>

        <div className="p-4 md:p-6">
            {activeTab === 'charts' && (
                <div className="space-y-6">
                     {/* Income vs Expense Bar Chart */}
                     <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white p-4">Income vs Expenses</h3>
                        {barChartData.length > 0 ? (
                            <div className="h-64 w-full px-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="month" tick={{fontSize: 10}} />
                                        <YAxis tick={{fontSize: 10}} />
                                        <Tooltip />
                                        <Bar dataKey="income" fill="#10B981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-48 flex items-center justify-center text-gray-400">No data</div>
                        )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Expense Breakdown */}
                         <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white p-4">Expense Breakdown</h3>
                             {pieData.length > 0 ? (
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                             ) : (
                                 <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No expenses</div>
                             )}
                         </div>
                     </div>
                </div>
            )}

            {activeTab === 'pnl' && (
                <div className="space-y-4">
                    <h3 className="text-center text-lg font-bold underline decoration-blue-500 underline-offset-4">Profit & Loss</h3>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-300">Revenue</span>
                        <span className="font-bold">NPR {totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-300">Expenses</span>
                        <span className="font-bold text-red-500">(NPR {totalOperatingExpenses.toLocaleString()})</span>
                    </div>
                     <div className="flex justify-between py-4 bg-gray-50 dark:bg-gray-700 px-3 rounded-lg">
                        <span className="font-bold">Net Profit</span>
                        <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            NPR {netProfit.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {activeTab === 'cashflow' && (
                <div className="space-y-4">
                    <h3 className="text-center text-lg font-bold underline decoration-green-500 underline-offset-4">Cash Flow</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
                            <p className="text-xs text-green-600">Inflow</p>
                            <p className="font-bold text-green-700">+{cashInflow.toLocaleString()}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center">
                            <p className="text-xs text-red-600">Outflow</p>
                            <p className="font-bold text-red-700">-{cashOutflow.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="flex justify-between py-3 border-t mt-2">
                        <span>Net Change</span>
                        <span className={cashInflow - cashOutflow >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {(cashInflow - cashOutflow).toLocaleString()}
                        </span>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
