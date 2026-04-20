import React from 'react';
import { useAppContext } from '../context/AppContext';

const phaseColors = {
  waiting: 'bg-gray-100 text-gray-700',
  entry: 'bg-warning-light text-warning-dark',
  live: 'bg-success-light text-secondary',
  halftime: 'bg-orange-100 text-orange-800',
  end: 'bg-danger-light text-danger',
};

const EventPhaseChip = () => {
  const { eventPhase } = useAppContext();
  const colorClass = phaseColors[eventPhase] || phaseColors.waiting;

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${colorClass}`}>
      <span className="w-2 h-2 rounded-full bg-current mr-2 animate-pulse" />
      {eventPhase}
    </div>
  );
};

export default EventPhaseChip;
