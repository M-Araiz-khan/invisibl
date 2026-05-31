const supabase = require('../config/supabaseclient'); // 👈 Yahan C chota kar diya hai
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

    // Respond immediately to the client
    res.status(202).json({ status: 'Scheduled', messageId });

    // Log with user info (using req.user.id for Supabase)
    const initiatedBy = req.user ? `by ID: ${req.user.id}` : 'by anonymous';
    logger.info(`Self-destruct scheduled for message ${messageId} in ${timeout}s ${initiatedBy}`);

    // Schedule deletion (timer doesn't prevent process exit)
    const timer = setTimeout(async () => {
      try {
        // Step 1: Check if message exists (Optional, but good for logging)
        const { data: message, error: fetchError } = await supabase
          .from('messages')
          .select('id')
          .eq('id', messageId)
          .eq('chat_id', chatId)
          .single(); // Assuming messageId is primary key

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError; // Ignore "Row not found" error for logging later
        }

        if (message) {
          // Step 2: Delete the message from Supabase Table
          const { error: deleteError } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId)
            .eq('chat_id', chatId);

          if (deleteError) throw deleteError;
          
          logger.info(`POOF! 💨 Message ${messageId} destroyed from Supabase.`);
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