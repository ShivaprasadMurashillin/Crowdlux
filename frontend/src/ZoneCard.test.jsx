import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ZoneCard from './components/ZoneCard';

describe('ZoneCard', () => {
  const mockZone = {
    id: "gate_a",
    name: "Gate A",
    category: "gate",
    capacity: 1000,
    current_count: 500,
    wait_minutes: 5,
    is_closed: false
  };

  it('renders zone information correctly', () => {
    render(<ZoneCard zone={mockZone} />);
    
    // Check name
    expect(screen.getByText('Gate A')).toBeDefined();
    
    // Check occupancy text
    expect(screen.getByText('500 / 1000')).toBeDefined();
    
    // Check status logic - 50% should be "Busy"
    expect(screen.getByText('Busy')).toBeDefined();
  });
  
  it('shows closed status if is_closed is true', () => {
    render(<ZoneCard zone={{...mockZone, is_closed: true}} />);
    expect(screen.getByText('Closed')).toBeDefined();
  });
});
