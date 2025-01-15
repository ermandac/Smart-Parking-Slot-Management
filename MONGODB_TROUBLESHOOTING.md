# MongoDB Installation Troubleshooting Guide

## Installation Methods

### 1. Docker Installation (Recommended)
```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io

# Pull MongoDB image
sudo docker pull mongo:latest

# Run MongoDB container
sudo docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### 2. Traditional Package Installation
```bash
# Import MongoDB GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org
```

## Common SSL/Dependency Issues

### Resolving libssl1.1 Problems
```bash
# Download libssl1.1 for Ubuntu 20.04
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb

# Install the package
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
```

## Verification and Debugging

### Check MongoDB Status
```bash
# For systemd-managed MongoDB
sudo systemctl status mongod

# For Docker
sudo docker ps | grep mongodb
sudo docker logs mongodb
```

### Connection Testing
```bash
# Using MongoDB Shell
mongosh

# Connection string for Node.js/Mongoose
mongodb://localhost:27017/your_database
```

## Potential Solutions for Dependency Issues

1. **Update Package Lists**
```bash
sudo apt-get clean
sudo apt-get update
sudo apt-get upgrade
```

2. **Force Dependency Resolution**
```bash
sudo apt-get -f install
```

3. **Manually Install Dependencies**
```bash
# Install potential missing dependencies
sudo apt-get install -y libssl-dev
```

## Node.js Mongoose Connection Tips

```javascript
mongoose.connect('mongodb://localhost:27017/your_database', {
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
  w: 'majority'
});

// Connection event handlers
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});
```

## Security Recommendations
- Use authentication
- Enable SSL/TLS
- Restrict network access
- Regularly update MongoDB

## Fallback Options
1. Use MongoDB Atlas (cloud-hosted)
2. Use SQLite for development
3. Use in-memory database for testing
