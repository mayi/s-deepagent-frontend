'use client';

import { useState, useEffect } from 'react';
import { Key, Copy, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Eye, EyeOff, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

interface ApiKeyInfo {
  has_key: boolean;
  prefix?: string;
  created_at?: string;
  last_used_at?: string;
}

export default function ApiKeySettings() {
  const { token } = useAuth();
  const [keyInfo, setKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmRevoke, setShowConfirmRevoke] = useState(false);
  const [showConfirmRegenerate, setShowConfirmRegenerate] = useState(false);

  useEffect(() => {
    if (token) {
      fetchKeyInfo();
    }
  }, [token]);

  const fetchKeyInfo = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/api-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setKeyInfo(data);
      }
    } catch (e) {
      setError('获取 API Key 信息失败');
    } finally {
      setIsLoading(false);
    }
  };

  const generateKey = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setShowConfirmRegenerate(false);
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNewKey(data.key);
        setShowKey(true);
        setKeyInfo({ has_key: true, prefix: data.prefix });
      } else {
        setError(data.detail || '生成失败');
      }
    } catch (e) {
      setError('生成 API Key 失败');
    } finally {
      setIsGenerating(false);
    }
  };

  const revokeKey = async () => {
    try {
      setIsRevoking(true);
      setError(null);
      setShowConfirmRevoke(false);
      const res = await fetch('/api/settings/api-key', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setKeyInfo({ has_key: false });
        setNewKey(null);
      } else {
        setError(data.detail || '撤销失败');
      }
    } catch (e) {
      setError('撤销 API Key 失败');
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-5 h-5 text-ink-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
        >
          <Key className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ink-100">API Key 管理</h3>
          <p className="text-sm text-ink-400">用于远程调用个股分析接口</p>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-coral-500/10 border border-coral-500/30 text-coral-400 text-sm"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Key Display - Only shown immediately after generation */}
      <AnimatePresence>
        {newKey && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">请立即保存此 API Key，它不会再次显示</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-3 rounded-lg bg-ink-800/80 border border-ink-600/50 font-mono text-sm text-ink-100 overflow-x-auto">
                {showKey ? newKey : '•'.repeat(newKey.length)}
              </div>
              <motion.button
                onClick={() => setShowKey(!showKey)}
                className="p-2.5 rounded-lg bg-ink-700/50 text-ink-300 hover:text-ink-100 hover:bg-ink-600/50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={showKey ? '隐藏' : '显示'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
              <motion.button
                onClick={() => copyToClipboard(newKey)}
                className={`p-2.5 rounded-lg transition-colors ${
                  copied
                    ? 'bg-jade-500/20 text-jade-400'
                    : 'bg-ink-700/50 text-ink-300 hover:text-ink-100 hover:bg-ink-600/50'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="复制"
              >
                {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Key Status Card */}
      <div className="p-4 rounded-xl bg-ink-800/40 border border-ink-600/30">
        {keyInfo?.has_key ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-jade-400" />
                <span className="text-sm font-medium text-ink-200">已激活</span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-jade-500/10 text-jade-400 border border-jade-500/30">
                Active
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-ink-400">Key 前缀</span>
                <p className="font-mono text-ink-200 mt-0.5">{keyInfo.prefix}</p>
              </div>
              <div>
                <span className="text-ink-400">创建时间</span>
                <p className="text-ink-200 mt-0.5">
                  {keyInfo.created_at ? new Date(keyInfo.created_at).toLocaleString('zh-CN') : '-'}
                </p>
              </div>
              <div>
                <span className="text-ink-400">最后使用</span>
                <p className="text-ink-200 mt-0.5">
                  {keyInfo.last_used_at ? new Date(keyInfo.last_used_at).toLocaleString('zh-CN') : '从未使用'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              {!showConfirmRegenerate ? (
                <motion.button
                  onClick={() => setShowConfirmRegenerate(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-ink-700/50 text-ink-200 hover:text-ink-100 hover:bg-ink-600/50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4" />
                  重新生成
                </motion.button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-400">旧 Key 将立即失效</span>
                  <motion.button
                    onClick={generateKey}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
                    whileTap={{ scale: 0.98 }}
                    disabled={isGenerating}
                  >
                    {isGenerating ? '生成中...' : '确认重新生成'}
                  </motion.button>
                  <motion.button
                    onClick={() => setShowConfirmRegenerate(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-400 hover:text-ink-200 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    取消
                  </motion.button>
                </div>
              )}

              {!showConfirmRevoke ? (
                <motion.button
                  onClick={() => setShowConfirmRevoke(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-coral-400 hover:bg-coral-500/10 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isRevoking}
                >
                  <Trash2 className="w-4 h-4" />
                  撤销
                </motion.button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-coral-400">确定撤销？</span>
                  <motion.button
                    onClick={revokeKey}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-500/20 text-coral-400 hover:bg-coral-500/30 transition-colors"
                    whileTap={{ scale: 0.98 }}
                    disabled={isRevoking}
                  >
                    {isRevoking ? '撤销中...' : '确认撤销'}
                  </motion.button>
                  <motion.button
                    onClick={() => setShowConfirmRevoke(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-ink-400 hover:text-ink-200 transition-colors"
                    whileTap={{ scale: 0.98 }}
                  >
                    取消
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 space-y-4">
            <div className="text-ink-400 text-sm">尚未生成 API Key</div>
            <motion.button
              onClick={generateKey}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-ink-900 transition-colors"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Key className="w-4 h-4" />
              )}
              {isGenerating ? '生成中...' : '生成 API Key'}
            </motion.button>
          </div>
        )}
      </div>

      {/* Usage Guide */}
      <div className="p-4 rounded-xl bg-ink-800/30 border border-ink-600/20 space-y-3">
        <h4 className="text-sm font-semibold text-ink-200">使用说明</h4>
        <div className="text-xs text-ink-400 space-y-2">
          <p>• 每次分析消耗 <span className="text-amber-400 font-medium">100 积分</span>，同界面使用一致</p>
          <p>• 同一时间只能进行一个分析任务，进行中会返回 429 错误</p>
          <p>• 分析耗时约 1-5 分钟，请设置超时时间为 <span className="text-amber-400 font-medium">5 分钟</span></p>
        </div>
        <div className="mt-3">
          <h5 className="text-xs font-medium text-ink-300 mb-2">调用示例 (curl):</h5>
          <div className="relative">
            <pre className="px-4 py-3 rounded-lg bg-ink-900/80 text-xs font-mono text-ink-300 overflow-x-auto whitespace-pre-wrap break-all">
{`curl -X POST http://YOUR_HOST:8000/api/v1/stock/analyze \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"stock_code": "002015"}'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
