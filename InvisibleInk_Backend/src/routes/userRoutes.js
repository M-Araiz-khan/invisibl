const express = require('express');
const router = express.Router();

// Controllers & Middleware
const userController = require('../controllers/userController');
const requireAuth = require('../middlewares/requireAuth'); // ✅ FIXED: Path & name matched with other routes

/**
 * Async wrapper to catch unhandled promise rejections.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ==========================================
// USER ROUTES
// ==========================================

// Route:   GET /profile
// Desc:    View own profile (Fetches from Supabase)
// Access:  Private (Requires Bearer Token)
router.get('/profile', requireAuth, asyncHandler(userController.getProfile));

// Route:   PUT /update
// Desc:    Update own profile (Updates in Supabase)
// Access:  Private (Requires Bearer Token)
router.put('/update', requireAuth, asyncHandler(userController.updateProfile));

module.exports = router;