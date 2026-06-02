import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType } from '../types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar
} from 'recharts';
import { Filter, TrendingUp, DollarSign, TrendingDown, Percent, ArrowUpRight, ArrowDownRight, Activity, Zap, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface ReportsProps {
  transactions: Transaction[];
}

type DateFilterType = 'all' | 'today' | 'week' | 'month' | 'year';
type Granularity = 'weekly' | 'monthly' | 'yearly';

/* ===================== FORECAST HELPERS ===================== */

function holt(series: number[], steps: number, alpha = 0.5, beta = 0.3): number[] {
  if (series.length === 0) return Array(steps).fill(0);
  if (series.length === 1) return Array(steps).fill(series[0]);

  let level = series[0];
  let trend = series[1] - series[0];

  for (let i = 1; i < series.length; i++) {
    const prev = level;
    level = alpha * series[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prev) + (1 - beta) * trend;
  }

  return Array.from({ length: steps }, (_, h) =>
    Math.round(level + (h + 1) * trend)
  );
}

function periodKey(d: Date, g: Granularity): string {
  const y = d.getFullYear();
  if (g === 'yearly') return `${y}`;
  if (g === 'monthly') return `${y}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}-${String(s.getDate()).padStart(2, '0')}`;
}

function labelFromKey(key: string, g: Granularity): string {
  if (g === 'yearly') return key;
  if (g === 'monthly') {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
  }
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

function futureLabel(lastKey: string, g: Granularity, offset: number): string {
  if (g === 'yearly') return `${parseInt(lastKey, 10) + offset}`;
  if (g === 'monthly') {
    const [y, m] = lastKey.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    return d.toLocaleString('default', { month: 'short', year: '2-digit' });
  }
  const [y, m, d] = lastKey.split('-').map(Number);
  const nd = new Date(y, m - 1, d);
  nd.setDate(nd.getDate() + 7 * offset);
  return nd.toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

const STEPS: Record<Granularity, number> = { weekly: 4, monthly: 3, yearly: 2 };

/* ===================== CUSTOM TOOLTIP ===================== */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs border border-gray-700">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-mono font-bold">NPR {Number(p.value).toLocaleString()}</span>
        </p>
      ))}
    </div>
  );
};

/* ===================== COMPONENT ===================== */

const Reports: React.FC<ReportsProps> = ({ transactions }) => {
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [granularity, setGranularity] = useState<Granularity>('monthly');

  /* ---------- Date filter ---------- */
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return transactions.filter(t => {
      const tDate = new Date(t.date);
      const tDateStr = t.date.includes('T') ? t.date.split('T')[0] : t.date;

      switch (dateFilter) {
        case 'today':
          return tDateStr === todayStr;
        case 'week': {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
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
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalVAT = filteredTransactions.reduce((sum, t) => sum + (t.vatAmount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  /* ---------- Expense by category ---------- */
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  /* ---------- Monthly trend data ---------- */
  const monthlyTrendData = useMemo(() => {
    const map = new Map<string, { month: string; sortKey: string; income: number; expense: number }>();
    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (!map.has(sortKey)) map.set(sortKey, { month: monthLabel, sortKey, income: 0, expense: 0 });
      const e = map.get(sortKey)!;
      if (t.type === TransactionType.SALES) e.income += t.amount;
      else e.expense += t.amount;
    });
    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredTransactions]);

  /* ---------- Forecast ---------- */
  const forecastData = useMemo(() => {
    const buckets = new Map<string, { income: number; expense: number }>();
    transactions.forEach(t => {
      const key = periodKey(new Date(t.date), granularity);
      if (!buckets.has(key)) buckets.set(key, { income: 0, expense: 0 });
      const b = buckets.get(key)!;
      if (t.type === TransactionType.SALES) b.income += t.amount;
      else b.expense += t.amount;
    });

    const sortedKeys = Array.from(buckets.keys()).sort();
    if (sortedKeys.length === 0) return { future: [], chart: [], hasData: false };

    const incomes = sortedKeys.map(k => buckets.get(k)!.income);
    const expensesArr = sortedKeys.map(k => buckets.get(k)!.expense);

    const steps = STEPS[granularity];
    const fInc = holt(incomes, steps);
    const fExp = holt(expensesArr, steps);

    const lastKey = sortedKeys[sortedKeys.length - 1];

    const hist = sortedKeys.slice(-6).map(k => ({
      label: labelFromKey(k, granularity),
      income: Math.round(buckets.get(k)!.income),
      expense: Math.round(buckets.get(k)!.expense),
      net: Math.round(buckets.get(k)!.income - buckets.get(k)!.expense),
      type: 'actual' as const,
    }));

    const future = fInc.map((inc, i) => ({
      label: futureLabel(lastKey, granularity, i + 1),
      income: Math.max(0, fInc[i]),
      expense: Math.max(0, fExp[i]),
      net: fInc[i] - fExp[i],
      type: 'forecast' as const,
    }));

    const chart = [...hist, ...future];
    return { future, chart, hasData: true };
  }, [transactions, granularity]);

  const COLORS = [
    '#6366F1', '#8B5CF6', '#A78BFA', '#C4B5FD',
    '#10B981', '#34D399', '#6EE7B7',
    '#F59E0B', '#FBBF24', '#FCD34D',
    '#EF4444', '#F87171', '#FCA5A5',
    '#3B82F6'
  ];

  const filterOptions: { id: DateFilterType; label: string }[] = [
    { id: 'all', label: 'All Time' },
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
    { id: 'year', label: 'Year' },
  ];

  const fmt = (n: number) => `NPR ${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-5 pb-24">

      {/* ═══════════════ HEADER + DATE FILTER ═══════════════ */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <BarChart3 size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Financial Reports</h2>
              <p className="text-xs text-white/70">
                {filterOptions.find(f => f.id === dateFilter)?.label} • {filteredTransactions.length} transactions
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 w-full md:w-auto">
            {filterOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setDateFilter(opt.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                  dateFilter === opt.id
                    ? 'bg-white text-indigo-700 shadow-md'
                    : 'bg-white/15 text-white/90 hover:bg-white/25 backdrop-blur-sm'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════ KPI CARDS ═══════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Revenue */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-6 -mt-6" />
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
              <ArrowUpRight size={14} className="text-emerald-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Revenue</span>
          </div>
          <p className="text-lg font-bold text-gray-800 dark:text-white">{fmt(totalRevenue)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{sales.length} sales transactions</p>
        </div>

        {/* Expenses */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -mr-6 -mt-6" />
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <ArrowDownRight size={14} className="text-red-500" />
            </div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Expenses</span>
          </div>
          <p className="text-lg font-bold text-gray-800 dark:text-white">{fmt(totalExpenses)}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{expenses.length} expense entries</p>
        </div>

        {/* Net Profit */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition-shadow">
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-6 -mt-6 ${netProfit >= 0 ? 'bg-blue-500/5' : 'bg-orange-500/5'}`} />
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded-lg ${netProfit >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
              <Activity size={14} className={netProfit >= 0 ? 'text-blue-600' : 'text-orange-500'} />
            </div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Net Profit</span>
          </div>
          <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
            {netProfit >= 0 ? '' : '-'}{fmt(netProfit)}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">{netProfit >= 0 ? 'Profitable' : 'Loss'} period</p>
        </div>

        {/* Margin */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition-shadow">
          <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-6 -mt-6 ${profitMargin >= 0 ? 'bg-purple-500/5' : 'bg-red-500/5'}`} />
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Percent size={14} className="text-purple-600" />
            </div>
            <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Margin</span>
          </div>
          <p className={`text-lg font-bold ${profitMargin >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
            {profitMargin.toFixed(1)}%
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">VAT collected: NPR {totalVAT.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
        </div>
      </div>

      {/* ═══════════════ FINANCIAL SUMMARY ═══════════════ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <DollarSign size={16} className="text-indigo-500" />
            Financial Summary
          </h3>
        </div>

        <div className="px-5 pb-5 space-y-1">
          {/* Revenue */}
          <div className="flex justify-between items-center py-2.5 border-b border-gray-50 dark:border-gray-700/60">
            <span className="text-sm text-gray-500 dark:text-gray-400">Sales Revenue</span>
            <span className="text-sm font-bold text-emerald-600">+{fmt(totalRevenue)}</span>
          </div>

          {/* Top expense categories */}
          {expenseByCategory.slice(0, 5).map((cat, i) => (
            <div key={cat.name} className="py-2">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">{cat.name}</span>
                <span className="text-xs font-semibold text-red-400">-{fmt(cat.value)}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                  }}
                />
              </div>
            </div>
          ))}

          {expenseByCategory.length > 5 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-700/60">
              <span className="text-xs text-gray-400 italic">
                +{expenseByCategory.length - 5} more categories
              </span>
              <span className="text-xs font-semibold text-red-400">
                -{fmt(expenseByCategory.slice(5).reduce((s, c) => s + c.value, 0))}
              </span>
            </div>
          )}

          {/* Total Expenses */}
          <div className="flex justify-between items-center py-2.5 border-b border-gray-200 dark:border-gray-600">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Total Expenses</span>
            <span className="text-sm font-bold text-red-500">-{fmt(totalExpenses)}</span>
          </div>

          {/* Net Profit - bold row */}
          <div className={`flex justify-between items-center py-3 px-4 -mx-1 rounded-xl mt-1 ${
            netProfit >= 0 
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20' 
              : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
          }`}>
            <span className="text-sm font-bold text-gray-800 dark:text-white">Net Profit / Loss</span>
            <span className={`text-base font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {netProfit >= 0 ? '+' : '-'}{fmt(netProfit)}
            </span>
          </div>

          {/* Cash Position row */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-emerald-50 dark:bg-emerald-900/15 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-emerald-600 font-medium mb-0.5">Cash In</p>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">+{totalRevenue.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/15 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-red-500 font-medium mb-0.5">Cash Out</p>
              <p className="text-xs font-bold text-red-600 dark:text-red-400">-{totalExpenses.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
            </div>
            <div className={`rounded-xl p-2.5 text-center ${netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-900/15' : 'bg-orange-50 dark:bg-orange-900/15'}`}>
              <p className={`text-[10px] font-medium mb-0.5 ${netProfit >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>Net Change</p>
              <p className={`text-xs font-bold ${netProfit >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ CHARTS SECTION ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Income vs Expense Area Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-indigo-500" />
            Revenue vs Expenses
          </h3>
          {monthlyTrendData.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={28}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="income" name="Revenue" stroke="#10B981" strokeWidth={2} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-300 text-sm">No data available</div>
          )}
        </div>

        {/* Expense Breakdown Donut + Legend */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <PieChartIcon size={15} className="text-purple-500" />
            Expense Breakdown
          </h3>
          {expenseByCategory.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="h-48 w-48 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {expenseByCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5 max-h-48 overflow-y-auto w-full">
                {expenseByCategory.map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{cat.name}</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
                      {totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No expenses recorded</div>
          )}
        </div>
      </div>

      {/* Net Profit Trend Line */}
      {monthlyTrendData.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <Activity size={15} className="text-blue-500" />
            Monthly Net Profit Trend
          </h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyTrendData.map(d => ({ ...d, net: d.income - d.expense }))}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="barProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="net" name="Net Profit" fill="url(#barProfit)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════ FORECAST SECTION ═══════════════ */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-2xl shadow-sm border border-indigo-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <Zap size={16} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-800 dark:text-white">AI Forecast</h3>
              <p className="text-[10px] text-gray-400">Holt exponential smoothing projection</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {(['weekly', 'monthly', 'yearly'] as Granularity[]).map(g => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`px-3 py-1 text-xs font-semibold rounded-full capitalize transition-all ${
                  granularity === g
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-white/70 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 pb-5">
          {forecastData.hasData ? (
            <div className="space-y-4">
              {/* Forecast Chart */}
              <div className="h-56 w-full bg-white/50 dark:bg-gray-900/30 rounded-xl p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastData.chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fcIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fcExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    <Area type="monotone" dataKey="income" name="Revenue" stroke="#10B981" strokeWidth={2} fill="url(#fcIncome)" />
                    <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2} fill="url(#fcExpense)" />
                    <Line type="monotone" dataKey="net" name="Net" stroke="#6366F1" strokeWidth={2.5} dot={false} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Table */}
              <div className="bg-white/70 dark:bg-gray-900/40 rounded-xl overflow-hidden">
                <div className="grid grid-cols-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-2 border-b border-gray-200/50 dark:border-gray-700/50">
                  <span>Period</span>
                  <span className="text-right">Revenue</span>
                  <span className="text-right">Expense</span>
                  <span className="text-right">Net</span>
                </div>
                {forecastData.future.map((f, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-4 px-4 py-2.5 text-xs border-b border-gray-100/50 dark:border-gray-700/30 last:border-0 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors"
                  >
                    <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                      {f.label}
                    </span>
                    <span className="text-right text-emerald-600 font-semibold">+{f.income.toLocaleString()}</span>
                    <span className="text-right text-red-400 font-semibold">-{f.expense.toLocaleString()}</span>
                    <span className={`text-right font-bold ${f.net >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {f.net >= 0 ? '+' : ''}{f.net.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center italic">
                ⚡ Projections based on historical trends using Holt exponential smoothing. Not financial advice.
              </p>
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
              <Zap size={24} className="text-gray-300" />
              <p>Not enough data to generate forecast</p>
              <p className="text-[10px]">Add more transactions to enable AI projections</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;