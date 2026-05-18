const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  info: (message, meta = null) => {
    if (!isProduction) {
      const metaString = meta ? `\nData: ${JSON.stringify(meta, null, 2)}` : '';
      console.log(`\x1b[36m[INFO]\x1b[0m ${new Date().toISOString()} - ${message}${metaString}`);
    }
  },

  error: (message, err = null) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${new Date().toISOString()} - ${message}`);
    if (err) {
      // Print stack if available, otherwise print the whole error/meta object
      if (err.stack) {
        console.error(`\x1b[31m[STACK]\x1b[0m\n${err.stack}`);
      } else {
        console.error(`\x1b[31m[DETAILS]\x1b[0m\n${JSON.stringify(err, null, 2)}`);
      }
    }
  },

  warn: (message, meta = null) => {
    const metaString = meta ? `\nData: ${JSON.stringify(meta, null, 2)}` : '';
    console.warn(`\x1b[33m[WARN]\x1b[0m ${new Date().toISOString()} - ${message}${metaString}`);
  },

  debug: (message, meta = null) => {
    if (isDevelopment) {
      const metaString = meta ? `\nData: ${JSON.stringify(meta, null, 2)}` : '';
      console.log(`\x1b[35m[DEBUG]\x1b[0m ${new Date().toISOString()} - ${message}${metaString}`);
    }
  },
};

module.exports = logger;