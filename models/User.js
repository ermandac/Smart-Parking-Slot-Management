const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  firstName: { 
    type: String, 
    trim: true
  },
  lastName: { 
    type: String, 
    trim: true
  },
  phoneNumber: { 
    type: String,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please fill a valid phone number']
  },
  registeredDate: { 
    type: Date, 
    default: Date.now 
  },
  role: { 
    type: String, 
    enum: ['user', 'admin'], 
    default: 'user' 
  },
  vehicleInfo: {
    licensePlate: { 
      type: String, 
      uppercase: true,
      trim: true
    },
    vehicleType: { 
      type: String, 
      enum: ['car', 'motorcycle', 'truck', 'other'] 
    },
    color: { 
      type: String 
    }
  }
}, {
  timestamps: true
});

// Disable password hashing middleware
UserSchema.pre('save', function(next) {
  // Only log, do not modify
  console.log('Pre-save Hook Called');
  console.log('Current Password:', this.password);
  next();
});

// Method to manually hash password
UserSchema.methods.hashPassword = async function(password) {
  try {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('Manual Password Hashing Error:', error);
    throw error;
  }
};

// Method to check password validity
UserSchema.methods.isValidPassword = async function(candidatePassword) {
  try {
    console.log('Password Validation:');
    console.log('Candidate Password:', candidatePassword);
    console.log('Stored Password:', this.password);

    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    
    console.log('Bcrypt Comparison Result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Password Validation Error:', error);
    return false;
  }
};

// Static method to authenticate user
UserSchema.statics.authenticate = async function(username, password) {
  try {
    // Find the user by username
    const user = await this.findOne({ username });
    
    if (!user) {
      console.log('User not found:', username);
      return null;
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    console.log('Authentication Attempt:');
    console.log('Username:', username);
    console.log('Password Match:', isMatch);
    
    if (!isMatch) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Authentication Error:', error);
    return null;
  }
};

module.exports = mongoose.model('User', UserSchema);
