import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in
    const t1 = setTimeout(() => setOpacity(1), 50);
    // Stay visible
    const t2 = setTimeout(() => setOpacity(0), 1800);
    // Finish
    const t3 = setTimeout(() => onFinish(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0f0f23]"
         style={{ opacity, transition: 'opacity 0.6s ease-in-out' }}>
      {/* Logo - using the actual app icon image */}
      <img 
        src="/splash-logo.png" 
        alt="NURA" 
        width={180} 
        height={180}
        className="select-none pointer-events-none"
        style={{ 
          opacity: opacity,
          transform: `scale(${opacity * 0.4 + 0.6})`,
          transition: 'opacity 0.8s ease-out, transform 0.8s ease-out'
        }}
      />
      
      {/* Brand text */}
      <p className="text-white text-2xl tracking-[0.3em] mt-4 font-light"
         style={{ 
           opacity: Math.max(0, opacity * 1.5 - 0.5),
           transform: `translateY(${(1 - opacity) * 10}px)`,
           transition: 'opacity 0.6s ease-out, transform 0.6s ease-out'
         }}>
        NURA
      </p>
    </div>
  );
}
