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

### MongoDB Installation

#### Ubuntu/Debian Linux
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update package database
sudo apt-get update

# Install MongoDB packages
sudo apt-get install -y mongodb-org

# Start MongoDB service
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod

# Verify installation
mongod --version
```

#### macOS (using Homebrew)
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify installation
mongod --version
```

#### Windows
##### Method 1: Installer (Recommended for Beginners)
1. Download MongoDB Community Server:
   - Visit: https://www.mongodb.com/try/download/community
   - Select "Windows" platform
   - Choose "MSI" installer
   - Select the latest stable version

2. Run the Installer:
   - Run the downloaded `.msi` file
   - Choose "Complete" setup type
   - Select "Install MongoDB as a Service"
   - Check "Install MongoDB Compass" (recommended)
   - Click "Install"

3. Configure Environment Variables:
   - Open "System Properties" > "Advanced" > "Environment Variables"
   - Under "System variables", edit "Path"
   - Add MongoDB installation path (typically `C:\Program Files\MongoDB\Server\6.0\bin`)

4. Create Data Directory:
   Open PowerShell as Administrator:
   ```powershell
   # Create default MongoDB data directory
   mkdir C:\data\db

   # Optional: Create a custom data directory
   mkdir C:\MongoDB\data
   ```

5. Start MongoDB Service:
   ```powershell
   # Start MongoDB service
   Start-Service MongoDB

   # Optional: Set service to start automatically
   Set-Service MongoDB -StartupType Automatic
   ```

##### Method 2: Chocolatey Package Manager (Advanced Users)
1. Install Chocolatey (if not already installed):
   Open PowerShell as Administrator:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force
   [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
   iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. Install MongoDB:
   ```powershell
   choco install mongodb --version=6.0.5
   choco install mongodb-compass
   ```

##### Verification
```powershell
# Check MongoDB version
mongod --version

# Connect to MongoDB
mongo
```

##### Troubleshooting
- Firewall: Allow MongoDB through Windows Firewall
- Antivirus: Add MongoDB to exclusion list
- Permissions: Run PowerShell or Command Prompt as Administrator
- Log Location: `C:\Program Files\MongoDB\Server\6.0\log\mongod.log`

##### Common Error Solutions
1. Service Startup Failure:
   ```powershell
   # Reinstall MongoDB service
   mongod --remove
   mongod --install
   ```

2. Port Conflicts:
   - Default MongoDB port is 27017
   - Check for conflicts using:
     ```powershell
     netstat -ano | findstr :27017
     ```

3. Permission Issues:
   ```powershell
   # Ensure proper ownership of data directory
   icacls C:\data\db /grant "Everyone":(OI)(CI)F
   ```

##### Security Best Practices
1. Enable Authentication:
   ```powershell
   # Create admin user
   use admin
   db.createUser({
     user: "adminUser",
     pwd: "strongPassword",
     roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
   })

   # Enable authentication in config
   security:
     authorization: enabled
   ```

2. Use Strong Passwords
3. Limit Network Exposure
4. Keep MongoDB Updated

### Initial Database Setup
```bash
# Connect to MongoDB
mongo

# Create database
use parkingdb

# Create admin user (replace with your credentials)
use admin
db.createUser({
  user: "parkingadmin",
  pwd: "your_secure_password",
  roles: ["readWriteAnyDatabase", "dbAdminAnyDatabase"]
})

# Switch to project database
use parkingdb
```

### Troubleshooting
- Ensure MongoDB service is running
- Check firewall settings
- Verify connection string in `.env` file
- For connection issues, check MongoDB logs
  - Ubuntu: `/var/log/mongodb/mongod.log`
  - macOS: `/usr/local/var/log/mongodb/mongo.log`
  - Windows: `C:\Program Files\MongoDB\Server\6.0\log\mongod.log`

### Security Recommendations
- Always use strong, unique passwords
- Limit network access to MongoDB
- Use authentication and authorization
- Regularly update MongoDB

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
