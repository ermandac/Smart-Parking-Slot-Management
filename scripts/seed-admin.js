const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const { User } = require('../models');

async function seedAdminUser() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Remove existing admin users
        await User.deleteMany({ username: 'admin' });

        // Hash the password manually to ensure correct hashing
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('AdminPassword123!', saltRounds);

        // Create new admin user with explicitly hashed password
        const adminUser = new User({
            username: 'admin',
            email: 'admin@smartparking.com',
            password: hashedPassword,  // Use pre-hashed password
            firstName: 'System',
            lastName: 'Administrator',
            role: 'admin',
            vehicleInfo: {
                licensePlate: 'ADMIN001',
                vehicleType: 'car'
            }
        });

        // Save the admin user
        await adminUser.save();
        console.log('Admin user created successfully');

        // Verify the user
        const verifiedUser = await User.findOne({ username: 'admin' });
        console.log('Verified Admin User:', {
            username: verifiedUser.username,
            email: verifiedUser.email,
            role: verifiedUser.role
        });

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Seeding admin user error:', error);
        mongoose.connection.close(true);
    }
}

seedAdminUser();
