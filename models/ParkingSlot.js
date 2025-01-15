const mongoose = require('mongoose');

const ParkingSlotSchema = new mongoose.Schema({
  slotNumber: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'reserved', 'maintenance'], 
    default: 'available' 
  },
  sensorData: {
    lastDetectedDistance: { 
      type: Number 
    },
    lastUpdated: { 
      type: Date, 
      default: Date.now 
    }
  },
  currentVehicle: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    licensePlate: { 
      type: String, 
      uppercase: true 
    },
    entryTime: { 
      type: Date 
    },
    expectedExitTime: { 
      type: Date 
    }
  },
  location: {
    section: { 
      type: String 
    },
    coordinates: {
      latitude: { 
        type: Number 
      },
      longitude: { 
        type: Number 
      }
    }
  },
  sensors: {
    triggerPin: { 
      type: Number, 
      required: true 
    },
    echoPin: { 
      type: Number, 
      required: true 
    }
  }
}, {
  timestamps: true
});

// Method to update slot status based on sensor data
ParkingSlotSchema.methods.updateStatus = function(distance) {
  const OCCUPIED_THRESHOLD = 10; // cm
  const AVAILABLE_THRESHOLD = 20; // cm

  this.sensorData.lastDetectedDistance = distance;
  this.sensorData.lastUpdated = new Date();

  if (distance <= OCCUPIED_THRESHOLD) {
    this.status = 'occupied';
  } else if (distance > AVAILABLE_THRESHOLD) {
    this.status = 'available';
  }

  return this.save();
};

// Static method to find available slots
ParkingSlotSchema.statics.findAvailableSlots = function() {
  return this.find({ status: 'available' });
};

module.exports = mongoose.model('ParkingSlot', ParkingSlotSchema);
