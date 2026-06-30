export const STORAGE_KEYS = {
  AUTH_TOKEN: '@paaswala_auth_token',
  USER_DATA: '@paaswala_user',
  THEME: '@paaswala_theme',
  LANGUAGE: '@paaswala_language',
  ONBOARDING_DONE: '@paaswala_onboarding',
  DRAFT_POSTS: '@paaswala_drafts',
  SELECTED_NEIGHBORHOOD: '@paaswala_neighborhood',
  POSTS: '@paaswala_posts',
  COMMENTS: '@paaswala_comments',
  CHATS: '@paaswala_chats',
  CHAT_REQUESTS: '@paaswala_chat_requests',
  MESSAGES: '@paaswala_messages',
  EVENTS: '@paaswala_events',
  POLLS: '@paaswala_polls',
  ALERTS: '@paaswala_alerts',
  BUSINESSES: '@paaswala_businesses',
  LISTINGS: '@paaswala_listings',
  LOST_FOUND: '@paaswala_lostfound',
  NOTIFICATIONS: '@paaswala_notifications',
  ADMIN_PENDING: '@paaswala_admin_pending',
  ADMIN_REPORTS: '@paaswala_admin_reports',
  SEED_DONE: '@paaswala_seed_done',
  USERS: '@paaswala_users',
};

export const REPUTATION = {
  POST_POINTS: 5,
  LIKE_RECEIVED: 1,
  HELPFUL_REACTION: 3,
  EVENT_ATTENDED: 5,
  VERIFIED_BONUS: 20,
  BRONZE_THRESHOLD: 0,
  SILVER_THRESHOLD: 50,
  GOLD_THRESHOLD: 200,
};

export const CATEGORIES = {
  general: 'General',
  announcement: 'Announcement',
  question: 'Question',
  recommendation: 'Recommendation',
  complaint: 'Complaint',
  appreciation: 'Appreciation',
  urgent: 'Urgent',
};

export const ALERT_TYPES = {
  emergency: { label: 'Emergency', color: '#FF4444', icon: 'alert-circle' },
  security: { label: 'Security', color: '#FF8C00', icon: 'shield' },
  weather: { label: 'Weather', color: '#4A90D9', icon: 'cloud-lightning' },
  utility: { label: 'Utility', color: '#FFD700', icon: 'zap' },
  traffic: { label: 'Traffic', color: '#9B59B6', icon: 'navigation' },
  lost_pet: { label: 'Lost Pet', color: '#E91E63', icon: 'heart' },
  other: { label: 'Other', color: '#A8B8A8', icon: 'bell' },
};

export const ROLE_BADGES = {
  resident: { icon: 'check-circle', color: '#52B788', label: 'Resident' },
  admin: { icon: 'shield', color: '#2D6A4F', label: 'Neighborhood Admin' },
  superAdmin: { icon: 'award', color: '#FFD700', label: 'Super Admin' },
  business: { icon: 'briefcase', color: '#4A90D9', label: 'Business Owner' },
};
