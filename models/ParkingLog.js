const mongoose = require('mongoose');

const ParkingLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  slotId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ParkingSlot', 
    required: true 
  },
  entryTime: { 
    type: Date, 
    required: true, 
    default: Date.now 
  },
  exitTime: { 
    type: Date 
  },
  duration: { 
    type: Number, // in minutes
    min: 0 
  },
  cost: { 
    type: Number, 
    min: 0 
  },
  vehicleDetails: {
    licensePlate: { 
      type: String, 
      uppercase: true, 
      required: true 
    },
    vehicleType: { 
      type: String, 
      enum: ['car', 'motorcycle', 'truck', 'other'] 
    }
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'pending' 
  }
}, {
  timestamps: true
});

// Method to calculate parking duration and cost
ParkingLogSchema.methods.finalizeParkingSession = function(exitTime) {
  if (!this.entryTime) {
    throw new Error('No entry time recorded');
  }

  this.exitTime = exitTime || new Date();
  
  // Calculate duration in minutes
  const durationInMinutes = Math.ceil(
    (this.exitTime.getTime() - this.entryTime.getTime()) / (1000 * 60)
  );
  this.duration = durationInMinutes;

  // Calculate cost (example pricing: $2 per hour)
  const hourlyRate = 2;
  this.cost = Math.ceil(durationInMinutes / 60) * hourlyRate;

  return this.save();
};

// Static method to get user's parking history
ParkingLogSchema.statics.getUserParkingHistory = function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ entryTime: -1 })
    .limit(limit)
    .populate('slotId')
    .populate('userId', 'username email');
};

module.exports = mongoose.model('ParkingLog', ParkingLogSchema);
