import React from 'react';
import { getZoneStatus } from '../utils/zoneColors';
import { motion } from 'framer-motion';

const ZoneCard = ({ zone, onAction, actionLabel }) => {
  const status = getZoneStatus(zone.current_count, zone.capacity, zone.is_closed);
  const pct = (zone.current_count / zone.capacity) * 100;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface rounded-xl p-4 border border-divider shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg text-on-surface">{zone.name}</h3>
          <p className="text-sm text-on-surfaceSec capitalize">{zone.category}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${status.class}`}>
          {status.label}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-on-surfaceSec font-medium">Occupancy</span>
          <span className="text-on-surface font-semibold">{zone.current_count} / {zone.capacity}</span>
        </div>
        <div className="w-full bg-surface-alt rounded-full h-2 overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(pct, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={`h-full`}
            style={{ backgroundColor: status.color }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 pt-3 border-t border-divider">
        <div className="text-sm">
          <span className="text-on-surfaceSec">Est. Wait: </span>
          <span className="font-bold text-on-surface">~{zone.wait_minutes} min</span>
        </div>
        
        {onAction && (
          <button 
            onClick={() => onAction(zone)}
            className="text-primary hover:text-primary-hover text-sm font-semibold"
          >
            {actionLabel || 'Action'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default ZoneCard;
