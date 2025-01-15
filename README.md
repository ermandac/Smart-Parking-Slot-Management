# Smart Parking Slot Management System

## Overview
An intelligent parking management system that uses Arduino sensors to detect vehicle presence and provides a modern web-based interface for real-time monitoring, analytics, and control.

## Features
- **Real-time Monitoring**: Live updates of parking slot occupancy
- **Analytics Dashboard**: 
  - Total vehicles, average parking duration, and occupancy rate
  - Peak hour analysis with vehicle counts
  - Interactive occupancy timeline chart
  - Slot usage distribution visualization
- **Admin Controls**: 
  - Manual slot status override
  - Vehicle simulation for testing
  - Batch operations (occupy/clear all slots)
- **Security**: 
  - JWT-based authentication
  - Role-based access control
  - Session timeout management
- **Database Integration**: 
  - MongoDB for persistent storage
  - Parking logs and analytics
  - Historical data tracking

## System Architecture
### Frontend
- **Framework**: Node.js with Express
- **UI Libraries**: 
  - Bootstrap 5.2.3 for responsive design
  - Chart.js for analytics visualization
  - Font Awesome for icons
- **Real-time Updates**: Fetch API with automatic refresh

### Backend
- **Server**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Hardware Integration**: Arduino sensor interface
- **API Endpoints**:
  - `/api/slots`: Get slot status
  - `/api/simulate-slot/:id`: Simulate vehicle detection
  - `/api/analytics/:period`: Get analytics data
  - `/api/auth/*`: Authentication endpoints

### Hardware
- Arduino Uno/Mega
- Ultrasonic Sensors (HC-SR04)
- USB Connection for Arduino-Server communication

## Installation

### Prerequisites
- Node.js (v14+)
- MongoDB
- Arduino IDE (for hardware setup)
- Modern web browser

### Setup Steps
1. Clone the repository
```bash
git clone https://github.com/yourusername/smart-parking-system.git
cd smart-parking-system
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env` file with:
```env
MONGODB_URI=mongodb://localhost:27017/parking-system
JWT_SECRET=your-secret-key
PORT=3000
```

4. Start MongoDB
```bash
mongod
```

5. Start the server
```bash
npm start
```

6. Access the web interface
Open `http://localhost:3000` in your browser

### Hardware Setup (Optional)
If using actual Arduino sensors:

1. Connect sensors according to pinout configuration
2. Upload Arduino sketch
3. Update `config.js` with correct serial port

## Usage

### Admin Interface
1. Login with admin credentials
2. View real-time parking status
3. Access analytics dashboard
4. Use simulation controls for testing

### Analytics Dashboard
- Switch between day/week/month views
- Monitor key performance indicators
- View occupancy patterns
- Track usage statistics

### Vehicle Simulation
For testing without hardware:
1. Use "Slot X Occupied" buttons to simulate vehicles
2. Use "Occupy All" for full capacity testing
3. Use "Clear All" to reset all slots

## API Documentation

### Authentication
```
POST /api/auth/login
POST /api/auth/refresh-token
```

### Slot Management
```
GET /api/slots
POST /api/simulate-slot/:id
```

### Analytics
```
GET /api/analytics/:period
```

## Configuration

### Session Management
- Warning timeout: 5 minutes
- Logout timeout: 10 minutes

### Arduino Settings
- Distance threshold: 20cm
- Sensor polling rate: 1000ms

## Development

### Running Tests
```bash
npm test
```

### Code Style
- ESLint configuration included
- Prettier for formatting

## Security Considerations
- All API endpoints are protected with JWT
- Session timeout for security
- CORS protection enabled
- Input validation on all endpoints

## Troubleshooting
- Check MongoDB connection if data doesn't persist
- Verify JWT token for authentication issues
- Check browser console for frontend errors
- Monitor server logs for backend issues

## Contributing
1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License
MIT License - See LICENSE file for details
