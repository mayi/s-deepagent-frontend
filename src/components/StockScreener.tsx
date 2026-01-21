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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// API 基础地址
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    const abortControllerRef = useRef<AbortController | null>(null);

    // 获取选股公式列表
    useEffect(() => {
        const fetchPatterns = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/screener/patterns`);
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

    // 开始选股
    const startScreener = async () => {
        if (!selectedPattern || !user) return;

        setIsRunning(true);
        setError(null);
        setMatchedStocks([]);
        setProgress({ current: 0, total: 0 });

        const token = localStorage.getItem('auth_token');
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(
                `${API_BASE}/api/screener/run?pattern=${selectedPattern}`,
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
            const response = await fetch(`${API_BASE}/api/screener/kline/batch`, {
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
                <span>大阳日: ${stock.base_date} → 信号日: ${stock.signal_date}</span>
            </div>
            <div class="stock-meta">
                ${stock.details?.big_yang_gain ? `<div class="gain">+${stock.details.big_yang_gain}%</div>` : ''}
                <div class="label">大阳涨幅</div>
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

    // 当前选中的公式
    const currentPattern = patterns.find((p) => p.name === selectedPattern);

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
                {(isRunning || matchedStocks.length > 0 || error) && (
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
                                                            大阳日: {stock.base_date} → 信号日: {stock.signal_date}
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
        </div>
    );
}
