'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Filter,
    Play,
    Square,
    TrendingUp,
    BarChart3,
    Loader2,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Settings,
    Zap,
    Target,
    Lock,
    Download,
    X,
    RotateCcw,
    ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// 去掉 API_BASE，使用相对路径
// const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Pattern {
    name: string;
    display_name: string;
    description: string;
    category: string;
    params: PatternParam[];
}

interface PatternParam {
    name: string;
    label: string;
    type: string;
    default: any;
    min_value?: number;
    max_value?: number;
    description: string;
}

interface MatchedStock {
    code: string;
    name: string;
    signal_date: string;
    base_date: string;
    details: Record<string, any>;
}

interface ScreenerProgress {
    current: number;
    total: number;
}

interface KlineData {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export default function StockScreener() {
    const { user } = useAuth();
    const [patterns, setPatterns] = useState<Pattern[]>([]);
    const [selectedPattern, setSelectedPattern] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<ScreenerProgress | null>(null);
    const [matchedStocks, setMatchedStocks] = useState<MatchedStock[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [scanCompleted, setScanCompleted] = useState(false);
    const [customParams, setCustomParams] = useState<Record<string, any>>({});
    const [showParams, setShowParams] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // 获取选股公式列表
    useEffect(() => {
        const fetchPatterns = async () => {
            try {
                const res = await fetch(`/api/screener/patterns`);
                const data = await res.json();
                if (data.success && data.patterns) {
                    setPatterns(data.patterns);
                    if (data.patterns.length > 0) {
                        setSelectedPattern(data.patterns[0].name);
                    }
                }
            } catch (err) {
                console.error('获取选股公式失败:', err);
            }
        };
        fetchPatterns();
    }, []);

    // 当选中的公式变化时，初始化参数为默认值
    useEffect(() => {
        const pat = patterns.find((p) => p.name === selectedPattern);
        if (pat) {
            const defaults: Record<string, any> = {};
            pat.params.forEach((p) => { defaults[p.name] = p.default; });
            setCustomParams(defaults);
        }
    }, [selectedPattern, patterns]);

    // 重置参数为默认值
    const resetParams = () => {
        const pat = patterns.find((p) => p.name === selectedPattern);
        if (pat) {
            const defaults: Record<string, any> = {};
            pat.params.forEach((p) => { defaults[p.name] = p.default; });
            setCustomParams(defaults);
        }
    };

    const currentPattern = patterns.find((p) => p.name === selectedPattern);

    // 开始选股
    const startScreener = async () => {
        if (!selectedPattern || !user) return;

        setIsRunning(true);
        setError(null);
        setMatchedStocks([]);
        setProgress({ current: 0, total: 0 });
        setScanCompleted(false);

        const token = localStorage.getItem('auth_token');
        abortControllerRef.current = new AbortController();

        try {
            const paramsStr = Object.keys(customParams).length > 0
                ? `&params=${encodeURIComponent(JSON.stringify(customParams))}`
                : '';
            const response = await fetch(
                `/api/screener/run?pattern=${selectedPattern}${paramsStr}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    signal: abortControllerRef.current.signal,
                }
            );

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) {
                throw new Error('无法读取响应');
            }

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'progress') {
                                setProgress({ current: data.current, total: data.total });
                            } else if (data.type === 'match') {
                                setProgress({ current: data.current, total: data.total });
                                setMatchedStocks((prev) => [...prev, data.stock]);
                            } else if (data.type === 'complete') {
                                setProgress({ current: data.total_scanned, total: data.total_scanned });
                            } else if (data.type === 'error') {
                                setError(data.message);
                            }
                        } catch (e) {
                            // 忽略解析错误
                        }
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError(err.message || '选股过程中发生错误');
            }
        } finally {
            setIsRunning(false);
            setScanCompleted(true);
        }
    };

    // 停止选股
    const stopScreener = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        setIsRunning(false);
    };

    // 导出状态
    const [isExporting, setIsExporting] = useState(false);

    // 导出HTML报告
    const exportToHTML = async () => {
        if (matchedStocks.length === 0) return;

        setIsExporting(true);
        const token = localStorage.getItem('auth_token');

        try {
            // 获取K线数据
            const codes = matchedStocks.map(s => s.code);
            const response = await fetch(`/api/screener/kline/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ codes, days: 30 }),
            });

            const { data: klineData } = await response.json();

            // 生成HTML
            const patternName = currentPattern?.display_name || '量化选股';
            const today = new Date().toISOString().split('T')[0];

            const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${patternName} - 选股结果 (${today})</title>
    <script src="https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #e2e8f0;
            min-height: 100vh;
            padding: 2rem;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(251, 191, 36, 0.3);
        }
        .header h1 { color: #fbbf24; font-size: 2rem; margin-bottom: 0.5rem; }
        .header p { color: #94a3b8; }
        .stock-card {
            background: rgba(30, 41, 59, 0.8);
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            border: 1px solid rgba(71, 85, 105, 0.5);
        }
        .stock-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        .stock-info h2 { color: #fbbf24; font-size: 1.25rem; }
        .stock-info span { color: #94a3b8; font-size: 0.875rem; }
        .stock-meta { text-align: right; }
        .stock-meta .gain { color: #f87171; font-size: 1.5rem; font-weight: bold; }
        .stock-meta .label { color: #64748b; font-size: 0.75rem; }
        .chart { width: 100%; height: 400px; }
        .dates { color: #64748b; font-size: 0.875rem; margin-top: 0.5rem; }
        .footer { text-align: center; margin-top: 2rem; color: #64748b; font-size: 0.875rem; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📈 ${patternName}</h1>
        <p>生成时间: ${new Date().toLocaleString('zh-CN')} | 共 ${matchedStocks.length} 只股票</p>
    </div>

    ${matchedStocks.map((stock, index) => {
                const kline = klineData[stock.code] || [];
                return `
    <div class="stock-card">
        <div class="stock-header">
            <div class="stock-info">
                <h2>${stock.code} ${stock.name}</h2>
                <span>${stock.base_date} → ${stock.signal_date}</span>
            </div>
            <div class="stock-meta">
                ${stock.details?.big_yang_gain ? `<div class="gain">+${stock.details.big_yang_gain}%</div><div class="label">大阳涨幅</div>` : ''}
                ${stock.details?.total_gain ? `<div class="gain">+${stock.details.total_gain}%</div><div class="label">${stock.details.consecutive_days || ''}天量价齐升</div>` : ''}
            </div>
        </div>
        <div class="chart" id="chart-${index}"></div>
    </div>`;
            }).join('')}

    <div class="footer">
        <p>由 AstraShare 量化选股系统生成</p>
    </div>

    <script>
        const klineData = ${JSON.stringify(klineData)};
        const stocks = ${JSON.stringify(matchedStocks)};
        
        stocks.forEach((stock, index) => {
            const kline = klineData[stock.code] || [];
            if (kline.length === 0) return;
            
            const chartDom = document.getElementById('chart-' + index);
            if (!chartDom) return;
            
            const chart = echarts.init(chartDom, 'dark');
            
            const dates = kline.map(k => k.date);
            const ohlc = kline.map(k => [k.open, k.close, k.low, k.high]);
            const volumes = kline.map(k => k.volume);
            
            // 标记大阳日和信号日
            const baseIdx = dates.indexOf(stock.base_date);
            const signalIdx = dates.indexOf(stock.signal_date);
            
            const markPoints = [];
            if (baseIdx >= 0) markPoints.push({ coord: [baseIdx, kline[baseIdx].high], value: '大阳', itemStyle: { color: '#f87171' } });
            if (signalIdx >= 0) markPoints.push({ coord: [signalIdx, kline[signalIdx].high], value: '信号', itemStyle: { color: '#4ade80' } });
            
            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
                grid: [
                    { left: 50, right: 50, top: 30, height: '55%' },
                    { left: 50, right: 50, top: '72%', height: '18%' }
                ],
                xAxis: [
                    { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false } },
                    { type: 'category', data: dates, gridIndex: 1 }
                ],
                yAxis: [
                    { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#334155' } } },
                    { scale: true, gridIndex: 1, splitLine: { show: false } }
                ],
                series: [
                    {
                        name: 'K线',
                        type: 'candlestick',
                        data: ohlc,
                        xAxisIndex: 0,
                        yAxisIndex: 0,
                        itemStyle: { color: '#f87171', color0: '#4ade80', borderColor: '#f87171', borderColor0: '#4ade80' },
                        markPoint: { data: markPoints, symbol: 'pin', symbolSize: 40 }
                    },
                    {
                        name: '成交量',
                        type: 'bar',
                        data: volumes,
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        itemStyle: { color: '#64748b' }
                    }
                ]
            });
        });
    </script>
</body>
</html>`;

            // 下载文件
            const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${patternName}_${today}.html`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('导出失败:', err);
        } finally {
            setIsExporting(false);
        }
    };

    // K线弹窗状态
    const [chartModalStock, setChartModalStock] = useState<MatchedStock | null>(null);
    const [chartKlineData, setChartKlineData] = useState<KlineData[]>([]);
    const [isLoadingChart, setIsLoadingChart] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // 打开K线弹窗
    const openChartModal = async (stock: MatchedStock) => {
        setChartModalStock(stock);
        setIsLoadingChart(true);
        setChartKlineData([]);

        const token = localStorage.getItem('auth_token');
        try {
            const response = await fetch(`/api/screener/kline/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ codes: [stock.code], days: 60 }),
            });
            const { data } = await response.json();
            if (data && data[stock.code]) {
                setChartKlineData(data[stock.code]);
            }
        } catch (err) {
            console.error('获取K线数据失败:', err);
        } finally {
            setIsLoadingChart(false);
        }
    };

    // 渲染ECharts
    useEffect(() => {
        if (!chartModalStock || chartKlineData.length === 0 || !chartContainerRef.current) return;

        // 动态导入 ECharts
        import('echarts').then((echarts) => {
            const chart = echarts.init(chartContainerRef.current!, 'dark');

            const dates = chartKlineData.map((k) => k.date);
            const ohlc = chartKlineData.map((k) => [k.open, k.close, k.low, k.high]);
            const volumes = chartKlineData.map((k) => k.volume);

            // 标记大阳日和信号日
            const baseIdx = dates.indexOf(chartModalStock.base_date);
            const signalIdx = dates.indexOf(chartModalStock.signal_date);

            const markPoints: any[] = [];
            if (baseIdx >= 0) markPoints.push({ coord: [baseIdx, chartKlineData[baseIdx].high], value: '大阳', itemStyle: { color: '#f87171' } });
            if (signalIdx >= 0) markPoints.push({ coord: [signalIdx, chartKlineData[signalIdx].high], value: '信号', itemStyle: { color: '#4ade80' } });

            chart.setOption({
                backgroundColor: 'transparent',
                tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
                grid: [
                    { left: 60, right: 30, top: 40, height: '55%' },
                    { left: 60, right: 30, top: '72%', height: '18%' },
                ],
                xAxis: [
                    { type: 'category', data: dates, gridIndex: 0, axisLabel: { show: false } },
                    { type: 'category', data: dates, gridIndex: 1 },
                ],
                yAxis: [
                    { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#334155' } } },
                    { scale: true, gridIndex: 1, splitLine: { show: false } },
                ],
                series: [
                    {
                        name: 'K线',
                        type: 'candlestick',
                        data: ohlc,
                        xAxisIndex: 0,
                        yAxisIndex: 0,
                        itemStyle: { color: '#f87171', color0: '#4ade80', borderColor: '#f87171', borderColor0: '#4ade80' },
                        markPoint: { data: markPoints, symbol: 'pin', symbolSize: 40, label: { color: '#fff' } },
                    },
                    {
                        name: '成交量',
                        type: 'bar',
                        data: volumes,
                        xAxisIndex: 1,
                        yAxisIndex: 1,
                        itemStyle: { color: '#64748b' },
                    },
                ],
            });

            // 响应窗口变化
            const handleResize = () => chart.resize();
            window.addEventListener('resize', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                chart.dispose();
            };
        });
    }, [chartModalStock, chartKlineData]);

    // 未登录状态
    if (!user) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-12 text-center"
            >
                <motion.div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
                    style={{
                        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
                        border: '1px solid rgba(251, 191, 36, 0.2)',
                    }}
                    animate={{
                        boxShadow: [
                            '0 0 0 0 rgba(251, 191, 36, 0)',
                            '0 0 40px 10px rgba(251, 191, 36, 0.1)',
                            '0 0 0 0 rgba(251, 191, 36, 0)',
                        ],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                >
                    <Lock className="w-12 h-12 text-amber-400" />
                </motion.div>
                <h2 className="text-2xl font-bold text-ink-100 mb-4 font-display">
                    量化选股需要登录
                </h2>
                <p className="text-ink-400 mb-8 max-w-md mx-auto">
                    量化选股是高级功能，可以批量扫描全市场股票，筛选符合特定形态的股票。登录后即可使用此功能。
                </p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 公式选择区 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30">
                            <Filter className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-ink-100 font-display">量化选股</h2>
                            <p className="text-sm text-ink-400">选择形态公式，全市场智能扫描</p>
                        </div>
                    </div>
                </div>

                {/* 公式列表 */}
                <div className="grid gap-4">
                    {patterns.map((pattern) => (
                        <motion.button
                            key={pattern.name}
                            onClick={() => setSelectedPattern(pattern.name)}
                            className={`p-4 rounded-xl border text-left transition-all ${selectedPattern === pattern.name
                                ? 'bg-amber-500/10 border-amber-500/40'
                                : 'bg-ink-800/50 border-ink-600/50 hover:border-ink-500'
                                }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`p-2 rounded-lg ${pattern.category === 'bullish'
                                            ? 'bg-coral-500/10 text-coral-400'
                                            : 'bg-jade-500/10 text-jade-400'
                                            }`}
                                    >
                                        {pattern.category === 'bullish' ? (
                                            <TrendingUp className="w-5 h-5" />
                                        ) : (
                                            <BarChart3 className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-ink-100">{pattern.display_name}</h3>
                                        <p className="text-sm text-ink-400 mt-0.5">{pattern.description}</p>
                                    </div>
                                </div>
                                {selectedPattern === pattern.name && (
                                    <CheckCircle className="w-5 h-5 text-amber-400" />
                                )}
                            </div>
                        </motion.button>
                    ))}
                </div>

                {/* 参数调整区 */}
                {currentPattern && currentPattern.params.length > 0 && (
                    <div className="mt-4">
                        <motion.button
                            onClick={() => setShowParams(!showParams)}
                            className="flex items-center gap-2 text-sm text-ink-400 hover:text-ink-200 transition-colors mb-3"
                        >
                            <Settings className="w-4 h-4" />
                            <span>参数调整</span>
                            <motion.div animate={{ rotate: showParams ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown className="w-4 h-4" />
                            </motion.div>
                        </motion.button>

                        <AnimatePresence>
                            {showParams && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="overflow-hidden"
                                >
                                    <div className="p-4 bg-ink-800/60 rounded-xl border border-ink-600/40 space-y-5">
                                        {currentPattern.params.map((param) => (
                                            <div key={param.name}>
                                                {param.type === 'bool' ? (
                                                    /* 布尔型：开关 */
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <span className="text-sm font-medium text-ink-200">{param.label}</span>
                                                            {param.description && (
                                                                <p className="text-xs text-ink-500 mt-0.5">{param.description}</p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                setCustomParams((prev) => ({ ...prev, [param.name]: !prev[param.name] }))
                                                            }
                                                            className={`relative w-11 h-6 rounded-full transition-colors ${customParams[param.name]
                                                                ? 'bg-amber-500/60'
                                                                : 'bg-ink-600'
                                                                }`}
                                                        >
                                                            <motion.div
                                                                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
                                                                animate={{ left: customParams[param.name] ? '22px' : '2px' }}
                                                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                            />
                                                        </button>
                                                    </div>
                                                ) : (param.type === 'int' || param.type === 'float') && param.min_value != null && param.max_value != null ? (
                                                    /* 数值型（有范围）：滑块 */
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-sm font-medium text-ink-200">{param.label}</span>
                                                            <span className="text-sm font-mono text-amber-400 font-semibold">
                                                                {customParams[param.name] ?? param.default}
                                                                {param.label.includes('%') ? '%' : ''}
                                                            </span>
                                                        </div>
                                                        {param.description && (
                                                            <p className="text-xs text-ink-500 mb-2">{param.description}</p>
                                                        )}
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs text-ink-500 font-mono w-8 text-right">{param.min_value}</span>
                                                            <input
                                                                type="range"
                                                                min={param.min_value}
                                                                max={param.max_value}
                                                                step={param.type === 'int' ? 1 : 0.1}
                                                                value={customParams[param.name] ?? param.default}
                                                                onChange={(e) => {
                                                                    const val = param.type === 'int'
                                                                        ? parseInt(e.target.value)
                                                                        : parseFloat(e.target.value);
                                                                    setCustomParams((prev) => ({ ...prev, [param.name]: val }));
                                                                }}
                                                                className="flex-1 h-1.5 rounded-full appearance-none bg-ink-600 accent-amber-500 cursor-pointer
                                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                                                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-400
                                                                    [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                                                            />
                                                            <span className="text-xs text-ink-500 font-mono w-8">{param.max_value}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* 其他类型：文本输入 */
                                                    <div>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-sm font-medium text-ink-200">{param.label}</span>
                                                        </div>
                                                        {param.description && (
                                                            <p className="text-xs text-ink-500 mb-2">{param.description}</p>
                                                        )}
                                                        <input
                                                            type="text"
                                                            value={customParams[param.name] ?? param.default}
                                                            onChange={(e) =>
                                                                setCustomParams((prev) => ({ ...prev, [param.name]: e.target.value }))
                                                            }
                                                            className="w-full px-3 py-1.5 bg-ink-700/80 border border-ink-600 rounded-lg text-sm text-ink-200 focus:outline-none focus:border-amber-500/50"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* 恢复默认 */}
                                        <div className="pt-2 border-t border-ink-600/40">
                                            <button
                                                onClick={resetParams}
                                                className="flex items-center gap-1.5 text-xs text-ink-400 hover:text-amber-400 transition-colors"
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                                恢复默认参数
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* 开始按钮 */}
                <div className="mt-6 flex gap-3">
                    {!isRunning ? (
                        <motion.button
                            onClick={startScreener}
                            disabled={!selectedPattern || isLoading}
                            className="btn-primary flex items-center gap-2 px-6"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Play className="w-4 h-4" />
                            开始选股
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={stopScreener}
                            className="px-6 py-2.5 bg-coral-500/20 text-coral-400 border border-coral-500/40 rounded-xl font-semibold flex items-center gap-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Square className="w-4 h-4" />
                            停止扫描
                        </motion.button>
                    )}
                </div>
            </motion.div>

            {/* 进度和结果区 */}
            <AnimatePresence>
                {(isRunning || matchedStocks.length > 0 || error || scanCompleted) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="card p-6"
                    >
                        {/* 进度条 */}
                        {progress && progress.total > 0 && (
                            <div className="mb-6">
                                <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-ink-400 flex items-center gap-2">
                                        {isRunning ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 text-jade-400" />
                                        )}
                                        {isRunning ? '扫描中...' : '扫描完成'}
                                    </span>
                                    <span className="text-ink-300 font-mono">
                                        {progress.current} / {progress.total}
                                    </span>
                                </div>
                                <div className="h-2 bg-ink-700 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                                        initial={{ width: 0 }}
                                        animate={{
                                            width: `${(progress.current / progress.total) * 100}%`,
                                        }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* 错误提示 */}
                        {error && (
                            <div className="p-4 bg-coral-500/10 border border-coral-500/30 rounded-xl flex items-center gap-3 mb-6">
                                <AlertCircle className="w-5 h-5 text-coral-400 flex-shrink-0" />
                                <span className="text-coral-300">{error}</span>
                            </div>
                        )}

                        {/* 无结果提示 */}
                        {!isRunning && scanCompleted && matchedStocks.length === 0 && !error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-8 text-center"
                            >
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-ink-700/50 border border-ink-600/50">
                                    <Filter className="w-8 h-8 text-ink-500" />
                                </div>
                                <h3 className="text-lg font-semibold text-ink-300 mb-2">未发现符合条件的股票</h3>
                                <p className="text-sm text-ink-500 max-w-md mx-auto">
                                    本次扫描共检测 {progress?.total || 0} 只股票，没有找到符合当前形态条件的标的。可以尝试调整参数后重新扫描。
                                </p>
                            </motion.div>
                        )}

                        {/* 结果列表 */}
                        {matchedStocks.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-ink-100 flex items-center gap-2">
                                        <Target className="w-5 h-5 text-jade-400" />
                                        发现 {matchedStocks.length} 只符合条件的股票
                                    </h3>
                                    <motion.button
                                        onClick={exportToHTML}
                                        disabled={isExporting}
                                        className="px-4 py-2 bg-jade-500/20 text-jade-400 border border-jade-500/40 rounded-xl font-medium flex items-center gap-2 hover:bg-jade-500/30 transition-colors disabled:opacity-50"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        {isExporting ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Download className="w-4 h-4" />
                                        )}
                                        {isExporting ? '导出中...' : '导出HTML报告'}
                                    </motion.button>
                                </div>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {matchedStocks.map((stock, index) => (
                                        <motion.div
                                            key={`${stock.code}-${index}`}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => openChartModal(stock)}
                                            className="p-4 bg-ink-800/60 rounded-xl border border-ink-600/50 hover:border-jade-500/30 transition-colors group cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 rounded-lg bg-jade-500/10">
                                                        <Zap className="w-4 h-4 text-jade-400" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-amber-400 font-semibold">
                                                                {stock.code}
                                                            </span>
                                                            <span className="text-ink-100 font-medium">{stock.name}</span>
                                                        </div>
                                                        <div className="text-sm text-ink-400 mt-1">
                                                            {stock.base_date} → {stock.signal_date}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {stock.details?.big_yang_gain && (
                                                        <div className="text-right">
                                                            <div className="text-coral-400 font-bold font-mono">
                                                                +{stock.details.big_yang_gain}%
                                                            </div>
                                                            <div className="text-xs text-ink-500">大阳涨幅</div>
                                                        </div>
                                                    )}
                                                    {stock.details?.total_gain && !stock.details?.big_yang_gain && (
                                                        <div className="text-right">
                                                            <div className="text-coral-400 font-bold font-mono">
                                                                +{stock.details.total_gain}%
                                                            </div>
                                                            <div className="text-xs text-ink-500">
                                                                {stock.details.consecutive_days}天量价齐升 · 量比{stock.details.volume_ratio}x
                                                            </div>
                                                        </div>
                                                    )}
                                                    <ChevronRight className="w-5 h-5 text-ink-500 group-hover:text-ink-300 transition-colors" />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* K线弹窗 */}
            <AnimatePresence>
                {chartModalStock && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setChartModalStock(null)}
                    >
                        {/* 背景遮罩 */}
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

                        {/* Modal 内容 */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative w-full max-w-4xl bg-ink-800 rounded-2xl border border-ink-600 shadow-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-ink-600">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-jade-500/10">
                                        <TrendingUp className="w-5 h-5 text-jade-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-ink-100">
                                            {chartModalStock.code} {chartModalStock.name}
                                        </h3>
                                        <p className="text-sm text-ink-400">
                                            {chartModalStock.base_date} → {chartModalStock.signal_date}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setChartModalStock(null)}
                                    className="p-2 rounded-lg hover:bg-ink-700 text-ink-400 hover:text-ink-200 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Chart Area */}
                            <div className="p-4">
                                {isLoadingChart ? (
                                    <div className="flex items-center justify-center h-96">
                                        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
                                    </div>
                                ) : chartKlineData.length === 0 ? (
                                    <div className="flex items-center justify-center h-96 text-ink-400">
                                        暂无K线数据
                                    </div>
                                ) : (
                                    <div ref={chartContainerRef} className="w-full h-96" />
                                )}
                            </div>

                            {/* Footer */}
                            {(chartModalStock.details?.big_yang_gain || chartModalStock.details?.total_gain) && (
                                <div className="px-4 pb-4">
                                    <div className="flex items-center gap-4 p-3 bg-ink-700/50 rounded-xl flex-wrap">
                                        {chartModalStock.details?.big_yang_gain && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-ink-400">大阳涨幅:</span>
                                                <span className="text-lg font-bold text-coral-400 font-mono">
                                                    +{chartModalStock.details.big_yang_gain}%
                                                </span>
                                            </div>
                                        )}
                                        {chartModalStock.details?.total_gain && !chartModalStock.details?.big_yang_gain && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-ink-400">累计涨幅:</span>
                                                    <span className="text-lg font-bold text-coral-400 font-mono">
                                                        +{chartModalStock.details.total_gain}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-ink-400">连续天数:</span>
                                                    <span className="text-lg font-bold text-amber-400 font-mono">
                                                        {chartModalStock.details.consecutive_days}天
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-ink-400">量比:</span>
                                                    <span className="text-lg font-bold text-amber-400 font-mono">
                                                        {chartModalStock.details.volume_ratio}x
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
