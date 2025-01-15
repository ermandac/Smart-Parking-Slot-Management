const express = require('express');
const { SerialPort } = require('serialport');
const path = require('path');
const fs = require('fs');
const { connectDB, User, ParkingSlot, Reservation, ParkingLog } = require('./models');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const VehicleControlsConfig = require('./config/vehicle-controls'); // Import vehicle controls configuration
const SessionTimeoutConfig = require('./config/session-timeout'); // Import session timeout configuration
const ReportService = require('./services/reportService'); // Import report service

// Load environment variables
dotenv.config();

// Database connection
connectDB();

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware for body parsing
app.use((req, res, next) => {
    console.log('---INCOMING REQUEST---');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    next();
});

// Debugging middleware for all routes
app.use((req, res, next) => {
    console.log('---REQUEST RECEIVED---');
    console.log('Method:', req.method);
    console.log('Path:', req.path);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    next();
});

// CORS configuration with more detailed handling
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Serve static files from the public directory
app.use(express.static('public', {
    index: ['admin.html', 'index.html'],
    extensions: ['html']
}));

// Detailed logging middleware
app.use((req, res, next) => {
    console.log('---REQUEST RECEIVED---');
    console.log('Path:', req.path);
    console.log('Method:', req.method);
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    next();
});

// Debugging route to show all registered routes
app.get('/debug-routes', (req, res) => {
    const routes = app._router.stack
        .filter(r => r.route)
        .map(r => ({
            method: Object.keys(r.route.methods)[0],
            path: r.route.path
        }));
    res.json(routes);
});

// Global variable to track total slots
const TOTAL_SLOTS = 6;  // Explicitly define total slots

// Simulated Parking Slot Status (for demonstration)
// In a real scenario, this would be updated by Arduino sensors
let parkingSlots = Array(TOTAL_SLOTS).fill(false).map((_, index) => ({
    id: index + 1,
    occupied: false,
    lastUpdated: new Date()
}));

// Initialize Serial Port with error handling
let arduinoPort;
try {
    arduinoPort = new SerialPort({
        path: process.env.ARDUINO_PORT || '/dev/ttyACM0',
        baudRate: 9600,
        autoOpen: false // Don't open immediately
    });

    // Handle port opening
    arduinoPort.open((err) => {
        if (err) {
            console.log('Failed to open port:', err.message);
            // Don't throw error, just log it
        } else {
            console.log('Serial port opened successfully');
        }
    });

    // Error handling
    arduinoPort.on('error', (err) => {
        console.log('Serial Port Error:', err.message);
        // Don't throw error, just log it
    });

    // Data handling
    arduinoPort.on('data', (data) => {
        try {
            const dataStr = data.toString().trim();
            console.log('Received data:', dataStr);
            
            // Parse data only if it matches expected format
            const match = dataStr.match(/SLOT:(\d+),STATUS:(\d+)/);
            if (match) {
                const slotId = parseInt(match[1]);
                const occupied = match[2] === '1';
                
                // Update slot status in database
                updateSlotStatus(slotId, occupied).catch(err => {
                    console.error('Error updating slot status:', err);
                });
            }
        } catch (error) {
            console.error('Error processing Arduino data:', error);
        }
    });

} catch (error) {
    console.log('Failed to initialize Serial Port:', error.message);
    // Create a mock SerialPort object for graceful degradation
    arduinoPort = {
        isOpen: false,
        write: () => console.log('Arduino not connected - write operation ignored'),
        on: () => console.log('Arduino not connected - event listener ignored'),
        open: () => console.log('Arduino not connected - open operation ignored'),
        close: () => console.log('Arduino not connected - close operation ignored')
    };
}

// Helper function to safely write to serial port
function writeToArduino(data) {
    if (arduinoPort && arduinoPort.isOpen) {
        arduinoPort.write(data, (err) => {
            if (err) {
                console.error('Error writing to Arduino:', err.message);
            }
        });
    } else {
        console.log('Arduino not connected - command ignored');
    }
}

// Helper function to update slot status in database
async function updateSlotStatus(slotId, occupied) {
    try {
        const slot = await ParkingSlot.findOne({ slotNumber: slotId });
        if (slot) {
            slot.status = occupied ? 'occupied' : 'available';
            slot.lastUpdated = new Date();
            await slot.save();
            console.log(`Updated slot ${slotId} status to ${slot.status}`);
        }
    } catch (error) {
        console.error(`Error updating slot ${slotId}:`, error);
        throw error; // Re-throw to be handled by caller
    }
}

// Cleanup function for graceful shutdown
function cleanup() {
    if (arduinoPort && arduinoPort.isOpen) {
        console.log('Closing Arduino port...');
        arduinoPort.close((err) => {
            if (err) {
                console.error('Error closing port:', err.message);
            } else {
                console.log('Arduino port closed successfully');
            }
        });
    }
}

// Register cleanup handlers
process.on('SIGINT', () => {
    console.log('Received SIGINT. Cleaning up...');
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Cleaning up...');
    cleanup();
    process.exit(0);
});

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Test route to simulate slot occupation with more robust handling
app.get('/test-slot-update', (req, res) => {
    console.log('---TEST SLOT UPDATE ROUTE CALLED---');
    console.log('Full Request Query:', req.query);
    
    const slotId = req.query.slotId ? parseInt(req.query.slotId) : null;
    const occupied = req.query.occupied === 'true';

    console.log('Parsed Parameters:', { 
        slotId, 
        occupied, 
        rawSlotId: req.query.slotId, 
        rawOccupied: req.query.occupied 
    });

    // Validate slot ID
    if (!slotId || slotId < 1 || slotId > TOTAL_SLOTS) {
        console.error('Invalid Slot ID:', slotId);
        return res.status(400).json({ 
            error: 'Invalid slot ID', 
            details: { 
                slotId, 
                totalSlots: TOTAL_SLOTS,
                receivedSlotId: req.query.slotId 
            } 
        });
    }

    // Ensure we're using the correct array index
    const arrayIndex = slotId - 1;

    // Update slot status
    try {
        parkingSlots[arrayIndex].occupied = occupied;
        parkingSlots[arrayIndex].lastUpdated = new Date();

        console.log('Updated Slot Details:', parkingSlots[arrayIndex]);
        console.log('All Slots Status:', parkingSlots.map(slot => ({
            id: slot.id,
            occupied: slot.occupied
        })));

        res.json({
            message: `Slot ${slotId} updated successfully`,
            slot: parkingSlots[arrayIndex],
            allSlots: parkingSlots.map(slot => ({
                id: slot.id,
                occupied: slot.occupied
            }))
        });
    } catch (error) {
        console.error('Error updating slot:', error);
        res.status(500).json({ 
            error: 'Failed to update slot', 
            details: error.message 
        });
    }
});

// Debugging route to show all routes
app.get('/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            routes.push({
                path: middleware.route.path,
                method: Object.keys(middleware.route.methods)[0]
            });
        }
    });
    res.json(routes);
});

// Serve the main HTML page
app.get('/', (req, res) => {
    res.redirect('/admin'); // Redirect root to admin panel
});

// Admin dashboard route
app.get('/admin', authenticateToken, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'), {
        sessionTimeout: {
            timeoutMinutes: SessionTimeoutConfig.timeoutMinutes,
            gracePeriodSeconds: SessionTimeoutConfig.gracePeriodSeconds
        },
        vehicleControls: VehicleControlsConfig
    });
});

// Customer View - Available Slots
app.get('/available', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'available.html'));
});

// Customer View - Parking Map
app.get('/map', (req, res) => {
    console.log('Attempting to serve map.html');
    console.log('Full path:', path.join(__dirname, 'public', 'map.html'));
    console.log('File exists:', require('fs').existsSync(path.join(__dirname, 'public', 'map.html')));
    res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

// API endpoint to get parking status
app.get('/api/parking-status', (req, res) => {
    try {
        // Calculate occupied and available slots
        const occupiedSlots = parkingSlots.filter(slot => slot.occupied).length;

        // Prepare slots with sensor connection status
        const slotsWithSensorStatus = parkingSlots.map(slot => ({
            ...slot,
            sensorConnected: checkSlotSensorConnection(slot.id)
        }));

        // Log current state
        console.log('Current parking status:', {
            totalSlots: TOTAL_SLOTS,
            occupiedSlots,
            availableSlots: TOTAL_SLOTS - occupiedSlots,
            slots: parkingSlots.map(s => ({ id: s.id, occupied: s.occupied }))
        });

        res.json({
            totalSlots: TOTAL_SLOTS,
            occupiedSlots,
            availableSlots: TOTAL_SLOTS - occupiedSlots,
            slots: slotsWithSensorStatus
        });
    } catch (error) {
        console.error('Error in parking status route:', error);
        res.status(500).json({ 
            error: 'Could not retrieve parking status',
            totalSlots: TOTAL_SLOTS,
            occupiedSlots: 0,
            availableSlots: TOTAL_SLOTS,
            slots: []
        });
    }
});

// API for just available slots
app.get('/api/available-slots', async (req, res) => {
    try {
        const availableSlots = await ParkingSlot.findAvailableSlots();
        res.json(availableSlots);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching available slots', error: error.message });
    }
});

// Modified vehicle detection route to use database
app.post('/api/update-slot', async (req, res) => {
    try {
        console.log('Simulating slot:', req.body);
        
        const { slotId, isOccupied, userId, vehicleDetails } = req.body;

        // Find the parking slot by ID or number
        let parkingSlot;
        if (mongoose.Types.ObjectId.isValid(slotId)) {
            parkingSlot = await ParkingSlot.findById(slotId);
        } else {
            parkingSlot = await ParkingSlot.findOne({ slotNumber: slotId });
        }

        if (!parkingSlot) {
            return res.status(404).json({ error: 'Parking slot not found' });
        }

        // Update slot status
        parkingSlot.status = isOccupied ? 'occupied' : 'available';
        await parkingSlot.save();

        // Log parking event if a user is associated
        if (userId) {
            const parkingLog = new ParkingLog({
                userId: userId,
                slotId: parkingSlot._id,
                entryTime: new Date(),
                vehicleDetails: vehicleDetails || {},
                paymentStatus: 'pending'
            });

            await parkingLog.save();
        }

        res.json({ 
            message: 'Slot updated successfully', 
            slotStatus: parkingSlot.status,
            slotNumber: parkingSlot.slotNumber
        });
    } catch (error) {
        console.error('Error updating slot:', error);
        res.status(500).json({ 
            error: 'Failed to update sensor status',
            details: error.message 
        });
    }
});

// API endpoint to send commands to Arduino
app.post('/api/send', (req, res) => {
    const command = req.body.command;
    
    if (!command) {
        return res.status(400).json({ error: 'No command provided' });
    }

    writeToArduino(command);

    res.json({ response: 'Command sent to Arduino' });
});

// Check Arduino connection status
app.get('/api/status', (req, res) => {
    res.json({ 
        connected: arduinoPort.isOpen,
        port: arduinoPort.path
    });
});

// Add a new route to check sensor connection status
app.get('/api/sensor-status', (req, res) => {
    try {
        // Check if Arduino port is open and connected
        if (arduinoPort && arduinoPort.isOpen) {
            res.status(200).json({ 
                status: 'connected', 
                lastConnection: new Date().toISOString() 
            });
        } else {
            res.status(503).json({ 
                status: 'disconnected', 
                message: 'Arduino port is not open' 
            });
        }
    } catch (error) {
        console.error('Error checking sensor status:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Could not check sensor status' 
        });
    }
});

// API endpoint to check Arduino connection status
app.get('/api/arduino-status', (req, res) => {
    try {
        // Simulate an error condition
        if (!arduinoPort) {
            console.error('Arduino port not initialized');
            return res.status(500).json({
                connected: false,
                error: 'Arduino port not initialized',
                details: 'SerialPort configuration missing or failed'
            });
        }

        // Check port status
        const isConnected = arduinoPort.isOpen;
        console.log('Arduino connection status:', { 
            isConnected, 
            path: arduinoPort.path 
        });
        
        res.json({
            connected: isConnected,
            port: arduinoPort.path,
            lastError: arduinoPort.lastError || null
        });
    } catch (error) {
        console.error('Critical error checking Arduino status:', error);
        res.status(500).json({ 
            connected: false,
            error: 'Failed to check Arduino status',
            details: error.message
        });
    }
});

// API endpoint to simulate vehicle detection
app.post('/api/simulate-vehicle', (req, res) => {
    console.log('---SIMULATE VEHICLE REQUEST---');
    console.log('Received body:', req.body);
    
    try {
        const { slotId, detected } = req.body;
        
        // Validate input
        if (!slotId || slotId < 1 || slotId > TOTAL_SLOTS) {
            console.error('Invalid slot ID:', { slotId, totalSlots: TOTAL_SLOTS });
            return res.status(400).json({ 
                error: 'Invalid slot ID',
                details: { slotId, totalSlots: TOTAL_SLOTS }
            });
        }

        // Get array index (0-based)
        const arrayIndex = slotId - 1;

        // Update slot status based on simulation
        parkingSlots[arrayIndex].occupied = detected;
        parkingSlots[arrayIndex].lastUpdated = new Date();

        // Calculate new counts
        const occupiedCount = parkingSlots.filter(slot => slot.occupied).length;

        console.log('Vehicle simulation successful:', {
            slotId,
            detected,
            totalOccupied: occupiedCount,
            slot: parkingSlots[arrayIndex]
        });

        // Send success response with current state
        res.json({
            success: true,
            message: `Slot ${slotId} vehicle ${detected ? 'detected' : 'removed'}`,
            slot: parkingSlots[arrayIndex],
            totalSlots: TOTAL_SLOTS,
            occupiedSlots: occupiedCount,
            availableSlots: TOTAL_SLOTS - occupiedCount,
            allSlots: parkingSlots.map(slot => ({
                id: slot.id,
                occupied: slot.occupied,
                lastUpdated: slot.lastUpdated
            }))
        });
    } catch (error) {
        console.error('Error in vehicle simulation:', error);
        res.status(500).json({ 
            error: 'Failed to simulate vehicle detection',
            details: error.message 
        });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    console.log('---LOGIN ROUTE CALLED---');
    console.log('Request Body (Sanitized):', {
        username: req.body.username,
        passwordLength: req.body.password ? req.body.password.length : 'N/A'
    });

    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            console.log('Missing username or password');
            return res.status(400).json({ 
                message: 'Username and password are required',
                error: 'Incomplete credentials' 
            });
        }

        // Find user by username
        const user = await User.findOne({ username });

        // Check if user exists
        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ 
                message: 'Invalid username or password',
                error: 'User not found' 
            });
        }

        // Perform manual password comparison
        console.log('Password Verification:');
        console.log('Stored Hashed Password:', user.password);
        console.log('Attempted Password Length:', password.length);

        // Use bcrypt to compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        
        console.log('Password Match Result:', isMatch);

        // Check password
        if (!isMatch) {
            console.log('Authentication Failed for User:', username);
            return res.status(401).json({ 
                message: 'Invalid username or password',
                error: 'Authentication failed' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: user._id, 
                username: user.username, 
                role: user.role 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // Respond with token and user info
        console.log('Login successful for user:', username);
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                role: user.role,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login route error:', error);
        res.status(500).json({ 
            message: 'Server error during login',
            error: error.message 
        });
    }
});

// Logout Route
app.post('/api/auth/logout', (req, res) => {
    try {
        // On the client-side, the token will be removed from local storage
        // On the server-side, we can implement token blacklisting if needed
        console.log('User logout attempt');
        
        res.status(200).json({ 
            message: 'Logout successful',
            action: 'clear_token'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ 
            message: 'Server error during logout',
            error: error.message 
        });
    }
});

// Protected Admin Route Example
app.get('/api/admin/dashboard', authenticateToken, async (req, res) => {
    // Check if user is an admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Fetch admin dashboard data
        const totalUsers = await User.countDocuments();
        const totalSlots = await ParkingSlot.countDocuments();
        const activeReservations = await Reservation.countDocuments({ status: 'active' });

        res.json({
            totalUsers,
            totalSlots,
            activeReservations
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).json({ message: 'Error fetching admin dashboard data' });
    }
});

// Add configuration endpoint
app.get('/api/config/vehicle-controls', (req, res) => {
    res.json({
        isVisible: VehicleControlsConfig.isVisible
    });
});

// Session timeout configuration endpoint
app.get('/api/config/session-timeout', (req, res) => {
    res.json({
        timeoutMinutes: SessionTimeoutConfig.timeoutMinutes,
        gracePeriodSeconds: SessionTimeoutConfig.gracePeriodSeconds
    });
});

// Token refresh endpoint
app.post('/api/auth/refresh-token', authenticateToken, (req, res) => {
    try {
        // Extract user info from authenticated request
        const { id, username, role } = req.user;

        // Generate new token
        const newToken = jwt.sign(
            { id, username, role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({ 
            message: 'Token refreshed successfully',
            token: newToken 
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ message: 'Failed to refresh token' });
    }
});

// Initialize parking slots in database
async function initializeParkingSlots() {
    try {
        // Check if slots already exist
        const existingSlots = await ParkingSlot.countDocuments();
        
        if (existingSlots > 0) {
            console.log(`Parking slots already initialized. Total slots: ${existingSlots}`);
            return;
        }

        // Create 6 parking slots with specific sensor pins
        const slotsToCreate = [
            {
                slotNumber: 1,
                status: 'available',
                sensors: {
                    triggerPin: 2,
                    echoPin: 3
                },
                location: {
                    section: 'A1',
                    coordinates: {
                        latitude: 37.7749,
                        longitude: -122.4194
                    }
                },
                currentVehicle: null
            },
            {
                slotNumber: 2,
                status: 'available',
                sensors: {
                    triggerPin: 4,
                    echoPin: 5
                },
                location: {
                    section: 'A2',
                    coordinates: {
                        latitude: 37.7750,
                        longitude: -122.4195
                    }
                },
                currentVehicle: null
            },
            {
                slotNumber: 3,
                status: 'available',
                sensors: {
                    triggerPin: 6,
                    echoPin: 7
                },
                location: {
                    section: 'B1',
                    coordinates: {
                        latitude: 37.7751,
                        longitude: -122.4196
                    }
                },
                currentVehicle: null
            },
            {
                slotNumber: 4,
                status: 'available',
                sensors: {
                    triggerPin: 8,
                    echoPin: 9
                },
                location: {
                    section: 'B2',
                    coordinates: {
                        latitude: 37.7752,
                        longitude: -122.4197
                    }
                },
                currentVehicle: null
            },
            {
                slotNumber: 5,
                status: 'available',
                sensors: {
                    triggerPin: 10,
                    echoPin: 11
                },
                location: {
                    section: 'C1',
                    coordinates: {
                        latitude: 37.7753,
                        longitude: -122.4198
                    }
                },
                currentVehicle: null
            },
            {
                slotNumber: 6,
                status: 'available',
                sensors: {
                    triggerPin: 12,
                    echoPin: 13
                },
                location: {
                    section: 'C2',
                    coordinates: {
                        latitude: 37.7754,
                        longitude: -122.4199
                    }
                },
                currentVehicle: null
            }
        ];

        // Insert slots into database
        const createdSlots = await ParkingSlot.insertMany(slotsToCreate);
        
        console.log('Parking Slots Initialized:', createdSlots.map(slot => ({
            slotNumber: slot.slotNumber,
            status: slot.status,
            triggerPin: slot.sensors.triggerPin,
            echoPin: slot.sensors.echoPin
        })));
    } catch (error) {
        console.error('Error initializing parking slots:', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack
        });
        throw error; // Re-throw to allow caller to handle
    }
}

// Modified vehicle detection route to use database
app.post('/api/simulate-slot/:slotId', authenticateToken, async (req, res) => {
    try {
        const slotId = parseInt(req.params.slotId);
        const { occupied } = req.body;
        const userId = req.user.id;
        const currentTime = new Date();

        console.error('CRITICAL: Slot Update Request Details', {
            slotId: slotId,
            occupied: occupied,
            userId: userId,
            currentTime: currentTime.toISOString(),
            userDetails: req.user
        });

        // Verify user and authentication
        if (!userId) {
            console.error('CRITICAL: No user ID found in authentication');
            return res.status(401).json({ error: 'Authentication failed' });
        }

        // Find the slot in the database by slot number
        const slot = await ParkingSlot.findOne({ slotNumber: slotId });
        
        if (!slot) {
            console.error('CRITICAL: Slot not found in database', { 
                slotId, 
                existingSlots: await ParkingSlot.find({}, 'slotNumber') 
            });
            
            // If no slots exist, initialize them first
            await initializeParkingSlots();
            
            // Try finding the slot again
            const reinitializedSlot = await ParkingSlot.findOne({ slotNumber: slotId });
            
            if (!reinitializedSlot) {
                return res.status(404).json({ 
                    error: 'Slot not found', 
                    details: 'Failed to initialize slots' 
                });
            }
        }

        console.error('CRITICAL: Slot Found', {
            slotNumber: slot.slotNumber,
            previousStatus: slot.status
        });

        // Update slot status
        slot.status = occupied ? 'occupied' : 'available';
        
        // Update vehicle details if occupied
        if (occupied) {
            slot.currentVehicle = {
                userId: userId,
                entryTime: currentTime,
                licensePlate: `SIM${slotId}` // Simulated license plate
            };

            // Create a new parking log entry
            const parkingLog = new ParkingLog({
                userId: userId,
                slotId: slot._id,
                entryTime: currentTime,
                vehicleDetails: {
                    licensePlate: `SIM${slotId}`,
                    vehicleType: 'car'
                }
            });

            try {
                await parkingLog.save();
                console.error('CRITICAL: Parking Log Created', {
                    logId: parkingLog._id,
                    slotId: slotId,
                    entryTime: parkingLog.entryTime,
                    userId: parkingLog.userId
                });
            } catch (saveError) {
                console.error('CRITICAL: Failed to Save Parking Log', {
                    error: saveError.message,
                    stack: saveError.stack
                });
                return res.status(500).json({ 
                    error: 'Failed to create parking log', 
                    details: saveError.message 
                });
            }
        } else {
            // If slot is now available, try to find and update the most recent parking log
            const activeParkingLog = await ParkingLog.findOne({
                slotId: slot._id,
                exitTime: null
            });

            if (activeParkingLog) {
                // Set exitTime and calculate duration
                activeParkingLog.exitTime = currentTime;
                
                // Calculate duration in minutes
                const duration = (currentTime - activeParkingLog.entryTime) / (1000 * 60);
                activeParkingLog.duration = Math.round(duration);
                
                try {
                    await activeParkingLog.save();
                    console.error('CRITICAL: Parking Log Updated', {
                        logId: activeParkingLog._id,
                        slotId: slotId,
                        entryTime: activeParkingLog.entryTime,
                        exitTime: activeParkingLog.exitTime,
                        duration: activeParkingLog.duration
                    });
                } catch (updateError) {
                    console.error('CRITICAL: Failed to Update Parking Log', {
                        error: updateError.message,
                        stack: updateError.stack
                    });
                    return res.status(500).json({ 
                        error: 'Failed to update parking log', 
                        details: updateError.message 
                    });
                }
            } else {
                console.error('CRITICAL: No Active Parking Log Found', {
                    slotId: slotId,
                    currentTime: currentTime.toISOString()
                });
            }

            // Clear current vehicle details
            slot.currentVehicle = null;
        }

        // Save changes and log the result
        try {
            const savedSlot = await slot.save();
            console.error('CRITICAL: Slot Updated Successfully', {
                slotNumber: savedSlot.slotNumber,
                status: savedSlot.status,
                currentVehicle: savedSlot.currentVehicle
            });

            res.json({
                message: 'Slot updated successfully',
                slot: savedSlot
            });
        } catch (saveError) {
            console.error('CRITICAL: Error Saving Slot', {
                error: saveError.message,
                stack: saveError.stack
            });
            res.status(500).json({ 
                error: 'Failed to save slot', 
                details: saveError.message 
            });
        }
    } catch (error) {
        console.error('CRITICAL: Slot Simulation Error', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            error: 'Failed to simulate slot', 
            details: error.message 
        });
    }
});

// Get current status of all slots
app.get('/api/slots/status', authenticateToken, async (req, res) => {
    try {
        const slots = await ParkingSlot.find().sort({ slotNumber: 1 });
        res.json(slots.map(slot => ({
            id: slot.slotNumber,
            occupied: slot.status === 'occupied',
            lastUpdated: slot.currentVehicle?.entryTime || new Date()
        })));
    } catch (error) {
        console.error('Error fetching slot status:', error);
        res.status(500).json({ error: 'Failed to fetch slot status' });
    }
});

// Get current parking slot status
app.get('/api/parking-slots', authenticateToken, async (req, res) => {
    try {
        // Ensure slots exist before fetching
        await initializeParkingSlots();
        
        const slots = await ParkingSlot.find().sort({ slotNumber: 1 });
        
        console.log('Fetched parking slots:', slots.map(slot => ({
            slotNumber: slot.slotNumber,
            status: slot.status,
            currentVehicle: slot.currentVehicle ? {
                licensePlate: slot.currentVehicle.licensePlate,
                entryTime: slot.currentVehicle.entryTime
            } : null
        })));

        res.json({ 
            slots: slots.map(slot => ({
                slotNumber: slot.slotNumber,
                status: slot.status,
                currentVehicle: slot.currentVehicle,
                sensorData: slot.sensorData
            }))
        });
    } catch (error) {
        console.error('Error fetching parking slots:', error);
        res.status(500).json({ error: 'Failed to fetch parking slots', details: error.message });
    }
});

// Parking Database Simulation
const parkingDatabase = {
    parkingEvents: [],

    recordParkingEvent(slotId, isOccupied) {
        const event = {
            slotId,
            timestamp: new Date(),
            isOccupied
        };
        this.parkingEvents.push(event);
    },

    getParkingDataByDate(date) {
        const targetDate = new Date(date);
        return this.parkingEvents.filter(event => 
            event.timestamp.toDateString() === targetDate.toDateString() && event.isOccupied
        );
    }
};

// Analytics Routes
app.get('/api/analytics/:period', authenticateToken, async (req, res) => {
    try {
        const period = req.params.period; // 'day', 'week', or 'month'
        const now = new Date();
        let startDate;
        
        // Set time range based on period
        switch (period) {
            case 'day':
                // Start of today (local time)
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                // Start of 7 days ago (local time)
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                // Start of 30 days ago (local time)
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            default:
                throw new Error('Invalid period');
        }

        console.log('Fetching analytics for period:', {
            period,
            startDate: startDate.toISOString(),
            now: now.toISOString(),
            startDateLocal: startDate.toString(),
            nowLocal: now.toString()
        });

        // Fetch parking data for the current period
        const parkingData = await ParkingLog.find({
            $or: [
                // Vehicles that entered during the period
                { entryTime: { $gte: startDate, $lte: now } },
                // Vehicles that were already parked and haven't left yet
                {
                    entryTime: { $lt: startDate },
                    $or: [
                        { exitTime: null },
                        { exitTime: { $gte: startDate } }
                    ]
                }
            ]
        })
        .sort('entryTime')
        .lean() // Convert to plain JavaScript objects
        .exec();

        // Convert dates to Date objects
        parkingData.forEach(log => {
            log.entryTime = new Date(log.entryTime);
            if (log.exitTime) {
                log.exitTime = new Date(log.exitTime);
            }
        });

        console.log('Found parking data:', {
            count: parkingData.length,
            firstEntry: parkingData[0]?.entryTime.toString(),
            lastEntry: parkingData[parkingData.length - 1]?.entryTime.toString(),
            sampleData: parkingData.slice(0, 2).map(log => ({
                entryTime: log.entryTime.toString(),
                exitTime: log.exitTime?.toString() || 'Still parked',
                slotId: log.slotId
            }))
        });

        // Get previous period data for trends
        const previousStartDate = new Date(startDate);
        switch (period) {
            case 'day':
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                break;
            case 'week':
                previousStartDate.setDate(previousStartDate.getDate() - 7);
                break;
            case 'month':
                previousStartDate.setMonth(previousStartDate.getMonth() - 1);
                break;
        }
        
        const previousParkingData = await ParkingLog.find({
            $or: [
                // Vehicles that entered during the previous period
                { 
                    entryTime: { 
                        $gte: previousStartDate,
                        $lt: startDate
                    }
                },
                // Vehicles that were already parked and haven't left yet
                {
                    entryTime: { $lt: previousStartDate },
                    $or: [
                        { exitTime: null },
                        { exitTime: { $gte: previousStartDate } }
                    ]
                }
            ]
        })
        .lean()
        .exec();

        // Convert dates for previous data
        previousParkingData.forEach(log => {
            log.entryTime = new Date(log.entryTime);
            if (log.exitTime) {
                log.exitTime = new Date(log.exitTime);
            }
        });

        console.log('Previous period data:', {
            count: previousParkingData.length,
            startDate: previousStartDate.toString(),
            endDate: startDate.toString(),
            sampleData: previousParkingData.slice(0, 2).map(log => ({
                entryTime: log.entryTime.toString(),
                exitTime: log.exitTime?.toString() || 'Still parked',
                slotId: log.slotId
            }))
        });

        // Calculate analytics
        const avgDuration = calculateAverageDuration(parkingData);
        const occupancyRate = calculateOccupancyRate(parkingData);
        const { peakHour, peakHourVehicles } = findPeakHour(parkingData);
        const totalVehicles = parkingData.length;

        // Calculate trends
        const trends = calculateTrends(
            { totalVehicles, avgDuration, occupancyRate },
            { 
                totalVehicles: previousParkingData.length,
                avgDuration: calculateAverageDuration(previousParkingData),
                occupancyRate: calculateOccupancyRate(previousParkingData)
            }
        );

        // Generate occupancy timeline
        const occupancyTimeline = generateOccupancyTimeline(parkingData);

        const response = {
            totalVehicles,
            vehiclesTrend: trends.totalVehicles,
            avgDuration,
            durationTrend: trends.avgDuration,
            occupancyRate,
            occupancyTrend: trends.occupancyRate,
            peakHour,
            peakHourVehicles,
            occupancyTimeline
        };

        console.log('Analytics response:', response);
        res.json(response);

    } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});

// Analytics Helper Functions
function calculateAverageDuration(parkingData) {
    if (!parkingData || parkingData.length === 0) return 0;

    let totalDuration = 0;
    let validEntries = 0;

    parkingData.forEach(entry => {
        if (entry.entryTime && entry.exitTime) {
            const duration = entry.exitTime - entry.entryTime;
            if (duration > 0) {
                totalDuration += duration;
                validEntries++;
            }
        }
    });

    return validEntries > 0 ? Math.round(totalDuration / validEntries / (1000 * 60)) : 0; // Convert to minutes
}

function calculateOccupancyRate(parkingData) {
    if (!parkingData || parkingData.length === 0) return 0;

    const TOTAL_SLOTS = 6; // Total number of parking slots
    const now = new Date();

    // Count current occupied slots
    const occupiedSlots = parkingData.filter(entry => {
        return entry.entryTime <= now && (!entry.exitTime || entry.exitTime > now);
    }).length;

    return Math.min(Math.round((occupiedSlots / TOTAL_SLOTS) * 100), 100);
}

function calculateTrends(currentData, previousData) {
    return {
        totalVehicles: calculateTrendPercentage(currentData.totalVehicles, previousData.totalVehicles),
        avgDuration: calculateTrendPercentage(currentData.avgDuration, previousData.avgDuration),
        occupancyRate: calculateTrendPercentage(currentData.occupancyRate, previousData.occupancyRate)
    };
}

function calculateTrendPercentage(current, previous) {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

function findPeakHour(parkingData) {
    if (!parkingData || parkingData.length === 0) {
        console.log('No parking data available for peak hour calculation');
        return { peakHour: '--:--', peakHourVehicles: 0 };
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const TOTAL_SLOTS = 6;

    // Initialize hourly counts
    const hourlyOccupancy = new Array(24).fill(0).map(() => new Set());

    // Process each parking record
    parkingData.forEach(log => {
        const entryTime = new Date(log.entryTime);
        const exitTime = log.exitTime ? new Date(log.exitTime) : now;
        
        console.log('Processing vehicle for peak hour:', {
            slotId: log.slotId,
            entryTime: entryTime.toString(),
            exitTime: exitTime.toString()
        });

        // Calculate the hour range for this vehicle
        let currentHour = new Date(entryTime);
        currentHour.setMinutes(0, 0, 0);

        while (currentHour <= exitTime && currentHour < now) {
            const hourIndex = currentHour.getHours();
            hourlyOccupancy[hourIndex].add(log.slotId.toString());
            
            // Move to next hour
            currentHour.setHours(currentHour.getHours() + 1);
        }
    });

    // Find the peak hour
    let maxOccupancy = 0;
    let peakHourIndex = -1;

    hourlyOccupancy.forEach((slots, hour) => {
        const occupancy = slots.size;
        console.log('Hour occupancy:', {
            hour: formatHour(hour),
            occupancy,
            slots: Array.from(slots)
        });

        if (occupancy > maxOccupancy) {
            maxOccupancy = occupancy;
            peakHourIndex = hour;
        }
    });

    // Handle case where no peak hour was found
    if (peakHourIndex === -1) {
        console.log('No peak hour found in the data');
        return { peakHour: '--:--', peakHourVehicles: 0 };
    }

    const result = {
        peakHour: formatHour(peakHourIndex),
        peakHourVehicles: Math.min(maxOccupancy, TOTAL_SLOTS)
    };

    console.log('Peak hour calculation result:', {
        ...result,
        peakHourIndex,
        maxOccupancy,
        actualSlots: Array.from(hourlyOccupancy[peakHourIndex])
    });

    return result;
}

function formatHour(hour) {
    if (hour < 0 || hour >= 24) {
        console.log('Invalid hour value:', hour);
        return '--:--';
    }
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:00 ${period}`;
}

function generateOccupancyTimeline(parkingData) {
    console.log('Generating occupancy timeline with data:', 
        parkingData.map(log => ({
            slotId: log.slotId.toString(),
            entryTime: new Date(log.entryTime).toString(),
            exitTime: log.exitTime ? new Date(log.exitTime).toString() : 'Still parked'
        }))
    );

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const TOTAL_SLOTS = 6;
    
    // Initialize arrays for each hour of the day
    const hourlyOccupancy = Array(24).fill(0).map(() => new Set());
    const timeLabels = [];
    
    // Generate hourly labels and calculate occupancy
    for (let hour = 0; hour < 24; hour++) {
        // Format label in 12-hour format
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        timeLabels.push(`${hour12}:00 ${period}`);

        // Calculate hour boundaries
        const hourStart = new Date(startOfDay);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1, 0, 0, 0);

        // Check each parking record for this hour
        parkingData.forEach(log => {
            const entryTime = new Date(log.entryTime);
            const exitTime = log.exitTime ? new Date(log.exitTime) : now;

            // Vehicle is present if:
            // 1. It entered before or during this hour AND
            // 2. It exited after this hour started OR hasn't exited yet
            if (entryTime <= hourEnd && exitTime >= hourStart) {
                hourlyOccupancy[hour].add(log.slotId.toString());
            }
        });

        console.log(`Hour ${timeLabels[hour]}:`, {
            uniqueSlots: Array.from(hourlyOccupancy[hour]),
            occupiedCount: hourlyOccupancy[hour].size,
            totalSlots: TOTAL_SLOTS,
            hourStart: hourStart.toString(),
            hourEnd: hourEnd.toString()
        });
    }

    // Calculate occupancy rates
    const occupancyValues = hourlyOccupancy.map(slots => {
        const occupancyRate = Math.min((slots.size / TOTAL_SLOTS) * 100, 100);
        return Math.round(occupancyRate);
    });

    const result = { labels: timeLabels, values: occupancyValues };

    // Validate timeline data
    console.log('Timeline validation:', {
        maxOccupancy: Math.max(...occupancyValues),
        minOccupancy: Math.min(...occupancyValues),
        avgOccupancy: occupancyValues.reduce((a, b) => a + b, 0) / occupancyValues.length,
        nonZeroHours: occupancyValues.filter(v => v > 0).length,
        hourlyData: timeLabels.map((label, i) => ({
            hour: label,
            occupancy: occupancyValues[i],
            slots: Array.from(hourlyOccupancy[i])
        }))
    });

    return result;
}

function calculateOccupancyRate(parkingData) {
    if (!parkingData || parkingData.length === 0) return 0;

    const TOTAL_SLOTS = 6;
    const now = new Date();

    // Get unique slots that are currently occupied
    const occupiedSlots = new Set();
    parkingData.forEach(entry => {
        if (entry.entryTime <= now && (!entry.exitTime || entry.exitTime > now)) {
            occupiedSlots.add(entry.slotId.toString());
        }
    });

    console.log('Current occupancy:', {
        occupiedSlots: Array.from(occupiedSlots),
        totalOccupied: occupiedSlots.size,
        totalSlots: TOTAL_SLOTS,
        rate: (occupiedSlots.size / TOTAL_SLOTS) * 100
    });

    return Math.min(Math.round((occupiedSlots.size / TOTAL_SLOTS) * 100), 100);
}

// Get user role
app.get('/api/user/role', authenticateToken, (req, res) => {
    res.json({ role: req.user.role });
});

// Get all slots status
app.get('/api/slots', authenticateToken, async (req, res) => {
    try {
        const slots = await ParkingSlot.find().sort('slotNumber');
        res.json(slots.map(slot => ({
            slotNumber: slot.slotNumber,
            status: slot.status,
            lastUpdated: slot.sensorData?.lastUpdated
        })));
    } catch (error) {
        console.error('Error fetching slots:', error);
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});

// Get session timeout configuration
app.get('/api/config/session-timeout', authenticateToken, (req, res) => {
    res.json({
        warningTime: SessionTimeoutConfig.warningTime,
        logoutTime: SessionTimeoutConfig.logoutTime
    });
});

// Get Arduino connection status
app.get('/api/arduino-status', authenticateToken, (req, res) => {
    res.json({ connected: arduinoPort.isOpen });
});

// Get analytics data
app.get('/api/analytics/:period', authenticateToken, async (req, res) => {
    try {
        const { period } = req.params;
        const now = new Date();
        let startDate;

        // Calculate start date based on period
        switch (period) {
            case 'day':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            default:
                return res.status(400).json({ error: 'Invalid period' });
        }

        console.log('Fetching parking data from:', startDate, 'to:', now);

        // Fetch parking data - include both entry and exit times in the query
        const parkingData = await ParkingLog.find({
            $or: [
                // Vehicles that entered during the period
                { entryTime: { $gte: startDate, $lte: now } },
                // Vehicles that were already parked and haven't left yet
                {
                    entryTime: { $lt: startDate },
                    $or: [
                        { exitTime: null },
                        { exitTime: { $gte: startDate } }
                    ]
                }
            ]
        }).sort('entryTime');

        console.log('Found parking data:', parkingData.length, 'records');

        // Get previous period data for trends
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - (period === 'day' ? 1 : period === 'week' ? 7 : 30));
        
        const previousParkingData = await ParkingLog.find({
            entryTime: { 
                $gte: previousStartDate,
                $lt: startDate
            }
        });

        // Calculate analytics
        const avgDuration = calculateAverageDuration(parkingData);
        const prevAvgDuration = calculateAverageDuration(previousParkingData);
        const occupancyRate = calculateOccupancyRate(parkingData);
        const prevOccupancyRate = calculateOccupancyRate(previousParkingData);
        const { peakHour, peakHourVehicles } = findPeakHour(parkingData);
        const totalVehicles = parkingData.length;
        const prevTotalVehicles = previousParkingData.length;

        // Calculate trends
        const trends = calculateTrends(
            { totalVehicles, avgDuration, occupancyRate },
            { totalVehicles: prevTotalVehicles, avgDuration: prevAvgDuration, occupancyRate: prevOccupancyRate }
        );

        // Generate timeline data
        const occupancyTimeline = generateOccupancyTimeline(parkingData);

        const response = {
            totalVehicles,
            vehiclesTrend: trends.totalVehicles,
            avgDuration,
            durationTrend: trends.avgDuration,
            occupancyRate,
            occupancyTrend: trends.occupancyRate,
            peakHour,
            peakHourVehicles,
            ...trends,
            occupancyTimeline
        };

        console.log('Analytics response:', response);
        res.json(response);

    } catch (error) {
        console.error('Error generating analytics:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});

// API endpoint to get client config
app.get('/api/client-config', authenticateToken, (req, res) => {
    res.json({
        sessionTimeout: {
            timeoutMinutes: process.env.SESSION_TIMEOUT_MINUTES || 30,
            gracePeriodSeconds: process.env.GRACE_PERIOD_SECONDS || 30
        },
        features: {
            showVehicleSimulation: process.env.SHOW_VEHICLE_SIMULATION_CONTROLS === 'true'
        }
    });
});

// Config endpoint
app.get('/api/config', authenticateToken, (req, res) => {
    res.json({
        showVehicleSimulationControls: process.env.SHOW_VEHICLE_SIMULATION_CONTROLS === 'true',
        sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30,
        gracePeriod: parseInt(process.env.GRACE_PERIOD_SECONDS) || 30
    });
});

// Token Validation Endpoint
app.post('/api/validate-token', async (req, res) => {
    const token = req.body.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Optional: Additional checks like checking user existence
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Token is valid
        res.json({ 
            valid: true, 
            user: {
                id: user._id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        // Token is invalid or expired
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Start the server
app.listen(port, async () => {
    await connectDB();
    await initializeParkingSlots();
    console.log(`Parking Slot Management running at http://localhost:${port}`);
});
