const cors = require('cors');
const routes = require('./routes');
const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/db');
const logger = require('./config/logger');
const passportSetup = require('./config/passport');
const { errorHandler } = require('./middlewares/errorMiddleware');

require('dotenv').config();
connectDB();

const app = express();

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  console.log(`🌐 ${req.method} ${req.url} from ${req.headers.origin}`);
  console.log(`📋 Headers:`, {
    origin: req.headers.origin,
    'user-agent': req.headers['user-agent'],
    'content-type': req.headers['content-type'],
    authorization: req.headers.authorization ? 'present' : 'missing',
    token: req.headers.token ? 'present' : 'missing',
  });
  next();
});

// Handle preflight requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log('🔄 Preflight request from:', req.headers.origin);
    console.log('📋 Request headers:', req.headers);

    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, token, x-access-token, x-refresh-token, Accept, Origin, Cache-Control, X-File-Name',
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
    return;
  }
  next();
});

// CORS configuration cho production
const allowedOrigins = [
  'http://localhost:8686',
  'http://localhost',
  'http://localhost:5173',
  process.env.CLIENT_URL_V1,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('❌ Blocked CORS origin:', origin);
        console.log('✅ Allowed origins:', allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'token',
      'x-access-token',
      'x-refresh-token',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Disposition'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json());
app.use(cookieParser());

// Session configuration cho production
const isProduction = process.env.NODE_ENV === 'production';
const isSecure = isProduction && process.env.SECURE_COOKIES !== 'false';

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.DATABASE_URL,
      ttl: 24 * 60 * 60,
      autoRemove: 'native',
    }),
    cookie: {
      secure: isSecure,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      domain: isProduction ? process.env.COOKIE_DOMAIN : undefined,
    },
    name: 'sessionId', // Tên cookie session
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use('/api', routes);
app.use(errorHandler);

module.exports = app;
