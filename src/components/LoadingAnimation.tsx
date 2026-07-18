import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 64 }: { size?: number }) {
  const duration = 3;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor="#00CED1" />
        </linearGradient>
        <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E90FF" />
          <stop offset="100%" stopColor="#4169E1" />
        </linearGradient>
        <linearGradient id="g3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9370DB" />
          <stop offset="100%" stopColor="#6A5ACD" />
        </linearGradient>
      </defs>

      {/* Cyan blob - top right */}
      <motion.path
        d="M85 30 Q100 25 105 45 Q110 65 95 80 Q80 95 65 90 Q50 85 55 65 Q60 45 75 35Z"
        fill="url(#g1)"
        animate={{
          d: [
            'M85 30 Q100 25 105 45 Q110 65 95 80 Q80 95 65 90 Q50 85 55 65 Q60 45 75 35Z',
            'M70 20 Q90 15 100 35 Q110 55 100 75 Q85 90 65 85 Q45 80 45 60 Q45 35 60 25Z',
          ],
          rotate: [0, 360],
        }}
        transition={{
          d: { duration: duration * 0.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
          rotate: { duration: duration, repeat: Infinity, ease: 'linear' },
        }}
        opacity={0.9}
      />

      {/* Blue blob - bottom */}
      <motion.path
        d="M45 95 Q65 110 80 95 Q95 80 85 60 Q75 40 55 45 Q35 50 35 70 Q35 85 40 90Z"
        fill="url(#g2)"
        animate={{
          d: [
            'M45 95 Q65 110 80 95 Q95 80 85 60 Q75 40 55 45 Q35 50 35 70 Q35 85 40 90Z',
            'M40 85 Q55 100 75 95 Q95 90 90 70 Q85 50 65 45 Q45 40 35 60 Q25 75 30 85Z',
          ],
          rotate: [120, 480],
        }}
        transition={{
          d: { duration: duration * 0.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.15 },
          rotate: { duration: duration, repeat: Infinity, ease: 'linear' },
        }}
        opacity={0.7}
      />

      {/* Purple blob - left */}
      <motion.path
        d="M25 40 Q10 55 15 75 Q20 95 40 90 Q60 85 65 65 Q70 45 55 35 Q40 25 30 35Z"
        fill="url(#g3)"
        animate={{
          d: [
            'M25 40 Q10 55 15 75 Q20 95 40 90 Q60 85 65 65 Q70 45 55 35 Q40 25 30 35Z',
            'M20 55 Q10 70 25 85 Q40 100 60 85 Q75 70 65 50 Q55 30 40 35 Q25 40 20 55Z',
          ],
          rotate: [240, 600],
        }}
        transition={{
          d: { duration: duration * 0.5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 0.3 },
          rotate: { duration: duration, repeat: Infinity, ease: 'linear' },
        }}
        opacity={0.5}
      />
    </svg>
  );
}
