'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {(mode === 'forgot' || mode === 'reset') && (
                <button
                  onClick={() => switchMode('login')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
              )}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {getTitle()}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Message */}
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
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

            {/* Reset Token Display (Demo Mode) */}
            {mode === 'reset' && resetToken && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">重置Token（已自动填充）：</p>
                <code className="text-xs text-blue-700 dark:text-blue-300 break-all">{resetToken}</code>
              </div>
            )}

            {/* Email Field */}
            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  邮箱
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Invite Code Field */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  邀请码
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="请输入邀请码（必填）"
                    required
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  没有邀请码将无法注册。
                </p>
              </div>
            )}

            {/* Password Field */}
            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {mode === 'reset' ? '新密码' : '密码'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Confirm Password Field */}
            {(mode === 'register' || mode === 'reset') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  确认密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '处理中...' : getTitle()}
            </button>

            {/* Footer Links */}
            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => switchMode('forgot')}
                  className="text-blue-500 hover:text-blue-600"
                >
                  忘记密码？
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-blue-500 hover:text-blue-600"
                >
                  注册新账号
                </button>
              </div>
            )}

            {mode === 'register' && (
              <div className="text-center text-sm">
                <span className="text-gray-500 dark:text-gray-400">已有账号？</span>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-blue-500 hover:text-blue-600 ml-1"
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
