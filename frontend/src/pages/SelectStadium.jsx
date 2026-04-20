import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Users, Ticket, Activity } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const SelectStadium = () => {
  const { availableStadiums, availableEvents, setSelectedStadiumId } = useAppContext();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const filteredStadiums = availableStadiums.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.city.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (id) => {
    setSelectedStadiumId(id);
    navigate('/select-event');
  };

  return (
    <div className="min-h-screen bg-surface-alt p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center md:text-left">
          <h1 className="text-4xl font-black text-on-surface mb-2">Select Your Venue</h1>
          <p className="text-on-surfaceSec text-lg">Find your stadium to get started</p>
        </header>

        <div className="relative mb-12">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surfaceSec w-5 h-5" />
          <input 
            type="text"
            placeholder="Search city or stadium name..."
            className="w-full bg-surface border border-divider rounded-2xl py-4 pl-12 pr-6 shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStadiums.map((stadium) => (
            <motion.div
              key={stadium.id}
              whileHover={{ y: -5 }}
              className="bg-surface border border-divider rounded-3xl p-6 shadow-sm flex flex-col overflow-hidden relative group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="bg-primary/10 p-4 rounded-2xl text-primary">
                  {stadium.sport === 'cricket' && <Activity className="w-8 h-8" />}
                  {stadium.sport === 'football' && <Activity className="w-8 h-8" />}
                  {stadium.sport === 'multi' && <Activity className="w-8 h-8" />}
                </div>
                <span className="bg-surface-alt px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-on-surface">
                  {stadium.sport}
                </span>
              </div>

              <h2 className="text-xl font-black text-on-surface mb-1">{stadium.name}</h2>
              <div className="flex items-center text-on-surfaceSec text-sm mb-6">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                {stadium.city}, {stadium.state}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-alt rounded-2xl p-3">
                  <p className="text-[10px] text-on-surfaceSec uppercase font-black mb-1">Capacity</p>
                  <p className="text-sm font-bold">{stadium.capacity.toLocaleString()}</p>
                </div>
                <div className="bg-surface-alt rounded-2xl p-3">
                  <p className="text-[10px] text-on-surfaceSec uppercase font-black mb-1">Status</p>
                  <div className="flex items-center text-sm font-bold text-success">
                    <span className="w-2 h-2 bg-success rounded-full mr-2 animate-pulse" />
                    Open
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleSelect(stadium.id)}
                className="w-full bg-on-surface text-surface py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary transition-colors group-hover:shadow-lg group-hover:shadow-primary/20"
              >
                Select Venue
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectStadium;
