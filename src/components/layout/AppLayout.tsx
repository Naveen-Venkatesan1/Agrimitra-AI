import React, { useState, Component, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BackButton from '../ui/BackButton';
import { Sprout, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught render error caught by AppErrorBoundary:", error, errorInfo);
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
              this.setState({ hasError: false });
              window.location.href = '/dashboard';
            }}
            className="px-4 py-2 bg-agri-primary text-white text-xs font-bold rounded-xl shadow-sm hover:bg-agri-dark transition flex items-center justify-center gap-2 mx-auto"
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

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col lg:flex-row">
      {/* Shared Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[260px] transition-all">
        {/* Shared TopBar */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main className="flex-1 w-full app-container py-6">
          <BackButton />
          <AppErrorBoundary>
            <Outlet />
          </AppErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
