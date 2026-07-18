export function LoadingAnimation({ size = 72 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow behind the animation */}
      <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-2xl" />
      
      {/* Three orbiting blobs - exact Dribbble style, no background box */}
      <svg width={size} height={size} viewBox="0 0 120 120" className="relative z-10">
        <defs>
          <radialGradient id="g1" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#00CED1" stopOpacity="0.3"/>
          </radialGradient>
          <radialGradient id="g2" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1E90FF" stopOpacity="0.9"/>
            <stop offset="100%" stopColor="#0066CC" stopOpacity="0.3"/>
          </radialGradient>
          <radialGradient id="g3" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#9370DB" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#6A5ACD" stopOpacity="0.2"/>
          </radialGradient>
          <filter id="blur">
            <feGaussianBlur stdDeviation="2.5"/>
          </filter>
        </defs>

        {/* Blob 1 - cyan - upper area */}
        <ellipse cx="75" cy="35" rx="26" ry="20" fill="url(#g1)" filter="url(#blur)">
          <animateTransform attributeName="transform" type="translate"
            values="0,0; -10,10; 0,20; 10,10; 0,0" dur="4s" repeatCount="indefinite"/>
        </ellipse>

        {/* Blob 2 - blue - lower area */}
        <ellipse cx="45" cy="80" rx="22" ry="17" fill="url(#g2)" filter="url(#blur)">
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 10,-10; 0,-20; -10,-10; 0,0" dur="4s" repeatCount="indefinite"/>
        </ellipse>

        {/* Blob 3 - purple - accent */}
        <ellipse cx="60" cy="55" rx="12" ry="10" fill="url(#g3)" filter="url(#blur)">
          <animateTransform attributeName="transform" type="translate"
            values="0,0; -5,8; 0,15; 5,8; 0,0" dur="4s" repeatCount="indefinite"/>
        </ellipse>
      </svg>
    </div>
  );
}
