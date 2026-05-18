const express = require('express');
const router = express.Router();

// Controllers & Middleware
const profileController = require('../controllers/profileController');
const requireAuth = require('../middleware/requireAuth'); 

/**
 * Async wrapper to catch unhandled promise rejections.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ==========================================
// PROFILE ROUTES
// ==========================================

// Route:   GET /api/profile/me
// Desc:    Fetch current user's profile
// Access:  Private (Requires Bearer Token)
router.get('/me', requireAuth, asyncHandler(profileController.getProfile));

// Route:   PUT /api/profile/update
// Desc:    Update current user's profile (displayName, bio, phone)
// Access:  Private (Requires Bearer Token)
router.put('/update', requireAuth, asyncHandler(profileController.updateProfile));

module.exports = router;