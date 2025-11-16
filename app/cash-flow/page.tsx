'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getFinancialData, getMonthlyCashFlow } from '@/lib/storage';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export default function CashFlowPage() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadCashFlowData();
    const interval = setInterval(loadCashFlowData, 1000);
    return () => clearInterval(interval);
  }, [selectedYear]);

  const loadCashFlowData = () => {
    const months = [];
    for (let month = 1; month <= 12; month++) {
      const flow = getMonthlyCashFlow(selectedYear, month);
      const monthName = new Date(selectedYear, month - 1).toLocaleDateString('en-US', { month: 'short' });
      months.push({
        month: monthName,
        income: flow.income,
        expenses: flow.expenses,
        net: flow.income - flow.expenses,
      });
    }
    setMonthlyData(months);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + m.expenses, 0);
  const netCashFlow = totalIncome - totalExpenses;

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10" style={{ paddingLeft: 'calc(280px + 1.5rem)' }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-medium mb-2 text-[#3f3b39] tracking-tight">Cash Flow</h1>
          <p className="text-gray-500 text-[15px] font-light">Monthly income vs expenses analysis</p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3f3b39] focus:border-transparent transition-all font-medium text-sm"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-7 shadow-card">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Total Income</p>
          <p className="text-4xl font-medium tracking-tight text-emerald-600">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white rounded-2xl p-7 shadow-card">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Total Expenses</p>
          <p className="text-4xl font-medium tracking-tight text-red-600">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="bg-white rounded-2xl p-7 shadow-card">
          <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Net Cash Flow</p>
          <p className={`text-4xl font-medium tracking-tight ${netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(netCashFlow)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-card">
          <h2 className="text-xl font-medium mb-6 text-[#3f3b39]">Income vs Expenses</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10b981" name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-card">
          <h2 className="text-xl font-medium mb-6 text-[#3f3b39]">Net Cash Flow Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="net" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Net Cash Flow"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-card overflow-hidden">
        <h2 className="text-xl font-medium mb-6 text-[#3f3b39]">Monthly Breakdown</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th className="text-right py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                <th className="text-right py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                <th className="text-right py-4 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Net</th>
              </tr>
            </thead>
            <tbody>
              {monthlyData.map((data, index) => (
                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6 font-medium text-[#3f3b39]">{data.month}</td>
                  <td className="py-4 px-6 text-right font-medium text-emerald-600">{formatCurrency(data.income)}</td>
                  <td className="py-4 px-6 text-right font-medium text-red-600">{formatCurrency(data.expenses)}</td>
                  <td className={`py-4 px-6 text-right font-medium ${data.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(data.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

