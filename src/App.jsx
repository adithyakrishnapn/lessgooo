import React from 'react';
import { CampaignProvider, useCampaign } from './context/CampaignContext';
import CreatorDashboard from './components/CreatorDashboard';
import DatingEngine from './components/DatingEngine';
import EditDashboard from './components/EditDashboard';
import AdminPanel from './components/AdminPanel';

function AppContent() {
  const { currentRoute, currentSlug } = useCampaign();

  return (
    <div className="min-h-screen bg-[#0b0f19] bg-grid-pattern flex items-center justify-center p-2 sm:p-4 text-slate-100 overflow-y-auto relative w-full selection:bg-pink-500 selection:text-white">
      {/* Decorative colored glow orbs in the background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none"></div>

      {/* 
        Master Responsive Wrapper:
        - Dating Swiper (/match/:slug) gets a compact mobile-app frame aspect ratio.
        - Panels (Creator Dashboard, Editor Dashboard, Admin Board) get a wider, expansive desktop dashboard framework.
      */}
      <div className={`w-full transition-all duration-500 flex justify-center items-center ${
        currentRoute === 'match' ? 'max-w-md' : 'max-w-4xl'
      }`}>
        {currentRoute === 'creator' && <CreatorDashboard />}
        {currentRoute === 'match' && <DatingEngine />}
        {currentRoute === 'edit' && <EditDashboard />}
        {currentRoute === 'admin' && <AdminPanel />}
      </div>
    </div>
  );
}

function App() {
  return (
    <CampaignProvider>
      <AppContent />
    </CampaignProvider>
  );
}

export default App;
