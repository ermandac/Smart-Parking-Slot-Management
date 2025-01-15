# Smart Parking Slot Management System 🚗🅿️

## Project Overview

A comprehensive, full-stack smart parking management solution that leverages modern web technologies, Arduino hardware, and real-time data processing to provide an intelligent parking monitoring system.

![Project Banner](project-banner.png)

## 🌟 Key Features

### 1. Real-Time Parking Monitoring
- Instant detection of parking slot occupancy
- Live status updates for each parking slot
- Visual indicators for slot availability

### 2. Web-Based Management Dashboard
- Responsive admin and analytics interfaces
- Detailed parking slot statistics
- User authentication and access control

### 3. Hardware Integration
- Arduino-based sensor network
- Ultrasonic distance sensors for precise vehicle detection
- LED status indicators

### 4. Data Analytics
- Historical parking usage analysis
- Peak hour identification
- Occupancy rate tracking

## 🛠 Technology Stack

### Frontend
- HTML5, CSS3
- Bootstrap 5.1.3
- JavaScript (ES6+)
- Chart.js for data visualization

### Backend
- Node.js
- Express.js
- MongoDB for data storage
- Socket.IO for real-time updates
- JWT for authentication

### Hardware
- Arduino Uno/Nano
- HC-SR04 Ultrasonic Sensors
- Green Status LEDs

## 🔧 System Architecture

### Components
1. **Arduino Sensor Module**
   - Manages physical sensor readings
   - Detects vehicle presence in parking slots
   - Sends real-time status via serial communication

2. **Web Server**
   - Handles API requests
   - Manages user authentication
   - Processes and stores parking data

3. **Database**
   - Stores parking logs
   - Maintains user accounts
   - Tracks historical parking data

4. **Frontend Dashboard**
   - Displays real-time parking status
   - Provides analytics and reporting

## 📦 Hardware Setup

### Arduino Pin Configuration

| Pin | Component | Description |
|-----|-----------|-------------|
| D2  | Ultrasonic Trigger 1 | Trigger pin for parking slot 1 sensor |
| D3  | Ultrasonic Echo 1 | Echo pin for parking slot 1 sensor |
| D4  | Ultrasonic Trigger 2 | Trigger pin for parking slot 2 sensor |
| D5  | Ultrasonic Echo 2 | Echo pin for parking slot 2 sensor |
| D6  | Ultrasonic Trigger 3 | Trigger pin for parking slot 3 sensor |
| D7  | Ultrasonic Echo 3 | Echo pin for parking slot 3 sensor |
| D8  | Ultrasonic Trigger 4 | Trigger pin for parking slot 4 sensor |
| D9  | Ultrasonic Echo 4 | Echo pin for parking slot 4 sensor |
| D10 | LED 1 | Status indicator for slot 1 (Green) |
| D11 | LED 2 | Status indicator for slot 2 (Green) |
| D12 | LED 3 | Status indicator for slot 3 (Green) |
| D13 | LED 4 | Status indicator for slot 4 (Green) |

### Hardware Requirements
- 1x Arduino Uno/Nano
- 4x HC-SR04 Ultrasonic Distance Sensors
- 4x Green LEDs
- 4x 220Ω resistors
- Jumper wires
- Breadboard
- USB cable for Arduino

## 🚀 Installation and Setup

### Prerequisites
- Node.js (v14+ recommended)
- MongoDB
- Arduino IDE
- Git

### Backend Setup
1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/Smart-Parking-Slot-Management.git
   cd Smart-Parking-Slot-Management
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create `.env` file
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/parkingdb
   JWT_SECRET=your_secret_key
   ARDUINO_PORT=/dev/ttyUSB0  # Adjust based on your system
   ```

4. Start the server
   ```bash
   npm start
   ```

### Arduino Setup
1. Open `ParkingSlotManager.ino` in Arduino IDE
2. Install required libraries
3. Upload sketch to Arduino board
4. Connect sensors and LEDs as per pin configuration

### Frontend Access
- Open `http://localhost:3000` in your browser
- Login with admin credentials

## 📊 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Web server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | Authentication secret | - |
| `ARDUINO_PORT` | Serial port for Arduino | /dev/ttyUSB0 |
| `LOG_LEVEL` | Logging verbosity | info |

## 🧪 Testing

### Backend Tests
```bash
npm test
```

### Parking Log Verification
```bash
npm run test-parking-log
```

## 🔒 Security Features
- JWT-based authentication
- Secure password hashing
- Role-based access control
- Environment-based configuration

## 📈 Performance Metrics
- Real-time sensor update: 100ms
- Maximum supported parking slots: 4
- Sensor accuracy: ±1cm
- Web dashboard refresh rate: Real-time

## 🤝 Contributing
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License
MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments
- Arduino Community
- Node.js Open Source Contributors
- MongoDB Team

## 📞 Support
For issues, feature requests, or contributions, please open a GitHub issue.

---

**Built with ❤️ for smart urban mobility**
