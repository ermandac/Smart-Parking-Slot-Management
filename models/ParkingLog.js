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
    type: Date,
    validate: {
      validator: function(v) {
        // If exitTime is set, it must be after entryTime
        return !v || v > this.entryTime;
      },
      message: props => `Exit time (${props.value}) must be after entry time (${this.entryTime})`
    }
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
  if (!exitTime) {
    exitTime = new Date();
  }
  
  // Validate exit time
  if (exitTime <= this.entryTime) {
    throw new Error('Exit time must be after entry time');
  }
  
  // Calculate duration in minutes
  this.exitTime = exitTime;
  this.duration = Math.round((exitTime - this.entryTime) / (1000 * 60));
  
  // Basic cost calculation (example)
  this.cost = this.duration * 0.5; // $0.50 per minute
  
  return this;
};

// Static method to get user's parking history
ParkingLogSchema.statics.getUserParkingHistory = async function(userId, limit = 10) {
  return this.find({ userId })
    .sort({ entryTime: -1 })
    .limit(limit)
    .populate('slotId', 'slotNumber')
    .populate('userId', 'username email');
};

// Pre-save hook to ensure duration is calculated
ParkingLogSchema.pre('save', function(next) {
  // If exitTime is set but duration is not, calculate it
  if (this.exitTime && !this.duration) {
    this.duration = Math.round((this.exitTime - this.entryTime) / (1000 * 60));
  }
  next();
});

module.exports = mongoose.model('ParkingLog', ParkingLogSchema);
