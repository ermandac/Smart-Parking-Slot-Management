const fs = require('fs');
const path = require('path');

function cleanupDevelopmentFiles() {
    const scriptsToRemove = [
        'comprehensive-password-debug.js',
        'forensic-password-debug.js',
        'advanced-password-debug.js',
        'ultimate-admin-reset.js',
        'definitive-admin-reset.js'
    ];

    const scriptsDir = path.join(__dirname);

    console.log('=== Development Cleanup Script ===');

    scriptsToRemove.forEach(script => {
        const scriptPath = path.join(scriptsDir, script);
        
        try {
            if (fs.existsSync(scriptPath)) {
                fs.unlinkSync(scriptPath);
                console.log(`Removed: ${script}`);
            }
        } catch (error) {
            console.error(`Error removing ${script}:`, error.message);
        }
    });

    console.log('\nCleanup complete. Removed debugging scripts.');
}

cleanupDevelopmentFiles();
