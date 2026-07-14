'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Globe, Loader2, Send, Trash2, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Target, BrainCircuit, Rss
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProgressItem {
  message: string;
  timestamp: string;
}

interface HistoryRecord {
  id: number;
  news_preview: string;
  news_content: string;
  result: string | null;
  status: 'pending' | 'completed' | 'failed';
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface BacktestResult {
  asset: string;
  start_price: number;
  end_price: number;
  change_pct: number;
}

interface BacktestScore {
  score: number;
  reasoning: string;
}

const SAMPLE_NEWS = [
  '美国通胀数据低于预期，CPI 同比 3.0% vs 预期 3.2%，市场定价美联储 9 月降息概率升至 70%',
  '中东局势紧张升级，重要产油国遭遇袭击，原油期货价格单日飙升 5%',
  '中美贸易谈判取得积极进展，双方就关税问题达成初步协议',
  '美联储 FOMC 会议声明措辞偏鹰派，暗示年内可能不会降息',
];

export default function MacroAnalysis() {
  const { token, refreshMe } = useAuth();

  // Input State
  const [newsContent, setNewsContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);

  // Result State
  const [currentReport, setCurrentReport] = useState<string>('');
  const [currentRecordId, setCurrentRecordId] = useState<number | null>(null);
  const [analysisError, setAnalysisError] = useState<string>('');

  // History State
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryRecord | null>(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState<number | null>(null);

  // Backtest State
  const [backtestDays, setBacktestDays] = useState<number>(7);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestResults, setBacktestResults] = useState<BacktestResult[] | null>(null);
  const [backtestScore, setBacktestScore] = useState<BacktestScore | null>(null);
  const [backtestError, setBacktestError] = useState<string>('');

  // RSS State
  const [isFetchingRss, setIsFetchingRss] = useState(false);
  const [rssSource, setRssSource] = useState('eeo_finance');

  const eventSourceRef = useRef<EventSource | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Load history on mount
  useEffect(() => {
    if (token) {
      loadHistory();
    }
  }, [token]);

  const loadHistory = useCallback(async () => {
    if (!token) return;
    setIsLoadingHistory(true);
    try {
      const res = await fetch('/api/macro/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.records || []);
      }
    } catch (e) {
      console.error('Failed to load macro history', e);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token]);

  const handleAnalyze = useCallback(async () => {
    const content = newsContent.trim();
    if (!content || isAnalyzing) return;

    // Reset state
    setIsAnalyzing(true);
    setProgressItems([]);
    setCurrentReport('');
    setCurrentRecordId(null);
    setAnalysisError('');
    setSelectedHistory(null);

    try {
      const res = await fetch('/api/macro/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ news_content: content })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = errorData.detail || `请求失败 (${res.status})`;
        setAnalysisError(errorMsg);
        setIsAnalyzing(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) {
        setAnalysisError('无法读取响应流');
        setIsAnalyzing(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const chunk of lines) {
          const line = chunk.replace(/^data: /, '').trim();
          if (!line) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === 'progress') {
              setProgressItems(prev => [...prev, {
                message: event.message,
                timestamp: event.timestamp
              }]);
            } else if (event.type === 'report') {
              setCurrentReport(event.content);
              if (event.record_id) setCurrentRecordId(event.record_id);
              // Refresh points display
              await refreshMe();
            } else if (event.type === 'complete') {
              setIsAnalyzing(false);
              await loadHistory();
            } else if (event.type === 'error') {
              setAnalysisError(event.message);
              setIsAnalyzing(false);
              await refreshMe();
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e: unknown) {
      setAnalysisError(e instanceof Error ? e.message : '网络错误，请检查连接');
      setIsAnalyzing(false);
    }
  }, [newsContent, isAnalyzing, token, loadHistory, refreshMe]);

  const handleDeleteHistory = useCallback(async (recordId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const res = await fetch(`/api/macro/history/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHistory(prev => prev.filter(r => r.id !== recordId));
        if (selectedHistory?.id === recordId) setSelectedHistory(null);
        if (currentRecordId === recordId) {
          setCurrentReport('');
          setCurrentRecordId(null);
          setBacktestResults(null);
          setBacktestScore(null);
        }
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  }, [token, selectedHistory, currentRecordId]);

  const handleViewHistory = useCallback((record: HistoryRecord) => {
    setExpandedHistoryId(prev => prev === record.id ? null : record.id);
    if (record.result) {
      setSelectedHistory(record);
      setCurrentReport(record.result);
      setCurrentRecordId(record.id);
      setAnalysisError('');
      setProgressItems([]);
      setBacktestResults(null);
      setBacktestScore(null);
      setBacktestError('');
    }
  }, []);

  const handleReset = useCallback(() => {
    setCurrentReport('');
    setCurrentRecordId(null);
    setAnalysisError('');
    setProgressItems([]);
    setSelectedHistory(null);
    setNewsContent('');
    setBacktestResults(null);
    setBacktestScore(null);
    setBacktestError('');
    textareaRef.current?.focus();
  }, []);

  const formatTime = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  const hasResult = !!currentReport;

  const handleRunBacktest = useCallback(async (days: number) => {
    if (!currentRecordId || !token) return;
    setBacktestDays(days);
    setIsBacktesting(true);
    setBacktestError('');
    
    try {
      const res = await fetch(`/api/macro/backtest/${currentRecordId}?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setBacktestError(data.detail || data.error || '获取回测数据失败');
      } else {
        setBacktestResults(data.backtest_results);
        setBacktestScore(data.score_data);
      }
    } catch (e: any) {
      setBacktestError(e.message || '网络错误');
    } finally {
      setIsBacktesting(false);
    }
  }, [currentRecordId, token]);

  const handleFetchRss = useCallback(async () => {
    if (!token) return;
    setIsFetchingRss(true);
    setAnalysisError('');
    try {
      const res = await fetch(`/api/macro/rss?source=${rssSource}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalysisError(data.detail || data.error || '获取 RSS 失败');
      } else if (data.success && data.data) {
        setNewsContent(data.data);
      }
    } catch (e: any) {
      setAnalysisError(e.message || '网络错误');
    } finally {
      setIsFetchingRss(false);
    }
  }, [rssSource, token]);

  return (
    <div className="h-full flex gap-4 min-h-0">
      {/* Left Panel: Input + History */}
      <div className="w-80 flex-none flex flex-col gap-3 min-h-0">
        {/* Input Card */}
        <div className="card flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}
            >
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink-100">宏观策略分析</h2>
              <p className="text-xs text-ink-400">200 积分 / 次</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <select
              value={rssSource}
              onChange={(e) => setRssSource(e.target.value)}
              disabled={isAnalyzing || isFetchingRss}
              className="bg-ink-800 border border-ink-700 text-ink-200 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="eeo_finance">经济观察网 (EEO)</option>
              <option value="bloomberg_markets">Bloomberg Markets</option>
              <option value="bloomberg_economics">Bloomberg Economics</option>
            </select>
            <button
              onClick={handleFetchRss}
              disabled={isAnalyzing || isFetchingRss}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-800 hover:bg-ink-700 text-ink-300 text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-ink-700"
            >
              {isFetchingRss ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rss className="w-3 h-3" />}
              获取最新
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={newsContent}
            onChange={e => setNewsContent(e.target.value)}
            placeholder="粘贴或输入财经新闻内容...&#10;&#10;例如：美国通胀数据低于预期，CPI 同比 3.0% vs 预期 3.2%，市场定价美联储 9 月降息概率升至 70%"
            disabled={isAnalyzing}
            rows={7}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-ink-100 placeholder-ink-500 resize-none focus:outline-none focus:ring-2 transition-all"
            style={{
              background: 'rgba(30, 41, 59, 0.8)',
              border: '1px solid rgba(100, 116, 139, 0.3)',
              '--tw-ring-color': 'rgba(99, 102, 241, 0.5)',
            } as React.CSSProperties}
          />

          {/* Sample news chips */}
          <div className="flex flex-col gap-1">
            <p className="text-xs text-ink-500">示例新闻：</p>
            <div className="flex flex-wrap gap-1">
              {SAMPLE_NEWS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setNewsContent(s)}
                  disabled={isAnalyzing}
                  className="text-xs px-2 py-1 rounded-lg text-ink-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors text-left"
                  style={{ border: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  示例 {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <motion.button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !newsContent.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isAnalyzing || !newsContent.trim()
                  ? 'rgba(99, 102, 241, 0.3)'
                  : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                color: 'white',
              }}
              whileHover={!isAnalyzing && newsContent.trim() ? { scale: 1.02 } : {}}
              whileTap={!isAnalyzing && newsContent.trim() ? { scale: 0.98 } : {}}
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" />分析中...</>
              ) : (
                <><Send className="w-4 h-4" />开始分析</>
              )}
            </motion.button>

            {(hasResult || analysisError) && (
              <motion.button
                onClick={handleReset}
                className="px-3 py-2.5 rounded-xl text-ink-400 hover:text-ink-200 hover:bg-ink-700/50 transition-all"
                title="清除重置"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* History Card */}
        <div className="card flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-none">
            <h3 className="text-sm font-semibold text-ink-200 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-ink-400" />
              历史记录
            </h3>
            <button
              onClick={loadHistory}
              disabled={isLoadingHistory}
              className="text-xs text-ink-500 hover:text-indigo-400 transition-colors"
            >
              {isLoadingHistory ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {history.length === 0 && !isLoadingHistory && (
              <p className="text-xs text-ink-500 text-center py-4">暂无历史记录</p>
            )}
            <AnimatePresence>
              {history.map(record => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className={`rounded-xl p-2.5 cursor-pointer transition-all group ${
                    (selectedHistory?.id === record.id || expandedHistoryId === record.id)
                      ? 'bg-indigo-500/10 border border-indigo-500/30'
                      : 'hover:bg-ink-700/50 border border-transparent'
                  }`}
                  onClick={() => handleViewHistory(record)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {record.status === 'completed' ? (
                          <CheckCircle2 className="w-3 h-3 text-jade-400 flex-none" />
                        ) : record.status === 'failed' ? (
                          <XCircle className="w-3 h-3 text-coral-400 flex-none" />
                        ) : (
                          <Loader2 className="w-3 h-3 text-amber-400 animate-spin flex-none" />
                        )}
                        <span className="text-xs text-ink-400">{formatTime(record.created_at)}</span>
                      </div>
                      <p className="text-xs text-ink-300 leading-relaxed line-clamp-2">
                        {record.news_preview}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-none">
                      <button
                        onClick={e => handleDeleteHistory(record.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-ink-500 hover:text-coral-400 transition-all rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {expandedHistoryId === record.id
                        ? <ChevronUp className="w-3 h-3 text-ink-500" />
                        : <ChevronDown className="w-3 h-3 text-ink-500" />
                      }
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Right Panel: Analysis Result */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="card flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Progress */}
          <AnimatePresence>
            {isAnalyzing && progressItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex-none mb-4 space-y-2"
              >
                {progressItems.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2.5 text-sm text-ink-300"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-none animate-pulse" />
                    {item.message}
                  </motion.div>
                ))}
                {isAnalyzing && (
                  <div className="flex items-center gap-2 text-sm text-indigo-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI 正在分析中，请稍候...</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {analysisError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-none mb-4 flex items-start gap-3 p-4 rounded-xl"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <AlertTriangle className="w-5 h-5 text-red-400 flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-400">分析失败</p>
                  <p className="text-xs text-red-400/80 mt-0.5">{analysisError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {!isAnalyzing && !hasResult && !analysisError && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-6"
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)', border: '1px solid rgba(99, 102, 241, 0.3)' }}
                >
                  <Globe className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-ink-200 mb-2">宏观策略新闻分析</h3>
                <p className="text-sm text-ink-400 max-w-sm leading-relaxed">
                  输入财经或地缘政治新闻，AI 将为您分析其对大类资产和 A 股板块的潜在影响
                </p>
              </motion.div>

              <div className="grid grid-cols-3 gap-3 text-xs text-ink-400 max-w-md">
                {[
                  { icon: '💧', label: '流动性分析', desc: '美联储政策·通胀·利率' },
                  { icon: '⚡', label: '风险偏好', desc: '地缘冲突·贸易摩擦' },
                  { icon: '📈', label: '基本面', desc: '经济数据·产业政策' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
                    style={{ background: 'rgba(30, 41, 59, 0.6)', border: '1px solid rgba(100, 116, 139, 0.2)' }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-semibold text-ink-300">{item.label}</span>
                    <span className="text-ink-500 text-center">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report Content */}
          <AnimatePresence>
            {hasResult && (
              <motion.div
                key="report"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 overflow-y-auto"
              >
                <div
                  className="prose prose-invert prose-sm max-w-none"
                  style={{
                    '--tw-prose-body': 'rgb(203 213 225)',
                    '--tw-prose-headings': 'rgb(241 245 249)',
                    '--tw-prose-links': 'rgb(129 140 248)',
                    '--tw-prose-bold': 'rgb(241 245 249)',
                    '--tw-prose-quotes': 'rgb(148 163 184)',
                    '--tw-prose-code': 'rgb(251 191 36)',
                    '--tw-prose-th-borders': 'rgba(100, 116, 139, 0.4)',
                    '--tw-prose-td-borders': 'rgba(100, 116, 139, 0.2)',
                  } as React.CSSProperties}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentReport}
                  </ReactMarkdown>
                </div>
                
                {/* Backtest Section */}
                <div className="mt-8 pt-6 border-t border-ink-700/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-ink-200 flex items-center gap-2">
                      <Target className="w-4 h-4 text-indigo-400" />
                      宏观预测回测
                    </h3>
                    <div className="flex bg-ink-800/80 p-1 rounded-lg border border-ink-700/50">
                      {[1, 3, 7, 14, 30].map(days => (
                        <button
                          key={days}
                          onClick={() => handleRunBacktest(days)}
                          disabled={isBacktesting}
                          className={`px-3 py-1 text-xs rounded-md transition-all ${
                            backtestDays === days 
                              ? 'bg-indigo-500/20 text-indigo-300 font-semibold' 
                              : 'text-ink-400 hover:text-ink-200 hover:bg-ink-700/50'
                          }`}
                        >
                          {days}天
                        </button>
                      ))}
                    </div>
                  </div>

                  {!backtestResults && !isBacktesting && !backtestError && (
                    <div className="text-center py-6 bg-ink-800/30 rounded-xl border border-ink-700/30">
                      <p className="text-sm text-ink-400 mb-3">验证该预测在真实市场的准确度</p>
                      <button
                        onClick={() => handleRunBacktest(backtestDays)}
                        className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm rounded-lg transition-all font-semibold"
                      >
                        运行回测验证
                      </button>
                    </div>
                  )}

                  {isBacktesting && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3 text-ink-400">
                      <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-sm">正在获取市场快照并调用 AI 裁判评分...</span>
                    </div>
                  )}

                  {backtestError && (
                    <div className="p-4 bg-coral-500/10 border border-coral-500/30 rounded-xl text-sm text-coral-400 mt-2">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      {backtestError}
                    </div>
                  )}

                  {backtestResults && backtestScore && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-ink-800/50 border border-ink-700/50">
                          <h4 className="text-xs font-semibold text-ink-400 mb-1">AI 裁判评分</h4>
                          <div className="flex items-end gap-2 mb-2">
                            <span className={`text-3xl font-bold ${
                              backtestScore.score >= 80 ? 'text-jade-400' :
                              backtestScore.score >= 60 ? 'text-amber-400' : 'text-coral-400'
                            }`}>
                              {backtestScore.score}
                            </span>
                            <span className="text-xs text-ink-500 pb-1">/ 100</span>
                          </div>
                          <p className="text-xs text-ink-300 leading-relaxed bg-ink-900/50 p-2 rounded flex items-start gap-2">
                            <BrainCircuit className="w-4 h-4 text-indigo-400 flex-none mt-0.5" />
                            <span>{backtestScore.reasoning}</span>
                          </p>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-ink-700/50 text-ink-400">
                              <th className="font-semibold py-2">资产标的</th>
                              <th className="font-semibold py-2">预测时价格</th>
                              <th className="font-semibold py-2">当前价格</th>
                              <th className="font-semibold py-2 text-right">实际涨跌幅</th>
                            </tr>
                          </thead>
                          <tbody>
                            {backtestResults.map((res, i) => (
                              <tr key={i} className="border-b border-ink-800/50 hover:bg-ink-800/20">
                                <td className="py-2 text-ink-200">{res.asset}</td>
                                <td className="py-2 text-ink-400">{res.start_price}</td>
                                <td className="py-2 text-ink-400">{res.end_price}</td>
                                <td className="py-2 text-right">
                                  <span className={`flex items-center justify-end gap-1 ${
                                    res.change_pct > 0 ? 'text-jade-400' : 
                                    res.change_pct < 0 ? 'text-coral-400' : 'text-ink-400'
                                  }`}>
                                    {res.change_pct > 0 ? <TrendingUp className="w-3 h-3" /> : 
                                     res.change_pct < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                    {res.change_pct > 0 ? '+' : ''}{res.change_pct.toFixed(2)}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
