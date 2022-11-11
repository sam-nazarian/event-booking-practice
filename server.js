/**
 * For unhandled synchronous errors, works on errors in sync functions
 * If there's a try catch wrapped around the the err it is NOT uncaught so it won't be caught here, it will be caught in the catch section of the try
 * If there's an err in an express middleware then it doesn't go here, it goes to the express error handling middleware (which has 4 parameters, (err, req, res, next) )
 */
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT REJECTION! 💥 Shutting down...');
  console.log(err.name, err);
  //since these errors happen async, they have nothing to do with the server, so no need to close the server
  process.exit(1); //0 is success, 1 is uncaught exeption
});

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' }); //must configure before app
const app = require('./app');
const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DATABASE_PASSWORD);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'));

// START SERVER
const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`App is running on port ${port}`);
});

/**
 * For unhandled async errors such as promises or errors in async functions
 */
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err);

  // shutdown gracefully (wait until all current/pending requests are finished), only then after kill the server
  server.close(() => {
    process.exit(1);
  });
});
