import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 80 }: { size?: number }) {
  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {/* Glow effect behind */}
      <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
      
      {/* High quality loading animation */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        <img 
          src="/loading.png" 
          alt="" 
          width={size}
          height={size}
          className="select-none pointer-events-none"
          style={{ 
            width: size,
            height: size,
            objectFit: 'contain',
            imageRendering: 'auto'
          }}
        />
      </div>
    </div>
  );
}
