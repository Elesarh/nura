export function LoadingAnimation({ size = 72 }: { size?: number }) {
  return (
    <img 
      src="/loading.gif" 
      alt="" 
      className="select-none pointer-events-none"
      style={{ 
        width: size, 
        height: size, 
        objectFit: 'contain',
      }} 
    />
  );
}