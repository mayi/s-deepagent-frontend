'use client';

import { useState } from 'react';
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  A股智能分析系统
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  基于DeepAgents的多代理股票分析平台
                </p>
              </div>
            </div>
            
            {/* User Section */}
            <div className="flex items-center gap-4">
              {isLoading ? (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {user.email}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">退出</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  <User className="w-4 h-4" />
                  登录 / 注册
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-1 w-fit">
          <button
            onClick={() => setActiveTab('analyzer')}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === 'analyzer'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            个股分析
          </button>
          <button
            onClick={handleRadarClick}
            className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 ${
              activeTab === 'radar'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            个股雷达
            {!user && <Lock className="w-4 h-4 text-amber-500" />}
          </button>
        </div>
        
        {/* Guest Notice */}
        {!user && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              💡 您当前未登录，每天只能进行1次股票分析。
              <button
                onClick={() => setShowAuthModal(true)}
                className="ml-2 text-blue-500 hover:text-blue-600 underline"
              >
                登录或注册
              </button>
              以解锁无限分析次数和高级功能。
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {activeTab === 'analyzer' ? <StockAnalyzer /> : <StockRadar />}
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </main>
  );
}
