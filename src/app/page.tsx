'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import StockAnalyzer from '@/components/StockAnalyzer';
import StockRadar from '@/components/StockRadar';
import StockScreener from '@/components/StockScreener';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, User, LogOut, Lock, Sparkles, Coins, Filter } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'radar' | 'screener'>('analyzer');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isLoading, logout } = useAuth();

  const handleRadarClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setActiveTab('radar');
    }
  };

  const handleScreenerClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setActiveTab('screener');
    }
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden">
      {/* Header - 玻璃拟态 + 琥珀边框 */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex-none glass-strong border-b border-ink-600/50 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo 区域 */}
            <div className="flex items-center space-x-3 group">
              <motion.div
                className="w-11 h-11 rounded-xl flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  background: 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
                }}
              >
                {/* 光泽效果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
                <TrendingUp className="w-6 h-6 text-ink-900 relative z-10" />
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gradient-amber font-display">
                  AstraShare
                </h1>
                <p className="text-xs font-medium text-ink-400 uppercase tracking-widest">
                  AI 驱动的 A 股投资助手
                </p>
              </div>
            </div>

            {/* 用户区域 */}
            <div className="flex items-center gap-3">
              <Link
                href="/points"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-ink-300 hover:text-amber-400 transition-colors rounded-lg hover:bg-ink-700/50"
              >
                <Coins className="w-4 h-4" />
                积分规则
              </Link>

              {isLoading ? (
                <div className="w-9 h-9 rounded-xl bg-ink-700 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  {/* 用户邮箱 */}
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-ink-700/60 rounded-xl border border-ink-600">
                    <User className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-ink-200">
                      {user.email}
                    </span>
                  </div>

                  {/* 积分显示 */}
                  <motion.div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                    style={{
                      background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                      borderColor: 'rgba(52, 211, 153, 0.3)',
                    }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Sparkles className="w-4 h-4 text-jade-400" />
                    <span className="text-sm font-bold font-mono text-jade-400">
                      {typeof user.points === 'number' ? user.points : 0}
                    </span>
                    <span className="text-xs text-jade-400/70">积分</span>
                  </motion.div>

                  {/* 登出按钮 */}
                  <motion.button
                    onClick={logout}
                    className="p-2.5 text-ink-400 hover:text-coral-400 rounded-xl hover:bg-coral-500/10 transition-all"
                    title="退出登录"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <LogOut className="w-5 h-5" />
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  onClick={() => setShowAuthModal(true)}
                  className="btn-primary flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <User className="w-4 h-4" />
                  登录 / 注册
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content Container */}
      <div
        className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 overflow-y-auto lg:overflow-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >

        {/* Navigation Tabs - 墨迹选中态 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="flex-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex p-1 bg-ink-800/80 backdrop-blur-sm rounded-2xl border border-ink-600/50">
            {/* 个股分析 Tab */}
            <motion.button
              onClick={() => setActiveTab('analyzer')}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors ${activeTab === 'analyzer'
                ? 'text-ink-900'
                : 'text-ink-300 hover:text-ink-100'
                }`}
              whileHover={{ scale: activeTab === 'analyzer' ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeTab === 'analyzer' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">个股分析</span>
            </motion.button>

            {/* 个股雷达 Tab */}
            <motion.button
              onClick={handleRadarClick}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'radar'
                ? 'text-ink-900'
                : 'text-ink-300 hover:text-ink-100'
                }`}
              whileHover={{ scale: activeTab === 'radar' ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeTab === 'radar' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">个股雷达</span>
              {!user && (
                <Lock className="relative z-10 w-3.5 h-3.5 text-amber-400" />
              )}
            </motion.button>

            {/* 量化选股 Tab */}
            <motion.button
              onClick={handleScreenerClick}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'screener'
                ? 'text-ink-900'
                : 'text-ink-300 hover:text-ink-100'
                }`}
              whileHover={{ scale: activeTab === 'screener' ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {activeTab === 'screener' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">量化选股</span>
              {!user && (
                <Lock className="relative z-10 w-3.5 h-3.5 text-amber-400" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Content Area - Fills remaining height */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-1 min-h-0 relative"
        >
          {activeTab === 'analyzer' ? (
            <StockAnalyzer onNeedLogin={() => setShowAuthModal(true)} />
          ) : activeTab === 'radar' ? (
            <div className="h-full overflow-y-auto">
              <StockRadar />
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <StockScreener />
            </div>
          )}
        </motion.div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </main>
  );
}
