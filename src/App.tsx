import { WelcomeScreen } from '@/components/WelcomeScreen';
import { useFileStore } from '@/stores/fileStore';

function AppContent() {
  const { isAuthorized } = useFileStore();

  // 未授权时显示欢迎界面
  if (!isAuthorized) {
    return <WelcomeScreen />;
  }

  // 已授权时显示主界面（待实现）
  return (
    <div className="h-screen flex">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fg mb-2">PromptClip</h1>
          <p className="text-muted">主界面加载中...</p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
