import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, onSnapshot, query, where, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firestore';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [availableStadiums, setAvailableStadiums] = useState([]);
  const [selectedStadiumId, setSelectedStadiumId] = useState(null);
  const [selectedStadium, setSelectedStadium] = useState(null);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  const [eventPhase, setEventPhaseLocal] = useState('waiting');
  const [zones, setZones] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [userTicket, setUserTicket] = useState(null);

  const restoreSession = async (uid) => {
    const local = localStorage.getItem(`crowdlux_session_${uid}`);
    if (local) {
      const p = JSON.parse(local);
      setSelectedStadiumId(p.stadiumId);
      setSelectedEventId(p.eventId);
    } else if (!uid.startsWith('guest_')) {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists() && snap.data().currentEvent) {
          setSelectedStadiumId(snap.data().currentEvent.stadiumId);
          setSelectedEventId(snap.data().currentEvent.eventId);
        }
      } catch (e) {}
    }
  };

  const fetchRole = async (u) => {
    if (u.isGuest) {
      setRole('attendee');
      return;
    }
    
    // Quick Demo Mappings
    if (u.email === 'admin@crowdlux.com' || u.email === 'admin@admin.com') {
      setRole('admin');
      return;
    }
    if (u.email?.startsWith('staff') || u.email === 'staff@admin.com') {
      setRole('staff');
      return;
    }

    try {
      const snap = await getDoc(doc(db, 'user_roles', u.uid));
      if (snap.exists()) {
        setRole(snap.data().role);
      } else {
        setRole('attendee');
      }
    } catch (e) {
      setRole('attendee');
    }
  };

  // 0. Listen for Auth Changes
  useEffect(() => {
    // Check local guest session first
    const localGuest = localStorage.getItem('crowdlux_guest');
    if (localGuest) {
      const gUser = JSON.parse(localGuest);
      setUser(gUser);
      restoreSession(gUser.uid);
      fetchRole(gUser);
    }

    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        localStorage.removeItem('crowdlux_guest'); 
        restoreSession(u.uid);
        fetchRole(u);
      } else {
        // If no firebase user, and no local guest, then set null
        if (!localStorage.getItem('crowdlux_guest')) {
          setUser(null);
          setRole(null);
        }
      }
    });
    return unsub;
  }, []);

  // 1. Listen for ALL stadiums (always active)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stadiums'), (snapshot) => {
      const seen = new Set();
      const deduped = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const key = `${(data.name || '').toLowerCase()}|${(data.city || '').toLowerCase()}|${(data.state || '').toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push({ id: d.id, ...data });
      });

      deduped.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setAvailableStadiums(deduped);
    });
    return unsub;
  }, []);

  // 2. Listen for SELECTED stadium's details and its events
  useEffect(() => {
    if (!selectedStadiumId) {
      setAvailableEvents([]);
      setSelectedStadium(null);
      return;
    }

    const unsubStadium = onSnapshot(doc(db, 'stadiums', selectedStadiumId), (snap) => {
      if (snap.exists()) setSelectedStadium({ id: snap.id, ...snap.data() });
    });

    const unsubEvents = onSnapshot(collection(db, 'stadiums', selectedStadiumId, 'events'), (snap) => {
      const byName = new Map();

      snap.docs.forEach((d) => {
        const data = d.data() || {};
        const eventObj = { id: d.id, ...data };
        const key = (eventObj.name || d.id).toLowerCase().trim();

        // Keep the latest-dated document if duplicates with same display name exist.
        if (!byName.has(key)) {
          byName.set(key, eventObj);
          return;
        }

        const existing = byName.get(key);
        const existingDate = existing?.date?.seconds || 0;
        const incomingDate = eventObj?.date?.seconds || 0;
        if (incomingDate >= existingDate) {
          byName.set(key, eventObj);
        }
      });

      const dedupedEvents = Array.from(byName.values()).sort((a, b) => {
        const aDate = a?.date?.seconds || 0;
        const bDate = b?.date?.seconds || 0;
        return aDate - bDate;
      });

      setAvailableEvents(dedupedEvents);
    });

    return () => {
      unsubStadium();
      unsubEvents();
    };
  }, [selectedStadiumId]);

  // 3. Listen for SELECTED event's zones and alerts
  useEffect(() => {
    if (!selectedStadiumId || !selectedEventId) {
      setZones({});
      setAlerts([]);
      setSelectedEvent(null);
      return;
    }

    const eventRoot = `stadiums/${selectedStadiumId}/events/${selectedEventId}`;
    
    const unsubEvent = onSnapshot(doc(db, eventRoot), (snap) => {
      if (snap.exists()) setSelectedEvent({ id: snap.id, ...snap.data() });
    });

    const unsubZones = onSnapshot(collection(db, `${eventRoot}/zones`), (snap) => {
      const data = {};
      snap.forEach(d => { data[d.id] = { id: d.id, ...d.data() }; });
      setZones(data);
    });

    const alertsCollectionRef = collection(db, `${eventRoot}/alerts`);
    const alertsQ = query(
      alertsCollectionRef,
      where('is_active', '==', true),
      orderBy('created_at', 'desc')
    );

    let unsubAlertsFallback = null;
    const unsubAlertsPrimary = onSnapshot(
      alertsQ,
      (snap) => {
        setAlerts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.warn('Primary alerts query failed, falling back to client-side filtering:', err?.message || err);

        // Fallback avoids composite index dependency by reading collection directly.
        if (!unsubAlertsFallback) {
          unsubAlertsFallback = onSnapshot(alertsCollectionRef, (fallbackSnap) => {
            const fallbackAlerts = fallbackSnap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((a) => a.is_active)
              .sort((a, b) => {
                const aTs = a?.created_at?.seconds || 0;
                const bTs = b?.created_at?.seconds || 0;
                return bTs - aTs;
              });

            setAlerts(fallbackAlerts);
          });
        }
      }
    );

    return () => {
      unsubEvent();
      unsubZones();
      unsubAlertsPrimary();
      if (unsubAlertsFallback) unsubAlertsFallback();
    };
  }, [selectedStadiumId, selectedEventId]);

  // 4. Fetch the User's Ticket for the Selected Event
  useEffect(() => {
    if (!user || !selectedEventId) {
      setUserTicket(null);
      return;
    }

    if (user.isGuest) {
      const guestSeats = JSON.parse(localStorage.getItem(`crowdlux_seats_${user.uid}`) || '{}');
      if (guestSeats[selectedEventId]) {
        setUserTicket({
          id: `TKT-GUEST-${user.uid.slice(0, 5)}`,
          ...guestSeats[selectedEventId]
        });
      } else {
        setUserTicket(null);
      }
      return;
    }

    const unsubTicket = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.seats && data.seats[selectedEventId]) {
          setUserTicket({
            id: `TKT-${user.uid.slice(0, 5)}-${selectedEventId.slice(-4)}`.toUpperCase(),
            ...data.seats[selectedEventId]
          });
        } else {
          setUserTicket(null);
        }
      } else {
        setUserTicket(null);
      }
    });

    return unsubTicket;
  }, [user, selectedEventId]);

  const updateZoneCount = async (zoneId, newCount) => {
    if (!selectedStadiumId || !selectedEventId) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token unavailable');

      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      await fetch(`${backendUrl}/zones/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ 
          stadium_id: selectedStadiumId,
          event_id: selectedEventId,
          zone_id: zoneId, 
          current_count: newCount 
        })
      });
    } catch (err) {
      console.error("Failed to update via backend:", err);
    }
  };

  const addAlert = async (alertData) => {
    if (!selectedStadiumId || !selectedEventId) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token unavailable');

      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      await fetch(`${backendUrl}/alerts/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          ...alertData,
          stadium_id: selectedStadiumId,
          event_id: selectedEventId
        })
      });
    } catch (err) {
      console.error("Failed to broadcast alert:", err);
    }
  };

  const value = {
    user, setUser,
    role, setRole,
    availableStadiums, selectedStadiumId, setSelectedStadiumId, selectedStadium,
    availableEvents, selectedEventId, setSelectedEventId, selectedEvent,
    eventPhase, setEventPhase: setEventPhaseLocal, // Phase is now event-specific, eventually sync with Firestore
    zones, alerts,
    userTicket,
    updateZoneCount, addAlert
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
