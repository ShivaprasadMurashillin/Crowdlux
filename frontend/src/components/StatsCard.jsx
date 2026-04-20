import React, { useEffect } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

const StatsCard = ({ title, value, icon: Icon, colorClass, trend }) => {
  const isNumber = typeof value === 'number';

  const springValue = useSpring(0, {
    stiffness: 50,
    damping: 20,
  });

  const displayValue = useTransform(springValue, (current) =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    if (isNumber) {
      springValue.set(value);
    }
  }, [value, isNumber, springValue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-xl p-6 border border-divider shadow-sm flex flex-col"
    >
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm font-medium text-on-surfaceSec">{title}</p>
        <div className={`p-2 rounded-lg ${colorClass} bg-opacity-10`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
      </div>
      <div className="mt-auto">
        {isNumber ? (
          <motion.h3 className="text-3xl font-bold text-on-surface mb-2">
            {displayValue}
          </motion.h3>
        ) : (
          <h3 className="text-3xl font-bold text-on-surface mb-2">{value}</h3>
        )}
        {trend && (
          <p className="text-xs text-on-surfaceSec bg-surface-alt inline-block px-2 py-1 rounded-full">
            {trend}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default StatsCard;
