const { db } = require('../config/firebaseAdmin');
const logger = require('../utils/logger');

// Maximum allowed self-destruct time (1 hour)
const MAX_TIMEOUT_SECONDS = 3600;

exports.startSelfDestructTimer = async (req, res) => {
  try {
    const { chatId, messageId, timeoutSeconds } = req.body;

    // Validate required fields
    if (!chatId || !messageId || timeoutSeconds == null) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Validate timeoutSeconds is a positive number and within limits
    const timeout = Number(timeoutSeconds);
    if (isNaN(timeout) || timeout <= 0 || timeout > MAX_TIMEOUT_SECONDS) {
      return res.status(400).json({
        error: `Invalid timeout. Must be between 1 and ${MAX_TIMEOUT_SECONDS} seconds`,
      });
    }

    // Respond immediately
    res.status(202).json({ status: 'Scheduled', messageId });

    // Log with optional user info (if protect middleware is used)
    const initiatedBy = req.user ? `by ${req.user.uid}` : 'by anonymous';
    logger.info(`Self-destruct scheduled for message ${messageId} in ${timeout}s ${initiatedBy}`);

    // Schedule deletion (timer doesn't prevent process exit)
    const timer = setTimeout(async () => {
      try {
        const msgRef = db.ref(`chats/${chatId}/messages/${messageId}`);
        const snapshot = await msgRef.once('value');

        if (snapshot.exists()) {
          await msgRef.remove();
          logger.info(`POOF! 💨 Message ${messageId} destroyed.`);
        } else {
          logger.warn(`Message ${messageId} already gone before destruct timer fired.`);
        }
      } catch (error) {
        logger.error(`Destruction failed for ${messageId}: ${error.message}`, {
          stack: error.stack,
        });
      }
    }, timeout * 1000);

    // Allow the Node.js process to exit even if this timer is still pending
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
  } catch (error) {
    logger.error('Error in startSelfDestructTimer:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};