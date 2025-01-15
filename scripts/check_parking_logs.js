const mongoose = require('mongoose');
const ParkingLog = require('./models/ParkingLog');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function checkParkingLogs() {
    try {
        // Get MongoDB URI from environment variables
        const mongoURI = process.env.MONGODB_URI;
        
        if (!mongoURI) {
            console.error('CRITICAL: MongoDB URI not found in environment variables');
            return;
        }

        console.log('Attempting to connect to MongoDB with URI:', mongoURI);

        // Connect to the database
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('MongoDB Connection Successful');

        // Find parking logs with exit times
        const logs = await ParkingLog.find({ 
            $or: [
                { exitTime: { $ne: null } },
                { exitTime: { $exists: true } }
            ]
        })
        .select('slotId entryTime exitTime duration userId vehicleDetails')
        .limit(10);

        console.log('Parking Logs with Exit Times:');
        logs.forEach(log => {
            console.log({
                _id: log._id,
                slotId: log.slotId,
                userId: log.userId,
                entryTime: log.entryTime,
                exitTime: log.exitTime,
                duration: log.duration,
                vehicleDetails: log.vehicleDetails,
                calculatedDuration: log.exitTime ? 
                    Math.round((log.exitTime - log.entryTime) / (1000 * 60)) : 
                    'N/A'
            });
        });

        // Count total logs and logs with exit times
        const totalLogs = await ParkingLog.countDocuments();
        const logsWithExitTime = await ParkingLog.countDocuments({ 
            $or: [
                { exitTime: { $ne: null } },
                { exitTime: { $exists: true } }
            ]
        });

        console.log('\nTotal Logs:', totalLogs);
        console.log('Logs with Exit Time:', logsWithExitTime);

    } catch (error) {
        console.error('CRITICAL: Error checking parking logs:', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack
        });
    } finally {
        await mongoose.connection.close();
    }
}

checkParkingLogs();
