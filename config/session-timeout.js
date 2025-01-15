const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SessionTimeoutConfig = {
    // Session timeout in minutes
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30', 10),
    
    // Grace period in seconds before forced logout
    gracePeriodSeconds: parseInt(process.env.GRACE_PERIOD_SECONDS || '60', 10),

    // Convert timeout to milliseconds for easier use
    getTimeoutMilliseconds() {
        return this.timeoutMinutes * 60 * 1000;
    },

    // Validate and log configuration
    validate() {
        console.log('Session Timeout Configuration:');
        console.log(`- Timeout: ${this.timeoutMinutes} minutes`);
        console.log(`- Grace Period: ${this.gracePeriodSeconds} seconds`);

        // Validate timeout
        if (this.timeoutMinutes < 1) {
            console.warn('Session timeout must be at least 1 minute. Defaulting to 30 minutes.');
            this.timeoutMinutes = 30;
        }

        // Validate grace period
        if (this.gracePeriodSeconds < 0) {
            console.warn('Grace period cannot be negative. Defaulting to 60 seconds.');
            this.gracePeriodSeconds = 60;
        }
    }
};

// Validate configuration on module load
SessionTimeoutConfig.validate();

module.exports = SessionTimeoutConfig;
