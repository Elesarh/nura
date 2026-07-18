import { motion } from 'framer-motion';

export function LoadingAnimation({ size = 72 }: { size?: number }) {
  const s = size;
  
  return (
    <svg width={s} height={s} viewBox="0 0 200 200">
      <defs>
        <radialGradient id="lc1" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.9"/>
          <stop offset="70%" stopColor="#00CED1" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#00CED1" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="lc2" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1E90FF" stopOpacity="0.9"/>
          <stop offset="70%" stopColor="#0066CC" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#0066CC" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="lc3" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#9370DB" stopOpacity="0.7"/>
          <stop offset="70%" stopColor="#6A5ACD" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#6A5ACD" stopOpacity="0"/>
        </radialGradient>
      </defs>
      
      {/* Blob 1 - cyan, orbiting */}
      <g>
        <ellipse cx="120" cy="55" rx="45" ry="35" fill="url(#lc1)">
          <animateTransform attributeName="transform" type="translate"
            values="0,0; -15,15; 0,30; 15,15; 0,0" dur="4s" repeatCount="indefinite"/>
        </ellipse>
      </g>
      
      {/* Blob 2 - blue */}
      <g>
        <ellipse cx="75" cy="135" rx="38" ry="30" fill="url(#lc2)">
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 15,-15; 0,-30; -15,-15; 0,0" dur="4s" repeatCount="indefinite" begin="0.1s"/>
        </ellipse>
      </g>
      
      {/* Blob 3 - purple accent */}
      <g>
        <ellipse cx="100" cy="95" rx="22" ry="18" fill="url(#lc3)">
          <animateTransform attributeName="transform" type="translate"
            values="0,0; -8,12; 0,22; 8,12; 0,0" dur="4s" repeatCount="indefinite" begin="0.2s"/>
        </ellipse>
      </g>
    </svg>
  );
}
