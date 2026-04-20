import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, QrCode, CheckCircle, XCircle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const ScanTicket = () => {
  const navigate = useNavigate();
  const { selectedStadium, selectedEvent, role } = useAppContext();
  const [scanResult, setScanResult] = useState(null);
  const [ticketData, setTicketData] = useState(null);

  useEffect(() => {
    // Only staff should see this
    if (role !== 'staff' && role !== 'admin') {
      toast.error("Unauthorized. Staff only.");
      navigate('/');
      return;
    }

    if (!selectedStadium || !selectedEvent) {
      toast('Please select an event in the Staff Dashboard first');
      navigate('/staff');
      return;
    }

    const scanner = new Html5QrcodeScanner('reader', { 
      qrbox: { width: 250, height: 250 },
      fps: 10,
    });

    scanner.render(
      (data) => {
        scanner.clear();
        handleScan(data);
      },
      (err) => { /* ignore frame errors */ }
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, []);

  const handleScan = (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.t && parsed.u) {
        setTicketData(parsed);
        setScanResult('success');
        // In a real app, write to Firestore: updateDoc(doc(db, "users", parsed.u), { "seats.status": "scanned" })
        toast.success("Ticket Validated!");
      } else {
        throw new Error("Invalid format");
      }
    } catch (e) {
      setScanResult('error');
      toast.error("Invalid QR Code!");
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setTicketData(null);
    window.location.reload(); // Quick way to remount the scanner safely
  };

  return (
    <div className="min-h-screen bg-surface p-6 md:p-12">
      <div className="max-w-md mx-auto">
        <button 
          onClick={() => navigate('/staff')}
          className="flex items-center text-on-surfaceSec hover:text-on-surface mb-8 font-bold"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back to Staff Dashboard
        </button>

        <h1 className="text-3xl font-black mb-8 flex items-center">
          <QrCode className="mr-3 text-primary w-8 h-8" />
          Gate Scanner
        </h1>

        {!scanResult && (
          <div className="bg-surface-alt rounded-3xl p-6 border border-divider shadow-sm">
            <div id="reader" className="rounded-xl overflow-hidden" />
          </div>
        )}

        {scanResult === 'success' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-success-light border border-success p-8 rounded-3xl text-center">
            <CheckCircle className="w-20 h-20 text-success mx-auto mb-4" />
            <h2 className="text-2xl font-black text-on-surface mb-2">Valid Ticket</h2>
            <p className="text-sm text-on-surfaceSec font-medium mb-6">User ID: {ticketData.u}<br/>Ticket ID: {ticketData.t}</p>
            <button onClick={resetScanner} className="w-full bg-surface text-on-surface px-6 py-4 rounded-xl font-bold shadow-sm">Scan Next</button>
          </motion.div>
        )}

        {scanResult === 'error' && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-danger/10 border border-danger p-8 rounded-3xl text-center">
            <XCircle className="w-20 h-20 text-danger mx-auto mb-4" />
            <h2 className="text-2xl font-black text-danger mb-2">Invalid Ticket</h2>
            <button onClick={resetScanner} className="w-full bg-danger text-white px-6 py-4 rounded-xl font-bold mt-6 shadow-sm">Try Again</button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ScanTicket;
