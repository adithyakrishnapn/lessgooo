import React, { useState, useEffect } from 'react';
import { useCampaign } from '../context/CampaignContext';

export default function AdminPanel() {
  const { navigate, CampaignService } = useCampaign();

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(
    sessionStorage.getItem('lessgoooo_admin_unlocked') === 'true'
  );
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authError, setAuthError] = useState(null);

  const [campaignsList, setCampaignsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortField, setSortField] = useState('createdAt'); // 'createdAt' | 'totalViews' | 'creatorName'
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  // Load all campaigns
  const fetchAll = async () => {
    setLoading(true);
    try {
      const data = await CampaignService.getAllCampaigns();
      setCampaignsList(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminUnlocked) {
      fetchAll();
    }
  }, [isAdminUnlocked]);

  const handleAdminAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError(null);
    const configuredPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'lessgoooo-super-admin-2026';
    
    if (adminPasswordInput === configuredPassword) {
      sessionStorage.setItem('lessgoooo_admin_unlocked', 'true');
      setIsAdminUnlocked(true);
    } else {
      setAuthError('Invalid master admin password token.');
    }
  };

  // Check if campaign is active and under 24 hours
  const getCampaignStatus = (campaign) => {
    if (!campaign.isActive) return 'Expired';
    const timeDiff = Date.now() - campaign.createdAt;
    const isExpired = timeDiff >= 24 * 60 * 60 * 1000;
    return isExpired ? 'Expired' : 'Active';
  };

  // Manual Overwrite/Delete action button
  const handleManualDelete = async (slug) => {
    const confirm = window.confirm(`⚠️ Absolute Admin Action:\nAre you sure you want to immediately drop Firestore state, delete Vercel Blob binary targets, and revoke client rendering for "/match/${slug}"?`);
    if (!confirm) return;

    try {
      // Soft-delete: flips document state to isActive: false and purges customize media strings/files immediately
      await CampaignService.softDeleteCampaign(slug);
      
      // Update local state display
      setCampaignsList(prev => prev.map(c => {
        if (c.slug === slug) {
          return {
            ...c,
            isActive: false,
            audioUrl: '/karthave.mp3',
            partnerImgUrl: '/rithu.jpeg',
            exhaustedImgUrl: '/adi.jpeg',
            rejectionImgUrl: '/rejected.png',
            profiles: []
          };
        }
        return c;
      }));

      alert(`Administrative purge successful. Client rendering for "/match/${slug}" is now frozen.`);
    } catch (err) {
      console.error(err);
      alert('Override action failed.');
    }
  };

  // Statistics Calculations
  const totalCampaigns = campaignsList.length;
  
  const activeCampaigns = campaignsList.filter(c => getCampaignStatus(c) === 'Active').length;
  
  const totalViews = campaignsList.reduce((acc, c) => acc + (c.analytics?.totalViews || 0), 0);
  
  // Storage calculations: Assume total allocation cap is 50MB for mock environment. 
  // Custom media files size estimation (base64 length * 0.75 in bytes)
  const estimatePayloadSizeMB = (c) => {
    let sizeBytes = 0;
    if (c.partnerImgUrl?.startsWith('data:')) sizeBytes += c.partnerImgUrl.length;
    if (c.exhaustedImgUrl?.startsWith('data:')) sizeBytes += c.exhaustedImgUrl.length;
    if (c.rejectionImgUrl?.startsWith('data:')) sizeBytes += c.rejectionImgUrl.length;
    if (c.audioUrl?.startsWith('data:')) sizeBytes += c.audioUrl.length;
    c.profiles?.forEach(p => {
      if (p.photoUrl?.startsWith('data:')) sizeBytes += p.photoUrl.length;
    });
    return (sizeBytes * 0.75) / (1024 * 1024);
  };
  
  const totalUsedStorageMB = campaignsList.reduce((acc, c) => acc + estimatePayloadSizeMB(c), 0);
  const storageCapMB = 100; // 100 MB Cap limit
  const storagePercentage = Math.min(((totalUsedStorageMB / storageCapMB) * 100), 100).toFixed(2);

  // Filters & Sorting logic
  const filteredCampaigns = campaignsList.filter(c => {
    const term = filterText.toLowerCase();
    return (
      c.creatorName?.toLowerCase().includes(term) ||
      c.creatorEmail?.toLowerCase().includes(term) ||
      c.partnerName?.toLowerCase().includes(term) ||
      c.slug?.toLowerCase().includes(term)
    );
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    if (sortField === 'createdAt') {
      return b.createdAt - a.createdAt;
    }
    if (sortField === 'totalViews') {
      const viewsA = a.analytics?.totalViews || 0;
      const viewsB = b.analytics?.totalViews || 0;
      return viewsB - viewsA;
    }
    if (sortField === 'creatorName') {
      return a.creatorName?.localeCompare(b.creatorName || '');
    }
    return 0;
  });

  if (!isAdminUnlocked) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center px-1 py-4 w-full min-h-[70vh]">
        <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 relative text-left">
          
          {/* Locked Badge Icon */}
          <div className="w-14 h-14 bg-gradient-to-tr from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto border-4 border-slate-900 shadow-xl text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
              Admin Access Gate
            </h2>
            <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto leading-relaxed">
              Please input the master security password configured in your env registry to inspect platform analytics.
            </p>
          </div>

          {authError && (
            <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 font-semibold text-center leading-snug">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Master Security Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••••••"
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-97 cursor-pointer"
            >
              Verify Master Credentials
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors uppercase font-bold"
            >
              ← Exit to Creator Panel
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-start items-center w-full px-1 py-4">
      <div className="w-full max-w-4xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl text-left space-y-6">
        
        {/* Top Header */}
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
              Global Platform Analytics
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-wide flex items-center gap-2">
              🛡️ lessgoooo Super Admin Board
            </h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 text-xs font-bold uppercase transition-colors cursor-pointer"
          >
            Creator Dashboard
          </button>
        </div>

        {/* 1. HIGH-LEVEL STATISTICS GRID */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {/* Card 1: Links Overall */}
          <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Total Generated Links</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-slate-200">{totalCampaigns}</span>
              <span className="text-[9px] text-slate-600 font-bold">overall</span>
            </div>
          </div>

          {/* Card 2: Active Links */}
          <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Active Campaigns</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-emerald-400">{activeCampaigns}</span>
              <span className="text-[9px] text-emerald-600 font-bold">running</span>
            </div>
          </div>

          {/* Card 3: Storage Capacity */}
          <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Vercel Blob Storage Capacity</span>
            <div className="space-y-1 mt-2 w-full">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-black text-purple-400">{totalUsedStorageMB.toFixed(2)} MB</span>
                <span className="text-[9px] text-slate-600">/{storageCapMB}MB</span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${storagePercentage}%` }}
                ></div>
              </div>
              <span className="block text-[8px] text-slate-600 font-bold text-right">{storagePercentage}% occupied</span>
            </div>
          </div>

          {/* Card 4: Visitors */}
          <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl flex flex-col justify-between h-24">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">Collective Visitors</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-2xl font-black text-pink-400">{totalViews}</span>
              <span className="text-[9px] text-pink-600 font-bold">views</span>
            </div>
          </div>
        </div>

        {/* 2. FILTER & VIEWPORT CONTROLS */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-slate-950/20 p-3 rounded-xl border border-slate-800/80">
          <input
            type="text"
            placeholder="Search creator name, email, target, slug..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none placeholder-slate-600"
          />

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase font-bold">Sort By</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="createdAt">Created Time</option>
              <option value="totalViews">Page Views</option>
              <option value="creatorName">Creator Name</option>
            </select>

            <button
              onClick={fetchAll}
              className="p-2 border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>

        {/* 3. LIVE USER TRACKING DATA TABLE */}
        <div className="bg-slate-950/40 rounded-2xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
              Scrutinizing registry tables...
            </div>
          ) : sortedCampaigns.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-bold uppercase tracking-wider">
              No registered campaigns found matching filters
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="px-4 py-3">Creator / Campaign Info</th>
                    <th className="px-4 py-3">Target Partner</th>
                    <th className="px-4 py-3">Created Time</th>
                    <th className="px-4 py-3 text-center">Visits</th>
                    <th className="px-4 py-3">Link Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {sortedCampaigns.map((c) => {
                    const status = getCampaignStatus(c);
                    const timestamp = new Date(c.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={c.slug} className="hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3.5 space-y-0.5">
                          <div className="font-bold text-slate-200 flex items-center gap-1.5">
                            <span>{c.creatorName}</span>
                            <span 
                              onClick={() => navigate(`/match/${c.slug}`)}
                              className="text-[9px] bg-slate-800 hover:bg-slate-700 text-purple-400 font-mono px-1.5 py-0.25 rounded cursor-pointer transition-colors"
                            >
                              /{c.slug}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{c.creatorEmail}</div>
                          <div className="text-[9px] text-slate-400 font-medium pt-1 space-y-0.5">
                            <div>📱 WhatsApp: <span className="text-slate-300 font-mono">{c.whatsappNumber || '919876543210'}</span></div>
                            <div className="line-clamp-1 hover:line-clamp-none transition-all cursor-pointer" title={c.finalNote}>
                              📝 Note: <span className="text-slate-300 italic">"{c.finalNote || 'Default note'}"</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-slate-300">{c.partnerName}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 font-medium">{timestamp}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-400">{c.analytics?.totalViews || 0}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            status === 'Active'
                              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-950/20 border-rose-500/30 text-rose-400'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedCampaign(c)}
                            className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border border-purple-500/30 hover:border-purple-500 bg-purple-950/10 text-purple-400 hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleManualDelete(c.slug)}
                            disabled={!c.isActive}
                            className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded border border-rose-500/30 hover:border-rose-500 bg-rose-950/10 text-rose-500 hover:bg-rose-600 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                          >
                            Purge
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* DETAIL INSPECTOR MODAL */}
        {selectedCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
              
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-800/80 flex justify-between items-center bg-slate-950/40">
                <div>
                  <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">
                    Campaign Configuration Inspector
                  </span>
                  <h3 className="text-base font-black text-slate-100 flex items-center gap-2">
                    <span>📂 Campaign Detail:</span>
                    <span className="text-pink-400 font-mono">/match/{selectedCampaign.slug}</span>
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="w-8 h-8 rounded-full border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 flex items-center justify-center text-sm transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6 text-xs text-left">
                
                {/* 2-Column Core Info and customizable settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left Column: Creator and Customizable Parameters */}
                  <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
                      Core Configurations
                    </h4>
                    <div className="space-y-2 text-slate-300">
                      <div>
                        <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Creator Account</span>
                        <div className="font-bold text-slate-200">{selectedCampaign.creatorName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{selectedCampaign.creatorEmail}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Target Partner Name</span>
                        <div className="font-bold text-slate-200">{selectedCampaign.partnerName}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Custom WhatsApp Contact</span>
                        <div className="font-bold text-pink-400 font-mono">{selectedCampaign.whatsappNumber || '919876543210'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Custom Match Love Note</span>
                        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 mt-1 text-slate-200 italic font-serif leading-relaxed">
                          "{selectedCampaign.finalNote || "No custom note configured."}"
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Audio & Media Asset Previews */}
                  <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
                      Core Media Assets
                    </h4>
                    <div className="space-y-3 text-slate-300">
                      <div>
                        <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider mb-1">Background Soundtrack</span>
                        {selectedCampaign.audioUrl?.startsWith('data:') ? (
                          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-950">
                            🔊 Custom Audio Uploaded (Base64 Stream)
                          </div>
                        ) : selectedCampaign.audioUrl?.includes('publicdb') || selectedCampaign.audioUrl?.includes('blob') ? (
                          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-950 overflow-hidden text-ellipsis">
                            🔊 CDN: {selectedCampaign.audioUrl}
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            🔊 Default: {selectedCampaign.audioUrl || '/karthave.mp3'}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="text-center space-y-1">
                          <span className="block text-[8px] font-black uppercase text-slate-500 tracking-wider">Partner</span>
                          <div className="w-full aspect-square rounded-lg border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center">
                            {selectedCampaign.partnerImgUrl ? (
                              <img src={selectedCampaign.partnerImgUrl} className="w-full h-full object-cover" alt="Partner avatar" />
                            ) : (
                              <span className="text-[10px] text-slate-600 font-bold">Default</span>
                            )}
                          </div>
                        </div>

                        <div className="text-center space-y-1">
                          <span className="block text-[8px] font-black uppercase text-slate-500 tracking-wider">Exhausted</span>
                          <div className="w-full aspect-square rounded-lg border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center">
                            {selectedCampaign.exhaustedImgUrl ? (
                              <img src={selectedCampaign.exhaustedImgUrl} className="w-full h-full object-cover" alt="Exhausted icon" />
                            ) : (
                              <span className="text-[10px] text-slate-600 font-bold">Default</span>
                            )}
                          </div>
                        </div>

                        <div className="text-center space-y-1">
                          <span className="block text-[8px] font-black uppercase text-slate-500 tracking-wider">Rejection</span>
                          <div className="w-full aspect-square rounded-lg border border-slate-800 bg-slate-950 overflow-hidden flex items-center justify-center">
                            {selectedCampaign.rejectionImgUrl ? (
                              <img src={selectedCampaign.rejectionImgUrl} className="w-full h-full object-cover" alt="Rejection avatar" />
                            ) : (
                              <span className="text-[10px] text-slate-600 font-bold">Default</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Custom Profiles List */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl space-y-3">
                  <h4 className="text-[10px] font-black text-pink-400 uppercase tracking-widest border-b border-slate-800 pb-1.5">
                    Custom Dating Simulation Profiles ({selectedCampaign.profiles?.length || 0})
                  </h4>
                  {(!selectedCampaign.profiles || selectedCampaign.profiles.length === 0) ? (
                    <div className="text-slate-500 font-bold py-2">No profile cards found. Possibly purged.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedCampaign.profiles.map((p, idx) => (
                        <div key={p.id || idx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between space-y-2 text-left">
                          <div className="flex gap-2.5 items-start">
                            <div className="w-10 h-10 rounded-full border border-pink-500/30 overflow-hidden flex-shrink-0 bg-slate-950">
                              {p.photoUrl ? (
                                <img src={p.photoUrl} className="w-full h-full object-cover" alt={p.name} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-600">No pic</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-black text-slate-200 text-xs truncate flex items-center gap-1">
                                <span>{p.name || 'Anonymous'}</span>
                                <span className="text-[9px] text-slate-400 font-bold bg-slate-800 px-1 py-0.25 rounded font-mono">{p.age}</span>
                              </div>
                              <div className="text-[9px] text-slate-500 font-medium font-mono truncate">{p.distance || '0.1 km away'}</div>
                              {p.badgeText && (
                                <span className="inline-block mt-0.5 text-[7px] font-black bg-pink-500/20 text-pink-400 px-1.5 py-0.25 rounded uppercase tracking-wider">
                                  {p.badgeText}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {p.bio && (
                            <p className="text-[10px] text-slate-400 line-clamp-2 italic leading-relaxed">
                              "{p.bio}"
                            </p>
                          )}

                          <div className="space-y-1 pt-1 border-t border-slate-800/60">
                            {p.pros && p.pros.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-[8px] font-bold text-emerald-400">Pros:</span>
                                {p.pros.map((pro, i) => (
                                  <span key={i} className="text-[8px] bg-emerald-950/10 border border-emerald-500/20 text-emerald-400 px-1 rounded truncate max-w-[80px]">
                                    {pro}
                                  </span>
                                ))}
                              </div>
                            )}
                            {p.cons && p.cons.length > 0 && (
                              <div className="flex flex-wrap gap-1 items-center">
                                <span className="text-[8px] font-bold text-rose-400">Cons:</span>
                                {p.cons.map((con, i) => (
                                  <span key={i} className="text-[8px] bg-rose-950/10 border border-rose-500/20 text-rose-400 px-1 rounded truncate max-w-[80px]">
                                    {con}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="text-[9px] text-slate-500 bg-slate-950/50 p-1.5 rounded border border-slate-800/40">
                            <span className="font-bold text-rose-400 block text-[8px] uppercase tracking-wider mb-0.5">Rejection Trigger Text</span>
                            <span className="italic">"{p.rejectionText || 'No custom text'}"</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* visitor logs */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      Platform Swipe & Visitor Analytics Stream
                    </h4>
                    <div className="flex gap-3 text-[9px] text-slate-400 font-bold font-mono">
                      <div>Left (Reject): <span className="text-rose-400">{selectedCampaign.analytics?.swipesLeft || 0}</span></div>
                      <div>Right (Match): <span className="text-emerald-400">{selectedCampaign.analytics?.swipesRight || 0}</span></div>
                    </div>
                  </div>
                  {(!selectedCampaign.analytics?.visitors || selectedCampaign.analytics.visitors.length === 0) ? (
                    <div className="text-slate-500 font-bold py-2 text-center">No visitor footprints recorded yet.</div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 font-mono text-[10px] pr-2">
                      {[...selectedCampaign.analytics.visitors].reverse().map((v, idx) => (
                        <div key={idx} className="bg-slate-900 border border-slate-800/60 rounded-lg p-2 flex justify-between items-center text-left">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">{new Date(v.time).toLocaleString()}</span>
                            <span className="text-slate-400 truncate max-w-[200px]">{v.device}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                            v.isMatch 
                              ? 'bg-emerald-950/40 border border-emerald-500/20 text-emerald-400' 
                              : 'bg-slate-950 border border-slate-800 text-slate-500'
                          }`}>
                            {v.isMatch ? '❤️ Matched' : '👀 Visited'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800/80 flex justify-end gap-2 bg-slate-950/40">
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl font-bold uppercase text-[10px] tracking-wider text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
