import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 80 }: { size?: number }) {
  const s = size * 0.35;
  
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow underneath */}
      <div className="absolute inset-0 rounded-full bg-indigo-500/15 blur-2xl" />
      
      {/* Three orbiting blobs */}
      {[
        { color: '#00FFFF', delay: 0, blur: 0 },
        { color: '#1E90FF', delay: 0.15, blur: 0 },
        { color: '#9370DB', delay: 0.3, blur: 0 },
      ].map((blob, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: s - i * 8,
            height: s - i * 8,
            background: `radial-gradient(circle, ${blob.color}, transparent)`,
            filter: `blur(${blob.blur}px)`,
            opacity: 1 - i * 0.2,
          }}
          animate={{
            x: [0, size * 0.2, 0, -size * 0.2, 0],
            y: [-size * 0.15, 0, size * 0.15, 0, -size * 0.15],
            scale: [1, 0.8, 1.1, 0.8, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: blob.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </motion.div>
  );
}
