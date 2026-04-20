import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MapPin, Sparkles, Bell, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { DEMO_ATTENDEE } from '../utils/mockData';
import { getZoneStatus } from '../utils/zoneColors';
import { QRCodeSVG } from 'qrcode.react';
import MapComponent from '../components/MapComponent';
import EventPhaseChip from '../components/EventPhaseChip';

const Attendee = () => {
  const navigate = useNavigate();
  const { user, eventPhase, zones, alerts, userTicket, selectedStadium, selectedEvent } = useAppContext();
  const [activeTab, setActiveTab] = useState('home');
  const [aiQuery, setAiQuery] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [messages, setMessages] = useState([]); // [{role: 'user'|'model', parts: ''}]
  const [lastAskedDestination, setLastAskedDestination] = useState('');

  const zoneList = Object.values(zones);
  
  // Get gate wait
  const gateZone = userTicket?.gate ? zones[userTicket.gate] : null;
  const gateStatus = gateZone ? getZoneStatus(gateZone.current_count, gateZone.capacity, false) : null;

  const recommendedZones = zoneList
    .filter(z => z.category !== 'gate' && !z.is_closed)
    .sort((a, b) => (a.current_count / a.capacity) - (b.current_count / b.capacity))
    .slice(0, 3);

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    if (!selectedStadium?.id || !selectedEvent?.id) {
      const fallbackObj = {
        wait_minutes: 5,
        crowd_level: "moderate",
        recommendation: "Select a stadium and live event to enable guided routing.",
        best_time_to_go: "Now",
        tip: "Event context missing. Choose your event and try again."
      };
      setMessages(prev => [...prev, { role: 'model', parts: JSON.stringify(fallbackObj) }]);
      return;
    }
    
    // Add user message to UI immediately
    const userMsgText = aiQuery;
    setLastAskedDestination(userMsgText);
    const newChatHistory = [...messages, { role: 'user', parts: userMsgText }];
    setMessages(newChatHistory);
    setAiQuery('');
    setAiLoading(true);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
      const res = await fetch(`${backendUrl}/ai/crowd-guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stadium_id: selectedStadium.id,
          event_id: selectedEvent.id,
          zone_data: zones,
          event_phase: eventPhase,
          destination: userMsgText,
          history: newChatHistory,
          attendee_profile: userTicket ? { ...userTicket, name: user?.displayName || 'Guest' } : DEMO_ATTENDEE
        })
      });
      
      if (!res.ok) throw new Error("AI Backend returned error");
      const data = await res.json();
      
      // AI usually returns the JSON structure. Convert to a string response or keep structured format.
      // We will store the entire rich object in parts to render it nicely.
      setMessages(prev => [...prev, { role: 'model', parts: JSON.stringify(data) }]);
      
    } catch (e) {
      console.error(e);
      // Native fallback
      const fallbackObj = {
        wait_minutes: 5,
        crowd_level: "moderate",
        recommendation: `Our live sensors suggest using the main corridor to reach your location.`,
        best_time_to_go: "Now",
        tip: "Backend AI unreachable. Fallback logic utilized."
      };
      setMessages(prev => [...prev, { role: 'model', parts: JSON.stringify(fallbackObj) }]);
    } finally {
      setAiLoading(false);
    }
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'map', icon: MapPin, label: 'Map' },
    { id: 'ai', icon: Sparkles, label: 'AI Guide' },
    { id: 'alerts', icon: Bell, label: 'Alerts', badge: alerts.length > 0 },
    { id: 'ticket', icon: QrCode, label: 'Ticket' },
  ];

  return (
    <div className="flex min-h-screen bg-background relative">
      
      {/* 
        Responsive Layout Shift:
        On desktop, the navigation acts as a classic sidebar!
      */}
      <aside className="hidden md:flex w-64 bg-surface border-r border-divider flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="text-xl font-bold flex items-center space-x-2 text-on-surface">
              <span className="text-primary">Crowd</span>
              <span className="text-secondary">lux</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 bg-surface-alt border border-divider px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider"
            >
              <Home className="w-4 h-4" /> Home
            </button>
          </div>
          <nav className="space-y-2">
            {navItems.map(item => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm
                    ${isActive ? 'bg-primary text-surface' : 'text-on-surfaceSec hover:bg-surface-alt hover:text-on-surface'}`}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {item.badge && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-danger rounded-full border-2 border-background" />}
                  </div>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>
        <div className="p-4 border-t border-divider">
          <div className="flex items-center justify-between text-xs px-2">
            <span className="text-on-surfaceSec font-semibold">Event Phase</span>
            <EventPhaseChip />
          </div>
        </div>
      </aside>

      {/* Main Responsive Body */}
      <div className="flex-1 flex flex-col h-screen md:h-auto">
        
        {/* Mobile Header */}
        <header className="md:hidden px-6 py-4 flex justify-between items-center bg-surface border-b border-divider sticky top-0 z-20">
          <div className="flex items-center space-x-1">
            <span className="font-bold text-lg">
              <span className="text-primary">Crowd</span>
              <span className="text-secondary">lux</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1 bg-surface-alt border border-divider px-3 py-2 rounded-lg text-[11px] font-black uppercase"
            >
              <Home className="w-4 h-4" /> Home
            </button>
            <div className="relative cursor-pointer" onClick={()=>setActiveTab('alerts')}>
              <Bell className="w-6 h-6 text-on-surfaceSec" />
              {alerts.length > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-danger rounded-full border-2 border-surface" />}
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 overflow-y-auto w-full max-w-7xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
          <AnimatePresence mode="wait">
            
            {activeTab === 'home' && (
              <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                
                <div className="flex justify-between items-center mb-6">
                  <h1 className="text-3xl font-black text-on-surface">Hello, {user?.displayName?.split(' ')[0] || 'Attendee'} ðŸ‘‹</h1>
                  <EventPhaseChip />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Status Box */}
                  <div className="bg-blue-light rounded-3xl p-6 shadow-sm col-span-1 lg:col-span-2">
                    <h2 className="text-xl font-bold text-primary-hover mb-2">Live Match Status</h2>
                    <p className="text-sm text-primary mb-4">Event is currently in <strong className="uppercase">{eventPhase}</strong> phase.</p>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full transition-all duration-1000" style={{ width: eventPhase === 'waiting' ? '10%' : eventPhase === 'live' ? '50%' : '80%' }} />
                    </div>
                  </div>

                  {/* Seat Card */}
                  <div className="bg-surface rounded-3xl p-6 border border-divider shadow-sm">
                    <div className="text-xs font-bold tracking-widest text-on-surfaceSec uppercase mb-1">Your Seat</div>
                    <div className="text-2xl font-black text-on-surface mb-6">{userTicket?.stand ? `${userTicket.stand} Stand` : 'No Seat'} Â· Row {userTicket?.row || '-'}</div>
                    <div className="text-sm font-medium text-on-surface mb-2">Entry: {gateZone?.name || 'Gate not assigned'}</div>
                    {gateStatus && (
                      <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${gateStatus.class}`}>
                        Wait: ~{gateZone?.wait_minutes} min Â· {gateStatus.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h2 className="font-bold text-lg text-on-surface mb-4 flex items-center"><Sparkles className="w-5 h-5 text-warning mr-2" /> Recommended Zones Right Now</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recommendedZones.map(z => {
                      const pct = Math.round((z.current_count / z.capacity) * 100);
                      const zStatus = getZoneStatus(z.current_count, z.capacity, z.is_closed);
                      return (
                        <div key={z.id} className="bg-surface rounded-2xl p-5 border border-divider shadow-sm hover:shadow-md transition-shadow">
                          <div className="font-semibold text-base mb-2 truncate">{z.name}</div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-on-surfaceSec">{pct}% full</span>
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${zStatus.class}`}>{zStatus.label}</span>
                          </div>
                          <button onClick={() => { setAiQuery(z.name); setActiveTab('ai'); }} className="w-full bg-surface-alt py-2 rounded-lg text-sm text-primary font-bold hover:bg-primary hover:text-surface transition-colors">Navigate â†’</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'map' && (
              <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
                <div className="mb-4 flex justify-between items-center">
                  <h1 className="text-2xl font-bold">Live Stadium Map</h1>
                  <span className="text-on-surfaceSec flex items-center text-sm font-semibold"><span className="w-2.5 h-2.5 rounded-full bg-secondary mr-2 animate-pulse" /> Live</span>
                </div>
                <div className="flex-1 min-h-[500px]">
                  <MapComponent
                    stadium={selectedStadium}
                    zones={zones}
                    userTicket={userTicket}
                    destinationHint={lastAskedDestination}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'ai' && (
              <motion.div key="ai" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl mx-auto py-4 flex flex-col h-[calc(100vh-140px)]">
                <div className="text-center mb-6 shrink-0">
                  <div className="w-12 h-12 bg-blue-light rounded-full flex items-center justify-center mx-auto mb-2">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-2xl font-black text-on-surface">AI Route Guide</h1>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-6 px-2 pb-4">
                  {messages.length === 0 && (
                    <div className="text-center text-on-surfaceSec mt-10">
                      <p>Ask me for directions, crowd wait times, or venue tips!</p>
                    </div>
                  )}

                  {messages.map((m, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      {m.role === 'user' ? (
                        <div className="bg-primary text-surface px-6 py-3 rounded-2xl rounded-tr-none max-w-[85%] text-sm font-medium">
                          {m.parts}
                        </div>
                      ) : (
                         <div className="bg-surface border border-divider shadow-md p-6 rounded-3xl rounded-tl-none max-w-[95%] w-full">
                           {(() => {
                              try {
                                const data = JSON.parse(m.parts);
                                const safe = {
                                  wait_minutes: data.wait_minutes || 2,
                                  crowd_level: (data.crowd_level || 'moderate').toLowerCase(),
                                  recommendation: data.recommendation || 'Head there now â€” conditions look good.',
                                  alternative_zone: data.alternative_zone || null,
                                  alternative_wait: data.alternative_wait || null,
                                  best_time_to_go: data.best_time_to_go || 'Now',
                                  tip: data.tip || ''
                                };

                                const crowdBadgeColors = {
                                  low: 'bg-[#E6F4EA] text-[#1E8E3E]',
                                  moderate: 'bg-[#FEF7E0] text-[#B06000]',
                                  high: 'bg-[#FCE8E6] text-[#D93025]'
                                };
                                const badgeClass = crowdBadgeColors[safe.crowd_level] || crowdBadgeColors.moderate;

                                return (
                                  <>
                                    <div className="flex items-center justify-between mb-4 border-b border-divider pb-4">
                                      <span className="text-4xl font-black text-on-surface">~{safe.wait_minutes}m</span>
                                      <div className="flex items-center space-x-2">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClass}`}>
                                          {safe.crowd_level}
                                        </span>
                                        <span className="bg-warning-light text-warning-dark px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider">Est. Wait</span>
                                      </div>
                                    </div>
                                    <p className="text-base text-on-surface font-medium leading-relaxed mb-4">{safe.recommendation}</p>
                                    
                                    {safe.alternative_zone && (
                                      <div className="bg-[#E6F4EA] border border-[#1E8E3E]/20 rounded-xl p-4 mb-4">
                                        <p className="text-[10px] text-[#1E8E3E] font-black tracking-widest uppercase mb-1">Better Option</p>
                                        <p className="text-sm font-semibold text-on-surface">{safe.alternative_zone} (~{safe.alternative_wait}m wait)</p>
                                      </div>
                                    )}
                                    
                                    <div className="flex gap-2 mb-3">
                                      <span className="bg-surface-alt px-3 py-1.5 rounded-lg text-xs font-bold text-on-surfaceSec border border-divider">
                                        Best time to go: <span className="text-primary">{safe.best_time_to_go}</span>
                                      </span>
                                    </div>
                                    {safe.tip && (
                                      <p className="text-[13px] text-on-surfaceSec italic flex items-center">
                                        <Sparkles className="w-4 h-4 mr-1 text-warning" /> Tip: {safe.tip}
                                      </p>
                                    )}
                                  </>
                                )
                              } catch (e) {
                                return <p className="text-sm">{m.parts}</p>
                              }
                            })()}
                         </div>
                      )}
                    </motion.div>
                  ))}
                  
                  {aiLoading && (
                    <div className="flex items-start">
                      <div className="bg-surface border border-divider px-6 py-4 rounded-3xl rounded-tl-none flex space-x-2 items-center h-12">
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-2 h-2 bg-primary rounded-full" />
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-2 h-2 bg-primary rounded-full" />
                        <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-2 h-2 bg-primary rounded-full" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-surface rounded-2xl p-2 flex items-center shadow-lg border border-divider shrink-0">
                  <input 
                    type="text" 
                    value={aiQuery}
                    onChange={e => setAiQuery(e.target.value)}
                    placeholder="Ask a follow-up question..."
                    className="flex-1 bg-transparent px-4 py-3 text-sm outline-none"
                    onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                  />
                  <button 
                    onClick={handleAiSearch}
                    disabled={aiLoading || aiQuery.length === 0}
                    className="bg-primary text-surface px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'alerts' && (
              <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-4">
                <h1 className="text-2xl font-bold mb-6">Live Push Alerts</h1>
                {alerts.length === 0 ? (
                  <div className="text-center p-12 bg-surface rounded-3xl border border-divider text-on-surfaceSec">
                    <div className="w-20 h-20 bg-success-light rounded-full flex items-center justify-center mx-auto mb-6">
                      <Bell className="w-10 h-10 text-secondary" />
                    </div>
                    <p className="font-bold text-lg mb-2">All clear!</p>
                    <p className="text-sm">No active alerts from operations right now.</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {alerts.map(alert => (
                      <motion.div 
                        key={alert.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`bg-surface rounded-2xl p-6 shadow-sm border-l-8 ${
                          alert.type === 'danger' ? 'border-l-danger' : 
                          alert.type === 'warning' ? 'border-l-warning' : 
                          alert.type === 'success' ? 'border-l-secondary' : 'border-l-primary'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-sm font-black uppercase tracking-widest ${
                            alert.type === 'danger' ? 'text-danger' : 
                            alert.type === 'warning' ? 'text-warning' : 
                            alert.type === 'success' ? 'text-secondary' : 'text-primary'
                          }`}>
                            {alert.type} Broadcast
                          </span>
                          <span className="text-xs font-semibold text-on-surfaceTer">
                            {alert.created_at ? new Date(alert.created_at?.seconds ? alert.created_at.seconds * 1000 : alert.created_at).toLocaleTimeString() : 'Just now'}
                          </span>
                        </div>
                        <p className="text-base text-on-surface font-medium leading-relaxed">{alert.message}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </motion.div>
            )}

            {activeTab === 'ticket' && (
              <motion.div key="ticket" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center py-8">
                <div className="bg-surface w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden relative border border-divider">
                  <div className="p-8 bg-primary text-surface">
                    <div className="text-sm font-black uppercase tracking-widest opacity-80 mb-2">{selectedEvent?.name}</div>
                    <h2 className="text-3xl font-black mb-4">{selectedStadium?.name}</h2>
                    <div className="flex items-center space-x-2 text-base font-medium opacity-90">
                      <MapPin className="w-5 h-5" />
                      <span>{selectedStadium?.city}, {selectedStadium?.state}</span>
                    </div>
                  </div>
                  
                  <div className="relative h-8 bg-transparent">
                    <div className="absolute top-1/2 left-0 w-full border-t-2 border-dashed border-divider -mt-[1px]" />
                    <div className="absolute top-0 -left-4 w-8 h-8 bg-background rounded-full" />
                    <div className="absolute top-0 -right-4 w-8 h-8 bg-background rounded-full" />
                  </div>

                  <div className="p-8">
                    <div className="grid grid-cols-2 gap-6 mb-10">
                      <div>
                        <p className="text-xs text-on-surfaceSec tracking-widest mb-1 font-bold">STAND</p>
                        <p className="font-black text-xl">{userTicket?.stand || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surfaceSec tracking-widest mb-1 font-bold">ROW / SEAT</p>
                        <p className="font-black text-xl">{userTicket?.row || '-'} / {userTicket?.seat || '-'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-on-surfaceSec tracking-widest mb-1 font-bold">ENTER VIA</p>
                        <p className="font-black text-xl text-primary">{gateZone?.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center pt-8 border-t border-divider">
                      <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                        <QRCodeSVG value={userTicket ? JSON.stringify({t: userTicket.id, u: user.uid}) : "no-ticket"} size={180} level="Q" />
                      </div>
                      <p className="text-sm font-mono text-on-surfaceSec mt-4 tracking-widest font-bold">{userTicket?.id || 'TBD'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-secondary text-white text-center py-4 text-sm font-black tracking-widest uppercase">
                    Valid For Entry
                  </div>
                </div>
              </motion.div>
            )}
            
          </AnimatePresence>
        </main>

        {/* Bottom Navigation Mobile Only */}
        <nav className="md:hidden sticky bottom-0 w-full bg-surface border-t border-divider px-2 pb-6 pt-3 flex justify-between items-center z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center flex-1 relative transition-colors ${isActive ? 'text-primary' : 'text-on-surfaceSec'}`}
              >
                {item.badge && <span className="absolute top-0 right-1/4 w-2 h-2 bg-danger rounded-full" />}
                <Icon className={`w-6 h-6 mb-1 ${isActive ? 'stroke-[2.5px]' : ''}`} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

    </div>
  );
};

export default Attendee;
