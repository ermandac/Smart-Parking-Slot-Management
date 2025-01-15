const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected Successfully');
  } catch (error) {
    console.error('MongoDB Connection Error:', error.message);
    // Exit process with failure
    process.exit(1);
  }
};

mongoose.set('strictQuery', true); // Prepare for future Mongoose versions

module.exports = {
  connectDB,
  User: require('./User'),
  ParkingSlot: require('./ParkingSlot'),
  Reservation: require('./Reservation'),
  ParkingLog: require('./ParkingLog')
};
