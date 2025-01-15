const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const { User } = require('../models');

async function forceResetAdminUser() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Remove all existing admin users
        await User.deleteMany({ username: 'admin' });
        console.log('Existing admin users deleted');

        // Explicitly create admin user with manual hashing
        const plainTextPassword = 'AdminPassword123!';
        
        // Manually generate salt and hash
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const hashedPassword = await bcrypt.hash(plainTextPassword, salt);

        console.log('Salt Generated:', salt);
        console.log('Manually Hashed Password:', hashedPassword);

        // Create new admin user
        const adminUser = new User({
            username: 'admin',
            email: 'admin@smartparking.com',
            password: plainTextPassword,  // Let mongoose middleware handle hashing
            firstName: 'System',
            lastName: 'Administrator',
            role: 'admin',
            vehicleInfo: {
                licensePlate: 'ADMIN001',
                vehicleType: 'car'
            }
        });

        // Save the user
        await adminUser.save();
        console.log('New admin user created successfully');

        // Verify the user
        const verifiedUser = await User.findOne({ username: 'admin' });
        console.log('Verified Admin User:', {
            username: verifiedUser.username,
            email: verifiedUser.email,
            hashedPassword: verifiedUser.password
        });

        // Perform manual password verification
        console.log('\n--- Manual Password Verification ---');
        const isMatch = await bcrypt.compare(plainTextPassword, verifiedUser.password);
        console.log('Manual Bcrypt Verification:', isMatch);

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Force Reset Admin User Error:', error);
        mongoose.connection.close();
    }
}

forceResetAdminUser();
