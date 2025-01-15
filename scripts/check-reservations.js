const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });

const { Reservation } = require('../models');

async function checkReservations() {
    try {
        // Connect to the database
        await mongoose.connect(process.env.MONGODB_URI);

        // Find all reservations
        const reservations = await Reservation.find({}).populate('user').populate('parkingSlot');
        
        console.log('Existing Reservations:');
        if (reservations.length === 0) {
            console.log('No reservations found.');
        } else {
            reservations.forEach(reservation => {
                console.log(`Reservation ID: ${reservation._id}`);
                console.log(`User: ${reservation.user ? reservation.user.username : 'N/A'}`);
                console.log(`Parking Slot: ${reservation.parkingSlot ? reservation.parkingSlot.slotNumber : 'N/A'}`);
                console.log(`Start Time: ${reservation.startTime}`);
                console.log(`End Time: ${reservation.endTime}`);
                console.log(`Status: ${reservation.status}`);
                console.log('---');
            });
        }

        // Calculate and display summary
        const totalReservations = reservations.length;
        const activeReservations = reservations.filter(res => res.status === 'active').length;
        const completedReservations = reservations.filter(res => res.status === 'completed').length;

        console.log('\nSummary:');
        console.log(`Total Reservations: ${totalReservations}`);
        console.log(`Active Reservations: ${activeReservations}`);
        console.log(`Completed Reservations: ${completedReservations}`);

        // Close the database connection
        mongoose.connection.close();
    } catch (error) {
        console.error('Error checking reservations:', error);
        mongoose.connection.close();
    }
}

checkReservations();
