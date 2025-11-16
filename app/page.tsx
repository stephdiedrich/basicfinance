'use client';

import { useEffect, useState, useCallback } from 'react';
import { getFinancialData, calculateNetWorth, getMonthlyCashFlow, getAssetClasses, getLiabilityClasses } from '@/lib/storage';
import { Asset, Liability, Transaction, AssetClass, LiabilityClass } from '@/types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type CardType = 'net-worth' | 'performance' | 'liquidity' | 'cash-flow' | 'asset-allocation' | 'liability-allocation';

interface CardLayout {
  id: CardType;
  colSpan: number;
  rowSpan: number;
  order: number;
}

const DEFAULT_CARD_LAYOUTS: CardLayout[] = [
  { id: 'net-worth', colSpan: 1, rowSpan: 1, order: 0 },
  { id: 'performance', colSpan: 1, rowSpan: 1, order: 1 },
  { id: 'liquidity', colSpan: 1, rowSpan: 1, order: 2 },
  { id: 'cash-flow', colSpan: 1, rowSpan: 1, order: 3 },
  { id: 'asset-allocation', colSpan: 1, rowSpan: 1, order: 4 },
  { id: 'liability-allocation', colSpan: 1, rowSpan: 1, order: 5 },
];

export default function Home() {
  const [netWorth, setNetWorth] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  const [liquidAssets, setLiquidAssets] = useState(0);
  const [cashPosition, setCashPosition] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  const [incomeToExpenseRatio, setIncomeToExpenseRatio] = useState(0);
  const [momChange, setMomChange] = useState(0);
  const [momChangePercent, setMomChangePercent] = useState(0);
  const [oneDayChange, setOneDayChange] = useState(0);
  const [oneDayChangePercent, setOneDayChangePercent] = useState(0);
  const [assetAllocationData, setAssetAllocationData] = useState<{ name: string; value: number; percentage: number }[]>([]);
  const [liabilityAllocationData, setLiabilityAllocationData] = useState<{ name: string; value: number; percentage: number }[]>([]);
  const [performanceData, setPerformanceData] = useState<{ month: string; [key: string]: number | string }[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [cardLayouts, setCardLayouts] = useState<CardLayout[]>(DEFAULT_CARD_LAYOUTS);
  const [draggedCardId, setDraggedCardId] = useState<CardType | null>(null);
  const [draggedOverCardId, setDraggedOverCardId] = useState<CardType | null>(null);
  const [resizingCardId, setResizingCardId] = useState<CardType | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; colSpan: number; rowSpan: number; edge: string } | null>(null);
  const [previewSize, setPreviewSize] = useState<{ colSpan: number; rowSpan: number } | null>(null);

  // Load card layouts from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('home-card-layouts');
      if (saved) {
        try {
          setCardLayouts(JSON.parse(saved));
        } catch (e) {
          console.error('Error loading card layouts:', e);
        }
      }
    }
  }, []);

  // Save card layouts to localStorage
  const saveCardLayouts = useCallback((layouts: CardLayout[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('home-card-layouts', JSON.stringify(layouts));
    }
  }, []);

  const generateMockPerformanceData = (data: any, assetClasses: AssetClass[]): { month: string; [key: string]: number | string }[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const currentMonthIndex = now.getMonth();
    
    // Calculate current asset values by class
    const currentValuesByClass = new Map<string, number>();
    assetClasses.forEach(ac => {
      const classAssets = (data.assets || []).filter((asset: Asset) => {
        return ac.name.toLowerCase() === asset.type.toLowerCase() || 
               ac.id.toLowerCase() === asset.type.toLowerCase();
      });
      const total = classAssets.reduce((sum: number, asset: Asset) => sum + (asset.value || 0), 0);
      currentValuesByClass.set(ac.name, total);
    });
    
    const dataPoints: { month: string; [key: string]: number | string }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthIndex = (currentMonthIndex - i + 12) % 12;
      const progress = (12 - i) / 12;
      const point: { month: string; [key: string]: number | string } = { month: months[monthIndex] };
      
      // Generate values for each asset class with gradual growth
      assetClasses.forEach(ac => {
        const currentValue = currentValuesByClass.get(ac.name) || 0;
        const baseValue = currentValue * 0.7; // Start at 70% of current
        const value = baseValue + (currentValue - baseValue) * progress + (Math.random() - 0.5) * Math.max(currentValue, 1000) * 0.05;
        point[ac.name] = Math.max(0, value);
      });
      
      dataPoints.push(point);
    }
    
    return dataPoints;
  };

  const calculateMoMChange = (data: any, currentNetWorth: number): { change: number; percent: number } => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get transactions in last 30 days
    const recentTransactions = (data.transactions || []).filter((t: Transaction) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= thirtyDaysAgo && transactionDate <= now;
    });

    // Calculate net change from transactions
    const income = recentTransactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const expenses = recentTransactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const change = income - expenses;
    const previousNetWorth = currentNetWorth - change;
    const percent = previousNetWorth !== 0 ? (change / Math.abs(previousNetWorth)) * 100 : 0;

    return { change, percent };
  };

  const calculateOneDayChange = (data: any, currentNetWorth: number): { change: number; percent: number } => {
    const now = new Date();
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    oneDayAgo.setHours(0, 0, 0, 0);

    // Get transactions in last 1 day
    const recentTransactions = (data.transactions || []).filter((t: Transaction) => {
      const transactionDate = new Date(t.date);
      return transactionDate >= oneDayAgo && transactionDate <= now;
    });

    // Calculate net change from transactions
    const income = recentTransactions
      .filter((t: Transaction) => t.type === 'income')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    
    const expenses = recentTransactions
      .filter((t: Transaction) => t.type === 'expense')
      .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

    const change = income - expenses;
    const previousNetWorth = currentNetWorth - change;
    const percent = previousNetWorth !== 0 ? (change / Math.abs(previousNetWorth)) * 100 : 0;

    return { change, percent };
  };

  const loadData = () => {
    try {
      const data = getFinancialData();
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Calculate totals
      const assetsTotal = (data.assets || []).reduce((sum, asset) => sum + (asset.value || 0), 0);
      const liabilitiesTotal = (data.liabilities || []).reduce((sum, liability) => sum + (liability.amount || 0), 0);
      
      setTotalAssets(assetsTotal);
      setTotalLiabilities(liabilitiesTotal);
      const currentNetWorth = calculateNetWorth();
      setNetWorth(currentNetWorth);

      // Calculate MoM change
      const mom = calculateMoMChange(data, currentNetWorth);
      setMomChange(mom.change);
      setMomChangePercent(mom.percent);

      // Calculate 1d change
      const oneDay = calculateOneDayChange(data, currentNetWorth);
      setOneDayChange(oneDay.change);
      setOneDayChangePercent(oneDay.percent);
    
      // Calculate liquid assets
      const assetClasses = getAssetClasses();
      const liquidAssetClassIds = new Set(
        assetClasses.filter(ac => ac.isLiquid === true).map(ac => ac.id)
      );
      const liquidAssetsTotal = (data.assets || [])
        .filter(asset => {
          const assetClass = assetClasses.find(ac => 
            ac.name.toLowerCase() === asset.type.toLowerCase() || 
            ac.id.toLowerCase() === asset.type.toLowerCase()
          );
          return assetClass && liquidAssetClassIds.has(assetClass.id);
        })
        .reduce((sum, asset) => sum + asset.value, 0);
      setLiquidAssets(liquidAssetsTotal);

      // Calculate cash position
      const cashTotal = (data.assets || [])
        .filter(asset => {
          const assetClass = assetClasses.find(ac => 
            ac.name.toLowerCase() === asset.type.toLowerCase() || 
            ac.id.toLowerCase() === asset.type.toLowerCase()
          );
          return assetClass && (assetClass.id === 'cash' || assetClass.name.toLowerCase() === 'cash');
        })
        .reduce((sum, asset) => sum + asset.value, 0);
      setCashPosition(cashTotal);

      // Calculate monthly cash flow
      const cashFlow = getMonthlyCashFlow(currentYear, currentMonth);
      setMonthlyIncome(cashFlow.income);
      setMonthlyExpenses(cashFlow.expenses);
      
      // Calculate savings rate
      const savingsRateValue = cashFlow.income > 0 
        ? ((cashFlow.income - cashFlow.expenses) / cashFlow.income) * 100 
        : 0;
      setSavingsRate(savingsRateValue);

      // Calculate income to expense ratio
      const ratio = cashFlow.expenses > 0 ? cashFlow.income / cashFlow.expenses : 0;
      setIncomeToExpenseRatio(ratio);

      // Calculate asset allocation
      const assetAllocation = new Map<string, number>();
      
      (data.assets || []).forEach(asset => {
        const assetClass = assetClasses.find(ac => 
          ac.name.toLowerCase() === asset.type.toLowerCase() || 
          ac.id.toLowerCase() === asset.type.toLowerCase()
        );
        const className = assetClass ? assetClass.name : asset.type;
        assetAllocation.set(className, (assetAllocation.get(className) || 0) + asset.value);
      });

      const assetAllocData = Array.from(assetAllocation.entries())
        .map(([name, value]) => ({
          name,
          value,
          percentage: assetsTotal > 0 ? (value / assetsTotal) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value);
      setAssetAllocationData(assetAllocData);

      // Calculate liability allocation
      const liabilityClasses = getLiabilityClasses();
      const liabilityAllocation = new Map<string, number>();
      
      (data.liabilities || []).forEach(liability => {
        const liabilityClass = liabilityClasses.find(lc => 
          lc.name.toLowerCase() === liability.type.toLowerCase() || 
          lc.id.toLowerCase() === liability.type.toLowerCase()
        );
        const className = liabilityClass ? liabilityClass.name : liability.type;
        liabilityAllocation.set(className, (liabilityAllocation.get(className) || 0) + liability.amount);
      });

      const liabilityAllocData = Array.from(liabilityAllocation.entries())
        .map(([name, value]) => ({
          name,
          value,
          percentage: liabilitiesTotal > 0 ? (value / liabilitiesTotal) * 100 : 0
        }))
        .sort((a, b) => b.value - a.value);
      setLiabilityAllocationData(liabilityAllocData);

      // Generate mock performance data by asset class
      const mockData = generateMockPerformanceData(data, assetClasses);
      setPerformanceData(mockData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    loadData();
    const interval = setInterval(loadData, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, cardId: CardType) => {
    // Don't start drag if we're resizing
    if (resizingCardId) {
      e.preventDefault();
      return;
    }
    setDraggedCardId(cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, cardId: CardType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedCardId && draggedCardId !== cardId) {
      setDraggedOverCardId(cardId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverCardId(null);
  };

  const handleDrop = (e: React.DragEvent, dropCardId: CardType) => {
    e.preventDefault();
    if (!draggedCardId || draggedCardId === dropCardId) {
      setDraggedCardId(null);
      setDraggedOverCardId(null);
      return;
    }

    const newLayouts = [...cardLayouts];
    const draggedIndex = newLayouts.findIndex(l => l.id === draggedCardId);
    const dropIndex = newLayouts.findIndex(l => l.id === dropCardId);

    if (draggedIndex !== -1 && dropIndex !== -1) {
      const dragged = newLayouts[draggedIndex];
      newLayouts.splice(draggedIndex, 1);
      newLayouts.splice(dropIndex, 0, dragged);
      
      // Update order values
      newLayouts.forEach((layout, index) => {
        layout.order = index;
      });

      setCardLayouts(newLayouts);
      saveCardLayouts(newLayouts);
    }

    setDraggedCardId(null);
    setDraggedOverCardId(null);
  };

  const handleDragEnd = () => {
    setDraggedCardId(null);
    setDraggedOverCardId(null);
  };

  // Resize handlers - drag to resize
  const handleResizeStart = (e: React.MouseEvent, cardId: CardType, edge: string) => {
    e.stopPropagation();
    e.preventDefault();
    const layout = cardLayouts.find(l => l.id === cardId);
    if (layout) {
      setResizingCardId(cardId);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        colSpan: layout.colSpan,
        rowSpan: layout.rowSpan,
        edge: edge,
      });
      setPreviewSize({ colSpan: layout.colSpan, rowSpan: layout.rowSpan });
    }
  };

  useEffect(() => {
    if (!resizingCardId || !resizeStart) return;

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
    // Set cursor based on edge
    const cursorMap: { [key: string]: string } = {
      'top-left': 'nwse-resize',
      'top-right': 'nesw-resize',
      'bottom-left': 'nesw-resize',
      'bottom-right': 'nwse-resize',
      'top': 'ns-resize',
      'bottom': 'ns-resize',
      'left': 'ew-resize',
      'right': 'ew-resize',
    };
    document.body.style.cursor = cursorMap[resizeStart.edge] || 'nwse-resize';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      // Get the grid container to calculate actual cell sizes
      const gridContainer = document.querySelector('.grid');
      if (!gridContainer) return;
      
      const containerRect = gridContainer.getBoundingClientRect();
      const gap = 24; // 1.5rem = 24px gap
      
      // Calculate actual cell width and height
      let cols = 3; // Default for lg
      if (window.innerWidth <= 768) cols = 1;
      else if (window.innerWidth <= 1024) cols = 2;
      
      const cellWidth = (containerRect.width - (gap * (cols - 1))) / cols;
      const cellHeight = 300; // Approximate minimum card height
      
      // Calculate delta based on which edge is being dragged
      let colDelta = 0;
      let rowDelta = 0;
      
      if (resizeStart.edge.includes('right')) {
        colDelta = Math.round(deltaX / (cellWidth + gap));
      } else if (resizeStart.edge.includes('left')) {
        colDelta = -Math.round(deltaX / (cellWidth + gap));
      }
      
      if (resizeStart.edge.includes('bottom')) {
        rowDelta = Math.round(deltaY / (cellHeight + gap));
      } else if (resizeStart.edge.includes('top')) {
        rowDelta = -Math.round(deltaY / (cellHeight + gap));
      }
      
      const newColSpan = Math.max(1, Math.min(3, resizeStart.colSpan + colDelta));
      const newRowSpan = Math.max(1, Math.min(2, resizeStart.rowSpan + rowDelta));
      
      // Update preview only, don't apply yet
      setPreviewSize({ colSpan: newColSpan, rowSpan: newRowSpan });
    };

    const handleMouseUp = () => {
      // Apply the preview size
      if (previewSize) {
        setCardLayouts(prevLayouts => {
          const newLayouts = prevLayouts.map(layout => {
            if (layout.id === resizingCardId) {
              return { ...layout, colSpan: previewSize.colSpan, rowSpan: previewSize.rowSpan };
            }
            return layout;
          });
          saveCardLayouts(newLayouts);
          return newLayouts;
        });
      }
      setResizingCardId(null);
      setResizeStart(null);
      setPreviewSize(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [resizingCardId, resizeStart, previewSize, saveCardLayouts]);

  // Color palette for charts
  const CHART_COLORS = [
    '#3f3b39', '#6b6359', '#8b7d6b', '#a99d8f', '#c4b8a8', '#d4c9bb', '#9a8b7a', '#7a6b5a',
  ];

  // Asset class colors for performance chart (darker to lighter)
  const ASSET_CLASS_COLORS: { [key: string]: string } = {
    'Real Estate': '#3f3b39',      // Darkest brown
    'Equities': '#6b6359',          // Dark brown
    'Cash': '#8b7d6b',              // Medium brown
    'Personal Property': '#a99d8f', // Light brown
    'Retirement': '#c4b8a8',        // Lighter brown
  };

  // Sort layouts by order
  const sortedLayouts = [...cardLayouts].sort((a, b) => a.order - b.order);

  const renderCard = (layout: CardLayout) => {
    const isDragging = draggedCardId === layout.id;
    const isDraggedOver = draggedOverCardId === layout.id;
    const isResizing = resizingCardId === layout.id;
    const preview = isResizing && previewSize ? previewSize : null;
    const displayColSpan = preview ? preview.colSpan : layout.colSpan;
    const displayRowSpan = preview ? preview.rowSpan : layout.rowSpan;

    const baseClasses = `bg-white rounded-2xl p-7 shadow-card hover:shadow-card-hover transition-all cursor-move relative group ${
      isDragging ? 'opacity-50' : ''
    } ${isDraggedOver ? 'ring-2 ring-[#3f3b39]' : ''} ${isResizing ? 'select-none' : ''} ${
      preview ? 'ring-2 ring-dashed ring-[#3f3b39]' : ''
    }`;

    const gridStyle = {
      gridColumn: `span ${displayColSpan}`,
      gridRow: `span ${displayRowSpan}`,
    };

    const ResizeHandles = () => (
      <>
        {/* Corner handles */}
        <div
          className="absolute top-0 left-0 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-br"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'top-left')}
          title="Resize"
        />
        <div
          className="absolute top-0 right-0 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-bl"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'top-right')}
          title="Resize"
        />
        <div
          className="absolute bottom-0 left-0 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-nesw-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-tr"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'bottom-left')}
          title="Resize"
        />
        <div
          className="absolute bottom-0 right-0 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity cursor-nwse-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-tl"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'bottom-right')}
          title="Resize"
        />
        {/* Edge handles */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-b"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'top')}
          title="Resize"
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-ns-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-t"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'bottom')}
          title="Resize"
        />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-12 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-r"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'left')}
          title="Resize"
        />
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-12 opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize z-10 bg-gray-200 hover:bg-gray-300 rounded-l"
          onMouseDown={(e) => handleResizeStart(e, layout.id, 'right')}
          title="Resize"
        />
      </>
    );

    switch (layout.id) {
      case 'net-worth':
  return (
          <div
            key={layout.id}
            className={baseClasses}
            style={gridStyle}
            draggable
            onDragStart={(e) => handleDragStart(e, layout.id)}
            onDragOver={(e) => handleDragOver(e, layout.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layout.id)}
            onDragEnd={handleDragEnd}
          >
            <ResizeHandles />
            <p className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">Net Worth</p>
            <p className={`text-4xl font-medium tracking-tight mb-4 ${netWorth >= 0 ? 'text-black' : 'text-red-600'}`}>
            {formatCurrency(netWorth)}
          </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-baseline gap-2">
                <p className="text-xs text-gray-500 font-light">1d</p>
                <p className={`text-sm font-light ${oneDayChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {oneDayChangePercent >= 0 ? '+' : ''}{oneDayChangePercent.toFixed(1)}% ({oneDayChange >= 0 ? '+' : ''}{formatCurrency(oneDayChange)})
                </p>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-xs text-gray-500 font-light">30d</p>
                <p className={`text-sm font-light ${momChangePercent >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {momChangePercent >= 0 ? '+' : ''}{momChangePercent.toFixed(1)}% ({momChange >= 0 ? '+' : ''}{formatCurrency(momChange)})
                </p>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-100 mt-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-light">Total Assets: {formatCurrency(totalAssets)}</p>
                <p className="text-sm text-gray-500 font-light">Total Liabilities: {formatCurrency(totalLiabilities)}</p>
              </div>
            </div>
        </div>
        );

      case 'performance':
        return (
          <div
            key={layout.id}
            className={baseClasses}
            style={gridStyle}
            draggable
            onDragStart={(e) => handleDragStart(e, layout.id)}
            onDragOver={(e) => handleDragOver(e, layout.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layout.id)}
            onDragEnd={handleDragEnd}
          >
            <ResizeHandles />
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Performance</p>
            <div style={{ width: '100%', height: '250px' }}>
              {isClient && performanceData.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart data={performanceData}>
                    <defs>
                      {performanceData.length > 0 && Object.keys(performanceData[0])
                        .filter(key => key !== 'month')
                        .map((className) => {
                          const color = ASSET_CLASS_COLORS[className] || CHART_COLORS[0];
                          return (
                            <linearGradient key={className} id={`gradient-${className.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={color} stopOpacity={0.3}/>
                            </linearGradient>
                          );
                        })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" stroke="#9a9a9a" style={{ fontSize: '12px' }} />
                    <YAxis
                      stroke="#9a9a9a"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                        return `$${value}`;
                      }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '12px' }}
                    />
                    {performanceData.length > 0 && (() => {
                      // Get all asset classes and sort by average value (largest first for bottom layer)
                      const classNames = Object.keys(performanceData[0]).filter(key => key !== 'month');
                      const sortedClasses = classNames.sort((a, b) => {
                        const avgA = performanceData.reduce((sum, point) => sum + ((point[a] as number) || 0), 0) / performanceData.length;
                        const avgB = performanceData.reduce((sum, point) => sum + ((point[b] as number) || 0), 0) / performanceData.length;
                        return avgB - avgA; // Largest first (bottom layer)
                      });
                      
                      return sortedClasses.map((className) => {
                        // Only render if this class has data in at least one point
                        const hasData = performanceData.some(point => (point[className] as number) > 0);
                        if (!hasData) return null;
                        const color = ASSET_CLASS_COLORS[className] || CHART_COLORS[0];
                        return (
                          <Area
                            key={className}
                            type="monotone"
                            dataKey={className}
                            stackId="1"
                            stroke={color}
                            fill={`url(#gradient-${className.replace(/\s+/g, '-')})`}
                            strokeWidth={1}
                          />
                        );
                      });
                    })()}
                    <Legend 
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      iconType="circle"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 font-light text-sm">Loading performance data...</p>
                </div>
              )}
            </div>
      </div>
        );

      case 'liquidity':
        return (
          <div
            key={layout.id}
            className={baseClasses}
            style={gridStyle}
            draggable
            onDragStart={(e) => handleDragStart(e, layout.id)}
            onDragOver={(e) => handleDragOver(e, layout.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layout.id)}
            onDragEnd={handleDragEnd}
          >
            <ResizeHandles />
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Liquidity</p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">Total Assets</p>
                <p className="text-2xl font-medium text-black">{formatCurrency(totalAssets)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">Liquid Assets</p>
                <p className="text-2xl font-medium text-black">{formatCurrency(liquidAssets)}</p>
              </div>
        <div>
                <p className="text-xs text-gray-500 font-light mb-1">Cash Position</p>
                <p className="text-2xl font-medium text-black">{formatCurrency(cashPosition)}</p>
              </div>
            </div>
          </div>
        );

      case 'cash-flow':
        return (
          <div
            key={layout.id}
            className={baseClasses}
            style={gridStyle}
            draggable
            onDragStart={(e) => handleDragStart(e, layout.id)}
            onDragOver={(e) => handleDragOver(e, layout.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layout.id)}
            onDragEnd={handleDragEnd}
          >
            <ResizeHandles />
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Cash Flow</p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">Monthly Income</p>
                <p className="text-2xl font-medium text-black">{formatCurrency(monthlyIncome)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">Monthly Expenses</p>
                <p className="text-2xl font-medium text-black">{formatCurrency(monthlyExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-light mb-1">Savings Rate</p>
                <p className="text-2xl font-medium text-black">{savingsRate.toFixed(1)}%</p>
              </div>
                      <div>
                <p className="text-xs text-gray-500 font-light mb-1">Income to Expense Ratio</p>
                <p className="text-2xl font-medium text-black">{incomeToExpenseRatio.toFixed(2)}x</p>
                      </div>
                    </div>
                  </div>
        );

      case 'asset-allocation':
        return (
          <div
            key={layout.id}
            className={baseClasses}
            style={gridStyle}
            draggable
            onDragStart={(e) => handleDragStart(e, layout.id)}
            onDragOver={(e) => handleDragOver(e, layout.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layout.id)}
            onDragEnd={handleDragEnd}
          >
            <ResizeHandles />
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Asset Allocation</p>
            {isClient && assetAllocationData.length > 0 ? (
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={assetAllocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {assetAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        formatCurrency(value),
                        `${props.payload.name} (${props.payload.percentage.toFixed(1)}%)`
                      ]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend
                      formatter={(value, entry: any) => `${entry.payload.name} (${entry.payload.percentage.toFixed(1)}%)`}
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-gray-400 font-light text-sm">No assets to display</p>
              </div>
            )}
          </div>
        );

      case 'liability-allocation':
        return (
          <div
            key={layout.id}
            className={baseClasses}
            style={gridStyle}
            draggable
            onDragStart={(e) => handleDragStart(e, layout.id)}
            onDragOver={(e) => handleDragOver(e, layout.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, layout.id)}
            onDragEnd={handleDragEnd}
          >
            <ResizeHandles />
            <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">Liability Allocation</p>
            {isClient && liabilityAllocationData.length > 0 ? (
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={liabilityAllocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {liabilityAllocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        formatCurrency(value),
                        `${props.payload.name} (${props.payload.percentage.toFixed(1)}%)`
                      ]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e8e8e8', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend
                      formatter={(value, entry: any) => `${entry.payload.name} (${entry.payload.percentage.toFixed(1)}%)`}
                      wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-gray-400 font-light text-sm">No liabilities to display</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-10" style={{ paddingLeft: 'calc(280px + 1.5rem)' }}>
      <div className="mb-10">
        <h1 className="text-4xl font-medium mb-2 text-black tracking-tight">Overview</h1>
        <p className="text-gray-500 text-[15px] font-light">Your financial summary at a glance</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {sortedLayouts.map(layout => renderCard(layout))}
      </div>
    </div>
  );
}
