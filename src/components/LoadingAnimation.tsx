import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 80 }: { size?: number }) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    >
      <div className="absolute inset-0 rounded-full bg-indigo-500/15 blur-3xl" />
      <img 
        src="/loading.png" 
        alt="" 
        width={size}
        height={size}
        className="select-none pointer-events-none relative z-10"
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain',
          imageRendering: 'auto',
        }}
      />
    </motion.div>
  );
}
