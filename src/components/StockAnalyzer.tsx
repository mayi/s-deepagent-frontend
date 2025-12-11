'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ProgressEvent {
  type: 'progress' | 'report' | 'complete' | 'error';
  agent?: string;
  message?: string;
  content?: string;
  timestamp?: string;
}

interface AgentStatus {
  name: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  message?: string;
}

interface StockValidation {
  valid: boolean;
  message: string;
  stock_name: string;
  stock_code: string;
}

interface StockSearchResult {
  code: string;
  name: string;
}

export default function StockAnalyzer() {
  const { token } = useAuth();
  const [stockCode, setStockCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<StockValidation | null>(null);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [markdownReport, setMarkdownReport] = useState('');
  const [agents, setAgents] = useState<AgentStatus[]>([
    { name: '主分析师', status: 'pending' },
    { name: '技术分析师', status: 'pending' },
    { name: '基本面分析师', status: 'pending' },
    { name: '情绪分析师', status: 'pending' },
  ]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  const updateAgentStatus = (agentName: string, status: AgentStatus['status'], message?: string) => {
    setAgents(prev =>
      prev.map(agent =>
        agent.name === agentName ? { ...agent, status, message } : agent
      )
    );
  };

  // 搜索股票
  const searchStocks = async (keyword: string) => {
    if (!keyword.trim() || keyword.length < 1) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const response = await fetch(`/api/stock/search?keyword=${encodeURIComponent(keyword)}&limit=10`);
      const data = await response.json();
      
      if (data.success && data.stocks) {
        setSearchResults(data.stocks);
        setShowSearchResults(data.stocks.length > 0);
      }
    } catch (error) {
      console.error('搜索股票失败:', error);
    }
  };

  // 选择搜索结果
  const selectStock = (stock: StockSearchResult) => {
    setStockCode(stock.code);
    setShowSearchResults(false);
    setValidation({
      valid: true,
      message: '股票代码有效',
      stock_name: stock.name,
      stock_code: stock.code
    });
  };

  // 股票代码验证 (防抖)
  const validateStock = async (code: string) => {
    if (!code.trim() || code.length < 6) {
      setValidation(null);
      return;
    }

    setIsValidating(true);
    try {
      const response = await fetch(`/api/stock/validate?code=${encodeURIComponent(code)}`);
      const data: StockValidation = await response.json();
      setValidation(data);
    } catch (error) {
      setValidation({
        valid: false,
        message: '验证失败，请检查网络连接',
        stock_name: '',
        stock_code: code
      });
    } finally {
      setIsValidating(false);
    }
  };

  // 股票代码输入处理（带防抖验证和搜索）
  const handleStockCodeChange = (value: string) => {
    setStockCode(value);
    setValidation(null);
    
    // 清除之前的定时器
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // 搜索股票（300ms防抖）
    if (value.length >= 1) {
      searchTimeoutRef.current = setTimeout(() => {
        searchStocks(value);
      }, 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
    
    // 验证股票代码（500ms防抖）
    if (value.length >= 6) {
      validationTimeoutRef.current = setTimeout(() => {
        validateStock(value);
      }, 500);
    }
  };

  // 点击外部关闭搜索结果
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnalyze = async () => {
    if (!stockCode.trim()) {
      alert('请输入股票代码');
      return;
    }

    // 如果还没验证过，先验证
    if (!validation) {
      await validateStock(stockCode);
      // 获取最新验证结果
      const response = await fetch(`/api/stock/validate?code=${encodeURIComponent(stockCode)}`);
      const validationResult: StockValidation = await response.json();
      if (!validationResult.valid) {
        setValidation(validationResult);
        return;
      }
    } else if (!validation.valid) {
      return;
    }

    setIsAnalyzing(true);
    setProgress([]);
    setMarkdownReport('');
    setAgents(agents.map(a => ({ ...a, status: 'pending', message: undefined })));

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Create new EventSource connection with auth token
    
    // 注意: EventSource 不支持自定义headers，所以我们使用fetch + SSE
    // 对于需要认证的场景，使用fetch streaming
    try {
      const response = await fetch(`/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ stock_code: stockCode }),
      });
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('无法读取响应');
      }

      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: ProgressEvent = JSON.parse(line.slice(6));
              
              setProgress(prev => [...prev, data]);

              if (data.type === 'progress' && data.agent) {
                const agentMap: Record<string, string> = {
                  'main': '主分析师',
                  'technical': '技术分析师',
                  'fundamental': '基本面分析师',
                  'sentiment': '情绪分析师',
                };
                const agentName = agentMap[data.agent];
                if (agentName) {
                  updateAgentStatus(agentName, 'running', data.message);
                }
              } else if (data.type === 'report') {
                // 接收到最终的 Markdown 报告
                setMarkdownReport(data.content || '');
                agents.forEach(agent => {
                  updateAgentStatus(agent.name, 'complete');
                });
              } else if (data.type === 'complete') {
                setIsAnalyzing(false);
              } else if (data.type === 'error') {
                setIsAnalyzing(false);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      setIsAnalyzing(false);
      setProgress(prev => [
        ...prev,
        { type: 'error', message: '连接服务器失败，请确保后端服务已启动' },
      ]);
    }
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="flex gap-4">
          <div className="flex-1 relative" ref={searchInputRef}>
            <div className="relative">
              <input
                type="text"
                value={stockCode}
                onChange={(e) => handleStockCodeChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !isAnalyzing && handleAnalyze()}
                onFocus={() => stockCode.length >= 1 && searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="输入股票代码或名称，如: 000001, 平安银行"
                disabled={isAnalyzing}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 ${
                  validation?.valid === false
                    ? 'border-red-400 dark:border-red-500'
                    : validation?.valid === true
                    ? 'border-green-400 dark:border-green-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {/* 验证状态指示器 */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isValidating ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : validation?.valid === true ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : validation?.valid === false ? (
                  <XCircle className="w-5 h-5 text-red-500" />
                ) : null}
              </div>
            </div>
            
            {/* 搜索结果下拉框 */}
            <AnimatePresence>
              {showSearchResults && searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-700 rounded-xl shadow-xl border border-gray-200 dark:border-gray-600 max-h-64 overflow-y-auto"
                >
                  {searchResults.map((stock, index) => (
                    <button
                      key={stock.code}
                      onClick={() => selectStock(stock)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-between ${
                        index > 0 ? 'border-t border-gray-100 dark:border-gray-600' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {stock.code}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {stock.name}
                        </span>
                      </div>
                      <Search className="w-4 h-4 text-gray-400" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* 验证消息 */}
            {validation && !showSearchResults && (
              <div className={`mt-2 text-sm flex items-center gap-1 ${
                validation.valid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {validation.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>已验证: {validation.stock_name || validation.stock_code}</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    <span>{validation.message}</span>
                  </>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || (validation !== null && !validation.valid)}
            className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                分析中...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                开始分析
              </>
            )}
          </button>
        </div>
      </motion.div>

      {/* Agent Status Section */}
      {isAnalyzing || progress.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            分析进度
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  agent.status === 'running'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : agent.status === 'complete'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : agent.status === 'error'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {agent.status === 'running' ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  ) : agent.status === 'complete' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  ) : agent.status === 'error' ? (
                    <XCircle className="w-5 h-5 text-red-500" />
                  ) : (
                    <Clock className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {agent.name}
                    </p>
                    {agent.message && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {agent.message}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Progress Messages */}
          <div className="mt-6 max-h-48 overflow-y-auto space-y-2">
            <AnimatePresence>
              {progress.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"
                >
                  <span className="text-gray-400 dark:text-gray-600 font-mono text-xs mt-0.5">
                    {new Date().toLocaleTimeString('zh-CN', { hour12: false })}
                  </span>
                  <span className="flex-1">{event.message}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}

      {/* Result Section */}
      {markdownReport && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            分析报告
          </h2>
          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-blue-600 prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:list-disc prose-ol:list-decimal">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdownReport}
            </ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
}
