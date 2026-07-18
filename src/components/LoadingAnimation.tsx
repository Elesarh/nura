import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 80 }: { size?: number }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <img 
        src="/loading.gif" 
        alt="Loading..." 
        width={size} 
        height={size}
        style={{ 
          maxWidth: size, 
          maxHeight: size, 
          mixBlendMode: 'screen',
          filter: 'brightness(1.2) contrast(1.1)'
        }}
        className="select-none pointer-events-none"
      />
    </div>
  );
}
