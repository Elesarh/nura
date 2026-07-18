import { motion } from 'framer-motion';

const BLOB_COLORS = ['#00D4FF', '#1E90FF', '#0A2350'];
const BLOB_PATHS = [
  'M50 10 Q80 0 95 20 Q110 40 95 70 Q75 90 50 85 Q20 75 15 50 Q10 25 30 12Z',
  'M95 50 Q110 25 130 30 Q150 35 145 60 Q140 85 120 90 Q100 95 90 80 Q80 65 90 50Z',
  'M15 60 Q25 85 50 90 Q70 95 75 75 Q80 55 65 45 Q45 30 25 40 Q10 45 15 60Z',
];

export function LoadingAnimation({ size = 64 }: { size?: number }) {
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
    >
      <svg width={size} height={size} viewBox="0 0 160 100">
        {BLOB_PATHS.map((path, i) => (
          <motion.path
            key={i}
            d={path}
            fill={BLOB_COLORS[i]}
            animate={{
              d: [
                path,
                path === BLOB_PATHS[i] ? 
                  // Slight morph variations
                  BLOB_PATHS[i].replace(/(\d+)/g, m => String(Number(m) + (i % 2 ? -3 : 3)))
                  : path
              ]
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            opacity={1 - i * 0.15}
          />
        ))}
      </svg>
    </motion.div>
  );
}
