import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Armchair, ChevronRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firestore';
import toast from 'react-hot-toast';

const SelectSeat = () => {
  const { user, selectedStadium, selectedEvent, selectedEventId } = useAppContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    stand: '',
    row: '',
    seat: '',
    accessibility: false
  });

  // Redirect if previous steps skipped
  useEffect(() => {
    if (!selectedStadium) navigate('/select-stadium');
    else if (!selectedEvent) navigate('/select-event');
  }, [selectedStadium, selectedEvent, navigate]);

  // Check for existing seat assignment
  useEffect(() => {
    const checkExisting = async () => {
      if (!user || !selectedEventId) return;
      
      // Try local storage for guests first
      if (user.isGuest) {
        const guestSeats = JSON.parse(localStorage.getItem(`crowdlux_seats_${user.uid}`) || '{}');
        if (guestSeats[selectedEventId]) {
          toast.success("Welcome back! Loading your guest seat details...");
          navigate('/attendee');
        }
        return;
      }
      
      const docRef = doc(db, 'users', user.uid);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const userData = snap.data();
        if (userData.seats?.[selectedEventId]) {
          toast.success("Welcome back! Loading your seat details...");
          navigate('/attendee');
        }
      }
    };
    checkExisting();
  }, [selectedEventId, navigate]);

  if (!selectedStadium || !selectedEvent) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Please sign in first");
      return;
    }

    if (!formData.stand || !formData.row || !formData.seat) {
      toast.error("Please fill in all seat details");
      return;
    }

    setLoading(true);
    try {
      const seatData = {
        ...formData,
        gate: selectedStadium.gates.find(g => g.stand === formData.stand)?.id || 'gate_a'
      };

      if (!user.isGuest) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) {
          throw new Error('Authentication token unavailable. Please sign in again.');
        }

        const reserveRes = await fetch(`${backendUrl}/tickets/reserve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            stadium_id: selectedStadium.id,
            event_id: selectedEventId,
            stand: seatData.stand,
            row: String(seatData.row),
            seat: String(seatData.seat),
            accessibility: !!seatData.accessibility,
            gate: seatData.gate,
          })
        });

        if (!reserveRes.ok) {
          const errJson = await reserveRes.json().catch(() => ({}));
          const detail = errJson?.detail || 'Seat reservation failed';
          throw new Error(detail);
        }
      }

      if (user.isGuest) {
        // Mock save for guests to avoid Firestore permission errors
        const currentSeats = JSON.parse(localStorage.getItem(`crowdlux_seats_${user.uid}`) || '{}');
        currentSeats[selectedEventId] = seatData;
        localStorage.setItem(`crowdlux_seats_${user.uid}`, JSON.stringify(currentSeats));
        
        // Also save session info
        localStorage.setItem(`crowdlux_session_${user.uid}`, JSON.stringify({
          stadiumId: selectedStadium.id,
          eventId: selectedEventId
        }));
      } else {
        // Real Firestore save for authenticated users
        await setDoc(doc(db, 'users', user.uid), {
          currentEvent: {
            stadiumId: selectedStadium.id,
            eventId: selectedEventId
          },
          seats: {
            [selectedEventId]: seatData
          }
        }, { merge: true });
      }

      toast.success("Seat assigned! Entering stadium...");
      navigate('/attendee');
    } catch (err) {
      console.error(err);
      if ((err?.message || '').toLowerCase().includes('already booked')) {
        toast.error('That seat is already taken. Please choose another one.');
      } else {
        toast.error("Failed to save seat details. " + (err.code === 'permission-denied' ? "Login required for cloud sync." : err?.message || ""));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-alt p-6 md:p-12">
      <div className="max-w-2xl mx-auto">
        <button 
          onClick={() => navigate('/select-event')}
          className="flex items-center text-on-surfaceSec hover:text-on-surface mb-8 font-bold transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Events
        </button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-divider rounded-[40px] p-8 md:p-12 shadow-sm"
        >
          <header className="mb-10 text-center">
            <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-4 rounded-3xl mb-6">
              <Armchair className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-on-surface mb-2">Where are you sitting?</h1>
            <p className="text-on-surfaceSec font-medium">
              {selectedEvent.name} Â· {selectedStadium.name}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-on-surfaceSec mb-2 ml-1">
                Select Stand
              </label>
              <select 
                value={formData.stand}
                onChange={(e) => setFormData({...formData, stand: e.target.value})}
                className="w-full bg-surface-alt border border-divider rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all appearance-none cursor-pointer"
              >
                <option value="">Select a stand...</option>
                {selectedStadium.gates.map(g => (
                  <option key={g.id} value={g.stand}>{g.stand} Stand</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-on-surfaceSec mb-2 ml-1">
                  Row Number
                </label>
                <input 
                  type="number"
                  min="1"
                  max="50"
                  placeholder="e.g. 12"
                  value={formData.row}
                  onChange={(e) => setFormData({...formData, row: e.target.value})}
                  className="w-full bg-surface-alt border border-divider rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-on-surfaceSec mb-2 ml-1">
                  Seat Number
                </label>
                <input 
                  type="number"
                  min="1"
                  max="50"
                  placeholder="e.g. 42"
                  value={formData.seat}
                  onChange={(e) => setFormData({...formData, seat: e.target.value})}
                  className="w-full bg-surface-alt border border-divider rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-primary transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 bg-surface-alt p-6 rounded-3xl border border-divider">
              <div className="flex-1">
                <p className="text-sm font-black text-on-surface mb-1">Accessibility Seating</p>
                <p className="text-xs text-on-surfaceSec font-medium italic">I require step-free or accessible access</p>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({...formData, accessibility: !formData.accessibility})}
                className={`w-14 h-8 rounded-full transition-all relative ${formData.accessibility ? 'bg-success' : 'bg-divider'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-surface rounded-full shadow-sm transition-all ${formData.accessibility ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-on-surface text-surface py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-primary transition-all flex items-center justify-center group shadow-md disabled:opacity-50"
            >
              {loading ? "Registering..." : (
                <>
                  Confirm & Enter Stadium
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default SelectSeat;
