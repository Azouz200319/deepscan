export const OwlLogo = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    stroke="currentColor"
  >
    {/* Base Head Outline */}
    <path
      d="M15 35 L50 20 L85 35 L80 60 C75 75, 60 85, 50 85 C40 85, 25 75, 20 60 Z"
      strokeWidth="6"
      className="text-brand-900"
      strokeLinejoin="round"
    />

    {/* Top Cap (Folded paper effect) */}
    <path
      d="M15 35 L50 50 L85 35"
      strokeWidth="6"
      className="text-brand-900"
      strokeLinejoin="round"
    />
    <path
      d="M50 20 L85 35 L75 25 Z"
      fill="currentColor"
      className="text-brand-500"
    />

    {/* Beak */}
    <path
      d="M45 55 L50 65 L55 55 Z"
      fill="currentColor"
      className="text-brand-900"
    />

    {/* Right Eye (Normal) */}
    <circle cx="65" cy="50" r="10" strokeWidth="4" className="text-brand-900" />
    <circle cx="65" cy="48" r="4" fill="currentColor" className="text-brand-900" />

    {/* Left Eye (Scanning Tech Eye) */}
    <circle cx="35" cy="50" r="12" strokeWidth="4" className="text-brand-900" />
    {/* Tech Circles inside Left Eye */}
    <circle cx="35" cy="50" r="8" strokeWidth="2" className="text-glow animate-pulse" />
    <circle cx="35" cy="50" r="4" fill="currentColor" className="text-brand-500" />

    {/* Plus sign inside left eye */}
    <line x1="32" y1="50" x2="38" y2="50" stroke="white" strokeWidth="2" />
    <line x1="35" y1="47" x2="35" y2="53" stroke="white" strokeWidth="2" />
  </svg>
);
