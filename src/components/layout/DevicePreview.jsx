import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

const DevicePreview = ({ children }) => {
  const [device, setDevice] = useState('android');
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth > 1024 : false);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    const preventOuterScroll = (e) => {
      const scrollEl = document.getElementById('mobile-scroll-container');
      if (scrollEl && scrollEl.contains(e.target)) {
        return; // Allow scrolling inside mobile phone viewport
      }
      e.preventDefault(); // Lock desktop canvas from moving/scrolling
    };
    window.addEventListener('wheel', preventOuterScroll, { passive: false });
    return () => window.removeEventListener('wheel', preventOuterScroll);
  }, [isDesktop]);

  if (!isDesktop) {
    return (
      <div className="w-full min-h-screen min-h-[100dvh] bg-[#F6FAF5] flex flex-col">
        {children}
      </div>
    );
  }

  const dimensions = {
    iphone: { width: 390, height: 844 },
    android: { width: 412, height: 915 }
  };

  const { width, height } = dimensions[device];

  // Calculate scale so the phone fits comfortably within the desktop window height, leaving some padding
  const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 80 : 900;
  const scale = Math.min(1, availableHeight / (height + 30));

  return (
    <div className="fixed inset-0 h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center font-sans overflow-hidden select-none overscroll-none">
      
      {/* Left Control Panel */}
      <div className="flex-shrink-0 w-64 mr-12 flex flex-col h-full justify-center">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Preview Mode</h2>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setDevice('android')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                device === 'android' 
                ? 'border-green-500 bg-green-50/50 shadow-sm' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className={`text-sm font-semibold ${device === 'android' ? 'text-green-700' : 'text-gray-700'}`}>Android</span>
                <span className="text-xs text-gray-500 mt-0.5">412 × 915</span>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                device === 'android' ? 'border-green-500' : 'border-gray-300'
              }`}>
                {device === 'android' && <div className="w-2 h-2 rounded-full bg-green-500" />}
              </div>
            </button>

            <button 
              onClick={() => setDevice('iphone')}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                device === 'iphone' 
                ? 'border-green-500 bg-green-50/50 shadow-sm' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex flex-col items-start">
                <span className={`text-sm font-semibold ${device === 'iphone' ? 'text-green-700' : 'text-gray-700'}`}>iPhone</span>
                <span className="text-xs text-gray-500 mt-0.5">390 × 844</span>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                device === 'iphone' ? 'border-green-500' : 'border-gray-300'
              }`}>
                {device === 'iphone' && <div className="w-2 h-2 rounded-full bg-green-500" />}
              </div>
            </button>
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-500 leading-relaxed">
              <span className="font-semibold text-gray-700">Live Application View</span><br/>
              The existing React application is rendered directly inside the simulated viewport.
            </p>
          </div>
        </div>
      </div>

      {/* Phone Frame Container */}
      <div 
        className="relative flex-shrink-0 flex items-center justify-center transition-all duration-300 ease-out"
        style={{
          width: width,
          height: height,
          transform: `scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {/* Hardware Frame (Clean sleek border, NO notch or cutout) */}
        <div 
          className="absolute inset-0 pointer-events-none rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.3)] border-[12px] border-gray-900"
          style={{ width: width + 24, height: height + 24, left: -12, top: -12, zIndex: 50 }}
        >
          {/* Subtle phone bezel edge */}
          <div className="absolute inset-0 rounded-[1.8rem] border border-white/10 pointer-events-none" />

          {/* Hardware side buttons */}
          <div className="absolute -left-[14px] top-[100px] w-[2px] h-[30px] bg-gray-800 rounded-l-sm" />
          <div className="absolute -left-[14px] top-[150px] w-[2px] h-[60px] bg-gray-800 rounded-l-sm" />
          <div className="absolute -right-[14px] top-[180px] w-[2px] h-[80px] bg-gray-800 rounded-r-sm" />
        </div>

        {/* Live Application Viewport (Uninterrupted full-screen view) */}
        <div 
          className="relative bg-[#F6FAF5] w-full h-full rounded-[1.8rem] overflow-hidden"
          style={{
            transform: 'translateZ(0)',
            '--vw': `${width}px`,
            '--vh': `${height}px`,
          }}
        >
           {/* Internal Scrollable Area for the App to render in */}
           <div 
             id="mobile-scroll-container"
             className="w-full h-full overflow-y-auto overflow-x-hidden relative no-scrollbar overscroll-contain"
             style={{
               overscrollBehaviorY: 'contain',
               WebkitOverflowScrolling: 'touch'
             }}
           >
             {children}
           </div>
        </div>
      </div>
    </div>
  );
};

export default DevicePreview;
