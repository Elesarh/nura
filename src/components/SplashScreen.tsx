import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
  onFinish?: () => void;
  persist?: boolean;
}

export function SplashScreen({ onFinish, persist }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (persist) {
      // Stay visible until loading is done
      setPhase(1);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 50);   // fade in
    const t2 = setTimeout(() => setPhase(2), 1800);  // start fade out
    const t3 = setTimeout(() => onFinish?.(), 2500);  // done
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish, persist]);

  const isVisible = phase >= 1 && phase < 2;
  const isExiting = phase === 2;
  const isLoading = persist || isVisible;

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000000' }}
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* NURA Logo - three arcs */}
      <motion.svg
        width={persist ? 100 : 170}
        height={persist ? 100 : 170}
        viewBox="0 0 512 512"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{
          scale: isLoading ? 1 : 0.5,
          opacity: isExiting ? 0 : (isLoading ? 1 : 0),
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <rect width="512" height="512" fill="transparent" />
        <g transform="translate(256, 256)">
          <path d="M-130 10 A 130 130 0 0 0 130 10" 
                stroke="#FFFFFF" strokeWidth="16" fill="none" strokeLinecap="round" opacity="0.9"/>
          <path d="M-90 -30 A 90 90 0 0 0 90 -30" 
                stroke="#FFFFFF" strokeWidth="13" fill="none" strokeLinecap="round" opacity="0.85"/>
          <path d="M-55 -60 A 55 55 0 0 0 55 -60" 
                stroke="#FFFFFF" strokeWidth="10" fill="none" strokeLinecap="round" opacity="0.8"/>
        </g>
      </motion.svg>

      {/* Brand text */}
      <motion.p
        className="text-white text-2xl tracking-[0.3em] mt-4 font-light"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: isLoading ? 1 : 0,
          y: isLoading ? 0 : 10,
        }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        NURA
      </motion.p>

      {/* Gentle loading dots animation - only during persistent loading */}
      {persist && (
        <motion.div 
          className="flex items-center gap-1.5 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/40"
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
