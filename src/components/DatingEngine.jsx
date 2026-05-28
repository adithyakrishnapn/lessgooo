import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import emailjs from '@emailjs/browser';
import { useCampaign } from '../context/CampaignContext';

export default function DatingEngine() {
  const { activeCampaign, logSwipe, isExpired } = useCampaign();

  // If there are no profiles custom-coded in this campaign
  const profiles = activeCampaign?.profiles || [];

  // Loading and State management
  const [preloader, setPreloader] = useState(true);
  const [stackExhausted, setStackExhausted] = useState(false);
  const [screen, setScreen] = useState('welcome'); // 'welcome' | 'swiping' | 'matched'

  // Date of Birth & Vibe select state
  const [dob, setDob] = useState('2004-06-15');
  const [selectedVibe, setSelectedVibe] = useState('🌟 Ready to rule');
  const [customVibe, setCustomVibe] = useState('');

  // Stack configurations
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);

  // Audio elements
  const [isMuted, setIsMuted] = useState(true);
  const audioRef = useRef(null);

  // Ref to reset Bio panel scroll height
  const bioPanelRef = useRef(null);

  // Rejection modal
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  // Matching profiles variables
  const [matchedProfile, setMatchedProfile] = useState(null);
  const [loopCount, setLoopCount] = useState(0);
  const [showLoopNotice, setShowLoopNotice] = useState(false);

  const activeVibe = customVibe.trim() || selectedVibe;

  // Sync scroll height on cards change
  useEffect(() => {
    if (bioPanelRef.current) {
      bioPanelRef.current.scrollTop = 0;
    }
  }, [currentIndex, screen]);

  // Audio setup
  useEffect(() => {
    // Initialize EmailJS public key
    emailjs.init("98JQsc_R21-m2EHRJ");

    // Dynamic soundtrack loaded from campaign
    const soundtrackPath = activeCampaign?.audioUrl || '/karthave.mp3';
    audioRef.current = new Audio(soundtrackPath);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.35; // soft volume level

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [activeCampaign]);

  // Confetti celebration bursts
  const triggerConfetti = () => {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleStartMatching = (e) => {
    e.preventDefault();
    setScreen('swiping');
  };

  const handleLike = (profile) => {
    setMatchedProfile(profile);
    setScreen('matched');
    triggerConfetti();
    logSwipe('right');
    sendNotificationEmail(profile);
  };

  const handleDislikeTrigger = () => {
    setShowRejectionModal(true);
  };

  const confirmRejection = () => {
    setShowRejectionModal(false);
    setSwipeDirection('left');
    logSwipe('left');

    setTimeout(() => {
      moveToNextCard();
    }, 200);
  };

  const moveToNextCard = () => {
    setSwipeDirection(null);
    if (currentIndex >= profiles.length - 1) {
      setStackExhausted(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleResetStack = () => {
    setStackExhausted(false);
    setCurrentIndex(0);
    setLoopCount(prev => prev + 1);
    setShowLoopNotice(true);
    setTimeout(() => setShowLoopNotice(false), 4000);
  };

  const handleSearchGlobally = () => {
    alert(`Error: Global database query timed out. Searching 195 countries yielded 0 matches besides ${activeCampaign?.creatorName || 'Aarav'}. Reloading stack...`);
    handleResetStack();
  };

  // EmailJS notifications
  const sendNotificationEmail = (profile) => {
    const pName = activeCampaign?.partnerName || 'Priya';
    const cName = activeCampaign?.creatorName || 'Aarav';

    emailjs.send("service_2icld8p", "template_vww6b7t", {
      to_name: cName,
      from_name: `${pName} Matchmaker`,
      message: `She said YES! ❤️ ${pName} matched with ${profile.name}! Vibe Alignment: ${activeVibe}`
    }, "98JQsc_R21-m2EHRJ").catch(() => {
      // quiet fail
    });
  };

  // Open WhatsApp DM
  const openWhatsApp = (profile) => {
    const formattedDob = new Date(dob).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    
    // Setup message
    const message = `Hey ${profile.name}, I'm ready to match vibes! Our alignment (DOB: ${formattedDob}) is perfect for a "${activeVibe}" story.`;
    
    // Trigger WhatsApp link
    const phone = activeCampaign?.whatsappNumber || '919876543210';
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const vibesList = [
    '🌟 Ready to rule',
    '🍕 Chilled & casual',
    '💻 High energy coding',
    '🏍️ Adventurous & wild',
    '🔮 Cosmic destiny alignment'
  ];

  if (profiles.length === 0) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-slate-950/80 backdrop-blur rounded-3xl border border-slate-800">
        <span className="text-3xl mb-3">⚠️</span>
        <h3 className="text-lg font-bold text-slate-200">No profile cards configured</h3>
        <p className="text-xs text-slate-500 max-w-xs mt-1 leading-normal">
          This campaign does not contain any customized profile cards in its stack configuration.
        </p>
      </div>
    );
  }

  const currentProfile = profiles[currentIndex];

  return (
    <div className="w-full max-w-md h-[92vh] max-h-[850px] min-h-[580px] rounded-3xl border border-slate-800 bg-[#0f172a]/70 backdrop-blur-xl shadow-2xl relative overflow-hidden flex flex-col transition-all duration-300">
      
      {/* Top Header Bar */}
      <div className="h-14 border-b border-slate-800/80 px-6 flex items-center justify-between bg-slate-900/60 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-amber-400 filter drop-shadow-[0_0_5px_rgba(250,204,21,0.5)] animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a1 1 0 011 1v1.323l3.945-.395a1 1 0 011.107.89l.8 8a1 1 0 01-.89 1.107l-4.962.496V17a1 1 0 11-2 0v-2.58l-4.962-.496a1 1 0 01-.89-1.107l.8-8a1 1 0 011.107-.89L9 4.323V3a1 1 0 011-1z" />
          </svg>
          <span className="font-extrabold text-sm tracking-wider uppercase bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            {activeCampaign?.partnerName || 'Priya'}'s Matchmaker
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Audio Speaker toggle */}
          {!preloader && (
            <button
              onClick={() => {
                const nextMute = !isMuted;
                setIsMuted(nextMute);
                if (audioRef.current) {
                  if (nextMute) {
                    audioRef.current.pause();
                  } else {
                    audioRef.current.play().catch(() => {});
                  }
                }
              }}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-200 ${
                !isMuted
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 border-transparent text-white shadow-md shadow-pink-500/20 animate-pulse'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={isMuted ? "Unmute music" : "Mute music"}
            >
              {!isMuted ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              )}
            </button>
          )}

          {screen === 'swiping' && (
            <button
              onClick={() => {
                setScreen('welcome');
                setCurrentIndex(0);
              }}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1"
            >
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Edit Vibe
            </button>
          )}
        </div>
      </div>

      {/* Content viewport */}
      <div className="flex-1 relative flex flex-col p-4 overflow-hidden">
        <AnimatePresence mode="wait">
          
          {/* 1. DATABASE EXHAUSTED SCREEN */}
          {stackExhausted && (
            <motion.div
              key="exhausted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 bg-[#0f172a]/95 z-40 p-6 flex flex-col justify-between text-center overflow-y-auto"
            >
              <div className="pt-4">
                <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-rose-500/30 animate-bounce">
                  <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h2 className="text-xl font-black text-rose-500 uppercase tracking-wider leading-none">
                  Database Exhausted
                </h2>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">
                  Candidates: 0 remaining
                </p>
              </div>

              {/* Grayed-out connection frame of Creator */}
              <div className="my-4 relative w-32 h-32 mx-auto rounded-2xl overflow-hidden border border-rose-500/30 shadow-inner bg-slate-950 flex items-center justify-center">
                <img
                  src={activeCampaign?.exhaustedImgUrl}
                  alt="Creator Avatar"
                  className="w-full h-full object-cover filter grayscale opacity-45 select-none pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                <div className="absolute text-5xl text-rose-500 select-none animate-pulse">💔</div>
              </div>

              {/* Comedic Warning box */}
              <div className="backdrop-blur-md bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 max-w-sm mx-auto text-left relative shadow-lg">
                <div className="absolute top-[-8px] left-4 bg-rose-500 text-slate-950 text-[9px] font-black tracking-wider px-2.5 py-0.5 rounded-full uppercase shadow-md">
                  System Alert
                </div>
                <p className="font-serif italic text-xs sm:text-sm text-slate-200 leading-relaxed text-center font-bold mb-2">
                  "You are missing the best compatible match check here..."
                </p>
                <p className="text-[10px] text-slate-400 text-center leading-normal">
                  The matching algorithm check has run alignment scans. Rejecting {activeCampaign?.creatorName || 'Aarav'} represents a fatal error in your cosmic judgment.
                </p>
              </div>

              {/* Reset / Search Actions */}
              <div className="space-y-2.5 pb-4">
                <button
                  onClick={handleResetStack}
                  className="w-full py-3.5 px-6 rounded-2xl font-black text-xs tracking-wider uppercase bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  🔄 Re-evaluate Candidates
                </button>
                <button
                  onClick={handleSearchGlobally}
                  className="w-full py-2.5 px-6 rounded-2xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400 hover:text-slate-200 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  Search other 4 billion men
                </button>
              </div>
            </motion.div>
          )}

          {/* 2. DATING PRELOADER */}
          {preloader && (
            <motion.div
              key="preloader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-[#0f172a] z-50 p-6 flex flex-col justify-between items-center text-center animate-fade-in"
            >
              <div className="flex-1 flex flex-col justify-center items-center max-w-sm">
                <div className="relative mb-6">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                    className="w-24 h-24 rounded-full border-4 border-dashed border-pink-500/60 flex items-center justify-center"
                  ></motion.div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-10 h-10 text-amber-400 filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 2a1 1 0 011 1v1.323l3.945-.395a1 1 0 011.107.89l.8 8a1 1 0 01-.89 1.107l-4.962.496V17a1 1 0 11-2 0v-2.58l-4.962-.496a1 1 0 01-.89-1.107l.8-8a1 1 0 011.107-.89L9 4.323V3a1 1 0 011-1z" />
                    </svg>
                  </div>
                </div>

                <h2 className="text-xl font-black tracking-wide uppercase bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 bg-clip-text text-transparent mb-3 leading-tight">
                  {activeCampaign?.partnerName || 'Priya'}'s Matchmaker
                </h2>
                <p className="text-xs text-slate-400 mb-6 leading-relaxed max-w-xs">
                  Initializing matching algorithms... loading transits... customizing dating stacks exclusively for <span className="text-pink-400 font-bold">{activeCampaign?.partnerName || 'Priya'}</span>.
                </p>

                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 w-full text-center">
                  <span className="block text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-3">
                    Enable Background Music?
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setIsMuted(false);
                        setPreloader(false);
                        if (audioRef.current) {
                          audioRef.current.play().catch(() => {});
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-xs tracking-wider uppercase shadow-md active:scale-98 transition-transform cursor-pointer"
                    >
                      🎵 Yes, Play Music
                    </button>
                    <button
                      onClick={() => {
                        setIsMuted(true);
                        setPreloader(false);
                      }}
                      className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400 hover:text-slate-200 text-xs font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                    >
                      🔇 No, Keep Muted
                    </button>
                  </div>
                </div>
              </div>

              <div className="text-[9px] text-slate-600 tracking-widest uppercase mt-4">
                Powered by lessgoooo MERN Platform
              </div>
            </motion.div>
          )}

          {/* 3. WELCOME SCREEN */}
          {screen === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 p-4 flex flex-col justify-between overflow-y-auto"
            >
              <div className="text-center pt-2">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center shadow-lg relative">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center border-2 border-slate-900 shadow">
                    <span className="text-[10px] text-slate-950 font-bold">✨</span>
                  </div>
                </div>
                <h1 className="text-xl md:text-2xl font-black text-slate-100 mb-2 leading-tight">
                  Welcome, {activeCampaign?.partnerName || 'Priya'}.
                </h1>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  The matching algorithm has curated the ultimate dating pool based on your alignment configuration.
                </p>
              </div>

              {/* Form Input fields */}
              <form onSubmit={handleStartMatching} className="my-6 space-y-4 text-left flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                
                {/* DOB */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-purple-400 mb-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Date of Birth (DOB)
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                    required
                  />
                </div>

                {/* Vibe selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-pink-400 mb-1.5 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Current mood / Vibe alignment?
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto p-0.5 rounded-lg border border-slate-900 bg-slate-950/40">
                    {vibesList.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => {
                          setSelectedVibe(v);
                          setCustomVibe('');
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 flex items-center gap-1 cursor-pointer ${
                          selectedVibe === v && !customVibe
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 border-transparent text-white font-semibold shadow-md shadow-pink-500/10'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Or Custom Vibe */}
                <div>
                  <span className="block text-[10px] font-bold uppercase text-slate-500 mb-1 text-center">
                    — Or enter a custom vibe —
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. Craving spicy food, Stressed out coding"
                    value={customVibe}
                    onChange={(e) => setCustomVibe(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-pink-500 transition-colors placeholder-slate-600"
                  />
                </div>
              </form>

              {/* Start swiping */}
              <div className="pb-2">
                <button
                  onClick={handleStartMatching}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm tracking-wider uppercase bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white shadow-xl shadow-pink-600/20 neon-glow-btn transition-transform active:scale-[0.98] cursor-pointer"
                >
                  Find My Match
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. SWIPING CARDS SCREEN */}
          {screen === 'swiping' && (
            <motion.div
              key="swiping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 p-2 flex flex-col justify-between"
            >
              
              {/* Reset notice pop-over overlay */}
              <AnimatePresence>
                {showLoopNotice && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-2 left-2 right-2 z-30 bg-gradient-to-r from-purple-900/90 to-pink-900/90 border border-purple-500/30 text-white p-2 rounded-xl text-center shadow-lg"
                  >
                    <p className="text-xs font-bold leading-tight">
                      🌀 The algorithm detected extreme choosiness.
                    </p>
                    <p className="text-[10px] text-purple-200 mt-0.5">
                      Stack refreshed. Candidates are back, they are still your best option.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Drag stack cards container */}
              <div className="relative flex-1 w-full mb-4 mt-2">
                
                {/* Visual underlay card */}
                {profiles.length > 1 && (
                  <div className="absolute inset-x-2 top-4 bottom-0 bg-slate-800/40 rounded-3xl border border-slate-700/20 -z-10 scale-[0.95] translate-y-2 opacity-50 blur-[1px]"></div>
                )}

                {/* Core card body */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={(e, info) => {
                    const offset = info.offset.x;
                    if (offset > 140) {
                      handleLike(currentProfile);
                    } else if (offset < -140) {
                      handleDislikeTrigger();
                    }
                  }}
                  animate={
                    swipeDirection === 'left'
                      ? { x: -400, rotate: -30, opacity: 0 }
                      : { x: 0, rotate: 0, opacity: 1 }
                  }
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className="absolute inset-0 glass-card rounded-3xl overflow-hidden flex flex-col border border-slate-700/60"
                >
                  
                  {/* Photo area */}
                  <div className="h-[52%] relative bg-slate-950 overflow-hidden flex items-center justify-center">
                    
                    {/* Background blurred element */}
                    <img
                      src={currentProfile.photoUrl}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover filter blur-xl opacity-35 scale-110 pointer-events-none select-none"
                    />

                    {/* Crisp crisp foreground target image */}
                    <img
                      src={currentProfile.photoUrl}
                      alt={currentProfile.name}
                      className="relative z-10 max-w-full max-h-full object-contain select-none pointer-events-none"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30 pointer-events-none z-10"></div>

                    {/* Comedic tag pill indicator overlay */}
                    {currentProfile.badgeText && (
                      <div className="absolute top-4 right-4 z-20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold border border-pink-500/50 bg-slate-900/60 text-pink-400 animate-pulse">
                        {currentProfile.badgeText}
                      </div>
                    )}

                    {/* Verified & distance floating badges */}
                    <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between z-20">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-xl font-black text-white leading-none">
                            {currentProfile.name}
                          </h2>
                          {currentProfile.verified && (
                            <span className="bg-blue-500 text-white rounded-full p-0.5 shadow-md flex items-center justify-center" title="Verified candidate">
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                <path d="M6.267 3.455a.75.75 0 00-.708-.523H4.56a2.5 2.5 0 00-2.5 2.5v1.078a.75.75 0 00.379.65l1.644.95a1 1 0 01.5.866v1.948a1 1 0 01-.5.866l-1.644.95a.75.75 0 00-.379.65v1.078a2.5 2.5 0 002.5 2.5h.999a.75.75 0 00.708-.523l.363-1.09a3 3 0 015.688 0l.363 1.09a.75.75 0 00.708.523h.999a2.5 2.5 0 002.5-2.5v-1.078a.75.75 0 00-.379-.65l-1.644-.95a1 1 0 01-.5-.866v-1.948a1 1 0 01.5-.866l1.644-.95a.75.75 0 00.379-.65V5.432a2.5 2.5 0 00-2.5-2.5h-.999a.75.75 0 00-.708.523l-.363 1.09a3 3 0 01-5.688 0l-.363-1.09z" />
                              </svg>
                            </span>
                          )}
                          <span className="text-xs text-pink-400 font-bold ml-1.5">
                            {currentProfile.age}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-slate-300 text-xs mt-1 font-semibold">
                          <svg className="w-3.5 h-3.5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>{currentProfile.distance}</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 text-[9px] text-slate-400 max-w-[150px] text-right font-medium leading-tight">
                        {currentProfile.subDistance}
                      </div>
                    </div>
                  </div>

                  {/* Bio and metadata list area */}
                  <div
                    ref={bioPanelRef}
                    key={currentProfile.id}
                    className="flex-1 p-4 flex flex-col justify-between overflow-y-auto bg-slate-900/40"
                  >
                    <div>
                      <p className="text-xs text-slate-300 leading-relaxed italic mb-3">
                        "{currentProfile.bio || 'Highly aligned campaign candidate.'}"
                      </p>

                      <hr className="border-slate-800/80 my-2.5" />

                      {/* Pros list */}
                      {currentProfile.pros?.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Pros</span>
                          {currentProfile.pros.map((pro, index) => (
                            <div key={index} className="flex items-start gap-1.5 text-xs text-slate-200">
                              <span className="text-emerald-500 shrink-0 font-bold">✓</span>
                              <span className="leading-tight">{pro}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Cons list */}
                      {currentProfile.cons?.length > 0 && (
                        <div className="space-y-1.5 mt-3.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Cons</span>
                          {currentProfile.cons.map((con, index) => (
                            <div key={index} className="flex items-start gap-1.5 text-xs text-slate-200">
                              <span className="text-rose-500 shrink-0 font-bold">✗</span>
                              <span className="leading-tight">{con}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </motion.div>
              </div>

              {/* Bottom buttons panel */}
              <div className="flex justify-center items-center gap-6 pb-2">
                {/* Dislike */}
                <button
                  onClick={handleDislikeTrigger}
                  className="w-14 h-14 rounded-full border-2 border-rose-500/20 bg-slate-950/80 hover:bg-rose-500/10 text-rose-500 shadow-lg flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 hover:border-rose-500/60 cursor-pointer"
                  title="Nope"
                >
                  <svg className="w-6 h-6 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Like */}
                <button
                  onClick={() => handleLike(currentProfile)}
                  className="w-16 h-16 rounded-full border-2 border-emerald-500/20 bg-gradient-to-tr from-emerald-500/10 to-teal-500/20 hover:from-emerald-500/20 hover:to-teal-500/30 text-emerald-400 shadow-xl flex items-center justify-center transition-all duration-200 active:scale-90 hover:scale-105 hover:border-emerald-500/60 relative cursor-pointer"
                  title="Like!"
                >
                  <div className="absolute inset-0 rounded-full bg-emerald-500/15 animate-ping opacity-25"></div>
                  <svg className="w-7 h-7 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>

            </motion.div>
          )}

          {/* 5. IT'S A MATCH SCREEN */}
          {screen === 'matched' && matchedProfile && (
            <motion.div
              key="matched"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/95 z-50 p-6 flex flex-col justify-between overflow-y-auto text-center"
            >
              
              {/* Matching header */}
              <div className="pt-6">
                <div className="w-12 h-12 bg-amber-400/20 rounded-full flex items-center justify-center mx-auto mb-3 border border-amber-400/30 animate-bounce">
                  <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 2a1 1 0 011 1v1.323l3.945-.395a1 1 0 011.107.89l.8 8a1 1 0 01-.89 1.107l-4.962.496V17a1 1 0 11-2 0v-2.58l-4.962-.496a1 1 0 01-.89-1.107l.8-8a1 1 0 011.107-.89L9 4.323V3a1 1 0 011-1z" />
                  </svg>
                </div>
                <h1 className="text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-500 to-purple-400 filter drop-shadow-[0_0_15px_rgba(236,72,153,0.3)] leading-none uppercase">
                  IT'S A MATCH!
                </h1>
                <p className="text-xs text-slate-400 mt-2 font-semibold">
                  The universe (and SaaS configurations) have aligned.
                </p>
              </div>

              {/* Interlocking Avatar boxes */}
              <div className="my-6 relative flex items-center justify-center gap-6">
                
                {/* Partner (Priya) */}
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: -6 }}
                  transition={{ type: 'spring', delay: 0.1, stiffness: 200 }}
                  className="w-24 h-24 rounded-full border-4 border-amber-400 shadow-xl overflow-hidden relative z-10 filter drop-shadow-[0_4px_10px_rgba(251,191,36,0.3)]"
                >
                  <img src={activeCampaign?.partnerImgUrl} alt="Partner" className="w-full h-full object-cover" />
                </motion.div>

                {/* Central interlocking heart */}
                <div className="absolute z-20 w-12 h-12 bg-pink-500 rounded-full border-2 border-slate-950 flex items-center justify-center shadow-lg transform -translate-y-1 hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white animate-pulse fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Creator Persona */}
                <motion.div
                  initial={{ scale: 0, rotate: 20 }}
                  animate={{ scale: 1, rotate: 6 }}
                  transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
                  className="w-24 h-24 rounded-full border-4 border-pink-500 shadow-xl overflow-hidden relative z-10 filter drop-shadow-[0_4px_10px_rgba(236,72,153,0.3)]"
                >
                  <img src={matchedProfile.photoUrl} alt={matchedProfile.name} className="w-full h-full object-cover" />
                </motion.div>

              </div>

              {/* Heartfelt Note Box */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="backdrop-blur-sm bg-white/5 border border-white/10 rounded-xl p-4 md:p-5 mt-4 mb-6 max-w-md mx-auto text-center shadow-lg relative"
              >
                <div className="absolute -top-2.5 left-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[9px] font-bold tracking-wider px-2.5 py-0.5 rounded-full uppercase shadow-md flex items-center gap-1">
                  <span className="text-[10px] animate-pulse">💖</span> A Note For You
                </div>
                <p className="font-serif italic text-xs sm:text-sm text-slate-200 leading-relaxed font-bold">
                  "{activeCampaign?.finalNote || "Yeah, I know it's not happening, but this little heart thought of making you smile with this. You should know that this genuine heart is setting your standards so high that you shouldn't go for anything lower. I will make you the main character... with a whole heart, a simple nerd."}"
                </p>
              </motion.div>

              {/* DM actions row */}
              <div className="space-y-3 pb-4">
                <button
                  onClick={() => openWhatsApp(matchedProfile)}
                  className="w-full py-4 px-6 rounded-2xl font-black text-sm tracking-wider uppercase bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-400 hover:to-indigo-500 text-white shadow-xl shadow-pink-600/30 neon-glow-btn transition-transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 448 512">
                    <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L32 503l138.9-36.5c32.7 17.8 69 27.2 106.2 27.2 122.4 0 222-99.6 222-222 0-59.3-23.2-115-65.1-157c-8.2-8.2-16.7-16.7-25.1-25.1zM223.9 452.9c-33.2 0-65.7-8.9-94-25.7l-6.7-4-82.4 21.6 22-80.3-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7 .9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
                  </svg>
                  Slide into his DMs
                </button>

                <button
                  onClick={() => {
                    setScreen('swiping');
                    setMatchedProfile(null);
                    moveToNextCard();
                  }}
                  className="w-full py-3 px-6 rounded-2xl font-bold text-xs border border-slate-800 hover:border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Keep swiping (Are you crazy?)
                </button>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

        {/* 6. HILARIOUS REJECTION MODAL */}
        <AnimatePresence>
          {showRejectionModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/90 z-40 p-5 flex flex-col justify-center items-center"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col text-center"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    Match Interrupted
                  </span>
                  <button
                    onClick={() => setShowRejectionModal(false)}
                    className="text-slate-500 hover:text-slate-300 text-sm font-semibold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <h2 className="text-lg font-black text-rose-500 uppercase tracking-wide leading-none">
                  Wait! Are you sure?
                </h2>
                <p className="text-[10px] text-slate-400 mt-1 mb-4 leading-normal">
                  You're about to pass on an absolutely high-value candidate.
                </p>

                {/* Custom rejection image */}
                <div className="w-full aspect-[4/3] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden mb-4 relative flex items-center justify-center group shadow-inner">
                  <img
                    src={activeCampaign?.rejectionImgUrl}
                    alt="Sad Rejection illustration"
                    className="w-full h-full object-cover filter brightness-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-2 left-2 right-2 bg-slate-900/90 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] text-rose-400 font-semibold leading-tight italic">
                    "{currentProfile.rejectionText || "reconsider?"}"
                  </div>
                </div>

                {/* Confirm rejection / Oops */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowRejectionModal(false)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs tracking-wider uppercase shadow-md active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    💖 Oops, Let me Reconsider
                  </button>
                  <button
                    onClick={confirmRejection}
                    className="w-full py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-300 font-semibold text-xs tracking-wider transition-colors cursor-pointer"
                  >
                    Next profile anyway
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
