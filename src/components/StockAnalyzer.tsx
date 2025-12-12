'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, History, Trash2, RefreshCw, FileText, ArrowLeft, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TaskProgressItem {
  agent?: string;
  message?: string;
  timestamp?: string;
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

interface AnalysisTask {
  task_id: string;
  stock_code: string;
  stock_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}
type ViewMode = 'input' | 'history' | 'result';

export default function StockAnalyzer() {
  const { token } = useAuth();
  const [stockCode, setStockCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<StockValidation | null>(null);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());
  const tasksRef = useRef<AnalysisTask[]>([]);

  const [viewMode, setViewMode] = useState<ViewMode>('input');
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState<AnalysisTask | null>(null);
  const [taskResult, setTaskResult] = useState<string>('');
  const [taskProgress, setTaskProgress] = useState<TaskProgressItem[]>([]);
  const [submittedTaskId, setSubmittedTaskId] = useState<string | null>(null);

  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>(() => {
    if (typeof window === 'undefined') return 'unsupported';
    if (typeof Notification === 'undefined') return 'unsupported';
    return Notification.permission;
  });

  // 加载历史任务
  const loadTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    try {
      const response = await fetch('/api/analyze/history', {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      const data = await response.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('加载历史任务失败:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  }, [token]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      setNotificationPermission('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch {
      setNotificationPermission('denied');
    }
  };

  const maybeNotifyTask = useCallback((task: AnalysisTask) => {
    if (notificationPermission !== 'granted') return;
    if (typeof Notification === 'undefined') return;
    if (notifiedRef.current.has(task.task_id)) return;

    const title = task.status === 'completed'
      ? `分析完成：${task.stock_code} ${task.stock_name || ''}`.trim()
      : `分析失败：${task.stock_code} ${task.stock_name || ''}`.trim();

    const body = task.status === 'completed'
      ? '点击查看分析报告'
      : (task.error_message || '任务执行失败');

    try {
      const n = new Notification(title, { body });
      n.onclick = () => {
        window.focus();
        setViewMode('result');
        setSelectedTask(task);
      };
      notifiedRef.current.add(task.task_id);
    } catch {
      // ignore
    }
  }, [notificationPermission]);

  // 查看任务结果
  const viewTaskResult = async (task: AnalysisTask) => {
    setSelectedTask(task);
    setViewMode('result');
    setTaskResult('');
    setTaskProgress([]);

    // 进入详情页时，主动刷新一次状态和结果
    await refreshSelectedTask(task.task_id);
  };

  const refreshSelectedTask = useCallback(async (taskId: string) => {
    try {
      const statusRes = await fetch(`/api/analyze/status/${taskId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (!statusRes.ok) return;
      const statusData = await statusRes.json();

      setTaskProgress(Array.isArray(statusData.progress) ? statusData.progress : []);

      setTasks(prev => prev.map(t =>
        t.task_id === taskId
          ? {
              ...t,
              status: statusData.status,
              completed_at: statusData.completed_at,
              error_message: statusData.error_message,
            }
          : t
      ));

      setSelectedTask(prev => {
        if (!prev || prev.task_id !== taskId) return prev;
        return {
          ...prev,
          status: statusData.status,
          completed_at: statusData.completed_at,
          error_message: statusData.error_message,
        };
      });

      if (statusData.status === 'completed') {
        const res = await fetch(`/api/analyze/result/${taskId}`, {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        });
        const data = await res.json();
        if (data.status === 'completed' && data.result) {
          setTaskResult(data.result);
        }
      }
    } catch (error) {
      console.error('刷新任务详情失败:', error);
    }
  }, [token]);

  // 删除任务
  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/analyze/task/${taskId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (response.ok) {
        setTasks(prev => prev.filter(t => t.task_id !== taskId));
        if (selectedTask?.task_id === taskId) {
          setSelectedTask(null);
          setViewMode('history');
          setTaskResult('');
          setTaskProgress([]);
        }
      }
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  };

  // 轮询任务状态
  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/analyze/status/${taskId}`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      if (!response.ok) return;
      const data = await response.json();

      const existingTask = tasksRef.current.find(t => t.task_id === taskId);
      const notifyCandidate: AnalysisTask | null = existingTask
        ? {
            ...existingTask,
            status: data.status,
            completed_at: data.completed_at,
            error_message: data.error_message,
          }
        : null;
      setTasks(prev => prev.map(t => {
        if (t.task_id !== taskId) return t;
        return {
          ...t,
          status: data.status,
          completed_at: data.completed_at,
          error_message: data.error_message,
        };
      }));

      if (selectedTask?.task_id === taskId) {
        setTaskProgress(Array.isArray(data.progress) ? data.progress : []);
        if (data.status === 'completed') {
          await refreshSelectedTask(taskId);
        }
      }

      if (notifyCandidate && (notifyCandidate.status === 'completed' || notifyCandidate.status === 'failed')) {
        maybeNotifyTask(notifyCandidate);
      }
    } catch (error) {
      console.error('轮询任务状态失败:', error);
    }
  }, [token, selectedTask?.task_id, refreshSelectedTask, maybeNotifyTask]);

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

  // 提交后台任务（默认路径：不再提供“实时等待”）
  const submitAnalysisTask = async () => {
    if (!stockCode.trim()) {
      alert('请输入股票代码');
      return;
    }

    // 验证股票代码
    if (!validation) {
      await validateStock(stockCode);
      const response = await fetch(`/api/stock/validate?code=${encodeURIComponent(stockCode)}`);
      const validationResult: StockValidation = await response.json();
      if (!validationResult.valid) {
        setValidation(validationResult);
        return;
      }
    } else if (!validation.valid) {
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/analyze/async', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ stock_code: stockCode }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        alert(data.detail || data.error || '提交失败');
        return;
      }

      setSubmittedTaskId(data.task_id);
      
      // 添加到任务列表
      const newTask: AnalysisTask = {
        task_id: data.task_id,
        stock_code: data.stock_code,
        stock_name: data.stock_name || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      setTasks(prev => [newTask, ...prev]);

      // 切到历史页，并开始全局轮询
      setViewMode('history');
      setSelectedTask(null);
      setTaskResult('');
      setTaskProgress([]);
      startPolling();
      
      setStockCode('');
      setValidation(null);
      
    } catch (error) {
      alert('提交任务失败，请检查网络连接');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      const running = tasksRef.current.filter(t => t.status === 'pending' || t.status === 'running');
      if (running.length === 0) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        return;
      }
      await Promise.all(running.map(t => pollTaskStatus(t.task_id)));
    }, 3000);
  }, [pollTaskStatus]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    // 有未完成任务时自动开启轮询
    const hasRunning = tasks.some(t => t.status === 'pending' || t.status === 'running');
    if (hasRunning) startPolling();
  }, [tasks, startPolling]);

  // 切换到历史视图时加载任务
  useEffect(() => {
    if (viewMode === 'history') {
      loadTasks();
    }
  }, [viewMode, loadTasks]);

  useEffect(() => {
    // 自动隐藏“提交成功”提示
    if (!submittedTaskId) return;
    const t = setTimeout(() => setSubmittedTaskId(null), 6000);
    return () => clearTimeout(t);
  }, [submittedTaskId]);

  useEffect(() => {
    // 初始化已通知集合（避免频繁重复通知）
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('notifiedTaskIds');
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        notifiedRef.current = new Set(arr);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const arr = Array.from(notifiedRef.current).slice(-200);
      window.localStorage.setItem('notifiedTaskIds', JSON.stringify(arr));
    } catch {
      // ignore
    }
  }, [tasks]);

  useEffect(() => {
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // 获取状态徽章
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">等待中</span>;
      case 'running':
        return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />运行中</span>;
      case 'completed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">已完成</span>;
      case 'failed':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">失败</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* 模式切换和导航 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 视图切换 */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('input')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                viewMode === 'input'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Search className="w-4 h-4" />
              新分析
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                viewMode === 'history'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <History className="w-4 h-4" />
              历史任务
              {tasks.filter(t => t.status === 'running' || t.status === 'pending').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {tasks.filter(t => t.status === 'running' || t.status === 'pending').length}
                </span>
              )}
            </button>
          </div>

          {/* 通知权限引导 */}
          <div className="flex items-center gap-2">
            {notificationPermission === 'unsupported' ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <BellOff className="w-4 h-4" />
                当前浏览器不支持通知
              </div>
            ) : notificationPermission === 'granted' ? (
              <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                通知已开启
              </div>
            ) : notificationPermission === 'denied' ? (
              <div className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <BellOff className="w-4 h-4" />
                通知被禁止（请在浏览器设置中允许本站）
              </div>
            ) : (
              <button
                onClick={requestNotificationPermission}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <Bell className="w-4 h-4" />
                启用完成通知
              </button>
            )}
          </div>
        </div>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          默认使用后台分析：提交后可关闭页面，稍后在“历史任务”查看结果。
        </p>
      </motion.div>

      {/* Input Section */}
      {viewMode === 'input' && (
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
                  onKeyPress={(e) => e.key === 'Enter' && !isSubmitting && submitAnalysisTask()}
                  onFocus={() => stockCode.length >= 1 && searchResults.length > 0 && setShowSearchResults(true)}
                  placeholder="输入股票代码或名称，如: 000001, 平安银行"
                  disabled={isSubmitting}
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
              onClick={submitAnalysisTask}
              disabled={isSubmitting || (validation !== null && !validation.valid)}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  提交分析
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* 历史任务列表 */}
      {viewMode === 'history' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              历史分析任务
            </h2>
            <button
              onClick={loadTasks}
              disabled={isLoadingTasks}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isLoadingTasks ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无分析任务</p>
              <p className="text-sm mt-1">提交后台任务后，可以在这里查看进度和结果</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.task_id}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                    selectedTask?.task_id === task.task_id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => viewTaskResult(task)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lg font-semibold text-blue-600 dark:text-blue-400">
                        {task.stock_code}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {task.stock_name}
                      </span>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(task.created_at).toLocaleString('zh-CN')}
                      </span>
                      {task.status === 'completed' && (
                        <FileText className="w-4 h-4 text-green-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('确定删除此任务吗？')) {
                            deleteTask(task.task_id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {task.error_message && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                      {task.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* 任务结果查看 */}
      {viewMode === 'result' && selectedTask && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setViewMode('history')}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="font-mono text-blue-600 dark:text-blue-400">{selectedTask.stock_code}</span>
                  <span>{selectedTask.stock_name}</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(selectedTask.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refreshSelectedTask(selectedTask.task_id)}
                className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </button>
              {getStatusBadge(selectedTask.status)}
            </div>
          </div>

          {selectedTask.status === 'pending' && (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
              <p className="text-gray-600 dark:text-gray-400">任务等待执行中...</p>
            </div>
          )}

          {selectedTask.status === 'running' && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 mx-auto mb-3 text-blue-500 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400">正在分析中，请稍候...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">您可以关闭页面，稍后再来查看结果</p>
            </div>
          )}

          {selectedTask.status === 'failed' && (
            <div className="text-center py-12">
              <XCircle className="w-12 h-12 mx-auto mb-3 text-red-500" />
              <p className="text-gray-600 dark:text-gray-400">分析失败</p>
              {selectedTask.error_message && (
                <p className="text-sm text-red-500 mt-2">{selectedTask.error_message}</p>
              )}
            </div>
          )}

          {/* 进度日志 */}
          {taskProgress.length > 0 && selectedTask.status !== 'completed' && (
            <div className="mt-4 max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
              {taskProgress.map((p, idx) => (
                <div key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-gray-400 dark:text-gray-600 font-mono text-xs mt-0.5">
                    {p.timestamp ? new Date(p.timestamp).toLocaleTimeString('zh-CN', { hour12: false }) : '--:--:--'}
                  </span>
                  <span className="flex-1">{p.message}</span>
                </div>
              ))}
            </div>
          )}

          {selectedTask.status === 'completed' && taskResult && (
            <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:pb-2 prose-h3:text-xl prose-a:text-blue-600 prose-strong:text-gray-900 dark:prose-strong:text-white prose-ul:list-disc prose-ol:list-decimal">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {taskResult}
              </ReactMarkdown>
            </div>
          )}
        </motion.div>
      )}

      {/* 后台任务提交成功提示 */}
      <AnimatePresence>
        {submittedTaskId && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-6 h-6" />
            <div>
              <p className="font-medium">任务已提交</p>
              <p className="text-sm opacity-90">任务ID: {submittedTaskId}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
