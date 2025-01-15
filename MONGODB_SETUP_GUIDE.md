# MongoDB Setup Guide for Smart Parking System

## 1. Preliminary Steps

### Install libssl1.1 (if not already done)
```bash
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
```

## 2. MongoDB Installation

### Add MongoDB Repository
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
```

### Install MongoDB
```bash
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### Start and Enable MongoDB Service
```bash
sudo systemctl start mongod
sudo systemctl enable mongod
```

## 3. Verify MongoDB Installation

### Check Service Status
```bash
sudo systemctl status mongod
```

### Verify Port Listening
```bash
sudo netstat -tuln | grep 27017
```

## 4. Prepare Node.js Dependencies

### Install Required Packages
```bash
npm install mongoose bcrypt dotenv
```

## 5. Create Admin User

### Run Seed Script
```bash
cd /path/to/Automatic\ Parking\ Slot
node scripts/seed-admin.js
```

## Admin User Details
- **Username**: `admin`
- **Email**: `admin@smartparking.com`
- **Initial Password**: `AdminPassword123!`
- **Role**: `admin`

## Troubleshooting

### Common Issues
1. **MongoDB Not Running**
   - Check service status: `sudo systemctl status mongod`
   - Restart service: `sudo systemctl restart mongod`

2. **Connection Errors**
   - Verify MongoDB URI in `.env` file
   - Check network connectivity
   - Ensure correct port (default: 27017)

3. **Dependency Problems**
   - Reinstall dependencies: `npm install`
   - Check Node.js and MongoDB versions compatibility

## Security Recommendations
- Change default admin password immediately
- Use strong, unique passwords
- Enable MongoDB authentication
- Restrict network access

## Backup and Maintenance

### Backup MongoDB
```bash
# Create a backup
mongodump --db smart-parking-system

# Restore from backup
mongorestore --db smart-parking-system path/to/backup
```

### Update MongoDB
```bash
sudo apt-get update
sudo apt-get upgrade mongodb-org
```

## Useful Commands

### MongoDB Shell
```bash
# Connect to MongoDB
mongosh

# List databases
show dbs

# Switch to project database
use smart-parking-system
```

## Next Steps
1. Change admin password after first login
2. Set up additional user roles
3. Configure database access controls

## Version Information
- **MongoDB Version**: 6.0
- **Node.js Mongoose**: Latest version
- **Operating System**: Ubuntu (Focal)

**Last Updated**: {{ CURRENT_DATE }}

**Note**: Always keep this documentation updated with any changes to the setup process.
