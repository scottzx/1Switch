function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-surface-app">
      {/* 背景渐变 */}
      <div className="fixed inset-0 bg-gradient-radial pointer-events-none" />

      {/* Logo / 标题区 */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-claw-400 to-claw-600 bg-clip-text text-transparent">
          iClaw 统一门户
        </h1>
        <p className="text-content-secondary text-lg">OpenClaw Management Portal</p>
      </div>

      {/* 入口卡片 */}
      <div className="grid gap-6 w-full max-w-xl animate-slide-up">
        <a
          href="/app/iclaw/"
          className="block p-8 rounded-2xl bg-surface-card border border-edge shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-claw-500 to-claw-600 flex items-center justify-center text-white text-xl font-bold shadow-glow-claw">
              iC
            </div>
            <div>
              <h2 className="text-xl font-semibold text-content-primary group-hover:text-claw-500 transition-colors">
                进入管理系统
              </h2>
              <p className="text-content-secondary mt-1">
                访问 OpenClaw 设备管理与配置界面
              </p>
            </div>
          </div>
        </a>
      </div>

      {/* 底部信息 */}
      <div className="mt-12 text-content-tertiary text-sm animate-fade-in">
        <p>OpenClaw Portal &bull; v0.1.0</p>
      </div>
    </div>
  );
}

export default App;
