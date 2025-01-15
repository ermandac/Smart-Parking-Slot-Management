# MongoDB Connection Troubleshooting Guide

## Common Connection Issues

### 1. Deprecated Connection Options
In recent versions of Mongoose, several connection options have been deprecated:
- `useNewUrlParser`
- `useUnifiedTopology`
- `useCreateIndex`
- `useFindAndModify`

**Solution**: Remove these options from your connection configuration.

### 2. Mongoose Connection Configuration

```javascript
// Recommended Mongoose Connection
mongoose.connect(process.env.MONGODB_URI);

// Add global configuration
mongoose.set('strictQuery', true);
```

### 3. Verify MongoDB URI

Ensure your `.env` file has the correct MongoDB URI:
```
MONGODB_URI=mongodb://localhost:27017/your_database_name
```

### 4. Check MongoDB Service

```bash
# Check MongoDB service status
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod

# Enable MongoDB to start on boot
sudo systemctl enable mongod
```

### 5. Debugging Connection Issues

```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected Successfully'))
  .catch((error) => {
    console.error('MongoDB Connection Error:', error.message);
    // Additional error handling
  });

// Add error event listeners
mongoose.connection.on('error', (error) => {
  console.error('Mongoose Connection Error:', error);
});

mongoose.connection.once('open', () => {
  console.log('Mongoose connection established');
});
```

### 6. Network and Firewall Considerations

- Ensure MongoDB is listening on the correct interface
- Check firewall settings
- Verify no port conflicts

### 7. Authentication and Security

If using authentication:
```
MONGODB_URI=mongodb://username:password@localhost:27017/your_database
```

### 8. Node.js and Mongoose Compatibility

- Use Node.js >= 16.0.0
- Use Mongoose 8.x
- Keep dependencies updated

### Troubleshooting Checklist

1. Is MongoDB running?
2. Is the URI correct?
3. Are there any network restrictions?
4. Do you have the correct credentials?
5. Are your Node.js and Mongoose versions compatible?

## Emergency Recovery

```bash
# Completely reset MongoDB
sudo systemctl stop mongod
sudo rm -rf /var/lib/mongodb/*
sudo systemctl start mongod
```

**WARNING**: Only use the above command if you're okay with losing all data!

## Logging and Monitoring

Enable verbose logging in Mongoose:
```javascript
mongoose.set('debug', true);
```

## Contact Support

If none of these solutions work, prepare the following information:
- MongoDB version
- Mongoose version
- Node.js version
- Full error message
- Connection URI (with sensitive info removed)
