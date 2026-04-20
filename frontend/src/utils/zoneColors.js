export const getZoneStatus = (current_count, capacity, is_closed) => {
  if (is_closed) return { color: '#80868B', label: 'Closed', level: 'closed', class: 'bg-on-surfaceTer' };
  
  const pct = current_count / capacity;
  
  if (pct >= 0.85) {
    return { color: '#EA4335', label: 'Avoid', level: 'danger', class: 'bg-danger text-surface' };
  } else if (pct >= 0.70) {
    return { color: '#FA7B17', label: 'Crowded', level: 'orange', class: 'bg-orange text-surface' };
  } else if (pct >= 0.40) {
    return { color: '#FBBC04', label: 'Busy', level: 'warning', class: 'bg-warning text-on-surface' };
  } else {
    return { color: '#34A853', label: 'Clear', level: 'success', class: 'bg-secondary text-surface' };
  }
};
