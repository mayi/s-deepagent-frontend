'use client';

import { useState } from 'react';
import Link from 'next/link';
import StockAnalyzer from '@/components/StockAnalyzer';
import StockRadar from '@/components/StockRadar';
import AuthModal from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { TrendingUp, User, LogOut, Lock } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'radar'>('analyzer');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, isLoading, logout } = useAuth();

  const handleRadarClick = () => {
    if (!user) {
      setShowAuthModal(true);
    } else {
      setActiveTab('radar');
    }
  };

  return (
    <main className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  AstraShare
                </h1>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  AI 驱动的 A 股投资助手
                </p>
              </div>
            </div>
            
            {/* User Section */}
            <div className="flex items-center gap-4">
              <Link
                href="/points"
                className="hidden sm:block text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                积分规则
              </Link>
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {user.email}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {typeof user.points === 'number' ? user.points : 0} 积分
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title="退出登录"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm hover:shadow-md"
                >
                  <User className="w-4 h-4" />
                  登录 / 注册
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        
        {/* Navigation Tabs & Alerts */}
        <div className="flex-none flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex space-x-1 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => setActiveTab('analyzer')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analyzer'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              个股分析
            </button>
            <button
              onClick={handleRadarClick}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'radar'
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              个股雷达
              {!user && <Lock className="w-3 h-3 text-amber-500" />}
            </button>
          </div>
        </div>

        {/* Content Area - Fills remaining height */}
        <div className="flex-1 min-h-0 relative">
          {activeTab === 'analyzer' ? (
            <StockAnalyzer onNeedLogin={() => setShowAuthModal(true)} />
          ) : (
            <div className="h-full overflow-y-auto">
              <StockRadar />
            </div>
          )}
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </main>
  );
}
