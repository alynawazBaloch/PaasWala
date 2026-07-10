import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentCreated, onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// Helpers
// ============================================================

const BATCH_LIMIT = 500;

/**
 * Send an FCM notification to a user if they have an FCM token
 * stored on their user document.
 */
async function sendNotificationToUser(
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  try {
    const userSnap = await db.collection('users').doc(userId).get();
    if (!userSnap.exists) {
      logger.warn(`User ${userId} not found, skipping notification`);
      return;
    }

    const fcmToken = userSnap.data()?.fcmToken;
    if (!fcmToken) {
      logger.warn(`No FCM token for user ${userId}, skipping notification`);
      return;
    }

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
    });
  } catch (error) {
    logger.warn(`Failed to send notification to user ${userId}`, error);
  }
}

/**
 * Delete all documents matching a query in chunks using Firestore batched writes.
 * Returns the total number of documents deleted.
 */
async function deleteQueryInBatches(
  query: admin.firestore.Query,
  batchSize = BATCH_LIMIT,
): Promise<number> {
  let totalDeleted = 0;

  while (true) {
    const snapshot = await query.limit(batchSize).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    totalDeleted += snapshot.size;

    if (snapshot.size < batchSize) break;
  }

  return totalDeleted;
}

// ============================================================
// 0. resetPasswordWithOTP (HTTPS callable alternative via POST)
// URL: https://us-central1-<project>.cloudfunctions.net/resetPasswordWithOTP
//
// Accepts: { email, newPassword }
// Validates the request by verifying the Firestore passwordResets doc
// has been marked verified=true, then sets the Firebase Auth password.
// ============================================================

export const resetPasswordWithOTP = onRequest(
  { cors: true },
  async (req, res) => {
    // Only allow POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed — use POST' });
      return;
    }

    const { email, newPassword } = req.body || {};

    if (!email || !newPassword) {
      res.status(400).json({ error: 'email and newPassword are required.' });
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const docId = email.toLowerCase().trim().replace(/\./g, '_dot_');

    try {
      const resetRef = db.collection('passwordResets').doc(docId);
      const snap = await resetRef.get();

      if (!snap.exists) {
        res.status(400).json({ error: 'No password reset request found for this email.' });
        return;
      }

      const data = snap.data();

      // Check if OTP was verified
      if (!data?.verified) {
        res.status(400).json({ error: 'OTP has not been verified. Please complete OTP verification first.' });
        return;
      }

      // Check expiry (10 min grace period after OTP verification)
      if (data.expiresAt && (data.expiresAt as number) + 5 * 60 * 1000 < Date.now()) {
        res.status(400).json({ error: 'OTP session has expired. Please request a new code.' });
        return;
      }

      // Update Firebase Auth password using Admin SDK
      const userRecord = await admin.auth().getUserByEmail(email);
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword,
      });

      logger.info(`[resetPasswordWithOTP] Password reset successfully for ${email}`);

      res.status(200).json({ success: true, message: 'Password has been reset successfully.' });
    } catch (error: any) {
      logger.error('[resetPasswordWithOTP] Error:', error);

      if (error.code === 'auth/user-not-found') {
        res.status(404).json({ error: 'No user found with this email address.' });
        return;
      }

      res.status(500).json({ error: 'Failed to reset password. Please try again later.' });
    }
  },
);

// ============================================================
// 1. deleteExpiredStories
// Schedule: every 60 minutes
// Deletes stories where expiresAt < now
// ============================================================

export const deleteExpiredStories = onSchedule('every 60 minutes', async () => {
  const now = Date.now();
  logger.info('Checking for expired stories...');

  try {
    const snapshot = await db
      .collection('stories')
      .where('expiresAt', '<', now)
      .get();

    if (snapshot.empty) {
      logger.info('No expired stories found');
      return;
    }

    const batch = db.batch();
    let batchOps = 0;
    let deleted = 0;

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      batchOps++;
      deleted++;

      if (batchOps >= BATCH_LIMIT) {
        await batch.commit();
        batchOps = 0;
      }
    }

    if (batchOps > 0) {
      await batch.commit();
    }

    logger.info(`Deleted ${deleted} expired stories`);
  } catch (error) {
    logger.warn('Failed to delete expired stories', error);
  }
});

// ============================================================
// 2. deleteExpiredMessages
// Schedule: every 60 minutes
// For each chat with disappearingMode ('24h' | '7d'), delete
// messages older than the configured cutoff.
// ============================================================

export const deleteExpiredMessages = onSchedule('every 60 minutes', async () => {
  const now = Date.now();
  logger.info('Checking for expired messages...');

  try {
    const chatsSnapshot = await db
      .collection('chats')
      .where('disappearingMode', 'in', ['24h', '7d'])
      .get();

    if (chatsSnapshot.empty) {
      logger.info('No chats with disappearing mode found');
      return;
    }

    let totalDeleted = 0;

    for (const chatDoc of chatsSnapshot.docs) {
      const chatData = chatDoc.data();
      const mode: string = chatData.disappearingMode;
      const maxAge = mode === '7d' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      const cutoff = now - maxAge;

      const messagesQuery = chatDoc.ref
        .collection('messages')
        .where('createdAt', '<', cutoff);

      const deleted = await deleteQueryInBatches(messagesQuery);
      totalDeleted += deleted;
    }

    logger.info(
      `Deleted ${totalDeleted} expired messages across ${chatsSnapshot.docs.length} chats`,
    );
  } catch (error) {
    logger.warn('Failed to delete expired messages', error);
  }
});

// ============================================================
// 3. archiveOldLostFound
// Schedule: every 24 hours
// Archive expired unresolved lost & found items and notify
// the reporter.
// ============================================================

export const archiveOldLostFound = onSchedule('every 24 hours', async () => {
  const now = Date.now();
  logger.info('Checking for expired lost & found items...');

  try {
    const snapshot = await db
      .collection('lost_found')
      .where('expiresAt', '<', now)
      .where('resolved', '==', false)
      .get();

    if (snapshot.empty) {
      logger.info('No expired lost & found items to archive');
      return;
    }

    let archived = 0;

    for (const doc of snapshot.docs) {
      try {
        await doc.ref.update({ archived: true });
        archived++;

        const data = doc.data();
        const reporterId = data.reporterId || data.authorId;

        if (reporterId) {
          await sendNotificationToUser(
            reporterId,
            'Lost & Found Archived',
            'Your lost & found item has been archived',
          );
        }
      } catch (error) {
        logger.warn(`Failed to archive lost & found item ${doc.id}`, error);
      }
    }

    logger.info(`Archived ${archived} lost & found items`);
  } catch (error) {
    logger.warn('Failed to archive old lost & found items', error);
  }
});

// ============================================================
// 4. sendEventReminders
// Schedule: every 60 minutes
// Check recent events (created within last 30 days) and send
// FCM reminders to attendees who are 'going' when the event
// starts in ~24 hours or ~1 hour.
// ============================================================

export const sendEventReminders = onSchedule('every 60 minutes', async () => {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  logger.info('Checking for upcoming events...');

  try {
    const snapshot = await db
      .collection('events')
      .where('createdAt', '>', thirtyDaysAgo)
      .get();

    if (snapshot.empty) {
      logger.info('No recent events found');
      return;
    }

    let remindersSent = 0;

    for (const doc of snapshot.docs) {
      const event = doc.data();
      if (!event.startsAt) continue;

      // Resolve startsAt to milliseconds (supports both Timestamp and number)
      const eventTime =
        typeof event.startsAt === 'object' && event.startsAt.toDate
          ? event.startsAt.toDate().getTime()
          : (event.startsAt as number);
      const diffMs = eventTime - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      let reminderType: string | null = null;
      let hoursDisplay: string = '';

      if (diffHours >= 23 && diffHours < 25) {
        reminderType = '24h';
        hoursDisplay = '24 hours';
      } else if (diffHours >= 0.8 && diffHours < 1.2) {
        reminderType = '1h';
        hoursDisplay = '1 hour';
      }

      if (!reminderType) continue;

      // Avoid sending duplicate reminders
      if (event.reminders?.[reminderType]) continue;

      const attendees = event.attendees || {};
      const goingUserIds = Object.entries(attendees)
        .filter(([, status]) => status === 'going')
        .map(([userId]) => userId);

      if (goingUserIds.length === 0) continue;

      const title = '📅 Event Reminder';
      const body = `📅 Event Reminder: ${event.title} starts in ${hoursDisplay}!`;

      const sendPromises = goingUserIds.map((userId) =>
        sendNotificationToUser(userId, title, body),
      );
      await Promise.allSettled(sendPromises);

      // Mark this reminder as sent on the event document
      await doc.ref.update({
        [`reminders.${reminderType}`]: true,
      });

      remindersSent++;
    }

    logger.info(`Sent ${remindersSent} event reminders`);
  } catch (error) {
    logger.warn('Failed to send event reminders', error);
  }
});

// ============================================================
// 5. sendExpiredPollNotification
// Schedule: every 60 minutes
// Close expired polls and notify participants of the results.
// ============================================================

export const sendExpiredPollNotification = onSchedule('every 60 minutes', async () => {
  const now = Date.now();
  logger.info('Checking for expired polls...');

  try {
    const snapshot = await db
      .collection('polls')
      .where('expiresAt', '<', now)
      .get();

    if (snapshot.empty) {
      logger.info('No expired polls found');
      return;
    }

    let closed = 0;

    for (const doc of snapshot.docs) {
      const poll = doc.data();

      // Skip polls that have already been closed
      if (poll.closed === true) continue;

      try {
        await doc.ref.update({ closed: true });
        closed++;

        // Notify all participants listed in the voters map
        const voters = poll.voters || {};
        const participantIds = Object.keys(voters);

        if (participantIds.length > 0) {
          const title = '📊 Poll Results';
          const body = `📊 Poll results are in! View the final results for ${poll.question}`;

          const sendPromises = participantIds.map((userId) =>
            sendNotificationToUser(userId, title, body),
          );
          await Promise.allSettled(sendPromises);
        }
      } catch (error) {
        logger.warn(`Failed to close poll ${doc.id}`, error);
      }
    }

    logger.info(`Closed ${closed} expired polls and notified participants`);
  } catch (error) {
    logger.warn('Failed to process expired polls', error);
  }
});

// ============================================================
// 6. updateNeighborhoodStats
// Trigger: onDocumentCreated('posts/{postId}')
// Increment totalPosts and postsToday on the post's
// neighborhood document.
// ============================================================

export const updateNeighborhoodStats = onDocumentCreated(
  'posts/{postId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('No data associated with the created post');
      return;
    }

    const post = snapshot.data();
    const neighborhoodId = post.neighborhoodId;

    if (!neighborhoodId) {
      logger.warn(`Post ${event.params.postId} has no neighborhoodId`);
      return;
    }

    try {
      const neighborhoodRef = db.collection('neighborhoods').doc(neighborhoodId);
      await neighborhoodRef.update({
        totalPosts: admin.firestore.FieldValue.increment(1),
        postsToday: admin.firestore.FieldValue.increment(1),
      });
      logger.info(`Incremented stats for neighborhood ${neighborhoodId}`);
    } catch (error) {
      logger.warn(
        `Failed to update stats for neighborhood ${neighborhoodId}`,
        error,
      );
    }
  },
);

// ============================================================
// 7. autoHideReportedPost
// Trigger: onDocumentCreated('post_reports/{reportId}')
// If the reported post has reportCount >= 3, set hidden: true
// and notify admin users.
// ============================================================

export const autoHideReportedPost = onDocumentCreated(
  'post_reports/{reportId}',
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn('No data associated with the created report');
      return;
    }

    const report = snapshot.data();
    const postId = report.postId;

    if (!postId) {
      logger.warn(`Report ${event.params.reportId} has no postId`);
      return;
    }

    try {
      const postRef = db.collection('posts').doc(postId);
      const postSnap = await postRef.get();

      if (!postSnap.exists) {
        logger.warn(`Post ${postId} not found`);
        return;
      }

      const post = postSnap.data()!;
      const reportCount = post.reportCount ?? 0;

      if (reportCount >= 3) {
        await postRef.update({ hidden: true });
        logger.info(
          `Auto-hidden post ${postId} due to ${reportCount} reports`,
        );

        // Notify all admin users
        const adminSnapshot = await db
          .collection('users')
          .where('role', '==', 'admin')
          .get();

        if (!adminSnapshot.empty) {
          const title = 'Post Auto-Hidden';
          const body = `A post has been auto-hidden due to ${reportCount} reports`;

          const sendPromises = adminSnapshot.docs.map((adminDoc) =>
            sendNotificationToUser(adminDoc.id, title, body),
          );
          await Promise.allSettled(sendPromises);
        }
      } else {
        logger.info(
          `Post ${postId} has ${reportCount} reports, not yet at threshold`,
        );
      }
    } catch (error) {
      logger.warn(`Failed to auto-hide post ${postId}`, error);
    }
  },
);

// ============================================================
// 8. cleanupDeletedUserData
// Trigger: onDocumentDeleted('users/{userId}')
// Clean up all user-owned data across collections when a user
// account is deleted.
// ============================================================

export const cleanupDeletedUserData = onDocumentDeleted(
  'users/{userId}',
  async (event) => {
    const userId = event.params.userId;
    logger.info(`Cleaning up data for deleted user ${userId}...`);

    try {
      const results = await Promise.allSettled([
        // Delete user's posts
        deleteQueryInBatches(
          db.collection('posts').where('authorId', '==', userId),
        ),
        // Delete user's messages across all chat subcollections
        deleteQueryInBatches(
          db.collectionGroup('messages').where('senderId', '==', userId),
        ),
        // Delete user's listings
        deleteQueryInBatches(
          db.collection('listings').where('authorId', '==', userId),
        ),
        // Delete user's events
        deleteQueryInBatches(
          db.collection('events').where('authorId', '==', userId),
        ),
        // Delete user's lost & found items
        deleteQueryInBatches(
          db.collection('lost_found').where('authorId', '==', userId),
        ),
        // Delete friend connections where user is the sender
        deleteQueryInBatches(
          db.collection('friends').where('from', '==', userId),
        ),
        // Delete friend connections where user is the receiver
        deleteQueryInBatches(
          db.collection('friends').where('to', '==', userId),
        ),
        // Delete follow connections where user is the follower
        deleteQueryInBatches(
          db.collection('follows').where('followerId', '==', userId),
        ),
        // Delete follow connections where user is being followed
        deleteQueryInBatches(
          db.collection('follows').where('followingId', '==', userId),
        ),
      ]);

      const labels = [
        'posts',
        'messages',
        'listings',
        'events',
        'lost_found',
        'friends(from)',
        'friends(to)',
        'follows(follower)',
        'follows(following)',
      ];

      const summary = results.map((r, i) => {
        const label = labels[i] ?? `unknown_${i}`;
        return r.status === 'fulfilled'
          ? `${label}: ${r.value}`
          : `${label}: FAILED`;
      });

      logger.info(`Cleanup complete for user ${userId}: ${summary.join(', ')}`);
    } catch (error) {
      logger.warn(`Failed to clean up data for user ${userId}`, error);
    }
  },
);
