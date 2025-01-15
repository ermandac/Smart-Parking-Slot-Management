const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const { ParkingLog } = require('../models');

async function checkAnalyticsData() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Find parking logs
        const parkingLogs = await ParkingLog.find({}).sort({ timestamp: -1 }).limit(50);
        
        console.log('Recent Parking Logs:');
        if (parkingLogs.length === 0) {
            console.log('No parking logs found.');
        } else {
            parkingLogs.forEach(log => {
                console.log(`Log ID: ${log._id}`);
                console.log(`Slot Number: ${log.slotNumber}`);
                console.log(`Timestamp: ${log.timestamp}`);
                console.log(`Vehicle Type: ${log.vehicleType}`);
                console.log(`Duration (minutes): ${log.duration}`);
                console.log(`Entry Time: ${log.entryTime}`);
                console.log(`Exit Time: ${log.exitTime}`);
                console.log('---');
            });
        }

        // Aggregate analytics
        const analyticsResults = await ParkingLog.aggregate([
            {
                $group: {
                    _id: null,
                    totalEntries: { $sum: 1 },
                    totalDuration: { $sum: '$duration' },
                    vehicleTypeCounts: { 
                        $push: { 
                            vehicleType: '$vehicleType', 
                            count: 1 
                        } 
                    },
                    avgDuration: { $avg: '$duration' }
                }
            }
        ]);

        console.log('\nAnalytics Summary:');
        if (analyticsResults.length > 0) {
            const summary = analyticsResults[0];
            console.log(`Total Parking Entries: ${summary.totalEntries}`);
            console.log(`Total Parking Duration (minutes): ${summary.totalDuration}`);
            console.log(`Average Parking Duration (minutes): ${summary.avgDuration.toFixed(2)}`);

            // Count vehicle types
            const vehicleTypeCounts = {};
            summary.vehicleTypeCounts.forEach(entry => {
                vehicleTypeCounts[entry.vehicleType] = 
                    (vehicleTypeCounts[entry.vehicleType] || 0) + 1;
            });

            console.log('\nVehicle Type Distribution:');
            Object.entries(vehicleTypeCounts).forEach(([type, count]) => {
                console.log(`${type}: ${count}`);
            });
        }

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Error checking analytics data:', error);
        mongoose.connection.close();
    }
}

checkAnalyticsData();
