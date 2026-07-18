import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 72 }: { size?: number }) {
  const s = size * 0.35;
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Three orbiting blobs - exact Dribbble style */}
      <svg width={size} height={size} viewBox="0 0 120 120">
        <defs>
          <radialGradient id="g1" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#00FFFF" stopOpacity="1"/>
            <stop offset="100%" stopColor="#00CED1" stopOpacity="0.6"/>
          </radialGradient>
          <radialGradient id="g2" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1E90FF" stopOpacity="1"/>
            <stop offset="100%" stopColor="#0066CC" stopOpacity="0.6"/>
          </radialGradient>
          <radialGradient id="g3" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#9370DB" stopOpacity="0.8"/>
            <stop offset="100%" stopColor="#6A5ACD" stopOpacity="0.4"/>
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Main blob - cyan - stays mostly in upper-right */}
        <motion.ellipse
          cx="75" cy="35" rx="28" ry="22"
          fill="url(#g1)" filter="url(#glow)"
          animate={{
            cx: [75, 65, 75, 85, 75],
            cy: [35, 45, 55, 45, 35],
            rx: [28, 24, 28, 24, 28],
            ry: [22, 26, 22, 26, 22],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Middle blob - blue - moves bottom */}
        <motion.ellipse
          cx="45" cy="75" rx="24" ry="18"
          fill="url(#g2)" filter="url(#glow)"
          animate={{
            cx: [45, 55, 45, 35, 45],
            cy: [75, 65, 55, 65, 75],
            rx: [24, 20, 24, 20, 24],
            ry: [18, 22, 18, 22, 18],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.1 }}
        />

        {/* Small accent blob - purple */}
        <motion.ellipse
          cx="60" cy="60" rx="14" ry="12"
          fill="url(#g3)" filter="url(#glow)"
          animate={{
            cx: [60, 50, 60, 70, 60],
            cy: [60, 70, 80, 70, 60],
            rx: [14, 18, 14, 18, 14],
            ry: [12, 16, 12, 16, 12],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
        />
      </svg>
    </div>
  );
}
