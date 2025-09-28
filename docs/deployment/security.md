# Production Security Configuration

Security best practices and configuration for production deployment.

## Security Overview

The BIM Viewer implements multiple layers of security for production deployment:

- **Authentication**: Loytec device integration
- **Session Management**: Secure server-side sessions  
- **Network Security**: HTTPS and proper headers
- **Input Validation**: Server-side request validation
- **Development Safeguards**: Auto-disabled dev features

## Authentication Security

### Loytec Integration
```bash
# Production environment
LOYTEC_BASE_URL=https://secure-loytec-device.local
NODE_ENV=production
VITE_DEV_SKIP_AUTH=false  # Must be false or omitted
```

### Session Management
```javascript
// server/server.js
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const sessionStore = new Map(); // Use Redis in production

// Session validation
const isValidSession = (sessionId) => {
  const session = sessionStore.get(sessionId);
  return session && (Date.now() - session.lastActivity) < SESSION_DURATION;
};
```

### Password Policies
- Passwords handled by Loytec device
- No password storage in BIM Viewer
- Session-based authentication only

## Network Security

### HTTPS Configuration

#### Self-Signed Certificates (Development)
```bash
# Generate certificates
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```

#### Production HTTPS Setup
```javascript
// server/server.js - HTTPS configuration
const https = require('https');
const fs = require('fs');

const httpsOptions = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem'),
  // Optional: Certificate chain
  ca: fs.readFileSync('path/to/ca-bundle.pem')
};

if (process.env.NODE_ENV === 'production') {
  https.createServer(httpsOptions, app).listen(8001, () => {
    console.log('HTTPS Server running on port 8001');
  });
} else {
  app.listen(8001, () => {
    console.log('HTTP Server running on port 8001 (development)');
  });
}
```

### Security Headers

The server automatically includes security headers:

```javascript
// server/server.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Required for SharedArrayBuffer
}));
```

### CORS Configuration
```javascript
// Production CORS settings
app.use(cors({
  origin: function(origin, callback) {
    // Allow same-origin requests (no origin)
    if (!origin) return callback(null, true);
    
    // Production: restrict to known origins
    const allowedOrigins = [
      'https://your-domain.com',
      'https://loytec-device.local'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));
```

## Input Validation

### Request Sanitization
```javascript
// server/server.js - Input validation
const validator = require('validator');

const validateLoginInput = (req, res, next) => {
  const { username, password } = req.body;
  
  // Validate username
  if (!username || !validator.isAlphanumeric(username.replace(/[._-]/g, ''))) {
    return res.status(400).json({ error: 'Invalid username format' });
  }
  
  // Basic password validation
  if (!password || password.length < 1) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  next();
};

app.post('/ws/node/api/auth/login', validateLoginInput, async (req, res) => {
  // Login logic here
});
```

### File Upload Security
```javascript
// IFC file validation
const validateIFCFile = (file) => {
  const allowedExtensions = ['.ifc', '.IFC'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  return allowedExtensions.some(ext => file.name.endsWith(ext)) &&
         file.size <= maxSize;
};
```

## Environment Security

### Production Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=8001
LOYTEC_BASE_URL=https://secure-loytec-device.local

# Security settings
SESSION_SECRET=your-secure-random-secret
CSRF_SECRET=another-secure-random-secret
BCRYPT_ROUNDS=12

# Development features DISABLED
VITE_DEV_SKIP_AUTH=false
VITE_DEBUG_AUTH=false
```

### Secrets Management
```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Store securely (not in version control)
echo "SESSION_SECRET=generated-secret" >> .env.local
```

## Development Security Safeguards

### Automatic Development Feature Disabling

```javascript
// appConfig.ts - Production safety
export const getAppConfig = (): AppConfig => {
  const isDevelopment = import.meta.env.DEV || false;
  
  // Force disable in production
  const skipAuthInDev = isDevelopment && 
                       import.meta.env.VITE_DEV_SKIP_AUTH === 'true' &&
                       process.env.NODE_ENV !== 'production';
  
  return {
    skipAuthInDev,
    // ... other config
  };
};
```

### Build-time Security Checks
```javascript
// vite.config.ts - Build validation
export default defineConfig({
  build: {
    rollupOptions: {
      plugins: [
        {
          name: 'security-check',
          buildStart() {
            if (process.env.NODE_ENV === 'production' && 
                process.env.VITE_DEV_SKIP_AUTH === 'true') {
              this.error('Dev auth bypass cannot be enabled in production build');
            }
          }
        }
      ]
    }
  }
});
```

## Logging and Monitoring

### Security Event Logging
```javascript
// server/server.js - Security logging
const logSecurityEvent = (event, details) => {
  const timestamp = new Date().toISOString();
  console.log(`[SECURITY] ${timestamp}: ${event}`, details);
  
  // In production: send to security monitoring system
  if (process.env.NODE_ENV === 'production') {
    // Send to SIEM/monitoring system
  }
};

// Login attempt logging
app.post('/ws/node/api/auth/login', async (req, res) => {
  const { username } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    // Authentication logic
    const result = await authenticate(username, password);
    
    if (result.success) {
      logSecurityEvent('LOGIN_SUCCESS', { username, clientIP });
    } else {
      logSecurityEvent('LOGIN_FAILURE', { username, clientIP, reason: result.error });
    }
  } catch (error) {
    logSecurityEvent('LOGIN_ERROR', { username, clientIP, error: error.message });
  }
});
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/ws/node/api/auth/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

## Deployment Security Checklist

### Pre-deployment
- [ ] Environment variables configured for production
- [ ] Development auth bypass disabled (`VITE_DEV_SKIP_AUTH=false`)
- [ ] HTTPS certificates installed and valid
- [ ] Security headers configured
- [ ] CORS origins restricted to known domains
- [ ] Rate limiting enabled
- [ ] Logging configured

### Post-deployment
- [ ] Test authentication flow end-to-end
- [ ] Verify HTTPS is working
- [ ] Check security headers with tools like securityheaders.com
- [ ] Test rate limiting functionality
- [ ] Verify development features are disabled
- [ ] Monitor logs for security events

### Ongoing Security
- [ ] Regular security updates (`npm audit`)
- [ ] Monitor authentication logs
- [ ] Review and rotate secrets periodically
- [ ] Update HTTPS certificates before expiry
- [ ] Regular penetration testing

## Security Incident Response

### Suspected Compromise
1. **Immediate**: Rotate all secrets and sessions
2. **Analyze**: Check logs for unusual activity
3. **Secure**: Update compromised credentials
4. **Monitor**: Increase logging and monitoring

### Recovery Steps
```bash
# 1. Rotate session secret (invalidates all sessions)
echo "SESSION_SECRET=$(node -e 'console.log(crypto.randomBytes(32).toString("hex"))')" >> .env

# 2. Clear all sessions
# Restart server to clear in-memory session store
pm2 restart bim-viewer

# 3. Force all users to re-authenticate
# (automatic with session rotation)

# 4. Update Loytec device if compromised
# Follow Loytec security procedures
```

## Compliance and Auditing

### Security Standards
- **Data Protection**: Minimal data collection and storage
- **Access Control**: Role-based authentication via Loytec
- **Audit Trail**: Comprehensive logging of security events
- **Encryption**: HTTPS in transit, secure session storage

### Audit Preparation
```bash
# Generate security report
npm audit --audit-level=moderate
npm audit --production

# Check for outdated dependencies
npm outdated

# Verify production configuration
node -e "
const config = require('./server/server.js');
console.log('Production mode:', process.env.NODE_ENV === 'production');
console.log('HTTPS enabled:', !!process.env.HTTPS_CERT);
console.log('Dev auth disabled:', !process.env.VITE_DEV_SKIP_AUTH);
"
```

This security configuration ensures the BIM Viewer meets enterprise security requirements while maintaining usability and performance.