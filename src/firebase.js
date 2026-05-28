import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Environment variables loaded from Vite config
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID
};

// Check if Firebase keys are fully provided
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId
);

let db = null;
let app = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("🔥 lessgoooo initialized: Firebase Firestore & Auth integration active.");
  } catch (error) {
    console.error("⚠️ Failed to initialize Firebase SDK:", error);
  }
} else {
  console.warn(
    "⚡ lessgoooo sandbox mode: No Firebase credentials found in environment variables. " +
    "Running in high-fidelity LocalStorage adapter mode for zero-config testing."
  );
}

/**
 * Mock Firestore database layer using LocalStorage
 */
const MOCK_STORAGE_KEY = 'lessgoooo_campaigns';

const getMockCampaigns = () => {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

const saveMockCampaigns = (campaigns) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(campaigns));
};

// Seed original Cleopatra campaign as a default fallback if empty
const seedDefaultCampaign = () => {
  const campaigns = getMockCampaigns();
  if (Object.keys(campaigns).length === 0) {
    campaigns['cleopatra'] = {
      creatorName: "Aarav",
      creatorEmail: "aarav@lessgoooo.com",
      partnerName: "Priya",
      audioUrl: "/karthave.mp3",
      partnerImgUrl: "/rithu.jpeg",
      exhaustedImgUrl: "/adi.jpeg",
      rejectionImgUrl: "/rejected.png",
      createdAt: Date.now(),
      isActive: true,
      profiles: [
        {
          id: 'vlogger',
          name: 'Aarav Vlogs',
          age: 21,
          verified: true,
          distance: '0.5 km away',
          subDistance: 'Probably editing a video right outside',
          photoUrl: '/vlogger.jpeg',
          bio: 'Hey guys, welcome back to my channel! Today we are swiping right on high-value matches. Just a casual tech/lifestyle content creator looking for a co-star for my next viral reel.',
          pros: ['Will color-grade your photos', 'Cinematic 4K drone shots on our next date', 'Knows how to handle a camera'],
          cons: ['Will randomly pause our conversation to look into a camera lens that isn\'t there and say, "Don\'t forget to like and subscribe."'],
          badgeText: 'Danger: Viral Content Alert',
          rejectionText: 'Error 404: High-Value Match Missed. Are you sure you want to unsubscribe from this channel? Smash that Reconsider button!'
        },
        {
          id: 'romeo',
          name: 'Romeo Aarav',
          age: 21,
          verified: true,
          distance: '0.1 km away',
          subDistance: 'Status: Madly in love | Heart Rate: 140 bpm',
          photoUrl: '/romeo.jpeg',
          bio: 'Are you a magician? Because whenever I look at you, everyone else disappears. Looking for someone who can handle intense eye contact, romantic sunset walks, and endless flirting. My love language is writing cheesy poetry about your smile.',
          pros: ['Will write handwritten love letters', 'Knows how to cook your favorite food', 'Has a master\'s degree in compliments'],
          cons: ['Might stare at you for too long', 'Calls you "my queen" in public', 'Gets jealous of your phone when you look at it'],
          badgeText: 'Danger: Extremely Flirty',
          rejectionText: 'Romeo\'s heart has officially shattered into a million pieces. Are you sure you want to end this love story before it even begins?'
        },
        {
          id: 'comedian',
          name: 'Comedian Aarav',
          age: 22,
          verified: true,
          distance: '2.5 km away',
          subDistance: 'Giggles/min: 45 | Vibe: Stand-up Ready',
          photoUrl: '/comedian.jpeg',
          bio: 'Looking for a co-conspirator to laugh at my terrible puns. My ideal date is making fun of people at the mall or getting kicked out of a theater for laughing too loud. I can make you smile even when Mercury is in a mood.',
          pros: ['Infinite laugh guarantee', 'Can turn any boring situation into a meme'],
          cons: ['Will tell bad jokes during serious arguments', 'Might use our arguments as stand-up material'],
          badgeText: 'Warning: Stand-up Material',
          rejectionText: 'Is this a joke? Because I\'m not laughing! You sure you want to swipe left on a lifetime of free comedy?'
        },
        {
          id: 'ooola',
          name: 'Ooolaaa Aarav',
          age: 20,
          verified: false,
          distance: '0.0 km away',
          subDistance: 'IQ Level: 4 | Status: Confused',
          photoUrl: '/ooola.jpeg',
          bio: 'Ooolaaa! Brain cells: 2. One is sleeping, the other is eating pizza. I forgot why I opened this app, but you look very pretty. I am excellent at making mistakes, breathing, and looking confused in public. Let\'s do nothing together.',
          pros: ['Will agree with everything you say because he doesn\'t understand it anyway', 'Extremely low maintenance'],
          cons: ['Might get lost in a straight hallway', 'Will probably try to eat the phone screen', 'Forgets his own age'],
          badgeText: 'IQ Level: Single Digit',
          rejectionText: 'Ooolaaa is very confused... did you click the wrong button? Please click Reconsider before he tries to eat a crayon!'
        },
        {
          id: 'magician',
          name: 'Magician Aarav',
          age: 22,
          verified: true,
          distance: 'Hovering in mid-air',
          subDistance: 'Mana: 999 | Status: Spellcasting',
          photoUrl: '/magician.jpeg',
          bio: 'I can make your single status disappear. My hobbies include pulling rabbits out of hats, pretending to saw people in half, and casting spells to make you fall in love. Stare into my eyes and let me hypnotize your heart.',
          pros: ['Can magically make your bills disappear', 'Knows awesome card tricks'],
          cons: ['Might accidentally turn your pet into a pigeon', 'Refuses to explain his tricks', 'Lives in a cape'],
          badgeText: 'Spellcaster: Active',
          rejectionText: 'Alakazam! Your match has vanished! Stare at the crystal ball and click Reconsider to reverse the spell!'
        }
      ],
      analytics: {
        totalViews: 42,
        swipesLeft: 12,
        swipesRight: 30,
        visitors: [
          { time: Date.now() - 3600000, device: 'Mobile Chrome', isMatch: true },
          { time: Date.now() - 7200000, device: 'Desktop Firefox', isMatch: false }
        ]
      }
    };
    saveMockCampaigns(campaigns);
  }
};

// Seed fallback data immediately in mock mode
if (!isFirebaseConfigured) {
  seedDefaultCampaign();
}

/**
 * Global Campaign Service Adapter that coordinates database calls
 */
export const CampaignService = {
  isMock: !isFirebaseConfigured,

  /**
   * Fetch a single campaign document
   */
  async getCampaign(slug) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'campaigns', slug);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { slug, ...docSnap.data() };
        }
        return null;
      } catch (err) {
        console.error("Firestore get error:", err);
        return null;
      }
    } else {
      const campaigns = getMockCampaigns();
      return campaigns[slug] ? { slug, ...campaigns[slug] } : null;
    }
  },

  /**
   * Create a brand-new campaign document
   */
  async createCampaign(slug, data) {
    const campaignPayload = {
      ...data,
      createdAt: Date.now(),
      isActive: true,
      analytics: {
        totalViews: 0,
        swipesLeft: 0,
        swipesRight: 0,
        visitors: []
      }
    };

    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'campaigns', slug);
        await setDoc(docRef, campaignPayload);
        return true;
      } catch (err) {
        console.error("Firestore create error:", err);
        throw err;
      }
    } else {
      const campaigns = getMockCampaigns();
      campaigns[slug] = campaignPayload;
      saveMockCampaigns(campaigns);
      return true;
    }
  },

  /**
   * Update live configurations on an existing active campaign
   */
  async updateCampaign(slug, data) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'campaigns', slug);
        await updateDoc(docRef, data);
        return true;
      } catch (err) {
        console.error("Firestore update error:", err);
        throw err;
      }
    } else {
      const campaigns = getMockCampaigns();
      if (!campaigns[slug]) throw new Error("Campaign not found");
      campaigns[slug] = { ...campaigns[slug], ...data };
      saveMockCampaigns(campaigns);
      return true;
    }
  },

  /**
   * Check if a slug is currently free/unclaimed
   */
  async checkSlugAvailability(slug) {
    const normalized = slug.trim().toLowerCase();
    if (!normalized) return false;
    
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'campaigns', normalized);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) return true;
        
        const data = docSnap.data();
        const timeDiff = Date.now() - data.createdAt;
        const isExpiredOrInactive = !data.isActive || timeDiff >= 24 * 60 * 60 * 1000;
        return isExpiredOrInactive;
      } catch (err) {
        console.error("Firestore query error:", err);
        return false;
      }
    } else {
      const campaigns = getMockCampaigns();
      if (!campaigns[normalized]) return true;
      const data = campaigns[normalized];
      const timeDiff = Date.now() - data.createdAt;
      return !data.isActive || timeDiff >= 24 * 60 * 60 * 1000;
    }
  },

  /**
   * Delete or Overwrite campaign document (Admin Override tool)
   */
  async deleteCampaign(slug, purgeStorage = true) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'campaigns', slug);
        // Soft delete / complete drop
        await deleteDoc(docRef);
        return true;
      } catch (err) {
        console.error("Firestore delete error:", err);
        throw err;
      }
    } else {
      const campaigns = getMockCampaigns();
      if (campaigns[slug]) {
        delete campaigns[slug];
        saveMockCampaigns(campaigns);
      }
      return true;
    }
  },

  /**
   * Soft delete campaign by marking isActive: false (preserving metadata analytics)
   */
  async softDeleteCampaign(slug) {
    if (isFirebaseConfigured && db) {
      try {
        const docRef = doc(db, 'campaigns', slug);
        await updateDoc(docRef, {
          isActive: false,
          audioUrl: '/karthave.mp3',
          partnerImgUrl: '/rithu.jpeg',
          exhaustedImgUrl: '/adi.jpeg',
          rejectionImgUrl: '/rejected.png',
          'profiles': [] // Purges custom profile content blocks to reclaim schema index space
        });
        return true;
      } catch (err) {
        console.error("Firestore soft delete error:", err);
        throw err;
      }
    } else {
      const campaigns = getMockCampaigns();
      if (campaigns[slug]) {
        campaigns[slug].isActive = false;
        campaigns[slug].audioUrl = '/karthave.mp3';
        campaigns[slug].partnerImgUrl = '/rithu.jpeg';
        campaigns[slug].exhaustedImgUrl = '/adi.jpeg';
        campaigns[slug].rejectionImgUrl = '/rejected.png';
        campaigns[slug].profiles = [];
        saveMockCampaigns(campaigns);
      }
      return true;
    }
  },

  /**
   * Fetch all campaigns for the secret Admin Board dashboard
   */
  async getAllCampaigns() {
    if (isFirebaseConfigured && db) {
      try {
        const colSnap = await getDocs(collection(db, 'campaigns'));
        const campaignsList = [];
        colSnap.forEach((docSnap) => {
          campaignsList.push({ slug: docSnap.id, ...docSnap.data() });
        });
        return campaignsList;
      } catch (err) {
        console.error("Firestore fetch error:", err);
        return [];
      }
    } else {
      const campaigns = getMockCampaigns();
      return Object.entries(campaigns).map(([slug, payload]) => ({
        slug,
        ...payload
      }));
    }
  }
};

export { auth, db };
