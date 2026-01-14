export const OcyanLogo = ({ className = "w-16 h-16" }: { className?: string }) => {
  return (
    <div className={`${className} flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Círculo externo verde */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#a3d900"
          strokeWidth="10"
          strokeDasharray="120 60"
          transform="rotate(-90 50 50)"
        />
        
        {/* Círculo do meio azul */}
        <circle
          cx="50"
          cy="50"
          r="30"
          fill="none"
          stroke="#00b4d8"
          strokeWidth="8"
          strokeDasharray="80 40"
          transform="rotate(45 50 50)"
        />
        
        {/* Círculo interno cinza */}
        <circle
          cx="50"
          cy="50"
          r="18"
          fill="none"
          stroke="#4a5568"
          strokeWidth="6"
          strokeDasharray="50 20"
          transform="rotate(180 50 50)"
        />
        
        {/* Centro branco */}
        <circle
          cx="50"
          cy="50"
          r="8"
          fill="white"
        />
      </svg>
    </div>
  );
};