import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 80 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow effect behind */}
      <div className="absolute w-full h-full bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
      
      {/* The GIF with screen blend to remove black background */}
      <img 
        src="/loading.gif" 
        alt="" 
        width={size} 
        height={size}
        className="select-none pointer-events-none relative z-10"
        style={{ 
          maxWidth: size, 
          maxHeight: size,
          mixBlendMode: 'screen',
          objectFit: 'contain'
        }}
      />
    </div>
  );
}
