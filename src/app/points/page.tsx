import Link from 'next/link';

export default function PointsRulesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← 返回首页
          </Link>
        </div>

        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">积分规则</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
            积分用于控制分析次数与激励邀请。以下为当前规则：
          </p>

          <div className="mt-6 space-y-4">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">积分变动</h2>
              <ul className="mt-2 list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
                <li>每次进行股票分析：消耗 100 积分</li>
                <li>注册成功：赠送 500 积分</li>
                <li>成功邀请一位新用户注册：邀请人奖励 200 积分</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">邀请码规则</h2>
              <ul className="mt-2 list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">
                <li>注册必须填写邀请码；没有邀请码无法注册</li>
                <li>邀请码单次使用：一旦用于注册成功即作废</li>
                <li>每位用户每天最多生成 1 个邀请码（当天已生成且未使用时会返回同一个邀请码）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">说明</h2>
              <p className="mt-2 text-gray-700 dark:text-gray-300 text-sm">
                若积分不足，将无法提交新的分析任务。积分余额以登录状态下显示为准。
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
