# Smart Parking Slot Management System

## Overview
An intelligent parking management system that uses Arduino sensors to detect vehicle presence and a web-based interface for real-time monitoring and control.

## System Architecture
- **Frontend**: Node.js with Express
- **Backend**: Arduino sensor integration
- **Communication**: Serial communication via USB
- **Sensors**: Ultrasonic distance sensors

## Hardware Requirements
- Arduino Uno/Mega
- Ultrasonic Sensors (HC-SR04)
- Breadboard
- Jumper Wires
- USB Cable

## Sensor Pinout Configuration
### Arduino Uno Pinout for Parking Sensors
| Slot | Trigger Pin | Echo Pin | VCC | GND |
|------|-------------|----------|-----|-----|
| Slot 1 | Digital Pin 2 | Digital Pin 3 | 5V | GND |
| Slot 2 | Digital Pin 4 | Digital Pin 5 | 5V | GND |
| Slot 3 | Digital Pin 6 | Digital Pin 7 | 5V | GND |
| Slot 4 | Digital Pin 8 | Digital Pin 9 | 5V | GND |
| Slot 5 | Digital Pin 10 | Digital Pin 11 | 5V | GND |
| Slot 6 | Digital Pin 12 | Digital Pin 13 | 5V | GND |

## Sensor Wiring Diagram
```
Arduino Uno
    +---------------------+
    |                     |
    |  5V   GND           |
    |   |    |            |
    |   |    |            |
HC-SR04 Sensor Connections |
    |                     |
Slot 1: Trigger(D2) Echo(D3)
Slot 2: Trigger(D4) Echo(D5)
Slot 3: Trigger(D6) Echo(D7)
Slot 4: Trigger(D8) Echo(D9)
Slot 5: Trigger(D10) Echo(D11)
Slot 6: Trigger(D12) Echo(D13)
    |                     |
    +---------------------+
```

## Installation

### Prerequisites
- Node.js (v14+)
- Arduino IDE
- USB Cable

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

3. Upload Arduino Sketch
- Open `arduino_sketch.ino` in Arduino IDE
- Select your Arduino board
- Upload the sketch to the Arduino

4. Start the Web Server
```bash
npm start
```

5. Access the Web Interface
Open `http://localhost:3000` in your browser

## Configuration
- Modify `config.json` to adjust sensor thresholds
- Update `server.js` with correct Arduino port

## Sensor Calibration
- Adjust `DISTANCE_THRESHOLD` in Arduino sketch
- Typical values:
  - Empty slot: > 20 cm
  - Occupied slot: < 10 cm

## Vehicle Simulation Configuration

### Overview
The vehicle simulation service allows for automated testing and demonstration of the parking system.

### Configuration Options
You can configure the vehicle simulation by modifying the `.env` file:

- `ENABLE_VEHICLE_SIMULATION`: 
  - `true`: Enable vehicle simulation
  - `false`: Disable vehicle simulation
- `SIMULATION_INTERVAL_MS`: Time between simulation cycles (default: 5000ms)
- `SIMULATION_MAX_VEHICLES`: Maximum number of vehicles to simulate (default: 10)
- `SIMULATION_PARKING_SLOTS`: Number of parking slots to simulate (default: 5)

### Example Configuration
```
# Enable or disable vehicle simulation
ENABLE_VEHICLE_SIMULATION=true

# Simulation timing (in milliseconds)
SIMULATION_INTERVAL_MS=5000

# Simulation limits
SIMULATION_MAX_VEHICLES=10
SIMULATION_PARKING_SLOTS=5
```

### Simulation Behavior
- Randomly parks and removes vehicles
- Generates unique license plates
- Supports different vehicle types (car, motorcycle, truck)
- Respects parking slot availability

## Authentication System

### Overview
The authentication system provides secure user management with role-based access control.

### Features
- Secure password hashing using bcrypt
- JWT-based authentication
- Role-based access (admin, user)
- Comprehensive error handling

### Authentication Workflow
1. User submits login credentials
2. Server validates username and password
3. If valid, generates a JWT token
4. Token includes user ID, username, and role
5. Token expires after 1 hour

### Default Admin Credentials
- **Username**: `admin`
- **Email**: `admin@smartparking.com`
- **Initial Password**: `AdminPassword123!`

### Security Measures
- Passwords are never stored in plain text
- Bcrypt used for password hashing
- Salted password storage
- JWT for secure, stateless authentication

### Environment Variables
- `JWT_SECRET`: Used for signing authentication tokens
- `MONGODB_URI`: Database connection string

### Troubleshooting
- Ensure MongoDB is running
- Check `.env` file for correct configuration
- Verify network and firewall settings

## Session Management

### Session Timeout
- Automatic session timeout after 30 minutes of inactivity
- Grace period of 60 seconds before forced logout
- Configurable in `.env` file

### Configuration Options
```
# Session Timeout Configuration
SESSION_TIMEOUT_MINUTES=30   # Timeout duration
GRACE_PERIOD_SECONDS=60      # Warning period before logout
```

### Features
- Automatic session warning
- Option to extend session
- Secure token refresh mechanism
- Prevents unauthorized access

## Version Control

This project uses Git for version control.

### Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Start the server: `npm start`

### Version History

#### v0.1.0 (Current Version)
- Initial project setup
- Basic parking slot management
- User authentication
- Session timeout feature
- Reporting and analytics foundation

### Development Workflow

- `main` branch: Stable releases
- `develop` branch: Active development
- Feature branches: `feature/description`
- Hotfix branches: `hotfix/description`

### Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Scripts
- `npm run seed-admin`: Reset admin user
- `npm start`: Start the application

## Troubleshooting
- Ensure Arduino drivers are installed
- Check USB connection
- Verify serial port in `server.js`
- Monitor console for connection errors

## Future Improvements
- Implement password reset functionality
- Add machine learning for parking prediction
- Implement mobile app integration
- Create advanced analytics dashboard
- Enhance logging and monitoring

## License
MIT License

## Contributors
- [Your Name]
- [Contributor Names]

## Support
For issues, please file a GitHub issue or contact support@example.com
