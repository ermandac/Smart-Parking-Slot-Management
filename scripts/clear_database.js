const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function clearDatabase() {
    try {
        // Get MongoDB URI from environment variables
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.error('CRITICAL: MongoDB URI not found in environment variables');
            return;
        }

        // Connect to the database
        await mongoose.connect(mongoURI);
        console.log('MongoDB Connection Successful');

        // Import models
        const ParkingLog = require('./models/ParkingLog');
        const ParkingSlot = require('./models/ParkingSlot');
        const User = require('./models/User');
        const Reservation = require('./models/Reservation');

        // Clear collections
        await ParkingLog.deleteMany({});
        console.log('Cleared ParkingLog collection');

        await ParkingSlot.deleteMany({});
        console.log('Cleared ParkingSlot collection');

        // Optional: Keep some users, clear only parking-related data
        // await User.deleteMany({});
        // console.log('Cleared User collection');

        await Reservation.deleteMany({});
        console.log('Cleared Reservation collection');

        console.log('Database cleared successfully');
    } catch (error) {
        console.error('CRITICAL: Error clearing database:', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack
        });
    } finally {
        await mongoose.connection.close();
    }
}

clearDatabase();
