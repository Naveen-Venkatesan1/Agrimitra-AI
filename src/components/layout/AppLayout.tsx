import React, { useState, useRef, useEffect, Component, ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileBottomNav from './MobileBottomNav';
import BackButton from '../ui/BackButton';
import { Sprout, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReload?: () => void;
  locationKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: any;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught render error caught by AppErrorBoundary:", error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm max-w-md mx-auto my-12 space-y-4">
          <Sprout className="w-12 h-12 text-agri-primary mx-auto" />
          <h3 className="text-base font-bold text-gray-800">Refreshing Dashboard View...</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            An unexpected error occurred while loading this view. Click below to safely restore your session.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              if (this.props.onReload) {
                this.props.onReload();
              }
            }}
            className="px-4 py-2 bg-agri-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-agri-dark transition flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const location = useLocation();
  const mainScrollRef = useRef<HTMLElement>(null);

  // Scroll to top of the internal container on every route change
  useEffect(() => {
    // A tiny timeout ensures the Outlet has fully rendered the new page DOM
    // before we force the scroll reset, bypassing any React Router race conditions.
    setTimeout(() => {
      // 1. Reset the mobile DevicePreview scroll container (if present in development/preview)
      const mobileContainer = document.getElementById('mobile-scroll-container');
      if (mobileContainer) {
        mobileContainer.scrollTo({ top: 0, behavior: 'auto' });
        mobileContainer.scrollTop = 0;
      }

      // 2. Reset the internal app container
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: 'auto' });
        // Fallback for Safari/older mobile browsers
        mainScrollRef.current.scrollTop = 0;
      }
      // 3. Reset window as a fallback just in case
      window.scrollTo({ top: 0, behavior: 'auto' });
    }, 0);
  }, [location.pathname]);

  // Allow child pages (e.g. Dashboard hero) to open the sidebar via a custom DOM event
  useEffect(() => {
    const handler = () => setSidebarOpen(true);
    window.addEventListener('open-sidebar', handler);
    return () => window.removeEventListener('open-sidebar', handler);
  }, []);

  // Hide BackButton on specific core tabs for a cleaner mobile feel
  const isCoreTab = ['/dashboard', '/weather', '/crop-intelligence', '/alerts', '/profile', '/satellite', '/market-intelligence'].includes(location.pathname);
  const isAIAssistant = location.pathname === '/ai-assistant';

  return (
    <div 
      className={`w-full bg-[#F9FAFB] flex flex-col relative ${
        isAIAssistant 
          ? 'h-[var(--vh,100dvh)] overflow-hidden' 
          : 'min-h-[var(--vh,100dvh)]'
      }`}
    >
      {/* Mobile Drawer (repurposed Sidebar) */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main App Container - takes 100% width, no more desktop padding */}
      <div className="flex-1 flex flex-col min-w-0 w-full transition-all">
        {/* Compact TopBar */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} isCoreTab={isCoreTab} />

        {/* Page Content */}
        <main 
          ref={mainScrollRef}
          className={`flex-1 w-full app-container overflow-y-auto no-scrollbar ${
            isAIAssistant ? 'flex flex-col pb-20' : location.pathname === '/dashboard' ? 'pb-16' : 'py-4 pb-20'
          }`}
          style={{ paddingTop: location.pathname === '/dashboard' ? '0' : 'env(safe-area-inset-top, 16px)' }}
        >
          {!isCoreTab && !isAIAssistant && <BackButton />}
          <AppErrorBoundary locationKey={location.pathname} onReload={() => setReloadKey(prev => prev + 1)}>
            <Outlet key={reloadKey} />
          </AppErrorBoundary>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onMenuClick={() => setSidebarOpen(true)} />
      </div>
    </div>
  );
};

export default AppLayout;
