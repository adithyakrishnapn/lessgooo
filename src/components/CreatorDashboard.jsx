import React, { useState, useEffect } from 'react';
import { useCampaign } from '../context/CampaignContext';

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB
const MAX_AUDIO_SIZE_BYTES = 3 * 1024 * 1024; // 3 MB

export default function CreatorDashboard() {
  const { navigate, CampaignService } = useCampaign();

  // Multi-step state: 1 (Metadata) | 2 (Global Assets) | 3 (Profiles Builder)
  const [step, setStep] = useState(1);

  // Form Fields State
  const [creatorName, setCreatorName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [slug, setSlug] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [finalNote, setFinalNote] = useState(
    "Yeah, I know it's not happening, but this little heart thought of making you smile with this. You should know that this genuine heart is setting your standards so high that you shouldn't go for anything lower. I will make you the main character... with a whole heart, a simple nerd."
  );

  // Slug checking state
  const [isSlugChecking, setIsSlugChecking] = useState(false);
  const [slugStatus, setSlugStatus] = useState(null); // 'available' | 'taken' | 'invalid'

  // Global Assets (Base64)
  const [rithuImg, setRithuImg] = useState(''); // Partner Avatar (Cleopatra profile icon)
  const [adiImg, setAdiImg] = useState(''); // Database Exhausted Image (Adi profile icon)
  const [rejectedImg, setRejectedImg] = useState(''); // Rejection Screen Illustration
  const [audioUrl, setAudioUrl] = useState(''); // Background Soundtrack
  
  // File names for display
  const [filesDisplay, setFilesDisplay] = useState({
    partnerAvatar: '',
    exhaustedImg: '',
    rejectionImg: '',
    soundtrack: ''
  });

  // Dynamic profiles list state (up to 5 profiles)
  const [profiles, setProfiles] = useState([
    {
      id: 'profile_1',
      name: '',
      age: 21,
      verified: true,
      distance: '0.1 km away',
      subDistance: 'Active matches nearby',
      photoUrl: '',
      bio: '',
      pros: ['Great listener', 'Ambitious coder'],
      cons: ['Addicted to bubble tea'],
      badgeText: 'Top Candidate',
      rejectionText: 'Are you sure? High compatibility check warning.'
    }
  ]);

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [finalLink, setFinalLink] = useState('');

  // Error Alert State
  const [errorAlert, setErrorAlert] = useState(null);

  const showError = (msg) => {
    setErrorAlert(msg);
    setTimeout(() => setErrorAlert(null), 5000);
  };

  // Real-time Slug checker
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const sanitized = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (slug !== sanitized) {
        setSlug(sanitized);
      }
      
      if (!sanitized) {
        setSlugStatus(null);
        return;
      }

      if (sanitized === 'super-admin-lessgoooo' || sanitized === 'match') {
        setSlugStatus('taken');
        return;
      }

      setIsSlugChecking(true);
      try {
        const available = await CampaignService.checkSlugAvailability(sanitized);
        setSlugStatus(available ? 'available' : 'taken');
      } catch (err) {
        setSlugStatus('invalid');
      } finally {
        setIsSlugChecking(false);
      }
    }, 450);

    return () => clearTimeout(delayDebounce);
  }, [slug]);

  // Convert File to Base64 Stream helper
  const handleFileRead = (file, type, callback, displayNameField) => {
    if (!file) return;

    // Strict Client-side Validations
    if (type === 'image' && file.size > MAX_IMAGE_SIZE_BYTES) {
      showError(`"${file.name}" rejected. Image files must be strictly under 500KB.`);
      return;
    }
    if (type === 'audio' && file.size > MAX_AUDIO_SIZE_BYTES) {
      showError(`"${file.name}" rejected. Soundtrack audio file must be strictly under 3MB.`);
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

  // Profile fields updating handler
  const handleProfileFieldChange = (index, field, value) => {
    const updated = [...profiles];
    updated[index][field] = value;
    setProfiles(updated);
  };

  // Profile nested array updates (Pros/Cons tags manager)
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

  // Add a Profile block (up to 5 cards)
  const addProfileBlock = () => {
    if (profiles.length >= 5) {
      showError('You can customize up to 5 profiles maximum.');
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
        subDistance: 'High alignment rate',
        photoUrl: '',
        bio: '',
        pros: ['Very affectionate'],
        cons: ['Fails to text back instantly'],
        badgeText: 'New Challenger',
        rejectionText: 'Are you sure you want to pass on this?'
      }
    ]);
  };

  // Remove a Profile block
  const removeProfileBlock = (index) => {
    if (profiles.length <= 1) {
      showError('You must configure at least 1 profile in the matching stack.');
      return;
    }
    const updated = profiles.filter((_, i) => i !== index);
    setProfiles(updated);
  };

  // Submitting campaign configs
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!creatorName || !creatorEmail || !partnerName || !slug) {
      showError('Please configure all essential metadata in Step 1 first.');
      setStep(1);
      return;
    }

    if (slugStatus !== 'available') {
      showError('Please choose a slug that is free and available.');
      setStep(1);
      return;
    }

    // Enforce strictly required image uploads (No fallback placeholders!)
    if (!rithuImg) {
      showError("Please upload the Partner's Image (The Receiver of this webpage) in Step 2.");
      setStep(2);
      return;
    }
    if (!adiImg) {
      showError("Please upload Your Image (The Sender of this match game) in Step 2.");
      setStep(2);
      return;
    }
    if (!rejectedImg) {
      showError("Please upload the Rejection Screen Illustration in Step 2.");
      setStep(2);
      return;
    }

    // Verify profile images are uploaded
    for (let i = 0; i < profiles.length; i++) {
      if (!profiles[i].name) {
        showError(`Profile #${i + 1} is missing a Name card input.`);
        setStep(3);
        return;
      }
      if (!profiles[i].photoUrl) {
        showError(`Profile #${i + 1} ("${profiles[i].name || 'Unnamed'}") requires a photo upload.`);
        setStep(3);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Setup default assets fallback if blanks
      const campaignPayload = {
        creatorName,
        creatorEmail: creatorEmail.trim().toLowerCase(),
        partnerName,
        partnerImgUrl: rithuImg,
        exhaustedImgUrl: adiImg,
        rejectionImgUrl: rejectedImg,
        audioUrl: audioUrl || '/karthave.mp3',
        whatsappNumber: whatsappNumber.trim(),
        finalNote: finalNote.trim(),
        profiles: profiles.map((p, idx) => ({
          ...p,
          id: p.id || `profile_${idx}`
        }))
      };

      await CampaignService.createCampaign(slug, campaignPayload);

      // Generate shareable link
      const origin = window.location.origin;
      const matchLink = `${origin}/match/${slug}`;
      setFinalLink(matchLink);
      setShowSuccessModal(true);

    } catch (err) {
      console.error(err);
      showError('An error occurred while creating your match campaign. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center overflow-y-auto px-1 py-4 w-full">
      {/* Floating Error Alert */}
      {errorAlert && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-rose-950 border border-rose-500/60 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 max-w-sm w-11/12 animate-slide-down">
          <svg className="w-5 h-5 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs font-semibold leading-snug">{errorAlert}</span>
        </div>
      )}

      {/* Main Glassmorphism Form container */}
      <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 md:p-7 shadow-2xl relative text-left">
        
        {/* Header Title */}
        <div className="mb-6 flex justify-between items-center border-b border-slate-800/80 pb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 bg-clip-text text-transparent tracking-wide">
              lessgoooo SaaS Panel
            </h1>
            <p className="text-[10px] md:text-xs text-slate-400 font-medium">
              Generate fully customized dating swiper profiles without an account setup
            </p>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-950/20 text-purple-400">
            {CampaignService.isMock ? '⚡ Mock sandbox' : '🔥 Firestore Active'}
          </span>
        </div>

        {/* Step Steps Nav indicator */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <button
            onClick={() => setStep(1)}
            className={`py-2 px-1 text-center border-b-2 font-bold text-[10px] md:text-xs tracking-wider uppercase transition-colors ${
              step === 1 ? 'border-pink-500 text-pink-400' : 'border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
          >
            1. Metadata
          </button>
          <button
            onClick={() => creatorName && creatorEmail && partnerName && slug && setStep(2)}
            disabled={!creatorName || !creatorEmail || !partnerName || !slug}
            className={`py-2 px-1 text-center border-b-2 font-bold text-[10px] md:text-xs tracking-wider uppercase transition-colors ${
              step === 2 ? 'border-pink-500 text-pink-400' : 'border-slate-800 text-slate-500 disabled:opacity-40'
            }`}
          >
            2. Core Assets
          </button>
          <button
            onClick={() => creatorName && creatorEmail && partnerName && slug && setStep(3)}
            disabled={!creatorName || !creatorEmail || !partnerName || !slug}
            className={`py-2 px-1 text-center border-b-2 font-bold text-[10px] md:text-xs tracking-wider uppercase transition-colors ${
              step === 3 ? 'border-pink-500 text-pink-400' : 'border-slate-800 text-slate-500 disabled:opacity-40'
            }`}
          >
            3. Dynamic Cards
          </button>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
          {/* STEP 1: CAMPAIGN PROFILE METADATA */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Creator Details */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 space-y-3.5">
                  <span className="block text-[10px] font-black uppercase text-pink-400 tracking-widest">
                    Creator Profile Info
                  </span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Creator Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aarav"
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Creator Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. creator@domain.com"
                      value={creatorEmail}
                      onChange={(e) => setCreatorEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-pink-500 transition-colors"
                    />
                    <span className="block text-[9px] text-slate-500 mt-1">
                      🔑 Used as credentials to edit settings within the 24h window
                    </span>
                  </div>
                </div>

                {/* Target Partner Details */}
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 space-y-3.5">
                  <span className="block text-[10px] font-black uppercase text-purple-400 tracking-widest">
                    Target Partner Info
                  </span>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Target Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Slug Generator */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 space-y-2">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Choose Custom Slug / Share Path
                </label>
                <div className="flex rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                  <span className="bg-slate-900 border-r border-slate-800 text-[10px] md:text-xs text-slate-500 px-3 flex items-center">
                    lessgoooo.vercel.app/match/
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="custom-slug-here"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="flex-1 bg-transparent px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                  {isSlugChecking && (
                    <span className="text-[10px] text-slate-500 px-3 flex items-center">
                      Checking...
                    </span>
                  )}
                </div>
                
                {/* Real-time feedback alerts */}
                {slug && slugStatus === 'available' && (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    ✓ Link slug available: lessgoooo.vercel.app/match/{slug}
                  </span>
                )}
                {slug && slugStatus === 'taken' && (
                  <span className="text-[10px] text-rose-400 flex items-center gap-1 font-bold">
                    ✗ Link slug is already claimed. Choose another one.
                  </span>
                )}
              </div>

              {/* Customizable Vibe Note & Contact Block */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 space-y-3.5">
                <span className="block text-[10px] font-black uppercase text-amber-400 tracking-widest">
                  Custom Match Settings
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      WhatsApp Contact Number (Slide into DMs)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 919876543210"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value.replace(/[^0-9]/g, ''))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors"
                    />
                    <span className="block text-[9px] text-slate-500 mt-1">
                      Include country code without + (e.g. 91 for India)
                    </span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Custom Match Love Note
                    </label>
                    <textarea
                      rows="3"
                      required
                      placeholder="Write your custom heartfelt note..."
                      value={finalNote}
                      onChange={(e) => setFinalNote(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 transition-colors h-[72px] resize-none"
                    />
                    <span className="block text-[9px] text-slate-500 mt-0.5">
                      Displays at the Match Screen overlay
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  disabled={!creatorName || !creatorEmail || !partnerName || slugStatus !== 'available'}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md active:scale-97 disabled:opacity-40 transition-transform cursor-pointer"
                >
                  Continue to Core Assets →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CORE BASE ASSET UPLOAD */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-purple-950/15 border border-purple-500/20 rounded-2xl p-4 text-xs text-purple-300 mb-2 leading-relaxed">
                📢 Custom uploaded media items expire automatically in 24 hours. Default assets are pre-loaded if you skip uploading.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Partner Avatar */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-2">
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    1. Partner's Image (The Receiver going to view this webpage)
                  </span>
                  <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 bg-slate-950/80 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileRead(e.target.files[0], 'image', setRithuImg, 'partnerAvatar')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <svg className="w-6 h-6 text-slate-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {filesDisplay.partnerAvatar || 'Choose file or Drag & Drop'}
                    </span>
                    <span className="text-[8px] text-slate-600 mt-0.5">Strictly image &lt; 500KB</span>
                  </div>
                </div>

                {/* 2. Exhausted Screen image */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-2">
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    2. Your Image (The Sender of this match game)
                  </span>
                  <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 bg-slate-950/80 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileRead(e.target.files[0], 'image', setAdiImg, 'exhaustedImg')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <svg className="w-6 h-6 text-slate-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {filesDisplay.exhaustedImg || 'Choose file or Drag & Drop'}
                    </span>
                    <span className="text-[8px] text-slate-600 mt-0.5">Strictly image &lt; 500KB</span>
                  </div>
                </div>

                {/* 3. Rejection Screen */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-2">
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    3. Rejection Screen Illustration
                  </span>
                  <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 bg-slate-950/80 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileRead(e.target.files[0], 'image', setRejectedImg, 'rejectionImg')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <svg className="w-6 h-6 text-slate-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {filesDisplay.rejectionImg || 'Choose file or Drag & Drop'}
                    </span>
                    <span className="text-[8px] text-slate-600 mt-0.5">Strictly image &lt; 500KB</span>
                  </div>
                </div>

                {/* 4. Background Soundtrack */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/80 rounded-2xl space-y-2">
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    4. Background Soundtrack (Optional)
                  </span>
                  <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-3 bg-slate-950/80 flex flex-col items-center justify-center text-center cursor-pointer transition-colors relative">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => handleFileRead(e.target.files[0], 'audio', setAudioUrl, 'soundtrack')}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <svg className="w-6 h-6 text-slate-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {filesDisplay.soundtrack || 'Choose soundtrack or Drag & Drop'}
                    </span>
                    <span className="text-[8px] text-slate-600 mt-0.5">Strictly audio MP3 &lt; 3MB</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  ← Back to Step 1
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md active:scale-97 transition-transform cursor-pointer"
                >
                  Continue to Cards →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DYNAMIC PROFILES LIST CONFIGURATOR */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
                <div>
                  <span className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Dynamic Swiper Cards ({profiles.length}/5)
                  </span>
                  <span className="text-[9px] text-slate-500 leading-tight block mt-0.5">
                    Customize your persona cards that your partner will swipe left/right on.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addProfileBlock}
                  disabled={profiles.length >= 5}
                  className="px-3 py-1.5 rounded-lg border border-pink-500/30 hover:border-pink-500/60 bg-pink-950/20 text-pink-400 text-[10px] font-bold tracking-wider uppercase transition-colors disabled:opacity-40 cursor-pointer"
                >
                  + Add Card
                </button>
              </div>

              {/* Looping Profile Card Row Manager */}
              <div className="space-y-6 max-h-[350px] overflow-y-auto pr-1">
                {profiles.map((p, index) => (
                  <ProfileConfigCard
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

              {/* Actions row */}
              <div className="flex justify-between pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold uppercase tracking-wider transition-colors"
                >
                  ← Back to Assets
                </button>
                <button
                  type="button"
                  onClick={handleFormSubmit}
                  disabled={isSubmitting}
                  className="px-7 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 text-white shadow-xl hover:shadow-pink-500/20 active:scale-97 disabled:opacity-50 transition-all flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Streaming to storage...
                    </>
                  ) : (
                    '🚀 Generate dating experience'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* FLASHY SUCCESS MODAL POPUP */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-center space-y-5 animate-scale-up">
            
            {/* Crown / Sparkle badge */}
            <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-500 rounded-full flex items-center justify-center mx-auto border-4 border-slate-900 shadow-xl animate-bounce">
              <span className="text-2xl text-slate-900">👑</span>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500 uppercase tracking-wide">
                Experience Created!
              </h2>
              <p className="text-slate-400 text-xs font-semibold">
                Your custom matching site is fully deployed and active.
              </p>
            </div>

            {/* Final Share Link viewport */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
              <span className="block text-[10px] font-black uppercase text-pink-400 tracking-wider">
                Shareable Link (Valid for 24 hours)
              </span>
              <div className="flex gap-1.5 items-center justify-between bg-slate-900 px-3 py-2 rounded-xl border border-slate-800">
                <input
                  type="text"
                  readOnly
                  value={finalLink}
                  className="flex-1 bg-transparent text-[11px] text-slate-200 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(finalLink);
                    alert('Copied to clipboard!');
                  }}
                  className="px-2 py-1 bg-slate-800 text-[10px] font-bold text-slate-300 rounded hover:bg-slate-700 transition-colors uppercase cursor-pointer"
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Registered Credentials warning block */}
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3.5 text-left text-[11px] text-purple-300 leading-normal space-y-1">
              <span className="font-bold block uppercase text-[10px] tracking-wider text-purple-400">
                ⚠️ Strict self-editing window
              </span>
              <p>
                As the original creator, you can re-access your customization dashboard to edit configurations during the next <strong>24 hours</strong> using your credentials:
              </p>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-800 mt-2 space-y-1 font-mono text-[10px] text-slate-300">
                <div>Email: <span className="text-pink-400">{creatorEmail}</span></div>
                <div>Slug: <span className="text-pink-400">{slug}</span></div>
                <div>Edit Link: <span className="text-purple-400">{finalLink}/edit</span></div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
                After exactly 24 hours, all custom images/audio will be purged from storage and editing controls will lock permanently.
              </p>
            </div>

            {/* Launch / Exit actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(`/match/${slug}`);
                }}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-transform active:scale-97 cursor-pointer"
              >
                Launch Experience
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  // Refresh creator state
                  setCreatorName('');
                  setCreatorEmail('');
                  setPartnerName('');
                  setSlug('');
                  setStep(1);
                  setProfiles([
                    {
                      id: 'profile_1',
                      name: '',
                      age: 21,
                      verified: true,
                      distance: '0.1 km away',
                      subDistance: 'Active matches nearby',
                      photoUrl: '',
                      bio: '',
                      pros: ['Great listener', 'Ambitious coder'],
                      cons: ['Addicted to bubble tea'],
                      badgeText: 'Top Candidate',
                      rejectionText: 'Are you sure? High compatibility check warning.'
                    }
                  ]);
                }}
                className="py-3 px-4 border border-slate-800 hover:border-slate-700 bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileConfigCard({
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
    <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-4 space-y-4 relative">
      {/* Close Index Tag */}
      <div className="flex justify-between items-center border-b border-slate-900/60 pb-2">
        <span className="text-[10px] bg-slate-800 text-slate-300 font-bold px-2.5 py-0.5 rounded-full uppercase">
          Card #{index + 1}
        </span>
        <button
          type="button"
          onClick={() => removeProfileBlock(index)}
          className="text-slate-500 hover:text-rose-400 text-[10px] font-bold uppercase transition-colors"
        >
          ✕ Remove Card
        </button>
      </div>

      {/* Line 1: Name, Age, Verified */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label>
          <input
            type="text"
            required
            placeholder="e.g. Comedian Adi"
            value={profile.name}
            onChange={(e) => handleProfileFieldChange(index, 'name', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Age</label>
          <input
            type="number"
            required
            placeholder="21"
            value={profile.age}
            onChange={(e) => handleProfileFieldChange(index, 'age', parseInt(e.target.value) || 21)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500"
          />
        </div>
        <div className="flex items-center justify-start sm:justify-center pt-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={profile.verified}
              onChange={(e) => handleProfileFieldChange(index, 'verified', e.target.checked)}
              className="rounded border-slate-800 text-pink-500 bg-slate-950 focus:ring-pink-500"
            />
            <span className="text-[10px] font-bold text-slate-400 uppercase">Verified Blue Badge</span>
          </label>
        </div>
      </div>

      {/* Line 2: Photo Upload, Distance details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Distance Text</label>
          <input
            type="text"
            placeholder="0.5 km away"
            value={profile.distance}
            onChange={(e) => handleProfileFieldChange(index, 'distance', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Sub-distance Status</label>
          <input
            type="text"
            placeholder="Highly compatible"
            value={profile.subDistance}
            onChange={(e) => handleProfileFieldChange(index, 'subDistance', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
          />
        </div>
      </div>

      {/* Image Upload and Bio */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Profile Image Drag Area */}
        <div className="sm:col-span-1 border border-dashed border-slate-800 rounded-xl p-2 bg-slate-950 flex flex-col justify-center items-center text-center cursor-pointer relative h-[100px] overflow-hidden">
          {profile.photoUrl ? (
            <>
              <img src={profile.photoUrl} alt="" className="w-full h-full object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => handleProfileFieldChange(index, 'photoUrl', '')}
                className="absolute inset-0 bg-black/60 text-white text-[9px] font-bold opacity-0 hover:opacity-100 flex items-center justify-center rounded-lg transition-opacity"
              >
                Replace Photo
              </button>
            </>
          ) : (
            <>
              <input
                type="file"
                accept="image/*"
                required
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleFileRead(file, 'image', (base64) => {
                      handleProfileFieldChange(index, 'photoUrl', base64);
                    }, '');
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <span className="text-[9px] text-pink-400 font-bold">Upload Photo</span>
              <span className="text-[7px] text-slate-600 mt-0.5">&lt; 500KB strictly</span>
            </>
          )}
        </div>

        {/* Bio Field */}
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Bio text</label>
          <textarea
            rows="4"
            placeholder="Write a funny bio for this persona..."
            value={profile.bio}
            onChange={(e) => handleProfileFieldChange(index, 'bio', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500 h-[100px] resize-none"
          />
        </div>
      </div>

      {/* Line 4: Pros and Cons Array tag builder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Pros */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-emerald-400 uppercase">Pros</label>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Add a pro..."
              value={proInput}
              onChange={(e) => setProInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px]"
            />
            <button
              type="button"
              onClick={() => {
                handleTagAction(index, 'pros', 'add', proInput);
                setProInput('');
              }}
              className="px-2 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-lg text-xs font-bold"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {profile.pros.map((tag, tIdx) => (
              <span key={tIdx} className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>{tag}</span>
                <button type="button" onClick={() => handleTagAction(index, 'pros', 'remove', tIdx)} className="text-slate-500 hover:text-rose-400">✕</button>
              </span>
            ))}
          </div>
        </div>

        {/* Cons */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-rose-400 uppercase">Cons</label>
          <div className="flex gap-1">
            <input
              type="text"
              placeholder="Add a con..."
              value={conInput}
              onChange={(e) => setConInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-[11px]"
            />
            <button
              type="button"
              onClick={() => {
                handleTagAction(index, 'cons', 'add', conInput);
                setConInput('');
              }}
              className="px-2 bg-rose-950 border border-rose-800 text-rose-400 rounded-lg text-xs font-bold"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {profile.cons.map((tag, tIdx) => (
              <span key={tIdx} className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span>{tag}</span>
                <button type="button" onClick={() => handleTagAction(index, 'cons', 'remove', tIdx)} className="text-slate-500 hover:text-rose-400">✕</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Line 5: Badges and Rejection modal texts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Comedic Badge Text (Pill badge)</label>
          <input
            type="text"
            placeholder="Warning: Stand-up Material"
            value={profile.badgeText}
            onChange={(e) => handleProfileFieldChange(index, 'badgeText', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Rejection Modal Warning Text</label>
          <input
            type="text"
            placeholder="You're about to pass on an extremely high-value candidate..."
            value={profile.rejectionText}
            onChange={(e) => handleProfileFieldChange(index, 'rejectionText', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200"
          />
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

