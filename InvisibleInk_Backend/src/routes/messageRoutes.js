const express = require('express');
const router = express.Router();

// Controllers & Middleware
const messageController = require('../controllers/messageController');
const requireAuth = require('../middleware/requireAuth');  

/**
 * Async wrapper to catch unhandled promise rejections.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ==========================================
// MESSAGE ROUTES
// ==========================================

// Route:   POST /api/messages/timer
// Desc:    Starts a self-destruct timer for a specific message
// Access:  Private (Requires Bearer Token)
router.post('/timer', requireAuth, asyncHandler(messageController.startSelfDestructTimer));

module.exports = router;