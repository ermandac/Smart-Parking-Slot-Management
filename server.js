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

// Configure Serial Port (update with your Arduino's port)
const arduinoPort = new SerialPort({
    path: '/dev/ttyUSB0',  // Change this to match your Arduino's port
    baudRate: 9600
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

// API endpoint to update slot status (simulating sensor detection)
app.post('/api/update-slot', (req, res) => {
    console.log('Received sensor detection:', req.body);
    
    try {
        const { slotId } = req.body;
        
        console.log('Processing sensor data:', { slotId, type: typeof slotId });
        
        // Validate slot ID
        if (!slotId || slotId < 1 || slotId > TOTAL_SLOTS) {
            console.error('Invalid slot ID:', { slotId, totalSlots: TOTAL_SLOTS });
            return res.status(400).json({ 
                error: 'Invalid slot ID',
                details: { slotId, totalSlots: TOTAL_SLOTS }
            });
        }

        // Get array index (0-based)
        const arrayIndex = slotId - 1;
        const previousStatus = parkingSlots[arrayIndex].occupied;

        // Update slot status (simulating sensor detection)
        parkingSlots[arrayIndex].occupied = !previousStatus;
        parkingSlots[arrayIndex].lastUpdated = new Date();

        // Simulate sending command to Arduino
        const command = `SLOT:${slotId},STATUS:${parkingSlots[arrayIndex].occupied ? '1' : '0'}`;
        if (arduinoPort && arduinoPort.isOpen) {
            arduinoPort.write(command + '\n', (err) => {
                if (err) {
                    console.error('Error writing to Arduino:', err);
                } else {
                    console.log('Command sent to Arduino:', command);
                }
            });
        } else {
            console.log('Arduino not connected, simulating sensor:', command);
        }

        // Calculate new counts
        const occupiedCount = parkingSlots.filter(slot => slot.occupied).length;

        console.log('Sensor update successful:', {
            slotId,
            previousStatus,
            newStatus: parkingSlots[arrayIndex].occupied,
            totalOccupied: occupiedCount,
            slot: parkingSlots[arrayIndex]
        });

        // Send success response with current state
        res.json({
            success: true,
            message: `Slot ${slotId} sensor updated`,
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
        console.error('Error updating sensor status:', error);
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

    arduinoPort.write(command, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to send command' });
        }
        
        // Read response from Arduino
        arduinoPort.once('data', (data) => {
            res.json({ response: data.toString().trim() });
        });
    });
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
        const slots = await ParkingSlot.find();
        if (slots.length === 0) {
            // Create initial slots if none exist
            const slotsToCreate = Array.from({ length: 6 }, (_, i) => ({
                slotNumber: i + 1,
                status: 'available'
            }));
            await ParkingSlot.insertMany(slotsToCreate);
            console.log('Initialized parking slots in database');
        }
    } catch (error) {
        console.error('Error initializing parking slots:', error);
    }
}

// Modified vehicle detection route to use database
app.post('/api/simulate-slot/:slotId', authenticateToken, async (req, res) => {
    try {
        console.log('Simulating slot:', {
            slotId: req.params.slotId,
            occupied: req.body.occupied,
            userId: req.user.id
        });

        const slotId = parseInt(req.params.slotId);
        const { occupied } = req.body;
        const userId = req.user.id;

        // Update slot status in database
        const slot = await ParkingSlot.findOne({ slotNumber: slotId });
        console.log('Found slot:', slot);

        if (!slot) {
            console.error('Slot not found:', slotId);
            return res.status(404).json({ error: 'Slot not found' });
        }

        // Update slot status
        slot.status = occupied ? 'occupied' : 'available';
        
        // Update current vehicle info if occupied
        if (occupied) {
            slot.currentVehicle = {
                userId: userId,
                entryTime: new Date(),
                licensePlate: `SIM${slotId}` // Simulated license plate
            };
        } else {
            slot.currentVehicle = null;
        }

        console.log('Saving slot with updates:', slot);
        await slot.save();

        // Create parking log entry
        if (occupied) {
            const parkingLog = new ParkingLog({
                userId: userId,
                slotId: slot._id,
                vehicleDetails: {
                    licensePlate: `SIM${slotId}`,
                    vehicleType: 'car'
                },
                entryTime: new Date(),
                status: 'active'
            });
            console.log('Creating parking log:', parkingLog);
            await parkingLog.save();
        }

        res.json({ 
            success: true, 
            slot: {
                id: slot.slotNumber,
                status: slot.status,
                lastUpdated: new Date()
            }
        });
    } catch (error) {
        console.error('Error in simulate-slot:', error);
        res.status(500).json({ 
            error: 'Failed to update slot status',
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

// Reporting Routes
app.get('/api/reports/daily', authenticateToken, (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const parkingData = parkingDatabase.getParkingDataByDate(date);

        // Calculate metrics
        const totalSlots = 6;
        const reportData = {
            totalOccupancies: parkingData.length,
            averageOccupancyRate: (parkingData.length / totalSlots) * 100,
            peakHours: calculatePeakHours(parkingData)
        };

        res.json(reportData);
    } catch (error) {
        console.error('Daily report generation error:', error);
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

// PDF Report Generation
app.get('/api/reports/pdf', authenticateToken, async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const parkingData = await ParkingLog.find({
            entryTime: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            }
        }).populate('userId', 'username').exec();

        // Format data for PDF
        const formattedData = parkingData.map(log => ({
            slotId: log.slotId,
            entryTime: log.entryTime.toLocaleString(),
            exitTime: log.exitTime ? log.exitTime.toLocaleString() : 'N/A',
            duration: log.exitTime ? 
                Math.round((log.exitTime - log.entryTime) / (1000 * 60)) + ' minutes' : 
                'Still parked',
            user: log.userId ? log.userId.username : 'Unknown'
        }));

        // Calculate summary
        const summary = {
            totalParking: parkingData.length,
            averageDuration: parkingData.reduce((acc, log) => {
                if (log.exitTime) {
                    return acc + (log.exitTime - log.entryTime) / (1000 * 60);
                }
                return acc;
            }, 0) / parkingData.length || 0
        };

        res.json({
            date: date.toLocaleDateString(),
            summary,
            details: formattedData
        });
    } catch (error) {
        console.error('PDF report generation error:', error);
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
});

// CSV Report Generation
app.get('/api/reports/csv', authenticateToken, async (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const parkingData = await ParkingLog.find({
            entryTime: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            }
        }).populate('userId', 'username').exec();

        // Create CSV content
        const csvRows = [];
        csvRows.push(['Slot ID', 'Entry Time', 'Exit Time', 'Duration (minutes)', 'User']);

        parkingData.forEach(log => {
            csvRows.push([
                log.slotId,
                log.entryTime.toLocaleString(),
                log.exitTime ? log.exitTime.toLocaleString() : 'N/A',
                log.exitTime ? Math.round((log.exitTime - log.entryTime) / (1000 * 60)) : 'N/A',
                log.userId ? log.userId.username : 'Unknown'
            ]);
        });

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=parking-report-${date.toISOString().split('T')[0]}.csv`);

        // Send CSV content
        res.send(csvRows.map(row => row.join(',')).join('\n'));
    } catch (error) {
        console.error('CSV report generation error:', error);
        res.status(500).json({ error: 'Failed to generate CSV report' });
    }
});

// Helper function to calculate peak hours
function calculatePeakHours(parkingData) {
    const hourlyOccupancy = new Array(24).fill(0);
    
    parkingData.forEach(entry => {
        const hour = entry.timestamp.getHours();
        hourlyOccupancy[hour]++;
    });

    return hourlyOccupancy.map((count, hour) => ({
        hour,
        occupancyCount: count
    })).sort((a, b) => b.occupancyCount - a.occupancyCount).slice(0, 3);
}

// Helper function to check sensor connection for a specific slot
function checkSlotSensorConnection(slotId) {
    // This is a placeholder. In a real system, you would:
    // 1. Track actual sensor connection status
    // 2. Check if the specific slot's sensor is responding
    // 3. Handle potential connection issues

    try {
        // Simulate sensor connection check
        // You might want to replace this with actual sensor connection logic
        if (!arduinoPort || !arduinoPort.isOpen) {
            return false; // Arduino not connected
        }

        // Example: Randomly disconnect some sensors for demonstration
        // In a real system, this would be based on actual sensor communication
        return Math.random() > 0.2; // 80% chance of being connected
    } catch (error) {
        console.error(`Error checking sensor for slot ${slotId}:`, error);
        return false;
    }
}

// Error handling for Serial Port
arduinoPort.on('error', (err) => {
    console.error('Serial Port Error:', err.message);
});

// Serial Port Data Processing
arduinoPort.on('data', (data) => {
    try {
        // Parse incoming data from Arduino
        // Expected format: "SLOT:1,STATUS:1" or "SLOT:2,STATUS:0"
        const dataStr = data.toString().trim();
        const match = dataStr.match(/SLOT:(\d+),STATUS:(\d+)/);
        
        if (match) {
            const slotId = parseInt(match[1]);
            const occupied = match[2] === '1';
            
            console.log('Arduino Data Received:', { slotId, occupied });
            
            // Validate slot ID
            if (slotId > 0 && slotId <= TOTAL_SLOTS) {
                // Update the specific slot's status
                parkingSlots[slotId - 1].occupied = occupied;
                parkingSlots[slotId - 1].lastUpdated = new Date();
                
                console.log('Updated Slot:', parkingSlots[slotId - 1]);
                console.log('All Slots:', parkingSlots);
            } else {
                console.error('Invalid slot ID:', slotId);
            }
        } else {
            console.error('Invalid data format:', dataStr);
        }
    } catch (error) {
        console.error('Error processing Arduino data:', error);
    }
});

// Reporting Routes
const reportService = new ReportService(parkingDatabase);
app.get('/api/reports/daily', (req, res) => {
    try {
        const date = req.query.date ? new Date(req.query.date) : new Date();
        const reportData = reportService.generateDailyReport(date);
        res.json(reportData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate report' });
    }
});

app.get('/api/reports/pdf', (req, res) => {
    try {
        const reportData = reportService.generateDailyReport();
        const pdfPath = reportService.generatePDFReport(reportData);
        res.download(pdfPath);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate PDF report' });
    }
});

app.get('/api/reports/csv', (req, res) => {
    try {
        const reportData = reportService.generateDailyReport();
        const csvPath = reportService.exportToCSV(reportData);
        res.download(csvPath);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate CSV report' });
    }
});

// Analytics Routes
app.get('/api/analytics/:period', authenticateToken, async (req, res) => {
    try {
        const period = req.params.period; // 'day', 'week', or 'month'
        const now = new Date();
        let startDate;
        
        // Set time range based on period
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
                throw new Error('Invalid period');
        }

        // Fetch parking data
        const parkingData = await ParkingLog.find({
            entryTime: { $gte: startDate }
        }).populate('userId', 'username').exec();

        // Calculate KPIs
        const totalVehicles = parkingData.length;
        const avgDuration = calculateAverageDuration(parkingData);
        const occupancyRate = calculateOccupancyRate(parkingData);
        const { peakHour, peakHourVehicles } = findPeakHour(parkingData);

        // Calculate trends (comparing with previous period)
        const previousPeriodData = await ParkingLog.find({
            entryTime: {
                $gte: new Date(startDate.getTime() - (startDate - now)),
                $lt: startDate
            }
        }).exec();

        const trends = calculateTrends(parkingData, previousPeriodData);

        // Generate timeline data
        const occupancyTimeline = generateOccupancyTimeline(parkingData);
        
        // Generate slot distribution data
        const slotDistribution = await generateSlotDistribution(parkingData);
        
        // Generate hourly statistics
        const hourlyStats = generateHourlyStats(parkingData);

        res.json({
            totalVehicles,
            avgDuration,
            occupancyRate,
            peakHour,
            peakHourVehicles,
            ...trends,
            occupancyTimeline,
            slotDistribution,
            hourlyStats
        });

    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to generate analytics' });
    }
});

// Analytics Helper Functions
function calculateAverageDuration(parkingData) {
    const completedParkings = parkingData.filter(log => log.exitTime);
    if (completedParkings.length === 0) return 0;
    
    const totalDuration = completedParkings.reduce((acc, log) => {
        return acc + (log.exitTime - log.entryTime);
    }, 0);
    
    return totalDuration / completedParkings.length / (1000 * 60); // Convert to minutes
}

function calculateOccupancyRate(parkingData) {
    const totalSlots = 6;
    const totalMinutes = 24 * 60;
    const occupiedMinutes = parkingData.reduce((acc, log) => {
        const duration = log.exitTime ? 
            (log.exitTime - log.entryTime) : 
            (new Date() - log.entryTime);
        return acc + duration / (1000 * 60);
    }, 0);
    
    return (occupiedMinutes / (totalSlots * totalMinutes)) * 100;
}

function findPeakHour(parkingData) {
    const hourlyCount = new Array(24).fill(0);
    
    parkingData.forEach(log => {
        const hour = log.entryTime.getHours();
        hourlyCount[hour]++;
    });
    
    const peakHour = hourlyCount.indexOf(Math.max(...hourlyCount));
    return {
        peakHour: `${peakHour.toString().padStart(2, '0')}:00`,
        peakHourVehicles: hourlyCount[peakHour]
    };
}

function calculateTrends(currentData, previousData) {
    const calculateTrend = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };
    
    return {
        vehiclesTrend: calculateTrend(currentData.length, previousData.length),
        durationTrend: calculateTrend(
            calculateAverageDuration(currentData),
            calculateAverageDuration(previousData)
        ),
        occupancyTrend: calculateTrend(
            calculateOccupancyRate(currentData),
            calculateOccupancyRate(previousData)
        )
    };
}

function generateOccupancyTimeline(parkingData) {
    const timeLabels = [];
    const occupancyValues = [];
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    
    // Generate hourly labels
    for (let i = 0; i < 24; i++) {
        timeLabels.push(`${i.toString().padStart(2, '0')}:00`);
        const hourStart = new Date(startOfDay);
        hourStart.setHours(i);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(i + 1);
        
        // Count occupied slots during this hour
        const occupiedSlots = parkingData.filter(log => {
            return log.entryTime <= hourEnd && 
                (!log.exitTime || log.exitTime >= hourStart);
        }).length;
        
        occupancyValues.push(occupiedSlots);
    }
    
    return {
        labels: timeLabels,
        values: occupancyValues
    };
}

async function generateSlotDistribution(parkingData) {
    const slots = await ParkingSlot.find().exec();
    const slotUsage = slots.map(slot => ({
        label: `Slot ${slot.slotNumber}`,
        value: parkingData.filter(log => 
            log.slotId.toString() === slot._id.toString()
        ).length
    }));
    
    return {
        labels: slotUsage.map(slot => slot.label),
        values: slotUsage.map(slot => slot.value)
    };
}

function generateHourlyStats(parkingData) {
    const hourlyStats = [];
    
    for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date();
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setHours(hour + 1);
        
        const hourlyParkings = parkingData.filter(log => 
            log.entryTime >= hourStart && log.entryTime < hourEnd
        );
        
        const avgDuration = calculateAverageDuration(hourlyParkings);
        const occupancyRate = calculateOccupancyRate(hourlyParkings);
        
        // Calculate trend (compare with previous hour)
        const previousHourParkings = parkingData.filter(log => {
            const prevHourStart = new Date(hourStart);
            prevHourStart.setHours(hour - 1);
            return log.entryTime >= prevHourStart && log.entryTime < hourStart;
        });
        
        const trend = calculateTrends(hourlyParkings, previousHourParkings).vehiclesTrend;
        
        hourlyStats.push({
            hour: hour.toString().padStart(2, '0'),
            vehicles: hourlyParkings.length,
            avgDuration,
            occupancyRate,
            trend
        });
    }
    
    return hourlyStats;
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

        // Get parking data for the period
        const parkingData = await ParkingLog.find({
            timestamp: { $gte: startDate }
        }).sort('timestamp');

        // Get previous period data for trends
        const previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - (period === 'day' ? 1 : period === 'week' ? 7 : 30));
        
        const previousParkingData = await ParkingLog.find({
            timestamp: { 
                $gte: previousStartDate,
                $lt: startDate
            }
        });

        // Calculate analytics
        const avgDuration = calculateAverageDuration(parkingData);
        const prevAvgDuration = calculateAverageDuration(previousParkingData);
        const occupancyRate = calculateOccupancyRate(parkingData);
        const prevOccupancyRate = calculateOccupancyRate(previousParkingData);
        const { hour: peakHour, vehicles: peakHourVehicles } = findPeakHour(parkingData);
        const totalVehicles = parkingData.length;
        const prevTotalVehicles = previousParkingData.length;

        // Calculate trends
        const trends = calculateTrends(
            { totalVehicles, avgDuration, occupancyRate },
            { totalVehicles: prevTotalVehicles, avgDuration: prevAvgDuration, occupancyRate: prevOccupancyRate }
        );

        // Generate timeline and distribution data
        const occupancyTimeline = generateOccupancyTimeline(parkingData, period);
        const slotDistribution = generateSlotDistribution(parkingData);

        res.json({
            totalVehicles,
            vehiclesTrend: trends.totalVehicles,
            avgDuration,
            durationTrend: trends.avgDuration,
            occupancyRate,
            occupancyTrend: trends.occupancyRate,
            peakHour,
            peakHourVehicles,
            occupancyTimeline,
            slotDistribution
        });
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

// Start the server
app.listen(port, async () => {
    await connectDB();
    await initializeParkingSlots();
    console.log(`Parking Slot Management running at http://localhost:${port}`);
});
