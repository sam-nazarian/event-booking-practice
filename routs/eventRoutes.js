const express = require('express');
const eventController = require('../controllers/eventController');
const authController = require('../controllers/authController');
// const reviewRouter = require('reviewRoutes');

//convention to call this a router
const router = express.Router(); //creating a new router, which is middleware

//user must be logged in. only 'user' can post reviews.
// router.use('/:tourId/reviews', reviewRouter); //for this route usse review router, same as app

//EVENT ROUTES:
router.route('/').get(eventController.getAllEvents).post(eventController.createEvent); // authController.protect, authController.restrictTo('organiser')
router.route('/:id').get(eventController.getEvent).patch(eventController.uploadEventImages, eventController.resizeEventImages, eventController.updateEvent).delete(eventController.uploadEventImages, eventController.resizeEventImages, eventController.deleteEvent);

// EVENT GEOSPATIAL DATA:
router.route('/events-within/:distance/center/:latlng/unit/:unit').get(eventController.getEventsWithin); // /events-within/233/center/-40,35/unit/mi
router.route('/distances/:latlng/unit/:unit').get(eventController.getDistances); // /events-within?distance=233&center=-40,45&unit=mi //another way

module.exports = router;
