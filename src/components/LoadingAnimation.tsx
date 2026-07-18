export function LoadingAnimation({ size = 72 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <img 
        src="/loading.gif" 
        alt="" 
        className="select-none pointer-events-none"
        style={{ 
          width: size, 
          height: size, 
          objectFit: 'contain',
          mixBlendMode: 'screen' as any,
        }} 
      />
    </div>
  );
}
