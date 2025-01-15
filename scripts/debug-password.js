const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const { User } = require('../models');

async function debugPasswordVerification() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Find admin user
        const user = await User.findOne({ username: 'admin' });

        if (!user) {
            console.log('No admin user found');
            return;
        }

        // Test password verification
        const testPassword = 'AdminPassword123!';
        
        console.log('Stored Hashed Password:', user.password);
        
        // Direct bcrypt comparison
        const isMatch = await bcrypt.compare(testPassword, user.password);
        console.log('bcrypt.compare Result:', isMatch);

        // Alternative verification method
        const saltRounds = 10;
        const hashedTestPassword = await bcrypt.hash(testPassword, saltRounds);
        console.log('Newly Hashed Test Password:', hashedTestPassword);

        // Compare hashes
        const directHashCompare = user.password === hashedTestPassword;
        console.log('Direct Hash Comparison:', directHashCompare);

        // Detailed bcrypt verification
        try {
            const bcryptVerify = await bcrypt.compare(testPassword, user.password);
            console.log('Detailed bcrypt Verification:', bcryptVerify);
        } catch (bcryptError) {
            console.error('Bcrypt Verification Error:', bcryptError);
        }

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Debugging error:', error);
        mongoose.connection.close();
    }
}

debugPasswordVerification();
