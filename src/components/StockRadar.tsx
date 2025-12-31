'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Activity,
  VolumeX,
  BarChart3,
  Lock,
  Sparkles,
  Radio,
  Zap,
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
    { icon: ArrowUpCircle, label: '创新高', color: 'text-coral-400' },
    { icon: TrendingUp, label: '连续上涨', color: 'text-coral-400' },
    { icon: Activity, label: '持续放量', color: 'text-coral-400' },
    { icon: ArrowUpCircle, label: '向上突破', color: 'text-coral-400' },
    { icon: BarChart3, label: '量价齐升', color: 'text-coral-400' },
  ];

  // 下跌信号类型
  const bearishSignals = [
    { icon: ArrowDownCircle, label: '创新低', color: 'text-jade-400' },
    { icon: TrendingDown, label: '连续下跌', color: 'text-jade-400' },
    { icon: VolumeX, label: '持续缩量', color: 'text-jade-400' },
    { icon: ArrowDownCircle, label: '向下突破', color: 'text-jade-400' },
    { icon: BarChart3, label: '量价齐跌', color: 'text-jade-400' },
  ];

  // 未登录提示
  if (!user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-12 text-center"
      >
        <motion.div
          className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
            border: '1px solid rgba(251, 191, 36, 0.2)',
          }}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(251, 191, 36, 0)',
              '0 0 40px 10px rgba(251, 191, 36, 0.1)',
              '0 0 0 0 rgba(251, 191, 36, 0)',
            ],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Lock className="w-12 h-12 text-amber-400" />
        </motion.div>
        <h2 className="text-2xl font-bold text-ink-100 mb-4 font-display">
          个股雷达需要登录
        </h2>
        <p className="text-ink-400 mb-8 max-w-md mx-auto">
          个股雷达是高级功能，可以实时监控市场异动信号。登录后即可使用此功能。
        </p>
        <motion.div
          className="inline-block text-left rounded-xl p-6"
          style={{
            background: 'rgba(26, 26, 37, 0.8)',
            border: '1px solid rgba(37, 37, 50, 0.8)',
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold text-ink-100 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            功能预览
          </h3>
          <ul className="text-sm text-ink-400 space-y-2">
            {['创新高/创新低监控', '连续上涨/下跌提醒', '持续放量/缩量检测', '向上/向下突破信号', '量价齐升/齐跌分析'].map((item, i) => (
              <motion.li
                key={item}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <Zap className="w-3 h-3 text-amber-400/60" />
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-ink-100 font-display flex items-center gap-3">
              <Radio className="w-7 h-7 text-amber-400" />
              个股雷达
            </h2>
            <p className="text-ink-400 mt-2">
              实时监控市场异动信号 — 功能开发中
            </p>
          </div>
          <motion.div
            className="px-4 py-2 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(249, 115, 22, 0.1) 100%)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
            }}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(251, 191, 36, 0)',
                '0 0 20px 5px rgba(251, 191, 36, 0.1)',
                '0 0 0 0 rgba(251, 191, 36, 0)',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <p className="text-sm text-amber-400 font-semibold">
              即将上线
            </p>
          </motion.div>
        </div>

        {/* 信号类型展示 */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 上涨信号区 */}
          <motion.div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(251, 113, 133, 0.08) 0%, rgba(251, 113, 133, 0.02) 100%)',
              border: '1px solid rgba(251, 113, 133, 0.2)',
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-coral-400/10">
                <TrendingUp className="w-5 h-5 text-coral-400" />
              </div>
              <h3 className="text-lg font-semibold text-ink-100">
                上涨信号
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {bullishSignals.map((signal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="flex items-center gap-3 bg-ink-800/60 p-3 rounded-xl border border-ink-600/50 hover:border-coral-400/30 transition-colors group"
                >
                  <signal.icon className={`w-5 h-5 ${signal.color} group-hover:scale-110 transition-transform`} />
                  <span className="font-medium text-ink-200 group-hover:text-ink-100 transition-colors">
                    {signal.label}
                  </span>
                  <span className="ml-auto text-sm text-ink-500 font-mono">
                    0 支
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* 下跌信号区 */}
          <motion.div
            className="rounded-2xl p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.08) 0%, rgba(52, 211, 153, 0.02) 100%)',
              border: '1px solid rgba(52, 211, 153, 0.2)',
            }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 rounded-lg bg-jade-400/10">
                <TrendingDown className="w-5 h-5 text-jade-400" />
              </div>
              <h3 className="text-lg font-semibold text-ink-100">
                下跌信号
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {bearishSignals.map((signal, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  className="flex items-center gap-3 bg-ink-800/60 p-3 rounded-xl border border-ink-600/50 hover:border-jade-400/30 transition-colors group"
                >
                  <signal.icon className={`w-5 h-5 ${signal.color} group-hover:scale-110 transition-transform`} />
                  <span className="font-medium text-ink-200 group-hover:text-ink-100 transition-colors">
                    {signal.label}
                  </span>
                  <span className="ml-auto text-sm text-ink-500 font-mono">
                    0 支
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* 信号列表 - 预留 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-8"
      >
        <h3 className="text-xl font-semibold text-ink-100 mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          实时信号
        </h3>
        <motion.div
          className="text-center py-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.div
            className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{
              background: 'rgba(26, 26, 37, 0.8)',
              border: '1px solid rgba(37, 37, 50, 0.8)',
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Activity className="w-10 h-10 text-ink-500" />
          </motion.div>
          <p className="text-ink-400 text-lg">
            暂无信号数据
          </p>
          <p className="text-sm text-ink-500 mt-2 max-w-md mx-auto">
            该功能将支持实时监控创新高、创新低、连续上涨/下跌等市场异动
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
