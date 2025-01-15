const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

const { User } = require('../models');

async function resetAdminUser() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Find existing admin user
        const existingAdmin = await User.findOne({ username: 'admin' });

        if (existingAdmin) {
            // Remove existing admin user
            await User.deleteOne({ username: 'admin' });
            console.log('Existing admin user removed');
        }

        // Create new admin user
        const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
        const adminUser = new User({
            username: 'admin',
            email: 'admin@smartparking.com',
            password: hashedPassword,
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
        console.log('New admin user created successfully');

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Error resetting admin user:', error);
        mongoose.connection.close();
    }
}

resetAdminUser();
