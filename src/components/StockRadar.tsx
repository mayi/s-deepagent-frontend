'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  Volume2,
  VolumeX,
  BarChart3,
  Lock,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// 预留的雷达信号类型
interface RadarSignal {
  code: string;
  name: string;
  price: number;
  change: number;
  signal: string;
  timestamp: string;
}

export default function StockRadar() {
  const { user } = useAuth();
  const [signals] = useState<RadarSignal[]>([]);

  // 上涨信号类型
  const bullishSignals = [
    { icon: ArrowUpCircle, label: '创新高', color: 'text-red-500' },
    { icon: TrendingUp, label: '连续上涨', color: 'text-red-500' },
    { icon: Activity, label: '持续放量', color: 'text-red-500' },
    { icon: ArrowUpCircle, label: '向上突破', color: 'text-red-500' },
    { icon: BarChart3, label: '量价齐升', color: 'text-red-500' },
  ];

  // 下跌信号类型
  const bearishSignals = [
    { icon: ArrowDownCircle, label: '创新低', color: 'text-green-600' },
    { icon: TrendingDown, label: '连续下跌', color: 'text-green-600' },
    { icon: VolumeX, label: '持续缩量', color: 'text-green-600' },
    { icon: ArrowDownCircle, label: '向下突破', color: 'text-green-600' },
    { icon: BarChart3, label: '量价齐跌', color: 'text-green-600' },
  ];

  // 未登录提示
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
      >
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          个股雷达需要登录
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          个股雷达是高级功能，可以实时监控市场异动信号。登录后即可使用此功能。
        </p>
        <div className="flex justify-center gap-4">
          <div className="text-left bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">功能预览</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• 创新高/创新低监控</li>
              <li>• 连续上涨/下跌提醒</li>
              <li>• 持续放量/缩量检测</li>
              <li>• 向上/向下突破信号</li>
              <li>• 量价齐升/齐跌分析</li>
            </ul>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              个股雷达
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              实时监控市场异动信号 - 功能开发中
            </p>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-lg">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              即将上线
            </p>
          </div>
        </div>

        {/* 信号类型展示 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 上涨信号区 */}
          <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-6 border-2 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                上涨信号
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {bullishSignals.map((signal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg"
                >
                  <signal.icon className={`w-5 h-5 ${signal.color}`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {signal.label}
                  </span>
                  <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    0 支
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 下跌信号区 */}
          <div className="bg-green-50 dark:bg-green-900/10 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                下跌信号
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {bearishSignals.map((signal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg"
                >
                  <signal.icon className={`w-5 h-5 ${signal.color}`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {signal.label}
                  </span>
                  <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    0 支
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 信号列表 - 预留 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          实时信号
        </h3>
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            暂无信号数据
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            该功能将支持实时监控创新高、创新低、连续上涨/下跌等市场异动
          </p>
        </div>
      </motion.div>
    </div>
  );
}
