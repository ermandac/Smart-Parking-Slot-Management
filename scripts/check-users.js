const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const { User } = require('../models');

async function checkUsers() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Find all users
        const users = await User.find({}, 'username email role');
        
        console.log('Existing Users:');
        users.forEach(user => {
            console.log(`Username: ${user.username}, Email: ${user.email}, Role: ${user.role}`);
        });

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Error checking users:', error);
        mongoose.connection.close();
    }
}

checkUsers();
