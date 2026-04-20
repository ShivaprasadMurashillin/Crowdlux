import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Ticket, Star } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

const SelectEvent = () => {
  const { selectedStadium, availableEvents, setSelectedEventId } = useAppContext();
  const navigate = useNavigate();

  if (!selectedStadium) {
    navigate('/select-stadium');
    return null;
  }

  const handleSelect = (id) => {
    setSelectedEventId(id);
    navigate('/select-seat');
  };

  const statusColors = {
    live: 'bg-success/10 text-success border-success/20',
    upcoming: 'bg-primary/10 text-primary border-primary/20',
    completed: 'bg-surface-alt text-on-surfaceSec border-divider'
  };

  return (
    <div className="min-h-screen bg-surface-alt p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <button 
          onClick={() => navigate('/select-stadium')}
          className="flex items-center text-on-surfaceSec hover:text-on-surface mb-8 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Change Venue
        </button>

        <header className="mb-12">
          <div className="flex items-center text-primary font-black text-xs uppercase tracking-[0.2em] mb-3">
            <Star className="w-4 h-4 mr-2 fill-primary" />
            Selection Required
          </div>
          <h1 className="text-4xl font-black text-on-surface mb-2">Events at {selectedStadium.name}</h1>
          <p className="text-on-surfaceSec text-lg">{selectedStadium.city}, {selectedStadium.state}</p>
        </header>

        <div className="space-y-4">
          {availableEvents.length === 0 && (
            <div className="bg-surface border border-divider rounded-3xl p-12 text-center">
              <p className="text-on-surfaceSec">No upcoming events scheduled for this venue.</p>
            </div>
          )}

          {availableEvents.map((event) => (
            <motion.div
              key={event.id}
              whileHover={{ scale: 1.01 }}
              className="bg-surface border border-divider rounded-3xl p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[event.status]}`}>
                    {event.status === 'live' ? 'Live Now' : event.status}
                  </span>
                  <span className="text-on-surfaceSec text-xs font-bold">
                    {event.sport}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-on-surface mb-2">{event.name}</h2>
                <div className="flex flex-wrap gap-6 text-on-surfaceSec">
                  <div className="flex items-center text-sm font-bold">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(event.date.seconds * 1000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                  </div>
                  <div className="flex items-center text-sm font-bold">
                    <Clock className="w-4 h-4 mr-2" />
                    {event.timeIST}
                  </div>
                  <div className="flex items-center text-sm font-bold">
                    <Ticket className="w-4 h-4 mr-2" />
                    {event.ticketPrice}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleSelect(event.id)}
                disabled={event.status === 'completed'}
                className={`py-4 px-10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                  event.status === 'completed' 
                  ? 'bg-surface-alt text-on-surfaceSec cursor-not-allowed' 
                  : 'bg-on-surface text-surface hover:bg-primary hover:shadow-lg hover:shadow-primary/20'
                }`}
              >
                {event.status === 'completed' ? 'Completed' : 'Join Event'}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SelectEvent;
