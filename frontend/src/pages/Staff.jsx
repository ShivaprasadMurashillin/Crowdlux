import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import { Shield, LayoutGrid, SlidersHorizontal, Megaphone, ClipboardList, Settings, Activity, Sparkles, QrCode, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import StatsCard from '../components/StatsCard';
import ZoneCard from '../components/ZoneCard';
import toast from 'react-hot-toast';

const Staff = () => {
  const navigate = useNavigate();
  const { 
    availableStadiums, selectedStadiumId, setSelectedStadiumId,
    availableEvents, selectedEventId, setSelectedEventId,
    zones, updateZoneCount, eventPhase, setEventPhase, alerts, addAlert 
  } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Auto-select first event if none selected
  React.useEffect(() => {
    if (selectedStadiumId && !selectedEventId && availableEvents.length > 0) {
      setSelectedEventId(availableEvents[0].id);
    }
  }, [selectedStadiumId, selectedEventId, availableEvents, setSelectedEventId]);
  
  // Broadcast state
  const [draftAlertMsg, setDraftAlertMsg] = useState('');
  const [draftAlertType, setDraftAlertType] = useState('info');
  const [draftAlertZone, setDraftAlertZone] = useState('All Zones');

  const zoneList = Object.values(zones);
  
  // Calculate specific KPIs
  const totalVisitors = zoneList.reduce((acc, z) => acc + z.current_count, 0);
  const zonesAtRisk = zoneList.filter(z => (z.current_count / z.capacity) > 0.70).length;
  const avgWaitTime = Math.round(zoneList.reduce((acc, z) => acc + z.wait_minutes, 0) / (zoneList.length || 1));

  const handleSimulateHalftime = () => {
    if (!selectedEventId) return;
    setEventPhase('halftime');
    zoneList.forEach(z => {
      if (z.category === 'food') {
        const highCount = Math.floor(z.capacity * (0.85 + Math.random() * 0.1));
        updateZoneCount(z.id, highCount);
      }
    });
    toast.error("Halftime rush simulated!", { icon: 'ðŸ”' });
  };

  const handleSimulateEntry = () => {
    if (!selectedEventId) return;
    setEventPhase('entry');
    zoneList.forEach(z => {
      if (z.category === 'gate') {
        const highCount = Math.floor(z.capacity * (0.75 + Math.random() * 0.15));
        updateZoneCount(z.id, highCount);
      }
    });
    toast.success("Entry rush simulated!", { icon: 'ðŸŽ«' });
  };

  const handleBroadcast = () => {
    if (draftAlertMsg.trim().length === 0 || !selectedEventId) return;
    addAlert({
      message: draftAlertMsg,
      type: draftAlertType,
      zone_id: draftAlertZone === 'All Zones' ? null : draftAlertZone
    });
    toast.success("Alert sent to attendees", { icon: 'ðŸ“£' });
    setDraftAlertMsg('');
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 bg-surface border-r border-divider flex-col p-6">
        <div className="text-xl font-bold flex items-center space-x-2 text-on-surface mb-8">
          <span className="text-primary">Crowd</span>
          <span className="text-secondary">lux</span>
          <span className="bg-secondary/10 text-secondary text-[10px] px-2 py-1 rounded-md uppercase tracking-tighter">Staff</span>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full mb-4 flex items-center justify-center gap-2 bg-surface-alt border border-divider px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-divider transition-colors"
        >
          <Home className="w-4 h-4" /> Back To Home
        </button>

        {/* Hierarchy Nav */}
        <div className="space-y-4 mb-8 bg-surface-alt p-4 rounded-2xl border border-divider">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-on-surfaceSec mb-2">Stadium</label>
            <select 
              value={selectedStadiumId || ''} 
              onChange={e => {
                setSelectedStadiumId(e.target.value);
                setSelectedEventId(null);
              }}
              className="w-full bg-surface border border-divider rounded-xl p-2 text-xs font-bold outline-none"
            >
              <option value="">Select Venue...</option>
              {availableStadiums.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-on-surfaceSec mb-2">Event</label>
            <select 
              value={selectedEventId || ''} 
              onChange={e => setSelectedEventId(e.target.value)}
              disabled={!selectedStadiumId}
              className="w-full bg-surface border border-divider rounded-xl p-2 text-xs font-bold outline-none disabled:opacity-50"
            >
              <option value="">Select Event...</option>
              {availableEvents.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {[
            { id: 'dashboard', label: 'Monitor', icon: LayoutGrid },
            { id: 'zone_control', label: 'Overwrites', icon: SlidersHorizontal },
            { id: 'scan', label: 'Gate Scan', icon: QrCode, action: () => navigate('/staff/scan') },
            { id: 'broadcast', label: 'Broadcast', icon: Megaphone },
            { id: 'incident', label: 'Logs', icon: ClipboardList },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) item.action();
                else setActiveTab(item.id);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-bold text-sm
                ${activeTab === item.id 
                  ? 'bg-on-surface text-surface' 
                  : 'text-on-surfaceSec hover:bg-surface-alt hover:text-on-surface'}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        
        <div className="pt-4 border-t border-divider">
          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest px-2">
            <span className="text-on-surfaceSec">Phase</span>
            <span className="text-success flex items-center"><span className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />{eventPhase}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header Mobile */}
        <header className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-divider">
          <span className="text-lg font-bold">Crowdlux <span className="text-secondary text-xs uppercase ml-1 block">Staff</span></span>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-surface-alt border border-divider px-3 py-2 rounded-lg text-[11px] font-black uppercase"
          >
            <Home className="w-4 h-4" /> Home
          </button>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-on-surface mb-2">Venue Overview</h1>
                <p className="text-on-surfaceSec">Live monitoring of all stadium zones.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard title="Total Visitors" value={totalVisitors} icon={Activity} colorClass="text-primary" />
                <StatsCard title="Zones at Risk" value={zonesAtRisk} icon={Shield} colorClass="text-danger" trend={`${zonesAtRisk > 2 ? 'Action needed' : 'Normal'}`} />
                <StatsCard title="Active Alerts" value={alerts.length} icon={Megaphone} colorClass="text-warning" />
                <StatsCard title="Avg Wait Time" value={avgWaitTime} icon={SlidersHorizontal} colorClass="text-purple" trend="Stable" />
              </div>

              <h2 className="text-lg font-bold mb-4">All Zones Status</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zoneList.map(zone => (
                  <ZoneCard key={zone.id} zone={zone} />
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'zone_control' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h1 className="text-2xl font-bold text-on-surface mb-2">Live Zone Control</h1>
                  <p className="text-on-surfaceSec text-sm max-w-lg mb-4">Changes reflect instantly on all connected attendee devices and admin dashboards.</p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <select 
                    value={eventPhase}
                    onChange={(e) => setEventPhase(e.target.value)}
                    className="border border-divider rounded-lg px-3 py-2 text-sm bg-surface"
                  >
                    <option value="waiting">Waiting</option>
                    <option value="entry">Entry</option>
                    <option value="live">Live</option>
                    <option value="halftime">Halftime</option>
                    <option value="end">End Match</option>
                  </select>
                  <button onClick={handleSimulateEntry} className="px-4 py-2 bg-warning-light text-warning-dark border border-warning font-semibold text-sm rounded-lg hover:bg-warning hover:text-white transition-colors">
                    Simulate Entry
                  </button>
                  <button onClick={handleSimulateHalftime} className="px-4 py-2 bg-orange-100 text-orange-800 border border-orange font-semibold text-sm rounded-lg hover:bg-orange hover:text-white transition-colors">
                    Simulate Halftime
                  </button>
                </div>
              </div>

              <div className="bg-surface border border-divider rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-alt text-on-surfaceSec text-xs uppercase tracking-wider">
                      <th className="p-4 font-semibold">Zone</th>
                      <th className="p-4 font-semibold">Category</th>
                      <th className="p-4 font-semibold">Capacity</th>
                      <th className="p-4 font-semibold">Live Count</th>
                      <th className="p-4 font-semibold">% Full</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {zoneList.map(zone => {
                      const pct = Math.round((zone.current_count / zone.capacity) * 100);
                      let statusColor = "bg-green-100 text-green-800";
                      if (pct >= 85) statusColor = "bg-red-100 text-red-800";
                      else if (pct >= 70) statusColor = "bg-orange-100 text-orange-800";
                      else if (pct >= 40) statusColor = "bg-yellow-100 text-yellow-800";
  
                      return (
                        <tr key={zone.id} className="hover:bg-surface-alt/50 transition-colors">
                          <td className="p-4 font-medium text-sm text-on-surface">{zone.name}</td>
                          <td className="p-4 text-sm text-on-surfaceSec capitalize">{zone.category}</td>
                          <td className="p-4 text-sm text-on-surfaceSec">{zone.capacity}</td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <input 
                                type="number" 
                                id={`input-${zone.id}`}
                                className="w-24 border border-divider rounded-md px-2 py-1 text-sm bg-surface"
                                defaultValue={zone.current_count}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) updateZoneCount(zone.id, val);
                                  }
                                }}
                              />
                              <button 
                                onClick={() => {
                                  let val = parseInt(document.getElementById(`input-${zone.id}`).value);
                                  if (!isNaN(val)) updateZoneCount(zone.id, val);
                                }}
                                className="bg-primary hover:bg-primary-hover text-surface text-xs font-bold px-3 py-1.5 rounded-md transition-colors"
                              >
                                Update
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-semibold">{pct}%</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor}`}>
                              {pct >= 85 ? 'Avoid' : pct >= 70 ? 'Crowded' : pct >= 40 ? 'Busy' : 'Clear'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'broadcast' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto">
              {/* AI Suggestions Module */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-on-surface mb-2">Broadcast Alert</h1>
                    <p className="text-on-surfaceSec text-sm">Send real-time push notifications or get AI suggestions.</p>
                  </div>
                  <button 
                    onClick={async () => {
                       toast.loading("Gemini analyzing stadium load...", { id: 'ai' });
                       try {
                         const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
                         const res = await fetch(`${backendUrl}/ai/smart-alerts`, {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify(zones)
                         });
                         const data = await res.json();
                         toast.dismiss('ai');
                         
                         // Automatically set the first suggestion
                         if(data.length > 0) {
                           setDraftAlertMsg(data[0].message);
                           setDraftAlertType(data[0].type);
                           toast.success("AI generated 3 situational awareness alerts.");
                         }
                       } catch(e) {
                         toast.error("Failed to fetch AI suggestions", {id: 'ai'});
                       }
                    }}
                    className="bg-blue-light text-primary hover:bg-primary hover:text-white transition-colors text-sm font-bold px-4 py-2 rounded-xl flex items-center"
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> AI Suggestions
                  </button>
                </div>
              </div>

              <div className="bg-surface rounded-xl border border-divider shadow-sm p-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-2">Alert Type</label>
                    <div className="flex gap-4">
                      {['info', 'warning', 'danger', 'success'].map(type => (
                        <label key={type} className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" value={type} checked={draftAlertType === type} onChange={(e)=>setDraftAlertType(e.target.value)} className="accent-primary" />
                          <span className={`text-xs font-bold uppercase ${
                            type === 'danger' ? 'text-danger' : 
                            type === 'warning' ? 'text-warning' : 
                            type === 'success' ? 'text-secondary' : 'text-primary'
                          }`}>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-2">Target Zone (Optional)</label>
                    <select value={draftAlertZone} onChange={e => setDraftAlertZone(e.target.value)} className="w-full border border-divider rounded-lg px-3 py-2 text-sm bg-surface">
                      <option value="All Zones">All Zones</option>
                      {zoneList.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-on-surface mb-2">Message</label>
                    <textarea 
                      value={draftAlertMsg}
                      onChange={e => setDraftAlertMsg(e.target.value)}
                      maxLength={140}
                      className="w-full border border-divider rounded-lg p-3 text-sm bg-surface resize-none focus:ring-2 focus:ring-primary outline-none"
                      rows={3}
                      placeholder="Type your message to attendees..."
                    />
                    <div className="text-right text-xs text-on-surfaceSec mt-1">{draftAlertMsg.length} / 140</div>
                  </div>

                  <button 
                    onClick={handleBroadcast}
                    disabled={draftAlertMsg.length === 0}
                    className="w-full py-3 bg-primary text-surface rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors flex justify-center items-center"
                  >
                    <Megaphone className="w-5 h-5 mr-2" /> Broadcast to All Attendees
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'incident' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-on-surface mb-2">Incident Log</h1>
                  <p className="text-on-surfaceSec text-sm">Review operational anomalies and auto-generated AI alerts.</p>
                </div>
              </div>
              <div className="bg-surface rounded-xl border border-divider shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-surface-alt/50 border-b border-divider">
                    <tr>
                      <th className="p-4 text-xs font-semibold text-on-surfaceSec uppercase tracking-wider">Timestamp</th>
                      <th className="p-4 text-xs font-semibold text-on-surfaceSec uppercase tracking-wider">Message</th>
                      <th className="p-4 text-xs font-semibold text-on-surfaceSec uppercase tracking-wider">Severity</th>
                      <th className="p-4 text-xs font-semibold text-on-surfaceSec uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {alerts.map((alert, i) => (
                      <tr key={i} className="hover:bg-surface-alt/20">
                        <td className="p-4 text-sm text-on-surfaceSec">
                          {alert.created_at ? new Date(alert.created_at?.seconds ? alert.created_at.seconds * 1000 : alert.created_at).toLocaleTimeString() : 'Just now'}
                        </td>
                        <td className="p-4 text-sm text-on-surface font-medium max-w-sm truncate">{alert.message}</td>
                        <td className="p-4">
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                             alert.type === 'danger' ? 'bg-danger-light text-danger' : 
                             alert.type === 'warning' ? 'bg-warning-light text-warning' : 'bg-blue-light text-primary'
                          }`}>
                            {alert.type}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-xs font-bold text-on-surfaceTer uppercase">Open</span>
                        </td>
                      </tr>
                    ))}
                    {alerts.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-on-surfaceSec text-sm">No recorded incidents.</td></tr>}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <div className="flex items-center justify-center h-64 text-on-surfaceSec font-medium">
              System Configuration Locked
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Staff;
