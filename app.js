const express = require('express');
const app = express();
const path = require('path'); //core module
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const eventsRouter = require('./routs/eventRoutes');
const reviewRouter = require('./routs/reviewRoutes');

// proxies redirect & modify incoming requests
app.enable('trust proxy'); // trusts heroku which acts as a proxy

app.set('view engine', 'pug'); //defining template engine
app.set('views', path.join(__dirname, 'views')); //since we don't know if given path will have a '/' or not, use __dirname

app.use(cors());

//similar to app.get or app.delete, it's not for settings options, it's an http method that we can respond to
//allows complex requests (anything other than POST or GET is a complex request)
app.options('*', cors()); //route is '*'. & the handler is on cors middleware

// Serving static files (when there's a path in .pug files)
app.use(express.static(path.join(__dirname, 'public')));

// Set Security HTTP headers
app.use(helmet());

// Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //100 requests per hour (in ms)
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter); // effects routes starts with api

// Body Parser, reading data from body (converts it to json) then puts it into req.body as a json object
app.use(express.json({ limit: '10kb' })); //body must be under 10kb

//parsers data from cookie
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize()); //needs to be after express.json

// Date sanitization against XSS (malicious scripts)
app.use(xss());

// Prevent parameter pollition
// duplicates in query string, become array
app.use(
  hpp({
    whitelist: ['duration', 'ratingsAverage', 'ratingsQuantity', 'maxGroupSize', 'difficulty', 'price'],
  })
);

// compression() is a middleware function, compresses text sent to clients
app.use(compression());

app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/reviews', reviewRouter);

/*
app.use('/', viewRouter); //this middleware only happens in this url, (we call this mounting)
app.use('/api/v1/users', userRouter);
app.use('/api/v1/bookings', bookingRouter);
*/

app.all('*', (req, res, next) => {
  //next with a parameter is an error
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
