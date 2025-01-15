const mongoose = require('mongoose');

const ReservationSchema = new mongoose.Schema({
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
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'cancelled', 'expired'], 
    default: 'active' 
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
  paymentInfo: {
    amount: { 
      type: Number, 
      min: 0 
    },
    method: { 
      type: String, 
      enum: ['credit_card', 'debit_card', 'cash', 'mobile_wallet'] 
    },
    status: { 
      type: String, 
      enum: ['pending', 'paid', 'failed'] 
    }
  }
}, {
  timestamps: true
});

// Method to check if reservation is active
ReservationSchema.methods.isActive = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.startTime <= now && 
         this.endTime >= now;
};

// Static method to find active reservations for a user
ReservationSchema.statics.findActiveReservations = function(userId) {
  return this.find({ 
    userId, 
    status: 'active', 
    endTime: { $gte: new Date() } 
  });
};

// Middleware to update slot status when reservation is created/modified
ReservationSchema.pre('save', async function(next) {
  try {
    const ParkingSlot = mongoose.model('ParkingSlot');
    await ParkingSlot.findByIdAndUpdate(this.slotId, {
      status: this.status === 'active' ? 'reserved' : 'available'
    });
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Reservation', ReservationSchema);
