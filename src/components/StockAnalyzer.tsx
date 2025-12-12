'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Search, Loader2, CheckCircle2, XCircle, Clock, 
  Trash2, RefreshCw, FileText, ArrowLeft, Bell, 
  BellOff, Plus, ChevronRight, BarChart3, Sparkles
} from 'lucide-react';
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

interface StockAnalyzerProps {
  onNeedLogin?: () => void;
}

export default function StockAnalyzer({ onNeedLogin }: StockAnalyzerProps = {}) {
  const { token, user, refreshMe } = useAuth();
  
  // Core State
  const [tasks, setTasks] = useState<AnalysisTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<AnalysisTask | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  
  // Input State
  const [stockCode, setStockCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validation, setValidation] = useState<StockValidation | null>(null);
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Task Detail State
  const [taskResult, setTaskResult] = useState<string>('');
  const [taskProgress, setTaskProgress] = useState<TaskProgressItem[]>([]);
  
  // Invite Code State
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string>('');
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);

  // Refs
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLDivElement | null>(null);
  const stockInputRef = useRef<HTMLInputElement | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const tasksRef = useRef<AnalysisTask[]>([]);
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  // Notification Permission - initialize as 'unsupported' to match SSR
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('unsupported');

  // Update notification permission on client side only
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Notification !== 'undefined') {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // --- Effects & Data Loading ---

  const loadTasks = useCallback(async () => {
    // Only load tasks if user is logged in
    if (!token) {
      setTasks([]);
      setIsLoadingTasks(false);
      return;
    }
    
    setIsLoadingTasks(true);
    try {
      const response = await fetch('/api/analyze/history', {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
      });
      
      if (!response.ok) {
        // Handle 401 Unauthorized
        if (response.status === 401) {
          setTasks([]);
          return;
        }
      }
      
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

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    tasksRef.current = tasks;
    // Auto-poll if there are running tasks
    const hasRunning = tasks.some(t => t.status === 'pending' || t.status === 'running');
    if (hasRunning) startPolling();
  }, [tasks]);

  // --- Polling Logic ---

  const pollTaskStatus = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/analyze/status/${taskId}`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
      });
      if (!response.ok) return;
      const data = await response.json();

      setTasks(prev => prev.map(t => {
        if (t.task_id !== taskId) return t;
        const updated = {
          ...t,
          status: data.status,
          completed_at: data.completed_at,
          error_message: data.error_message,
        };
        // Notify if status changed to completed/failed
        if ((updated.status === 'completed' || updated.status === 'failed') && t.status !== updated.status) {
          maybeNotifyTask(updated);
        }
        return updated;
      }));

      // Update selected task view if it matches
      if (selectedTask?.task_id === taskId) {
        setTaskProgress(Array.isArray(data.progress) ? data.progress : []);
        if (data.status === 'completed' && selectedTask.status !== 'completed') {
          refreshSelectedTask(taskId);
        }
        // Update the selected task object in state to reflect status change
        setSelectedTask(prev => prev ? { ...prev, status: data.status } : null);
      }
    } catch (error) {
      console.error('轮询任务状态失败:', error);
    }
  }, [token, selectedTask?.task_id]); // Removed circular dependencies

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

  // --- Task Management ---

  const refreshSelectedTask = useCallback(async (taskId: string) => {
    try {
      const statusRes = await fetch(`/api/analyze/status/${taskId}`, {
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
      });
      if (!statusRes.ok) return;
      const statusData = await statusRes.json();

      setTaskProgress(Array.isArray(statusData.progress) ? statusData.progress : []);
      
      if (statusData.status === 'completed') {
        const res = await fetch(`/api/analyze/result/${taskId}`, {
          headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
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

  const handleSelectTask = async (task: AnalysisTask) => {
    setSelectedTask(task);
    setTaskResult('');
    setTaskProgress([]);
    // On mobile, this would trigger a view transition
    await refreshSelectedTask(task.task_id);
  };

  const handleDeleteTask = async (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    if (!confirm('确定删除此任务吗？')) return;
    
    try {
      const response = await fetch(`/api/analyze/task/${taskId}`, {
        method: 'DELETE',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }) },
      });
      if (response.ok) {
        setTasks(prev => prev.filter(t => t.task_id !== taskId));
        if (selectedTask?.task_id === taskId) {
          setSelectedTask(null);
        }
      }
    } catch (error) {
      console.error('删除任务失败:', error);
    }
  };

  const submitAnalysisTask = async () => {
    if (!stockCode.trim()) return;
    
    // Check if user is logged in
    if (!token || !user) {
      if (onNeedLogin) {
        onNeedLogin();
      }
      return;
    }
    
    // Validation logic
    if (!validation) {
      await validateStock(stockCode);
      // Re-check validation after await
      // For simplicity, we'll rely on the user waiting for the indicator or just submitting
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

      if (response.status === 401) {
        alert('请先登录');
        return;
      }

      if (response.status === 402) {
        alert(data.detail || '积分不足');
        return;
      }
      
      if (!response.ok) {
        alert(data.detail || '提交失败');
        return;
      }

      // Success
      if (token) refreshMe().catch(() => {});
      
      const newTask: AnalysisTask = {
        task_id: data.task_id,
        stock_code: data.stock_code,
        stock_name: data.stock_name || '',
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      
      setTasks(prev => [newTask, ...prev]);
      setStockCode('');
      setValidation(null);
      handleSelectTask(newTask); // Auto-select the new task
      startPolling();
      
    } catch (error) {
      alert('提交任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Search & Validation Helpers ---

  const searchStocks = async (keyword: string) => {
    if (!keyword.trim()) {
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
    } catch (error) { console.error(error); }
  };

  const validateStock = async (code: string) => {
    if (!code.trim() || code.length < 6) {
      setValidation(null);
      return;
    }
    setIsValidating(true);
    try {
      const response = await fetch(`/api/stock/validate?code=${encodeURIComponent(code)}`);
      const data = await response.json();
      setValidation(data);
    } catch {
      setValidation({ valid: false, message: '验证失败', stock_name: '', stock_code: code });
    } finally {
      setIsValidating(false);
    }
  };

  const handleStockCodeChange = (value: string) => {
    setStockCode(value);
    setValidation(null);
    if (validationTimeoutRef.current) clearTimeout(validationTimeoutRef.current);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (value.length >= 1) {
      searchTimeoutRef.current = setTimeout(() => searchStocks(value), 300);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
    
    if (value.length >= 6) {
      validationTimeoutRef.current = setTimeout(() => validateStock(value), 500);
    }
  };

  // --- Notifications & Invites ---

  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return;
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    } catch { setNotificationPermission('denied'); }
  };

  const maybeNotifyTask = (task: AnalysisTask) => {
    if (notificationPermission !== 'granted' || typeof Notification === 'undefined') return;
    if (notifiedRef.current.has(task.task_id)) return;

    const title = task.status === 'completed' ? `分析完成：${task.stock_name}` : `分析失败：${task.stock_name}`;
    try {
      new Notification(title, { body: '点击查看详情' });
      notifiedRef.current.add(task.task_id);
    } catch {}
  };

  const generateInvite = async () => {
    if (!token) return;
    setIsGeneratingInvite(true);
    try {
      const res = await fetch('/api/invite/generate', {
        method: 'POST',
        headers: { ...(token && { 'Authorization': `Bearer ${token}` }), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteCode(data.code);
        setInviteMessage('邀请码已生成');
      } else {
        setInviteMessage(data.detail || '生成失败');
      }
    } catch {
      setInviteMessage('网络错误');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // --- Render Helpers ---

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      running: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
    };
    const labels = { pending: "等待中", running: "分析中", completed: "已完成", failed: "失败" };
    // @ts-ignore
    return <span className={`px-2 py-0.5 text-xs rounded-full ${styles[status] || ''}`}>{labels[status] || status}</span>;
  };

  // --- Main Render ---

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 lg:h-full lg:overflow-hidden">
      
      {/* Sidebar: Task List (mobile 下放后面展示) */}
      <div className="order-2 lg:order-1 w-full lg:w-1/3 xl:w-1/4 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden lg:h-full">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            分析列表
          </h2>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              // 始终切换到新建分析，并滚动到输入区域 + 聚焦输入框（移动端更友好）
              setSelectedTask(null);
              if (mainContentRef.current) {
                mainContentRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
              // 延迟聚焦以等待布局切换完成
              setTimeout(() => {
                stockInputRef.current?.focus();
              }, 150);
            }}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
            title="新分析"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Task List */}
        <div className="p-3 space-y-2 lg:flex-1 lg:overflow-y-auto">
          {isLoadingTasks ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">暂无历史记录</p>
            </div>
          ) : (
            tasks.map(task => (
              <div
                key={task.task_id}
                onClick={() => handleSelectTask(task)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  selectedTask?.task_id === task.task_id
                    ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
                    : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-100 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                    {task.stock_name || task.stock_code}
                  </div>
                  {getStatusBadge(task.status)}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{task.stock_code}</span>
                  <div className="flex items-center gap-2">
                    <span>{new Date(task.created_at).toLocaleDateString()}</span>
                    <button 
                      onClick={(e) => handleDeleteTask(e, task.task_id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Notification Toggle (Bottom of Sidebar) */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/30">
           <button
            onClick={requestNotificationPermission}
            className="w-full flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-blue-600 transition-colors py-2"
          >
            {notificationPermission === 'granted' ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            {notificationPermission === 'granted' ? '通知已开启' : '开启完成通知'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        ref={mainContentRef}
        className="order-1 lg:order-2 w-full lg:flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[60vh] lg:min-h-0"
      >
        
        {/* State A: New Analysis Input */}
        {!selectedTask ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
            <div className="w-full space-y-8">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">开始新的分析</h1>
                <p className="text-gray-500 dark:text-gray-400">输入股票代码，AI 代理将为您生成深度投资报告</p>
              </div>

              {/* Search Box */}
              <div className="relative group" ref={searchInputRef}>
                <div className={`absolute inset-0 bg-blue-500/5 rounded-2xl blur-xl transition-opacity ${isSubmitting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                <div className="relative flex items-center">
                  <Search className="absolute left-4 w-5 h-5 text-gray-400" />
                  <input
                    ref={stockInputRef}
                    type="text"
                    value={stockCode}
                    onChange={(e) => handleStockCodeChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitAnalysisTask()}
                    onFocus={() => stockCode.length >= 1 && searchResults.length > 0 && setShowSearchResults(true)}
                    placeholder="输入代码或名称 (如: 000001, 平安银行)"
                    className="w-full pl-12 pr-32 py-4 text-lg bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl focus:border-blue-500 focus:ring-0 transition-all shadow-sm"
                  />
                  <div className="absolute right-2 flex items-center gap-2">
                    {isValidating && <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />}
                    {validation?.valid && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    <button
                      onClick={submitAnalysisTask}
                      disabled={isSubmitting || (validation !== null && !validation.valid)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting ? '分析中...' : '开始'}
                      {!isSubmitting && <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Search Dropdown */}
                <AnimatePresence>
                  {showSearchResults && searchResults.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-20"
                    >
                      {searchResults.map((stock) => (
                        <button
                          key={stock.code}
                          onClick={() => {
                            setStockCode(stock.code);
                            setShowSearchResults(false);
                            setValidation({ valid: true, message: '有效', stock_name: stock.name, stock_code: stock.code });
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center group/item"
                        >
                          <span className="font-medium text-gray-900 dark:text-white">{stock.name}</span>
                          <span className="font-mono text-sm text-gray-500 group-hover/item:text-blue-500">{stock.code}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Validation Message */}
                {validation && !validation.valid && (
                  <div className="absolute top-full left-0 mt-2 text-sm text-red-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> {validation.message}
                  </div>
                )}
              </div>

              {/* User Info / Invite Code */}
              {user && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    当前积分: <span className="font-bold text-gray-900 dark:text-white">{user.points}</span>
                    <span className="mx-2">|</span>
                    每次分析消耗 100 积分
                  </div>
                  <div className="flex items-center gap-2">
                    {inviteCode ? (
                      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="font-mono text-sm">{inviteCode}</span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(inviteCode).then(() => setInviteMessage('已复制'))}
                          className="text-xs text-blue-500 hover:underline"
                        >
                          复制
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={generateInvite}
                        disabled={isGeneratingInvite}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                      >
                        {isGeneratingInvite ? '生成中...' : '生成邀请码'}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {user && inviteMessage && <p className="text-center text-xs text-gray-400">{inviteMessage}</p>}
            </div>
          </div>
        ) : (
          /* State B: Task Detail View */
          <div className="flex flex-col h-full">
            {/* Detail Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedTask(null)}
                  className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {selectedTask.stock_name}
                    <span className="text-sm font-normal text-gray-500 font-mono">({selectedTask.stock_code})</span>
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedTask.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(selectedTask.status)}
                <button 
                  onClick={() => refreshSelectedTask(selectedTask.task_id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500"
                  title="刷新"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Detail Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 dark:bg-gray-900/30">
              {selectedTask.status === 'pending' && (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Clock className="w-12 h-12 mb-4 text-yellow-400" />
                  <p>任务排队中...</p>
                </div>
              )}

              {selectedTask.status === 'running' && (
                <div className="max-w-2xl mx-auto">
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 className="w-12 h-12 mb-4 text-blue-500 animate-spin" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">AI 代理正在深度分析...</p>
                    <p className="text-sm text-gray-500 mt-2">这通常需要 1-2 分钟，您可以稍后查看</p>
                  </div>
                  {/* Live Logs */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm max-h-60 overflow-y-auto">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">执行日志</h3>
                    <div className="space-y-3">
                      {taskProgress.map((p, i) => (
                        <div key={i} className="flex gap-3 text-sm">
                          <span className="text-gray-400 font-mono text-xs whitespace-nowrap">
                            {p.timestamp ? new Date(p.timestamp).toLocaleTimeString() : ''}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">{p.message}</span>
                        </div>
                      ))}
                      {taskProgress.length === 0 && <p className="text-sm text-gray-400 italic">等待代理启动...</p>}
                    </div>
                  </div>
                </div>
              )}

              {selectedTask.status === 'failed' && (
                <div className="flex flex-col items-center justify-center h-64 text-red-500">
                  <XCircle className="w-12 h-12 mb-4" />
                  <p className="font-medium">分析失败</p>
                  <p className="text-sm mt-2 text-gray-500">{selectedTask.error_message}</p>
                </div>
              )}

              {selectedTask.status === 'completed' && taskResult && (
                <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 border border-gray-100 dark:border-gray-700">
                  <article className="prose prose-slate dark:prose-invert max-w-none 
                    prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-8
                    prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
                    prose-strong:text-gray-900 dark:prose-strong:text-white
                    prose-li:text-gray-600 dark:prose-li:text-gray-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {taskResult}
                    </ReactMarkdown>
                  </article>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}