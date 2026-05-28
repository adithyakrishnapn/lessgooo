import React, { createContext, useState, useEffect, useContext } from 'react';
import { CampaignService } from '../firebase';

const CampaignContext = createContext();

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
};

export const CampaignProvider = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState('creator'); // 'creator' | 'match' | 'edit' | 'admin'
  const [currentSlug, setCurrentSlug] = useState(null);
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [loadingCampaign, setLoadingCampaign] = useState(false);
  const [campaignError, setCampaignError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isEditUnlocked, setIsEditUnlocked] = useState(false);

  // Parse path client-side
  const parsePath = () => {
    const path = window.location.pathname;
    
    if (path === '/super-admin-lessgoooo') {
      setCurrentRoute('admin');
      setCurrentSlug(null);
      return;
    }

    const matchMatches = path.match(/^\/match\/([^/]+)(?:\/(edit))?$/);
    if (matchMatches) {
      const slug = matchMatches[1].trim().toLowerCase();
      const isEditMode = matchMatches[2] === 'edit';
      setCurrentRoute(isEditMode ? 'edit' : 'match');
      setCurrentSlug(slug);
      return;
    }

    // Default to creator dashboard
    setCurrentRoute('creator');
    setCurrentSlug(null);
  };

  // Listen to browser navigation changes (popstate)
  useEffect(() => {
    parsePath();
    const handlePopState = () => parsePath();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Navigate function client-side
  const navigate = (path) => {
    window.history.pushState({}, '', path);
    parsePath();
  };

  // Fetch campaign when slug changes or when loading is required
  useEffect(() => {
    if (!currentSlug) {
      setActiveCampaign(null);
      setIsExpired(false);
      setCampaignError(null);
      setIsEditUnlocked(false);
      return;
    }

    const fetchCampaign = async () => {
      setLoadingCampaign(true);
      setCampaignError(null);
      setIsExpired(false);

      try {
        const campaign = await CampaignService.getCampaign(currentSlug);
        if (!campaign) {
          setCampaignError('Campaign not found in registry');
          setActiveCampaign(null);
          setLoadingCampaign(false);
          return;
        }

        // Time calculations for strictly 24-hour expiration window
        const timeDiff = Date.now() - campaign.createdAt;
        const expired = !campaign.isActive || timeDiff >= 24 * 60 * 60 * 1000;

        setIsExpired(expired);
        setActiveCampaign(campaign);

        // Record a visit dynamically (only for match mode and non-expired campaigns)
        if (currentRoute === 'match' && !expired) {
          const deviceType = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
          const visitorRecord = {
            time: Date.now(),
            device: `${deviceType} (${navigator.appName || 'Browser'})`,
            isMatch: false
          };

          const updatedAnalytics = {
            ...campaign.analytics,
            totalViews: (campaign.analytics?.totalViews || 0) + 1,
            visitors: [...(campaign.analytics?.visitors || []), visitorRecord]
          };

          await CampaignService.updateCampaign(currentSlug, {
            analytics: updatedAnalytics
          });

          // Update local state to show current views count
          setActiveCampaign(prev => ({
            ...prev,
            analytics: updatedAnalytics
          }));
        }

      } catch (err) {
        console.error("Failed to load campaign:", err);
        setCampaignError('Network error loading campaign');
      } finally {
        setLoadingCampaign(false);
      }
    };

    fetchCampaign();
  }, [currentSlug, currentRoute]);

  /**
   * Analytics logger for swipes
   */
  const logSwipe = async (direction) => {
    if (!activeCampaign || !currentSlug || isExpired) return;

    try {
      const field = direction === 'left' ? 'swipesLeft' : 'swipesRight';
      const currentVal = activeCampaign.analytics?.[field] || 0;

      const updatedAnalytics = {
        ...activeCampaign.analytics,
        [field]: currentVal + 1
      };

      // If it is a swipe right (Match), tag the last visitor entry as a successful Match
      if (direction === 'right') {
        const visitors = [...(activeCampaign.analytics?.visitors || [])];
        if (visitors.length > 0) {
          visitors[visitors.length - 1].isMatch = true;
        }
        updatedAnalytics.visitors = visitors;
      }

      await CampaignService.updateCampaign(currentSlug, {
        analytics: updatedAnalytics
      });

      setActiveCampaign(prev => ({
        ...prev,
        analytics: updatedAnalytics
      }));

    } catch (err) {
      console.error("Swipe logging error:", err);
    }
  };

  /**
   * Self-Editing access unlocked by Email Validation
   */
  const unlockEditMode = (email) => {
    if (!activeCampaign) return false;
    const matchesEmail = activeCampaign.creatorEmail.trim().toLowerCase() === email.trim().toLowerCase();
    if (matchesEmail) {
      setIsEditUnlocked(true);
      return true;
    }
    return false;
  };

  return (
    <CampaignContext.Provider
      value={{
        currentRoute,
        currentSlug,
        activeCampaign,
        loadingCampaign,
        campaignError,
        isExpired,
        isEditUnlocked,
        setIsEditUnlocked,
        unlockEditMode,
        logSwipe,
        navigate,
        CampaignService
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};
