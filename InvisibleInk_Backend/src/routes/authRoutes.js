const express = require('express');
const router = express.Router();

// Controllers & Middleware
const authController = require('../controllers/authController');
const requireAuth = require('../middlewares/requireAuth'); 

/**
 * Async wrapper to catch unhandled promise rejections.
 * Yeh automatically errors ko Express ke default error handler tak bhej deta hai.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ==========================================
// AUTH ROUTES
// ==========================================

// Route:   POST /verify
// Desc:    Verifies Supabase token and returns user data
// Access:  Private (Requires Bearer Token)
router.post('/verify', requireAuth, asyncHandler(authController.verifyLogin));

module.exports = router;