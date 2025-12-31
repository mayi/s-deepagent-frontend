'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, Gift, Sparkles, Users, Zap } from 'lucide-react';

export default function PointsRulesPage() {
  const rules = [
    {
      icon: Sparkles,
      title: '积分变动',
      items: [
        { label: '每次进行股票分析', value: '-100', color: 'text-coral-400' },
        { label: '注册成功', value: '+500', color: 'text-jade-400' },
        { label: '成功邀请一位新用户', value: '+200', color: 'text-jade-400' },
      ],
    },
    {
      icon: Users,
      title: '邀请码规则',
      items: [
        { label: '注册必须填写邀请码', note: '没有邀请码无法注册' },
        { label: '邀请码单次使用', note: '一旦用于注册成功即作废' },
        { label: '每日生成限制', note: '每位用户每天最多生成 1 个邀请码' },
      ],
    },
  ];

  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Back Link */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-ink-400 hover:text-amber-400 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            返回首页
          </Link>
        </motion.div>

        {/* Header Card */}
        <motion.div
          className="card p-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
              }}
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(251, 191, 36, 0)',
                  '0 0 20px 5px rgba(251, 191, 36, 0.15)',
                  '0 0 0 0 rgba(251, 191, 36, 0)',
                ],
              }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Coins className="w-7 h-7 text-amber-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-ink-100 font-display">积分规则</h1>
              <p className="text-ink-400 text-sm mt-1">
                积分用于控制分析次数与激励邀请
              </p>
            </div>
          </div>
        </motion.div>

        {/* Rules Cards */}
        <div className="space-y-6">
          {rules.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              className="card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + sectionIndex * 0.1 }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg bg-amber-400/10">
                  <section.icon className="w-5 h-5 text-amber-400" />
                </div>
                <h2 className="text-lg font-semibold text-ink-100">{section.title}</h2>
              </div>

              <div className="space-y-3">
                {section.items.map((item, itemIndex) => (
                  <motion.div
                    key={item.label}
                    className="flex items-center justify-between p-4 rounded-xl bg-ink-800/50 border border-ink-600/50 hover:border-amber-400/20 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + sectionIndex * 0.1 + itemIndex * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-4 h-4 text-amber-400/60" />
                      <div>
                        <span className="text-ink-200">{item.label}</span>
                        {'note' in item && (
                          <p className="text-xs text-ink-500 mt-0.5">{item.note}</p>
                        )}
                      </div>
                    </div>
                    {'value' in item && (
                      <span className={`font-mono font-bold text-lg ${'color' in item ? item.color : 'text-ink-300'}`}>
                        {item.value}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}

          {/* Info Card */}
          <motion.div
            className="card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-400/10">
                <Gift className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-ink-100">说明</h2>
            </div>
            <p className="text-ink-400 text-sm leading-relaxed">
              若积分不足，将无法提交新的分析任务。积分余额以登录状态下显示为准。
              如需更多积分，请通过邀请好友注册的方式获取。
            </p>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
