import React from 'react';

/**
 * Agrimitra AI Logo Component matching Reference Image 1
 * Variants:
 * - full: Complete logo with wordmark + tagline
 * - compact: Logo with wordmark without tagline
 * - icon: Icon-only leaf & circuit symbol
 */
export const LogoIcon = ({ className = "w-14 h-14", light = false }) => {
  return (
    <div className={`bg-white rounded-xl overflow-hidden shadow-sm flex items-center justify-center shrink-0 ${className}`}>
      <img 
        src="/new-logo.jpg" 
        alt="Agrimitra AI Logo Icon" 
        className="w-full h-full object-contain scale-[1.15]" 
      />
    </div>
  );
};

export const Logo = ({ variant = "full", light = false, className = "" }) => {
  if (variant === "icon") {
    return <LogoIcon className={`w-12 h-12 ${className}`} light={light} />;
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <LogoIcon className="w-14 h-14 flex-shrink-0" light={light} />
      <div className="flex flex-col">
        <div className={`flex items-baseline tracking-tight font-extrabold text-xl leading-none ${light ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : ''}`}>
          <span className={light ? "text-white" : "text-agri-dark"}>AGRIMITRA&nbsp;</span>
          <span className={light ? "text-white" : "text-agri-light"}>AI</span>
        </div>
        {variant === "full" && (
          <span className={`text-[10px] font-medium tracking-wide mt-1 whitespace-nowrap ${light ? "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" : "text-agri-dark/80"}`}>
            Smart Farming. Better Tomorrow
          </span>
        )}
      </div>
    </div>
  );
};

export default Logo;
