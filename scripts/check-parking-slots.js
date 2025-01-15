const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const { ParkingSlot } = require('../models');

async function checkParkingSlots() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Find all parking slots
        const slots = await ParkingSlot.find({});
        
        console.log('Existing Parking Slots:');
        slots.forEach(slot => {
            console.log(`Slot ID: ${slot._id}`);
            console.log(`Number: ${slot.slotNumber}`);
            console.log(`Status: ${slot.status}`);
            console.log(`Sensor ID: ${slot.sensorId}`);
            console.log(`Last Updated: ${slot.lastUpdated}`);
            console.log('---');
        });

        // Calculate and display summary
        const totalSlots = slots.length;
        const occupiedSlots = slots.filter(slot => slot.status === 'occupied').length;
        const availableSlots = slots.filter(slot => slot.status === 'available').length;

        console.log('\nSummary:');
        console.log(`Total Slots: ${totalSlots}`);
        console.log(`Occupied Slots: ${occupiedSlots}`);
        console.log(`Available Slots: ${availableSlots}`);

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Error checking parking slots:', error);
        mongoose.connection.close();
    }
}

checkParkingSlots();
