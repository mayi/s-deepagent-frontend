'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, AlertCircle, CheckCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps) {
  const { login, register, forgotPassword, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (result.success) {
          setMessage({ type: 'success', text: result.message });
          setTimeout(() => {
            onClose();
            resetForm();
          }, 1000);
        } else {
          setMessage({ type: 'error', text: result.message });
        }
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setMessage({ type: 'error', text: '两次输入的密码不一致' });
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          setMessage({ type: 'error', text: '密码长度至少6位' });
          setIsLoading(false);
          return;
        }
        const result = await register(email, password, inviteCode);
        if (result.success) {
          setMessage({ type: 'success', text: '注册成功，请登录' });
          setTimeout(() => {
            setMode('login');
            setPassword('');
            setConfirmPassword('');
            setInviteCode('');
            setMessage(null);
          }, 1500);
        } else {
          setMessage({ type: 'error', text: result.message });
        }
      } else if (mode === 'forgot') {
        const result = await forgotPassword(email);
        if (result.success) {
          if (result.reset_token) {
            // 演示模式：直接显示重置token
            setResetToken(result.reset_token);
            setMode('reset');
            setMessage({ type: 'success', text: '请使用以下token重置密码（实际应用中会通过邮件发送）' });
          } else {
            setMessage({ type: 'success', text: result.message });
          }
        } else {
          setMessage({ type: 'error', text: result.message });
        }
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          setMessage({ type: 'error', text: '两次输入的密码不一致' });
          setIsLoading(false);
          return;
        }
        const result = await resetPassword(resetToken, password);
        if (result.success) {
          setMessage({ type: 'success', text: '密码重置成功，请登录' });
          setTimeout(() => {
            setMode('login');
            resetForm();
          }, 1500);
        } else {
          setMessage({ type: 'error', text: result.message });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setInviteCode('');
    setConfirmPassword('');
    setResetToken('');
    setMessage(null);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setMessage(null);
    if (newMode !== 'reset') {
      setPassword('');
      setConfirmPassword('');
    }
    if (newMode !== 'register') {
      setInviteCode('');
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return '登录';
      case 'register': return '注册';
      case 'forgot': return '找回密码';
      case 'reset': return '重置密码';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'login': return '欢迎回来，开始您的投资分析之旅';
      case 'register': return '加入我们，解锁 AI 驱动的投资洞察';
      case 'forgot': return '输入邮箱，我们将帮您找回密码';
      case 'reset': return '设置新密码';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* Backdrop with blur */}
        <motion.div
          className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', bounce: 0.3 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl"
          style={{
            background: 'linear-gradient(180deg, #1a1a25 0%, #12121a 100%)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            boxShadow: '0 0 60px rgba(251, 191, 36, 0.1), 0 25px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Decorative glow */}
          <div
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-30 blur-3xl"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
          />

          {/* Header */}
          <div className="relative flex items-center justify-between p-6 border-b border-ink-600/50">
            <div className="flex items-center gap-3">
              {(mode === 'forgot' || mode === 'reset') && (
                <motion.button
                  onClick={() => switchMode('login')}
                  className="p-2 hover:bg-ink-600 rounded-xl transition-colors text-ink-400 hover:text-ink-100"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-5 h-5" />
                </motion.button>
              )}
              <div>
                <h2 className="text-xl font-bold text-ink-100 font-display flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  {getTitle()}
                </h2>
                <p className="text-xs text-ink-400 mt-0.5">{getSubtitle()}</p>
              </div>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 hover:bg-ink-600 rounded-xl transition-colors text-ink-400 hover:text-ink-100"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative p-6 space-y-5">
            {/* Message */}
            <AnimatePresence mode="wait">
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className={`flex items-center gap-2 p-3 rounded-xl ${message.type === 'success'
                      ? 'bg-jade-400/10 border border-jade-400/30 text-jade-400'
                      : 'bg-coral-400/10 border border-coral-400/30 text-coral-400'
                    }`}
                >
                  {message.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  )}
                  <span className="text-sm">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reset Token Display (Demo Mode) */}
            {mode === 'reset' && resetToken && (
              <div className="bg-amber-400/10 border border-amber-400/30 p-3 rounded-xl">
                <p className="text-xs text-amber-400 mb-1">重置Token（已自动填充）：</p>
                <code className="text-xs text-amber-300 break-all font-mono">{resetToken}</code>
              </div>
            )}

            {/* Email Field */}
            {mode !== 'reset' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink-300">
                  邮箱
                </label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="input w-full pl-10"
                  />
                </div>
              </div>
            )}

            {/* Invite Code Field */}
            {mode === 'register' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink-300">
                  邀请码
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入邀请码（必填）"
                    required
                    className="input w-full pl-10"
                  />
                </div>
                <p className="text-xs text-ink-500">
                  没有邀请码将无法注册。
                </p>
              </div>
            )}

            {/* Password Field */}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink-300">
                  {mode === 'reset' ? '新密码' : '密码'}
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="input w-full pl-10"
                  />
                </div>
              </div>
            )}

            {/* Confirm Password Field */}
            {(mode === 'register' || mode === 'reset') && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-ink-300">
                  确认密码
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-500 group-focus-within:text-amber-400 transition-colors" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="input w-full pl-10"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full py-3 text-base"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-ink-900/30 border-t-ink-900 rounded-full"
                  />
                  处理中...
                </span>
              ) : (
                getTitle()
              )}
            </motion.button>

            {/* Footer Links */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-ink-400 hover:text-amber-400 transition-colors"
                >
                  忘记密码？
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
                >
                  注册新账号
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div className="text-center text-sm pt-2">
                <span className="text-ink-500">已有账号？</span>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-amber-400 hover:text-amber-300 font-medium ml-1 transition-colors"
                >
                  立即登录
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
