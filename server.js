const express = require('express');
const { SerialPort } = require('serialport');
const path = require('path');
const fs = require('fs');
const { connectDB } = require('./models');
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

// Import models (optional, but can be useful)
const { User, ParkingSlot, Reservation, ParkingLog } = require('./models');

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

// Route for admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
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

// Modify existing vehicle detection routes to record events
app.post('/api/simulate-slot/:slotId', authenticateToken, (req, res) => {
    const { slotId } = req.params;
    const { occupied } = req.body;

    // Record parking event in the database
    parkingDatabase.recordParkingEvent(slotId, occupied);

    // Existing simulation logic
    // ... (previous implementation)

    res.json({ success: true });
});

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

// Start the server
app.listen(port, () => {
    console.log(`Parking Slot Management running at http://localhost:${port}`);
});
