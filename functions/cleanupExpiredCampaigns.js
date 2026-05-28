/**
 * lessgoooo SaaS Platform Centralized Lifecycle Engine
 * Firebase Cloud Function: Automated 24-Hour Blob Cleanup Cron Task
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { del } = require('@vercel/blob'); // Vercel Blob SDK deletion endpoint

// Initialize Firebase Admin client if not already initialized
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Scheduled Cron Job: exports.cleanupExpiredCampaigns
 * Runs once every day at midnight (00:00) to clear expired campaign media blocks.
 * To change frequency, adjust the schedule cron expression.
 */
exports.cleanupExpiredCampaigns = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const expiredThreshold = Date.now() - 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    console.log(`🧹 lessgoooo Lifecycle Script: Commencing purge check for records created before ${new Date(expiredThreshold).toISOString()}`);

    try {
      // Query for all active campaigns that have crossed the 24h operational limit
      const campaignRef = db.collection('campaigns');
      const snapshot = await campaignRef
        .where('createdAt', '<=', expiredThreshold)
        .where('isActive', '==', true)
        .get();

      if (snapshot.empty) {
        console.log('✓ No campaigns have expired within this lifecycle run.');
        return null;
      }

      console.log(`Found ${snapshot.size} campaign(s) that have crossed the 24-hour window limit. Commencing purge...`);

      const batch = db.batch();
      let blobsDeletedCount = 0;

      for (const docSnap of snapshot.docs) {
        const campaign = docSnap.data();
        const docRef = docSnap.ref;

        // 1. Gather all Vercel Blob URLs from this campaign document
        const vercelBlobUrls = [];

        // Check base campaign properties
        if (isVercelBlobUrl(campaign.partnerImgUrl)) vercelBlobUrls.push(campaign.partnerImgUrl);
        if (isVercelBlobUrl(campaign.exhaustedImgUrl)) vercelBlobUrls.push(campaign.exhaustedImgUrl);
        if (isVercelBlobUrl(campaign.rejectionImgUrl)) vercelBlobUrls.push(campaign.rejectionImgUrl);
        if (isVercelBlobUrl(campaign.audioUrl)) vercelBlobUrls.push(campaign.audioUrl);

        // Check custom dynamic profiles profile photos
        if (Array.isArray(campaign.profiles)) {
          campaign.profiles.forEach(profile => {
            if (isVercelBlobUrl(profile.photoUrl)) {
              vercelBlobUrls.push(profile.photoUrl);
            }
          });
        }

        // 2. Call Vercel Blob Storage del() API for each target url
        if (vercelBlobUrls.length > 0) {
          console.log(`Purging ${vercelBlobUrls.length} file blocks hosted on Vercel Blob for slug "/match/${docSnap.id}"`);
          
          for (const url of vercelBlobUrls) {
            try {
              await del(url);
              blobsDeletedCount++;
            } catch (err) {
              console.error(`⚠️ Failed to delete Vercel Blob media binary: ${url}`, err);
              // Fail-safe: continue execution to process remaining files
            }
          }
        }

        // 3. Update the Firestore campaign document state
        // We flip isActive to false and set fallbacks to preserve analytical viewports
        batch.update(docRef, {
          isActive: false,
          partnerImgUrl: '/rithu.jpeg',     // Reset to default baseline asset path
          exhaustedImgUrl: '/adi.jpeg',         // Reset to default baseline asset path
          rejectionImgUrl: '/rejected.png', // Reset to default baseline asset path
          audioUrl: '/karthave.mp3',       // Reset to default baseline asset path
          profiles: []                    // Purge the profile configurations array
        });
      }

      // Commit document status changes inside a single batch transaction
      await batch.commit();
      console.log(`✓ Lifecycle Run Complete. Purged ${snapshot.size} expired campaign records and deleted ${blobsDeletedCount} media blocks from Vercel Blob.`);

    } catch (error) {
      console.error('❌ Critical Lifecycle Execution Failure:', error);
    }

    return null;
  });

/**
 * Helper to determine if a URL points to Vercel Blob Storage
 */
function isVercelBlobUrl(url) {
  if (!url || typeof url !== 'string') return false;
  // Vercel Blob Storage hosts assets on domains ending in public.blob.vercel-storage.com
  return url.includes('public.blob.vercel-storage.com') || url.includes('vercel-storage.com');
}
