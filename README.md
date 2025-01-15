# Smart Parking Slot Management System

A modern web-based parking management system with real-time monitoring, analytics, and Arduino integration.

## Features

### Admin Dashboard
- Real-time parking slot monitoring
- Parking status overview (Total/Occupied/Available slots)
- System status monitoring (Arduino connection)
- Dark theme UI for better visibility
- Vehicle simulation controls (configurable via environment variables)

### Analytics Dashboard
- Historical parking data analysis
- Usage patterns visualization
- Peak hour identification
- Occupancy rate tracking

### Security Features
- JWT-based authentication
- Session timeout management
- Secure password handling with show/hide option
- Environment variable configuration

## Tech Stack

- **Frontend**:
  - HTML5, CSS3, JavaScript
  - Bootstrap 5.1.3
  - Font Awesome 6.0.0
  - Chart.js for analytics

- **Backend**:
  - Node.js
  - Express.js
  - MongoDB
  - JWT for authentication
  - Socket.IO for real-time updates

- **Hardware**:
  - Arduino for sensor integration
  - IR sensors for vehicle detection

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Smart-Parking-Slot-Management.git
   cd Smart-Parking-Slot-Management
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with the following configuration:
   ```env
   PORT=3000
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   SHOW_VEHICLE_SIMULATION_CONTROLS=true
   SESSION_TIMEOUT_MINUTES=30
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port number | 3000 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | Secret key for JWT | - |
| `NODE_ENV` | Environment mode | development |
| `SHOW_VEHICLE_SIMULATION_CONTROLS` | Toggle simulation controls | true |
| `SESSION_TIMEOUT_MINUTES` | Session timeout duration | 30 |

## API Endpoints

### Authentication
- `POST /api/login` - User authentication
- `POST /api/extend-session` - Extend user session

### Configuration
- `GET /api/config` - Get system configuration

### Parking Management
- `GET /api/slots` - Get all parking slots
- `GET /api/slots/:id` - Get specific slot details
- `POST /api/slots/:id/occupy` - Mark slot as occupied
- `POST /api/slots/:id/vacate` - Mark slot as available

### Analytics
- `GET /api/analytics/usage` - Get parking usage data
- `GET /api/analytics/peak-hours` - Get peak hour analysis

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to all contributors
- Inspired by modern parking management systems
- Built with ❤️ using Node.js and Arduino
