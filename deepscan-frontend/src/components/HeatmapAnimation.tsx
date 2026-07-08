import React from 'react';
import { motion } from 'framer-motion';

interface HeatmapAnimationProps {
  className?: string;
}

const zones = [
  { top: '25%', left: '30%', width: '12%', height: '8%', color: 'rgba(249, 115, 22, 0.4)' },
  { top: '45%', left: '55%', width: '15%', height: '10%', color: 'rgba(239, 68, 68, 0.4)' },
  { top: '60%', left: '20%', width: '10%', height: '12%', color: 'rgba(245, 158, 11, 0.4)' },
  { top: '35%', left: '70%', width: '8%', height: '6%', color: 'rgba(34, 197, 94, 0.4)' },
];

export const HeatmapAnimation: React.FC<HeatmapAnimationProps> = ({ className = "" }) => {
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {zones.map((zone, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-xl"
          style={{
            top: zone.top,
            left: zone.left,
            width: zone.width,
            height: zone.height,
            backgroundColor: zone.color,
            boxShadow: `0 0 20px 10px ${zone.color}`,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: [0, 0.7, 0.3, 0.8, 0],
            scale: [0.8, 1.1, 0.9, 1.2, 0.8],
          }}
          transition={{
            duration: 4 + i,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
            delay: i * 1.5,
          }}
        />
      ))}

      {/* Scanning Line */}
      <motion.div
        className="absolute left-0 right-0 h-0.5 bg-brand-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10"
        initial={{ top: '0%' }}
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear",
        }}
      />
    </div>
  );
};
