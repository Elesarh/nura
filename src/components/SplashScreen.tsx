import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100);
    const t2 = setTimeout(() => setPhase('exit'), 1800);
    const t3 = setTimeout(() => onFinish(), 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinish]);

  return (
    <motion.div
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#0f0f23]"
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'exit' ? 0 : 1 }}
      transition={{ duration: 0.6, ease: 'easeInOut' }}
    >
      {/* Logo arcs */}
      <motion.svg
        width="180" height="180" viewBox="0 0 512 512"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{
          scale: phase === 'visible' ? 1 : 0.6,
          opacity: phase === 'enter' ? 0 : 1,
        }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <rect width="512" height="512" fill="transparent" />
        <g transform="translate(256, 256)">
          <path d="M-160 30 A 150 150 0 0 1 160 30"
                stroke="#FFFFFF" strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.9"/>
          <path d="M-120 -20 A 110 110 0 0 1 120 -20"
                stroke="#FFFFFF" strokeWidth="11" fill="none" strokeLinecap="round" opacity="0.85"/>
          <path d="M-80 -60 A 80 80 0 0 1 80 -60"
                stroke="#FFFFFF" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.8"/>
        </g>
      </motion.svg>

      {/* Brand text */}
      <motion.p
        className="text-white text-2xl tracking-[0.3em] mt-4 font-light"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: phase === 'visible' ? 1 : 0,
          y: phase === 'visible' ? 0 : 10,
        }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        NURA
      </motion.p>
    </motion.div>
  );
}
