import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 80 }: { size?: number }) {
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size * 0.75, height: size * 0.75 }}
    >
      {/* Blob 1 - cyan, top-right */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.35,
          height: size * 0.3,
          background: 'linear-gradient(135deg, #00FFFF, #1E90FF)',
          filter: 'blur(1px)',
        }}
        animate={{
          x: [size * 0.15, -size * 0.15, size * 0.15],
          y: [-size * 0.2, size * 0.2, -size * 0.2],
          scale: [1, 0.85, 1],
          rotate: [0, 360],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Blob 2 - deep blue, bottom-left */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.3,
          height: size * 0.25,
          background: 'linear-gradient(135deg, #1E90FF, #0044FF)',
          filter: 'blur(1px)',
        }}
        animate={{
          x: [-size * 0.15, size * 0.15, -size * 0.15],
          y: [size * 0.2, -size * 0.2, size * 0.2],
          scale: [0.85, 1, 0.85],
          rotate: [120, 480],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
      />
      
      {/* Blob 3 - purple, accent */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          background: 'linear-gradient(135deg, #9370DB, #6A5ACD)',
          filter: 'blur(1px)',
        }}
        animate={{
          x: [size * 0.05, -size * 0.05, size * 0.05],
          y: [size * 0.05, -size * 0.1, size * 0.05],
          scale: [1, 1.2, 1],
          rotate: [240, 600],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
        opacity={0.7}
      />
    </div>
  );
}
