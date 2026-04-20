import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCircle, Shield, BarChart3, Navigation, LogIn, LogOut, Loader2, X, Mail, Lock } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firestore';
import toast from 'react-hot-toast';

const Landing = () => {
  const navigate = useNavigate();
  const { user, setUser, setRole, role } = useAppContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  const [authMode, setAuthMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const setupFallbackGuest = () => {
    const guestUser = {
      uid: 'guest_' + Math.random().toString(36).substring(7),
      isAnonymous: true,
      isGuest: true,
      displayName: 'Guest Attendee'
    };
    setUser(guestUser);
    localStorage.setItem('crowdlux_guest', JSON.stringify(guestUser));
    toast.success("Signed in as Guest (Demo Mode)");
    setShowAuthModal(false);
  };

  const handleGuestSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInAnonymously(auth);
      toast.success("Welcome! Signed in via Firebase.");
      setShowAuthModal(false);
    } catch (err) {
      console.warn("Firebase Auth Error:", err.code);
      if (err.code === 'auth/configuration-not-found' || err.code === 'auth/operation-not-allowed') {
        setupFallbackGuest();
      } else {
        toast.error("Sign in failed: " + err.message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success("Signed in with Google!");
      setShowAuthModal(false);
    } catch (err) {
      toast.error("Google Sign in failed: " + err.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsSigningIn(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Welcome back!");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("Account created successfully!");
      }
      setShowAuthModal(false);
    } catch (err) {
      toast.error("Authentication failed: " + err.message);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setRole(null);
      localStorage.removeItem('crowdlux_guest');
      toast.success("Signed out successfully.");
    } catch (err) {
      toast.error("Error signing out.");
    }
  };

  const handleRoleSelect = (roleName, path) => {
    if (!user) {
      toast('Please sign in first!', { icon: '👋' });
      setShowAuthModal(true);
      return;
    }
    // If they aren't admin/staff, block them from those panels
    if (roleName !== 'attendee' && role !== roleName && role !== 'admin') {
      toast.error(`Unauthorized! You must sign in with a ${roleName} account to enter this dashboard.`);
      return;
    }
    setRole(roleName);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <nav className="w-full max-w-7xl flex justify-between items-center mb-16">
        <div className="flex items-center space-x-2">
          <Navigation className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold">
            <span className="text-primary">Crowd</span>
            <span className="text-secondary">lux</span>
          </span>
        </div>

        <div className="flex items-center space-x-4 sm:space-x-12">
          {user ? (
            <div className="flex items-center space-x-4">
               <div className="text-right hidden sm:block">
                 <p className="text-[10px] font-black uppercase text-on-surface">
                   {role ? `Role: ${role}` : 'Authenticated'}
                 </p>
                 <div className="flex items-center text-[10px] text-on-surfaceSec font-medium">
                   <span className="w-1.5 h-1.5 bg-success rounded-full mr-1" />
                   {user.email || 'Guest User'}
                 </div>
               </div>
               <button 
                 onClick={handleSignOut}
                 className="flex items-center space-x-2 bg-surface-alt border border-divider px-4 py-2 rounded-xl text-on-surfaceSec hover:text-on-surface transition-colors font-bold text-xs"
               >
                 <LogOut className="w-4 h-4" />
                 <span className="hidden xs:inline">Sign Out</span>
               </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowAuthModal(true)}
              className="bg-primary text-surface px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-primary-hover transition-all flex items-center shadow-lg shadow-primary/25"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="text-center w-full max-w-4xl mx-auto mb-20">
        <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-primary font-semibold tracking-wider uppercase text-sm mb-4">
          Real-time crowd intelligence
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-bold text-on-surface mb-6 tracking-tight leading-tight">
          The crowd, made intelligent.
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg md:text-xl text-on-surfaceSec max-w-2xl mx-auto mb-10">
          Crowdlux gives every attendee, staff member, and admin a live view of the crowd — powered by Gemini AI.
        </motion.p>
      </main>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mx-auto">
        {/* Attendee */}
        <motion.div whileHover={{ y: -8 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-surface border border-divider rounded-2xl overflow-hidden card-shadow flex flex-col">
          <div className="h-2 bg-primary w-full" />
          <div className="p-8 flex-1 flex flex-col">
            <div className="w-12 h-12 rounded-full bg-blue-light flex items-center justify-center mb-6">
              <UserCircle className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">I'm Attending</h2>
            <p className="text-on-surfaceSec mb-6 flex-1">Navigate smarter. Beat the queues. Get AI-powered directions to any part of the stadium.</p>
            <button onClick={() => handleRoleSelect('attendee', '/select-stadium')} className="w-full py-3 bg-primary text-surface rounded-xl font-medium hover:bg-primary-hover transition-colors">
              Enter as Attendee
            </button>
          </div>
        </motion.div>

        {/* Staff */}
        <motion.div whileHover={{ y: -8 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-surface border border-divider rounded-2xl overflow-hidden shadow-xl flex flex-col transform md:-translate-y-4">
          <div className="h-2 bg-secondary w-full" />
          <div className="p-8 flex-1 flex flex-col">
            <div className="w-12 h-12 rounded-full bg-success-light flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-secondary" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">I'm Venue Staff</h2>
            <p className="text-on-surfaceSec mb-6 flex-1">Control zones. Broadcast alerts. Update crowd counts and keep the venue flowing.</p>
            <button onClick={() => handleRoleSelect('staff', '/staff')} className="w-full py-3 bg-secondary text-surface rounded-xl font-medium hover:bg-green-600 transition-colors">
              Enter as Staff
            </button>
          </div>
        </motion.div>

        {/* Admin */}
        <motion.div whileHover={{ y: -8 }} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-surface border border-divider rounded-2xl overflow-hidden card-shadow flex flex-col">
          <div className="h-2 bg-purple w-full" />
          <div className="p-8 flex-1 flex flex-col">
            <div className="w-12 h-12 rounded-full bg-purple-light flex items-center justify-center mb-6">
              <BarChart3 className="w-6 h-6 text-purple" />
            </div>
            <h2 className="text-2xl font-bold text-on-surface mb-3">I'm an Admin</h2>
            <p className="text-on-surfaceSec mb-6 flex-1">Full analytics. Live heatmaps. AI-generated crowd alerts and venue insights.</p>
            <button onClick={() => handleRoleSelect('admin', '/admin')} className="w-full py-3 bg-purple text-surface rounded-xl font-medium hover:bg-purple-700 transition-colors">
              Enter as Admin
            </button>
          </div>
        </motion.div>
      </div>

      {/* Full Screen Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-surface border border-divider rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
            >
              <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 text-on-surfaceSec hover:text-on-surface">
                <X className="w-6 h-6" />
              </button>
              
              <div className="p-8">
                <h2 className="text-2xl font-black mb-1">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                <p className="text-on-surfaceSec text-sm mb-6">
                  {authMode === 'login' ? 'Sign in to access your tickets.' : 'Sign up to get your smart ticket.'}
                </p>

                <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surfaceSec" />
                      <input 
                        type="email" 
                        required
                        placeholder="Email Address" 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-surface-alt border border-divider rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surfaceSec" />
                      <input 
                        type="password" 
                        required
                        placeholder="Password" 
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-surface-alt border border-divider rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSigningIn}
                    className="w-full bg-on-surface text-surface py-3 rounded-xl font-bold flex justify-center items-center hover:opacity-90 disabled:opacity-50"
                  >
                    {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
                  </button>
                </form>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-divider"></div></div>
                  <div className="relative flex justify-center text-xs"><span className="bg-surface px-2 text-on-surfaceSec">OR</span></div>
                </div>

                <div className="space-y-3">
                  <button 
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="w-full bg-surface-alt border border-divider hover:bg-primary/5 py-3 rounded-xl font-bold flex justify-center items-center text-sm transition-colors"
                  >
                    Continue with Google
                  </button>
                  <button 
                    onClick={handleGuestSignIn}
                    disabled={isSigningIn}
                    className="w-full bg-transparent border-none text-on-surfaceSec hover:text-on-surface py-2 rounded-xl font-bold text-sm transition-colors"
                  >
                    Continue as Guest (Demo Mode)
                  </button>
                </div>
              </div>

              <div className="bg-surface-alt p-4 text-center border-t border-divider">
                <button 
                  onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                  className="text-sm font-semibold text-primary hover:text-primary-hover"
                >
                  {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="w-full text-center mt-auto pb-6 text-on-surfaceSec text-sm font-medium tracking-wide">
        Powered by Google Cloud · Gemini AI · Firebase · Google Maps
      </footer>
    </div>
  );
};

export default Landing;
