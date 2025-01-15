const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const axios = require('axios');

const { User, ParkingSlot, ParkingLog } = require('../models');

async function testParkingLog() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Find an existing user
        const user = await User.findOne({ username: 'admin' });
        if (!user) {
            throw new Error('No admin user found');
        }
        console.log('Found user:', user.username);

        // Find an available parking slot
        const parkingSlot = await ParkingSlot.findOne({ status: 'available' });
        if (!parkingSlot) {
            throw new Error('No available parking slots');
        }
        console.log('Found parking slot:', parkingSlot.slotNumber);

        // Simulate parking event
        const parkingEventData = {
            slotId: parkingSlot.slotNumber, 
            isOccupied: true,
            userId: user._id,
            vehicleDetails: {
                licensePlate: 'TEST123',
                vehicleType: 'car'
            }
        };

        // Use axios to simulate the API call (you'll need to replace with your actual server URL)
        const response = await axios.post('http://localhost:3000/api/update-slot', parkingEventData, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('API Response:', response.data);

        // Verify parking log was created
        const parkingLog = await ParkingLog.findOne({ 
            userId: user._id, 
            slotId: parkingSlot._id 
        }).sort({ entryTime: -1 });

        if (parkingLog) {
            console.log('Parking Log Created:');
            console.log('Entry Time:', parkingLog.entryTime);
            console.log('Vehicle Plate:', parkingLog.vehicleDetails.licensePlate);
            console.log('Payment Status:', parkingLog.paymentStatus);
        } else {
            console.log('No parking log created');
        }

        // Verify slot status was updated
        const updatedSlot = await ParkingSlot.findById(parkingSlot._id);
        console.log('Updated Slot Status:', updatedSlot.status);

        // Close the database connection
        await mongoose.connection.close();
    } catch (error) {
        console.error('Error in test script:', error.response ? error.response.data : error);
        await mongoose.connection.close();
    }
}

testParkingLog();
