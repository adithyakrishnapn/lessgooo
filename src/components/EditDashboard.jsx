import React, { useState, useEffect } from 'react';
import { useCampaign } from '../context/CampaignContext';

const MAX_IMAGE_SIZE_BYTES = 500 * 1024;
const MAX_AUDIO_SIZE_BYTES = 3 * 1024 * 1024;

export default function EditDashboard() {
  const { 
    currentSlug, 
    activeCampaign, 
    loadingCampaign, 
    campaignError, 
    isExpired, 
    isEditUnlocked, 
    unlockEditMode, 
    navigate,
    CampaignService 
  } = useCampaign();

  // Credentials input
  const [emailInput, setEmailInput] = useState('');
  const [authError, setAuthError] = useState(null);

  // Editing state fields (loaded from activeCampaign)
  const [creatorName, setCreatorName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('919876543210');
  const [finalNote, setFinalNote] = useState('');
  
  // Custom Media
  const [rithuImg, setRithuImg] = useState('');
  const [adiImg, setAdiImg] = useState('');
  const [rejectedImg, setRejectedImg] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const [filesDisplay, setFilesDisplay] = useState({
    partnerAvatar: '',
    exhaustedImg: '',
    rejectionImg: '',
    soundtrack: ''
  });

  // Profiles list
  const [profiles, setProfiles] = useState([]);
  
  // Submit state triggers
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errorAlert, setErrorAlert] = useState(null);

  // Sync editing fields with loaded campaign
  useEffect(() => {
    if (activeCampaign) {
      setCreatorName(activeCampaign.creatorName || '');
      setPartnerName(activeCampaign.partnerName || '');
      setRithuImg(activeCampaign.partnerImgUrl || '');
      setAdiImg(activeCampaign.exhaustedImgUrl || '');
      setRejectedImg(activeCampaign.rejectionImgUrl || '');
      setAudioUrl(activeCampaign.audioUrl || '');
      setWhatsappNumber(activeCampaign.whatsappNumber || '919876543210');
      setFinalNote(activeCampaign.finalNote || '');
      setProfiles(activeCampaign.profiles ? JSON.parse(JSON.stringify(activeCampaign.profiles)) : []);
    }
  }, [activeCampaign]);

  const showError = (msg) => {
    setErrorAlert(msg);
    setTimeout(() => setErrorAlert(null), 5000);
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError(null);
    const success = unlockEditMode(emailInput);
    if (!success) {
      setAuthError('Email ID does not match the registered creator of this slug.');
    }
  };

  // Convert File to Base64
  const handleFileRead = (file, type, callback, displayNameField) => {
    if (!file) return;

    if (type === 'image' && file.size > MAX_IMAGE_SIZE_BYTES) {
      showError(`"${file.name}" rejected. Image files must be under 500KB.`);
      return;
    }
    if (type === 'audio' && file.size > MAX_AUDIO_SIZE_BYTES) {
      showError(`"${file.name}" rejected. Audio soundtracks must be under 3MB.`);
      return;
    }

    const isProduction = !CampaignService.isMock;
    const blobToken = import.meta.env.VITE_BLOB_READ_WRITE_TOKEN;
    const hasBlob = !!blobToken;

    if (displayNameField) {
      setFilesDisplay(prev => ({
        ...prev,
        [displayNameField]: (isProduction && hasBlob) ? 'Uploading to CDN...' : 'Reading file...'
      }));
    }

    if (type === 'image') {
      compressImage(file, 800, 0.6)
        .then(async (compressedBase64) => {
          if (isProduction && hasBlob) {
            try {
              const compressedBlob = dataURLtoBlob(compressedBase64);
              const vercelBlobUrl = await uploadToVercelBlob(compressedBlob, file.name, blobToken);
              callback(vercelBlobUrl);
              if (displayNameField) {
                setFilesDisplay(prev => ({
                  ...prev,
                  [displayNameField]: `✓ ${file.name}`
                }));
              }
            } catch (uploadErr) {
              showError(`Vercel Blob upload failed: ${uploadErr.message}`);
              if (displayNameField) {
                setFilesDisplay(prev => ({
                  ...prev,
                  [displayNameField]: 'Upload failed'
                }));
              }
            }
          } else {
            callback(compressedBase64);
            if (displayNameField) {
              setFilesDisplay(prev => ({
                ...prev,
                [displayNameField]: file.name
              }));
            }
          }
        })
        .catch((err) => {
          showError(`Failed to compress image "${file.name}": ${err.message}`);
          if (displayNameField) {
            setFilesDisplay(prev => ({
              ...prev,
              [displayNameField]: 'Compression failed'
            }));
          }
        });
    } else {
      // Audio soundtrack upload
      if (isProduction && hasBlob) {
        uploadToVercelBlob(file, file.name, blobToken)
          .then((vercelBlobUrl) => {
            callback(vercelBlobUrl);
            if (displayNameField) {
              setFilesDisplay(prev => ({
                ...prev,
                [displayNameField]: `✓ ${file.name}`
              }));
            }
          })
          .catch((uploadErr) => {
            showError(`Vercel Blob soundtrack upload failed: ${uploadErr.message}`);
            if (displayNameField) {
              setFilesDisplay(prev => ({
                ...prev,
                [displayNameField]: 'Upload failed'
              }));
            }
          });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          callback(e.target.result);
          if (displayNameField) {
            setFilesDisplay(prev => ({
              ...prev,
              [displayNameField]: file.name
            }));
          }
        };
        reader.onerror = () => {
          showError(`Failed to parse file "${file.name}"`);
          if (displayNameField) {
            setFilesDisplay(prev => ({
              ...prev,
              [displayNameField]: 'Failed'
            }));
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleProfileFieldChange = (index, field, value) => {
    const updated = [...profiles];
    updated[index][field] = value;
    setProfiles(updated);
  };

  const handleTagAction = (profileIndex, type, action, tagIndexOrValue) => {
    const updated = [...profiles];
    if (type === 'pros') {
      if (action === 'add' && tagIndexOrValue.trim()) {
        updated[profileIndex].pros.push(tagIndexOrValue.trim());
      } else if (action === 'remove') {
        updated[profileIndex].pros.splice(tagIndexOrValue, 1);
      }
    } else if (type === 'cons') {
      if (action === 'add' && tagIndexOrValue.trim()) {
        updated[profileIndex].cons.push(tagIndexOrValue.trim());
      } else if (action === 'remove') {
        updated[profileIndex].cons.splice(tagIndexOrValue, 1);
      }
    }
    setProfiles(updated);
  };

  const addProfileBlock = () => {
    if (profiles.length >= 5) {
      showError('You can configure up to 5 profiles maximum.');
      return;
    }
    setProfiles([
      ...profiles,
      {
        id: `profile_${Date.now()}`,
        name: '',
        age: 21,
        verified: true,
        distance: '0.5 km away',
        subDistance: 'Newly added persona',
        photoUrl: '',
        bio: '',
        pros: ['Great chemistry check'],
        cons: ['Lazy swiper'],
        badgeText: 'New Challenger',
        rejectionText: 'Are you sure you want to pass on this?'
      }
    ]);
  };

  const removeProfileBlock = (index) => {
    if (profiles.length <= 1) {
      showError('You must configure at least 1 profile card.');
      return;
    }
    setProfiles(profiles.filter((_, i) => i !== index));
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!creatorName || !partnerName) {
      showError('Creator Name and Partner Name are required.');
      return;
    }

    // Verify profiles contain names and photos
    for (let i = 0; i < profiles.length; i++) {
      if (!profiles[i].name) {
        showError(`Profile Card #${i + 1} is missing a Name.`);
        return;
      }
      if (!profiles[i].photoUrl) {
        showError(`Profile Card #${i + 1} ("${profiles[i].name}") is missing a Photo upload.`);
        return;
      }
    }

    setIsUpdating(true);
    try {
      const updatePayload = {
        creatorName,
        partnerName,
        partnerImgUrl: rithuImg,
        exhaustedImgUrl: adiImg,
        rejectionImgUrl: rejectedImg,
        audioUrl,
        whatsappNumber: whatsappNumber.trim(),
        finalNote: finalNote.trim(),
        profiles
      };

      await CampaignService.updateCampaign(currentSlug, updatePayload);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);

    } catch (err) {
      console.error(err);
      showError('An error occurred during update. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  // 1. Loading Campaign State
  if (loadingCampaign) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-slate-950/40 backdrop-blur rounded-3xl border border-slate-800">
        <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Verifying registry codes...</span>
      </div>
    );
  }

  // 2. Error Campaign State
  if (campaignError) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-[#0f172a]/80 backdrop-blur rounded-3xl border border-slate-800 max-w-md mx-auto">
        <span className="text-4xl mb-3">💔</span>
        <h2 className="text-lg font-black text-rose-500 uppercase tracking-wide">Campaign Registry Error</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">{campaignError}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-5 px-5 py-2.5 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold uppercase hover:bg-slate-700 transition-colors"
        >
          Create New Campaign
        </button>
      </div>
    );
  }

  // 3. Campaign EXPIRED 24h State Gating
  if (isExpired) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center text-center p-6 bg-[#0f172a]/95 backdrop-blur-xl rounded-3xl border border-slate-800/80 max-w-md mx-auto text-slate-100 space-y-4 shadow-2xl">
        <div className="w-14 h-14 bg-rose-500/20 rounded-full flex items-center justify-center border-2 border-rose-500/30 animate-pulse text-rose-400">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-black text-rose-500 uppercase tracking-wider leading-none">
          Customization Dashboard Frozen
        </h2>
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
          Token Lifetime: Expired (24 hours elapsed)
        </p>

        <div className="bg-rose-950/20 border border-rose-500/20 rounded-2xl p-4 text-left text-xs text-slate-300 leading-relaxed shadow-inner">
          <span className="font-bold text-rose-400 block mb-1 uppercase text-[10px] tracking-wider">Security Access Dropped</span>
          All edit privileges for the slug <strong>"/match/{currentSlug}"</strong> locked automatically exactly 24 hours after links creation. Custom uploads have been purged from storage to optimize platform resources.
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          Create New Campaign Dashboard
        </button>
      </div>
    );
  }

  // 4. UNLOCKED Dashboard View
  if (isEditUnlocked) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto px-1 py-4 w-full">
        {/* Floating alerts */}
        {errorAlert && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-rose-950 border border-rose-500/60 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm w-11/12 animate-slide-down">
            <span className="text-xs font-semibold leading-snug">{errorAlert}</span>
          </div>
        )}

        {showSuccessToast && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-950 border border-emerald-500/60 text-emerald-200 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm w-11/12 animate-slide-down">
            <svg className="w-5 h-5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs font-bold leading-normal">
              Campaign settings updated! Changes are live immediately at the matching link.
            </div>
          </div>
        )}

        <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl text-left">
          
          {/* Header */}
          <div className="mb-6 flex justify-between items-center border-b border-slate-800/80 pb-4">
            <div>
              <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider block">
                Creator Customs / Editing
              </span>
              <h1 className="text-lg md:text-xl font-black text-slate-100 tracking-wide">
                Edit live slug: /match/{currentSlug}
              </h1>
            </div>
            <button
              onClick={() => navigate(`/match/${currentSlug}`)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200 text-[10px] font-bold tracking-wider uppercase transition-colors cursor-pointer"
            >
              Launch Match View
            </button>
          </div>

          <form onSubmit={handleUpdateSubmit} className="space-y-6">
            
            {/* Step 1: Base Details */}
            <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl space-y-4">
              <span className="block text-[10px] font-black uppercase text-pink-400 tracking-widest">
                Configure Core Details
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Creator Name</label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Partner Target Name</label>
                  <input
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">WhatsApp Contact Number</label>
                  <input
                    type="text"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custom Match Love Note</label>
                  <textarea
                    rows="2"
                    required
                    value={finalNote}
                    onChange={(e) => setFinalNote(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 h-[64px] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Global Assets Uploads */}
            <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl space-y-4">
              <span className="block text-[10px] font-black uppercase text-purple-400 tracking-widest">
                Edit Core Media Assets
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Partner's Image (The Receiver)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileRead(e.target.files[0], 'image', setRithuImg, 'partnerAvatar')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-1 text-[10px] text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Your Image (The Sender)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileRead(e.target.files[0], 'image', setAdiImg, 'exhaustedImg')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-1 text-[10px] text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rejection Screen Illustration</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileRead(e.target.files[0], 'image', setRejectedImg, 'rejectionImg')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-1 text-[10px] text-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Background Soundtrack (Optional)</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileRead(e.target.files[0], 'audio', setAudioUrl, 'soundtrack')}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-1 text-[10px] text-slate-300"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Profiles stacking loops */}
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Dynamic cards manager ({profiles.length}/5)</span>
                <button
                  type="button"
                  onClick={addProfileBlock}
                  className="px-2.5 py-1 rounded bg-pink-950 border border-pink-800 text-pink-400 text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  + Add Card
                </button>
              </div>

              <div className="space-y-6 max-h-[300px] overflow-y-auto pr-1">
                {profiles.map((p, index) => (
                  <ProfileEditCard
                    key={p.id || index}
                    profile={p}
                    index={index}
                    handleProfileFieldChange={handleProfileFieldChange}
                    handleTagAction={handleTagAction}
                    removeProfileBlock={removeProfileBlock}
                    handleFileRead={handleFileRead}
                  />
                ))}
              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => navigate(`/match/${currentSlug}`)}
                className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancel Changes
              </button>
              
              <button
                type="submit"
                disabled={isUpdating}
                className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md active:scale-97 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isUpdating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Updating Firestore...
                  </>
                ) : (
                  '💾 Save configurations'
                )}
              </button>
            </div>

          </form>

        </div>
      </div>
    );
  }

  // 5. LOCKED / CREDENTIALS Gate View
  return (
    <div className="flex-1 flex flex-col justify-center items-center px-1 py-4 w-full">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-6 relative text-left">
        
        {/* Crown logo / Locked icon */}
        <div className="w-14 h-14 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto border-4 border-slate-900 shadow-xl text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
            Dashboard Editor Gate
          </h2>
          <p className="text-xs text-slate-400 font-medium max-w-xs mx-auto">
            Input the registered email address of the creator of this slug to unlock.
          </p>
        </div>

        {authError && (
          <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-300 font-semibold text-center leading-snug">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Creator Email Credentials
            </label>
            <input
              type="email"
              required
              placeholder="e.g. your-email@domain.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-97 cursor-pointer"
          >
            Unlock Customizer
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            onClick={() => navigate(`/match/${currentSlug}`)}
            className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors uppercase font-bold"
          >
            ← Back to Swipe Screen
          </button>
        </div>

      </div>
    </div>
  );
}

function ProfileEditCard({
  profile,
  index,
  handleProfileFieldChange,
  handleTagAction,
  removeProfileBlock,
  handleFileRead
}) {
  const [proInput, setProInput] = useState('');
  const [conInput, setConInput] = useState('');

  return (
    <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 space-y-4">
      
      <div className="flex justify-between items-center border-b border-slate-900/60 pb-2">
        <span className="text-[9px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded uppercase">Card #{index + 1}</span>
        <button type="button" onClick={() => removeProfileBlock(index)} className="text-slate-500 hover:text-rose-400 text-[9px] uppercase font-bold">✕ Remove</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Name</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => handleProfileFieldChange(index, 'name', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Age</label>
          <input
            type="number"
            value={profile.age}
            onChange={(e) => handleProfileFieldChange(index, 'age', parseInt(e.target.value) || 21)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200"
          />
        </div>
        <div className="flex items-center justify-start sm:justify-center pt-3">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={profile.verified}
              onChange={(e) => handleProfileFieldChange(index, 'verified', e.target.checked)}
              className="rounded border-slate-800 text-pink-500 bg-slate-950"
            />
            <span className="text-[9px] font-bold text-slate-400 uppercase">Verified Blue Badge</span>
          </label>
        </div>
      </div>

      {/* Image and Bio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1 border border-dashed border-slate-800 rounded-xl p-1 bg-slate-950 flex flex-col justify-center items-center text-center cursor-pointer relative h-[80px] overflow-hidden">
          {profile.photoUrl ? (
            <>
              <img src={profile.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => handleProfileFieldChange(index, 'photoUrl', '')}
                className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold opacity-0 hover:opacity-100 flex items-center justify-center rounded-lg"
              >
                Replace
              </button>
            </>
          ) : (
            <>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleFileRead(file, 'image', (base64) => handleProfileFieldChange(index, 'photoUrl', base64), '');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <span className="text-[9px] text-pink-400 font-bold">Upload Photo</span>
            </>
          )}
        </div>
        
        <div className="sm:col-span-2">
          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Card Bio</label>
          <textarea
            rows="2"
            value={profile.bio}
            onChange={(e) => handleProfileFieldChange(index, 'bio', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 resize-none h-[80px]"
          />
        </div>
      </div>

      {/* Pros and Cons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[9px] font-bold text-emerald-400 uppercase mb-1">Pros</label>
          <div className="flex gap-1">
            <input
              type="text"
              value={proInput}
              onChange={(e) => setProInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px]"
              placeholder="Add pro..."
            />
            <button
              type="button"
              onClick={() => { handleTagAction(index, 'pros', 'add', proInput); setProInput(''); }}
              className="px-2 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded text-xs font-bold"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {profile.pros?.map((tag, tIdx) => (
              <span key={tIdx} className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>{tag}</span>
                <button type="button" onClick={() => handleTagAction(index, 'pros', 'remove', tIdx)} className="text-slate-500 hover:text-rose-400">✕</button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[9px] font-bold text-rose-400 uppercase mb-1">Cons</label>
          <div className="flex gap-1">
            <input
              type="text"
              value={conInput}
              onChange={(e) => setConInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[10px]"
              placeholder="Add con..."
            />
            <button
              type="button"
              onClick={() => { handleTagAction(index, 'cons', 'add', conInput); setConInput(''); }}
              className="px-2 bg-rose-950 border border-rose-800 text-rose-400 rounded text-xs font-bold"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {profile.cons?.map((tag, tIdx) => (
              <span key={tIdx} className="text-[8px] bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span>{tag}</span>
                <button type="button" onClick={() => handleTagAction(index, 'cons', 'remove', tIdx)} className="text-slate-500 hover:text-rose-400">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

function compressImage(file, maxDimension = 800, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

async function uploadToVercelBlob(blob, filename, token) {
  const cleanName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const response = await fetch(`https://blob.vercel-storage.com/${cleanName}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-version': '1',
      'content-type': blob.type
    },
    body: blob
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vercel Blob PUT error: ${errorText}`);
  }

  const data = await response.json();
  return data.url;
}


