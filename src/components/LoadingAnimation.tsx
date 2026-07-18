import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200">
      <defs>
        <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFFF" />
          <stop offset="100%" stopColor="#0088FF" />
        </linearGradient>
        <linearGradient id="blueGrad" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#00E5FF" />
          <stop offset="100%" stopColor="#0044FF" />
        </linearGradient>
      </defs>

      {/* Rotating container */}
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      >
        {/* Upper blob - cyan/blue crescent */}
        <motion.path
          d="M100 15 Q145 20 170 60 Q195 100 170 135 Q150 160 120 155 Q90 150 85 120 Q80 90 90 55 Q95 25 100 15Z"
          fill="url(#cyanGrad)"
          animate={{
            d: [
              'M100 15 Q145 20 170 60 Q195 100 170 135 Q150 160 120 155 Q90 150 85 120 Q80 90 90 55 Q95 25 100 15Z',
              'M100 30 Q140 35 160 70 Q180 105 160 140 Q140 165 115 150 Q85 135 80 105 Q75 75 90 45Z',
              'M100 45 Q135 50 150 80 Q165 110 150 140 Q130 155 110 145 Q85 130 80 100 Q75 70 90 50Z',
              'M100 15 Q145 20 170 60 Q195 100 170 135 Q150 160 120 155 Q90 150 85 120 Q80 90 90 55 Q95 25 100 15Z',
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Lower blob - deep blue crescent */}
        <motion.path
          d="M100 185 Q55 180 30 140 Q5 100 30 65 Q50 40 80 45 Q110 50 115 80 Q120 110 110 145 Q105 175 100 185Z"
          fill="url(#blueGrad)"
          animate={{
            d: [
              'M100 185 Q55 180 30 140 Q5 100 30 65 Q50 40 80 45 Q110 50 115 80 Q120 110 110 145 Q105 175 100 185Z',
              'M100 170 Q60 165 40 130 Q20 95 40 60 Q60 35 85 50 Q115 65 120 95 Q125 125 110 155Z',
              'M100 155 Q65 150 50 120 Q35 90 50 60 Q70 45 90 55 Q115 70 120 100 Q125 130 110 150Z',
              'M100 185 Q55 180 30 140 Q5 100 30 65 Q50 40 80 45 Q110 50 115 80 Q120 110 110 145 Q105 175 100 185Z',
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Small accent dots */}
        <motion.circle
          cx="130" cy="100" r="4"
          fill="#0044FF"
          animate={{ cx: [130, 135, 125, 130], cy: [100, 95, 105, 100] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          opacity={0.6}
        />
        <motion.circle
          cx="65" cy="100" r="4"
          fill="#1E90FF"
          animate={{ cx: [65, 60, 70, 65], cy: [100, 105, 95, 100] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          opacity={0.6}
        />
      </motion.g>
    </svg>
  );
}
