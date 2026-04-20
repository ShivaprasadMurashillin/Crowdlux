import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../services/firestore';
import StatsCard from '../components/StatsCard';
import { Users, AlertTriangle, Clock, ListOrdered, Download, Home, Megaphone } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import EventPhaseChip from '../components/EventPhaseChip';
import toast from 'react-hot-toast';

const mockLineData = Array.from({ length: 16 }).map((_, i) => ({
  time: `${12 + Math.floor(i / 4)}:${(i % 4) * 15 || '00'}`,
  entries: Math.floor(Math.random() * 1500) + 200,
  exits: Math.floor(Math.random() * 1000),
}));

const Admin = () => {
  const navigate = useNavigate();
  const { 
    availableStadiums, selectedStadiumId, setSelectedStadiumId, 
    availableEvents, selectedEventId, setSelectedEventId,
    zones, alerts, eventPhase
  } = useAppContext();
  const [lineData, setLineData] = useState(mockLineData);
  const [allVenueZones, setAllVenueZones] = useState([]);
  const [allVenueAlerts, setAllVenueAlerts] = useState([]);
  const [showGlobalAlertModal, setShowGlobalAlertModal] = useState(false);
  const [globalAlertMessage, setGlobalAlertMessage] = useState('');
  const [globalAlertType, setGlobalAlertType] = useState('warning');
  const [sendingGlobalAlert, setSendingGlobalAlert] = useState(false);
  const [reseeding, setReseeding] = useState(false);

  useEffect(() => {
    if (selectedStadiumId) {
      setAllVenueZones([]);
      setAllVenueAlerts([]);
      return;
    }

    const unsubZones = onSnapshot(collectionGroup(db, 'zones'), (snap) => {
      setAllVenueZones(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const globalAlertsQ = query(collectionGroup(db, 'alerts'), where('is_active', '==', true));
    const unsubAlerts = onSnapshot(globalAlertsQ, (snap) => {
      setAllVenueAlerts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubZones();
      unsubAlerts();
    };
  }, [selectedStadiumId]);

  // Auto-select first event if none selected
  useEffect(() => {
    if (selectedStadiumId && !selectedEventId && availableEvents.length > 0) {
      setSelectedEventId(availableEvents[0].id);
    }
  }, [selectedStadiumId, selectedEventId, availableEvents, setSelectedEventId]);

  const selectedZoneList = Object.values(zones);
  const zoneList = selectedStadiumId ? selectedZoneList : allVenueZones;
  const liveAlerts = selectedStadiumId ? alerts : allVenueAlerts;
  
  // Aggregate Logic: If All Stadiums is selected, we fake the aggregate for the demo
  // In a real app, this would use a cross-stadium listener
  const isAllStads = !selectedStadiumId;
  const totalFootfall = zoneList.reduce((acc, z) => acc + (z.current_count || 0), 0);
  const avgWaitTime = Math.round(zoneList.reduce((acc, z) => acc + (z.wait_minutes || 0), 0) / (zoneList.length || 1));
  const activeAlertsCount = liveAlerts.length;

  const peakZone = zoneList.length
    ? zoneList.reduce((prev, current) => {
      return (prev.current_count / prev.capacity) > (current.current_count / current.capacity) ? prev : current;
    }, zoneList[0])
    : null;

  const peakPct = peakZone ? Math.round((peakZone.current_count / peakZone.capacity) * 100) : 0;

  // Filter bar chart data
  const barData = zoneList.map(z => ({
    name: z.name.split(' â€” ')[0].replace('Food Court', 'FC').replace('Restrooms', 'RR').replace('Gate', 'Gt').replace('Stand', 'St'),
    occupancy: Math.round((z.current_count / z.capacity) * 100),
    original: z
  }));

  const getBarColor = (pct) => {
    if (pct >= 85) return '#EA4335';
    if (pct >= 70) return '#FA7B17';
    if (pct >= 40) return '#FBBC04';
    return '#34A853';
  };

  const handleGlobalAlertBroadcast = async () => {
    if (!globalAlertMessage.trim()) {
      toast.error('Please enter a message first.');
      return;
    }

    setSendingGlobalAlert(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token unavailable');

      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/alerts/broadcast-global`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          message: globalAlertMessage,
          type: globalAlertType,
          only_active_events: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.detail || data?.message || 'Global alert failed');
      }

      toast.success(`Global alert sent to ${data.created} event streams.`);
      setGlobalAlertMessage('');
      setShowGlobalAlertModal(false);
    } catch (err) {
      toast.error(`Failed to send global alert: ${err.message}`);
    } finally {
      setSendingGlobalAlert(false);
    }
  };

  const handleReseedAllData = async () => {
    setReseeding(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Authentication token unavailable');

      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/admin/seed`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.detail || data?.message || 'Reseed failed');
      }
      toast.success('Demo data refreshed for all venues/events/zones.');
    } catch (err) {
      toast.error(`Reseed failed: ${err.message}`);
    } finally {
      setReseeding(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Zone Name', 'Category', 'Capacity', 'Live Count', 'Percent Full', 'Status', 'Wait Minutes', 'Last Updated'];
    const rows = zoneList.map(z => {
      const pct = Math.round((z.current_count / z.capacity) * 100);
      const status = pct >= 85 ? 'Avoid' : pct >= 70 ? 'Crowded' : pct >= 40 ? 'Busy' : 'Clear';
      const timeStr = z.last_updated?.seconds ? new Date(z.last_updated.seconds * 1000).toISOString() : new Date().toISOString();
      return `"${z.name}","${z.category}","${z.capacity}","${z.current_count}","${pct}%","${status}","${z.wait_minutes}","${timeStr}"`;
    });
    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crowdlux_export_${selectedStadiumId || 'all'}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-surface-alt">
      {/* Top Multi-Stadium Nav */}
      <nav className="bg-surface border-b border-divider px-6 sticky top-0 z-20 shadow-sm">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <span className="text-xl font-black">
              <span className="text-primary">Crowd</span>
              <span className="text-on-surface">lux</span>
            </span>
            <span className="bg-primary/10 text-primary text-[10px] px-2 py-1 rounded-md uppercase font-black tracking-widest">
              Admin HQ
            </span>
            <button
              onClick={() => navigate('/')}
              className="ml-2 inline-flex items-center gap-2 bg-surface-alt border border-divider px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-divider transition-colors"
            >
              <Home className="w-4 h-4" /> Home
            </button>
          </div>
          <div className="flex items-center space-x-6">
            <EventPhaseChip />
            <button
              onClick={() => setShowGlobalAlertModal(true)}
              className="bg-on-surface text-surface px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary transition-colors"
            >
              Global Alerts
            </button>
          </div>
        </div>
        
        {/* Stadium Selector Tabs */}
        <div className="flex space-x-8 overflow-x-auto no-scrollbar pb-1">
          <button 
            onClick={() => { setSelectedStadiumId(null); setSelectedEventId(null); }}
            className={`pb-3 px-1 text-sm font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
              ${!selectedStadiumId ? 'border-primary text-primary' : 'border-transparent text-on-surfaceSec hover:text-on-surface'}`}
          >
            All Venues
          </button>
          {availableStadiums.map(s => (
            <button 
              key={s.id}
              onClick={() => { setSelectedStadiumId(s.id); setSelectedEventId(null); }}
              className={`pb-3 px-1 text-sm font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap
                ${selectedStadiumId === s.id ? 'border-primary text-primary' : 'border-transparent text-on-surfaceSec hover:text-on-surface'}`}
            >
              {s.name || s.city}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-6 max-w-[1700px] mx-auto space-y-8 mt-4">
        {/* Event Selectors if a stadium is chosen */}
        {selectedStadiumId && (
          <div className="flex items-center gap-4 bg-surface p-2 rounded-2xl border border-divider">
            <span className="text-[10px] font-black uppercase tracking-widest text-on-surfaceSec ml-4">Live Events in {availableStadiums.find(s=>s.id===selectedStadiumId)?.city}:</span>
            <div className="flex gap-2">
              {availableEvents.map(e => (
                <button
                  key={e.id}
                  onClick={() => setSelectedEventId(e.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all
                    ${selectedEventId === e.id ? 'bg-primary text-surface' : 'bg-surface-alt text-on-surfaceSec hover:bg-divider'}`}
                >
                  {e.name}
                </button>
              ))}
              {availableEvents.length === 0 && <span className="text-xs italic text-on-surfaceSec">No live events</span>}
            </div>
            <button
              onClick={handleReseedAllData}
              disabled={reseeding}
              className="ml-auto px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-surface-alt border border-divider hover:bg-divider transition-colors disabled:opacity-50"
            >
              {reseeding ? 'Reseeding...' : 'Reseed Demo Data'}
            </button>
          </div>
        )}

        {!selectedStadiumId && (
          <div className="flex items-center justify-between bg-surface p-4 rounded-2xl border border-divider">
            <p className="text-sm font-bold text-on-surface">All-venues view uses live aggregated Firestore streams from every venue.</p>
            <button
              onClick={handleReseedAllData}
              disabled={reseeding}
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-surface-alt border border-divider hover:bg-divider transition-colors disabled:opacity-50"
            >
              {reseeding ? 'Reseeding...' : 'Reseed Demo Data'}
            </button>
          </div>
        )}

        {/* Global / Stadium KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard title="Live Visitors" value={totalFootfall} icon={Users} colorClass="text-primary" trend="+12% Capacity" />
          <StatsCard title="Peak Zone" value={peakZone?.name || (isAllStads ? 'Gate A (HYB)' : 'N/A')} icon={AlertTriangle} colorClass="text-danger" trend={`${peakPct}% load`} />
          <StatsCard title="Avg Wait Time" value={avgWaitTime} icon={Clock} colorClass="text-purple" trend="Stable" />
          <StatsCard title="Active Alerts" value={activeAlertsCount} icon={ListOrdered} colorClass="text-warning" trend="Live Ops" />
        </div>

        {/* Drill down or Multi-view */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* L: Metrics Chart */}
          <div className="lg:col-span-12 xl:col-span-8 bg-surface rounded-[32px] border border-divider p-8 shadow-sm flex flex-col min-h-[460px]">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h3 className="text-xl font-black text-on-surface">Traffic Analysis</h3>
                  <p className="text-on-surfaceSec text-sm">Attendee flow analytics across {selectedStadiumId ? 'selected stadium' : 'all venues'}</p>
               </div>
               <div className="flex gap-2">
                  <button className="p-2 border border-divider rounded-lg hover:bg-surface-alt transition-colors"><Download className="w-4 h-4" onClick={exportCSV}/></button>
               </div>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EAED" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#5F6368', fontSize: 10, fontWeight: 'bold'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#5F6368', fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: '1px solid #E8EAED', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="entries" name="Entries" stroke="#1A73E8" strokeWidth={4} dot={{r: 4, strokeWidth: 0, fill: '#1A73E8'}} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="exits" name="Exits" stroke="#34A853" strokeWidth={4} dot={{r: 4, strokeWidth: 0, fill: '#34A853'}} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* R: Zone Occupancy (Only if event selected) */}
          <div className="lg:col-span-12 xl:col-span-4 bg-surface rounded-[32px] border border-divider p-8 shadow-sm flex flex-col min-h-[460px]">
             <h3 className="text-xl font-black text-on-surface mb-2">Zone Breakdown</h3>
             <p className="text-on-surfaceSec text-sm mb-8">Capacity per sector</p>
             <div className="flex-1 min-h-0">
                {!selectedEventId ? (
                   <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-surface-alt rounded-2xl border-2 border-dashed border-divider">
                      <ListOrdered className="w-12 h-12 text-on-surfaceTer mb-4" />
                      <p className="text-on-surfaceSec font-bold">Select a specific event to see real-time zone metrics.</p>
                   </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8EAED" />
                      <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#5F6368', fontSize: 10}} domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#000', fontSize: 10, fontWeight: 'black'}} width={80} />
                      <Tooltip cursor={{fill: '#F1F3F4'}} contentStyle={{ borderRadius: '8px' }} />
                      <Bar dataKey="occupancy" name="Load%" radius={[0, 4, 4, 0]}>
                        {barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getBarColor(entry.occupancy)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
             </div>
          </div>
        </div>

        {/* BOTTOM: Global Incidents or Zone Table */}
        <div className="bg-surface rounded-[32px] border border-divider shadow-sm overflow-hidden">
          <div className="p-8 border-b border-divider flex justify-between items-center">
            <h3 className="text-xl font-black text-on-surface">Ops Ledger</h3>
            <span className="text-xs font-black uppercase tracking-tighter text-on-surfaceSec">{selectedEventId ? 'Event Live' : 'Network Wide'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-alt/50 text-on-surfaceSec text-[10px] font-black uppercase tracking-widest border-b border-divider">
                <tr>
                  <th className="p-6">Venue Sector</th>
                  <th className="p-6">Type</th>
                  <th className="p-6">Metric</th>
                  <th className="p-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-divider bg-surface">
                {selectedEventId ? zoneList.map(zone => (
                  <tr key={zone.id} className="hover:bg-surface-alt/30 transition-all">
                    <td className="p-6 font-black text-sm text-on-surface">{zone.name}</td>
                    <td className="p-6 text-xs text-on-surfaceSec font-bold uppercase">{zone.category}</td>
                    <td className="p-6">
                      <div className="w-full bg-divider h-1.5 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className="h-full transition-all duration-500" 
                          style={{ 
                            width: `${Math.round((zone.current_count/zone.capacity)*100)}%`,
                            backgroundColor: getBarColor(Math.round((zone.current_count/zone.capacity)*100))
                          }}
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-[10px] font-black uppercase bg-surface-alt px-3 py-1 rounded-full border border-divider">
                        {Math.round((zone.current_count/zone.capacity)*100)}% Load
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-on-surfaceSec">
                       <p className="font-bold">Select an event to view granular zone analytics.</p>
                       <p className="text-xs">Aggregate global incidents will appear here in production.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {showGlobalAlertModal && (
        <div className="fixed inset-0 z-40 bg-black/35 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface rounded-3xl border border-divider shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-on-surface flex items-center gap-2"><Megaphone className="w-5 h-5 text-primary" /> Broadcast Global Alert</h3>
              <button onClick={() => setShowGlobalAlertModal(false)} className="text-on-surfaceSec text-sm font-black uppercase">Close</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-on-surfaceSec mb-2">Alert Type</label>
                <select
                  value={globalAlertType}
                  onChange={(e) => setGlobalAlertType(e.target.value)}
                  className="w-full bg-surface-alt border border-divider rounded-xl p-3 text-sm font-bold"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="danger">Danger</option>
                  <option value="success">Success</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-on-surfaceSec mb-2">Message</label>
                <textarea
                  value={globalAlertMessage}
                  onChange={(e) => setGlobalAlertMessage(e.target.value)}
                  rows={4}
                  maxLength={180}
                  className="w-full bg-surface-alt border border-divider rounded-xl p-3 text-sm font-medium resize-none"
                  placeholder="Message to broadcast to all venue attendees..."
                />
              </div>
              <button
                onClick={handleGlobalAlertBroadcast}
                disabled={sendingGlobalAlert || !globalAlertMessage.trim()}
                className="w-full bg-primary text-surface py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary-hover disabled:opacity-50 transition-colors"
              >
                {sendingGlobalAlert ? 'Sending...' : 'Send Global Alert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
