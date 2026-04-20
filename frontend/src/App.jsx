import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Toaster } from 'react-hot-toast';

import Landing from './pages/Landing';
import Attendee from './pages/Attendee';
import Staff from './pages/Staff';
import Admin from './pages/Admin';
import SelectStadium from './pages/SelectStadium';
import SelectEvent from './pages/SelectEvent';
import SelectSeat from './pages/SelectSeat';

import ScanTicket from './pages/ScanTicket';

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/select-stadium" element={<SelectStadium />} />
          <Route path="/select-event" element={<SelectEvent />} />
          <Route path="/select-seat" element={<SelectSeat />} />
          <Route path="/attendee" element={<Attendee />} />
          <Route path="/staff" element={<Staff />} />
          <Route path="/staff/scan" element={<ScanTicket />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
      <Toaster position="top-center" />
    </AppProvider>
  );
}

export default App;
