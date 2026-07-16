'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  Clock,
  Lock,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface WatchedStock {
  id?: number;
  stock_code: string;
}

interface StockNotice {
  id: number;
  stock_code: string;
  title: string;
  notice_date: string;
  url: string;
  category: string;
  created_at: string;
}

export default function StockNotices() {
  const { user } = useAuth();
  const [watchedStocks, setWatchedStocks] = useState<string[]>([]);
  const [notices, setNotices] = useState<StockNotice[]>([]);
  const [newStockCode, setNewStockCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const fetchWatchedStocks = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/watched-stocks', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setWatchedStocks(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch watched stocks', err);
    }
  };

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:8000/api/stock-notices?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotices(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notices', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWatchedStocks();
      fetchNotices();
    }
  }, [user]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStockCode.trim()) return;
    
    // 简单的股票代码格式验证 (6位数字)
    if (!/^\d{6}$/.test(newStockCode.trim())) {
      setError('请输入6位数字的股票代码');
      return;
    }

    try {
      setIsAdding(true);
      setError('');
      const res = await fetch('http://localhost:8000/api/watched-stocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ stock_code: newStockCode.trim() })
      });
      const data = await res.json();
      
      if (data.success) {
        setNewStockCode('');
        fetchWatchedStocks();
        // 如果后端是在添加时同步抓取，这里需要等一下再刷新公告；
        // 目前后端是定时异步抓取，所以立即刷新可能没数据，可以提示用户
        setTimeout(fetchNotices, 1000); 
      } else {
        setError(data.detail || '添加失败');
      }
    } catch (err) {
      setError('网络错误，添加失败');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveStock = async (stockCode: string) => {
    try {
      const res = await fetch(`http://localhost:8000/api/watched-stocks/${stockCode}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchWatchedStocks();
        fetchNotices();
      }
    } catch (err) {
      console.error('Failed to remove stock', err);
    }
  };

  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-12 text-center h-full flex flex-col items-center justify-center"
      >
        <Lock className="w-12 h-12 text-amber-400 mb-6" />
        <h2 className="text-2xl font-bold text-ink-100 mb-4 font-display">
          公告追踪需要登录
        </h2>
        <p className="text-ink-400 max-w-md mx-auto">
          登录后，您可以添加关心的股票代码，系统将自动帮您抓取并推送最新的公司公告，不再错过任何重要信息。
        </p>
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 p-4">
      {/* 左侧：股票列表与添加 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-80 flex flex-col gap-6"
      >
        <div className="card p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink-100">关注列表</h2>
              <p className="text-xs text-ink-400">管理您关心的股票代码</p>
            </div>
          </div>

          <form onSubmit={handleAddStock} className="mb-6 relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-ink-400" />
              <input
                type="text"
                placeholder="输入股票代码 (如 000001)"
                value={newStockCode}
                onChange={(e) => {
                  setNewStockCode(e.target.value);
                  setError('');
                }}
                className="w-full pl-9 pr-12 py-2.5 bg-ink-800 border border-ink-600 rounded-xl text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all text-ink-100"
              />
              <button
                type="submit"
                disabled={isAdding || !newStockCode.trim()}
                className="absolute right-2 p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-coral-400 text-xs mt-2 absolute">
                {error}
              </motion.p>
            )}
          </form>

          <div className="flex-1 overflow-y-auto pr-2 space-y-2" style={{ WebkitOverflowScrolling: 'touch' }}>
            <AnimatePresence>
              {watchedStocks.map((code) => (
                <motion.div
                  key={code}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-ink-800/50 border border-ink-700 hover:border-ink-600 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="font-mono text-sm font-medium text-ink-200">{code}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveStock(code)}
                    className="p-1.5 text-ink-500 hover:text-coral-400 hover:bg-coral-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
              {watchedStocks.length === 0 && (
                <div className="text-center py-8 text-ink-400 text-sm">
                  暂无关注的股票
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* 右侧：公告流 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex-1 card p-6 flex flex-col"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-ink-100 font-display flex items-center gap-2">
            最新公告
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-ink-400" />}
          </h2>
          <button 
            onClick={fetchNotices}
            className="text-xs text-ink-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
          >
            <Clock className="w-3.5 h-3.5" />
            刷新
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          <AnimatePresence>
            {notices.map((notice) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-ink-800/30 border border-ink-700/50 hover:bg-ink-800/50 hover:border-ink-600 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-xs font-mono font-medium rounded-md bg-ink-700 text-ink-300">
                        {notice.stock_code}
                      </span>
                      {notice.category && (
                        <span className="px-2 py-0.5 text-xs rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {notice.category}
                        </span>
                      )}
                      <span className="text-xs text-ink-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {notice.notice_date}
                      </span>
                    </div>
                    
                    <a 
                      href={notice.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-ink-100 group-hover:text-emerald-400 transition-colors inline-flex items-start gap-2"
                    >
                      {notice.title}
                      <ExternalLink className="w-3.5 h-3.5 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {!isLoading && notices.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-ink-400 py-12">
                <FileText className="w-12 h-12 mb-4 opacity-20" />
                <p>暂无相关公告，请先添加关注股票或等待系统抓取</p>
                <p className="text-xs mt-2 opacity-60">系统每隔 4 小时自动抓取最新公告</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
