export function LoadingAnimation({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <radialGradient id="g1" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#00CED1" stopOpacity="0.2"/>
        </radialGradient>
        <radialGradient id="g2" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1E90FF" stopOpacity="0.85"/>
          <stop offset="100%" stopColor="#0066CC" stopOpacity="0.2"/>
        </radialGradient>
        <radialGradient id="g3" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#9370DB" stopOpacity="0.65"/>
          <stop offset="100%" stopColor="#6A5ACD" stopOpacity="0.15"/>
        </radialGradient>
      </defs>

      {/* Blob 1 - cyan */}
      <ellipse cx="75" cy="35" rx="26" ry="20" fill="url(#g1)">
        <animateTransform attributeName="transform" type="translate"
          values="0,0; -10,10; 0,20; 10,10; 0,0" dur="4s" repeatCount="indefinite"/>
      </ellipse>

      {/* Blob 2 - blue */}
      <ellipse cx="45" cy="80" rx="22" ry="17" fill="url(#g2)">
        <animateTransform attributeName="transform" type="translate"
          values="0,0; 10,-10; 0,-20; -10,-10; 0,0" dur="4s" repeatCount="indefinite"/>
      </ellipse>

      {/* Blob 3 - purple */}
      <ellipse cx="60" cy="55" rx="12" ry="10" fill="url(#g3)">
        <animateTransform attributeName="transform" type="translate"
          values="0,0; -5,8; 0,15; 5,8; 0,0" dur="4s" repeatCount="indefinite"/>
      </ellipse>
    </svg>
  );
}
