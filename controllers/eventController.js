const multer = require('multer');
const sharp = require('sharp');
const Event = require('./../models/eventModel'); //Event is a Collection/model
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

/**
 * Store multer in memory, not in hard drive
 */
const multerStorage = multer.memoryStorage();

/**
 * Add a filter to multer
 */
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

/*
for single uploads
upload.single('image'); req.file

for multiple uploads, with 1 field
upload.array('images', 3); req.files
*/

/**
 * For multiple uploads, with many fields
 * Stores images in req.files
 */
exports.uploadEventImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

/**
 * Resize Images, save them to the img folder. Add name of image to req.body.
 */
exports.resizeEventImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);
  if (!req.files.imageCover || !req.files.images) return next();

  // 1: Cover image
  //on database field is called imageCover
  req.body.imageCover = `event-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/events/${req.body.imageCover}`);

  // 2: Images
  req.body.images = [];

  //async callback function returns a promise, which then would need to be awaited
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `event-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer).resize(2000, 1333).toFormat('jpeg').jpeg({ quality: 90 }).toFile(`public/img/events/${filename}`);

      req.body.images.push(filename);
    })
  );

  // console.log(req.body);
  next();
});

// EVENT ROUTE HANDLERS / CRUD CONTROLERS:
exports.getAllEvents = factory.getAll(Event);
exports.getEvent = factory.getOne(Event, { path: 'reviews' }); //poopulate reviews
exports.createEvent = factory.createOne(Event);
exports.updateEvent = factory.updateOne(Event); //patch updates part of data, put replaces data with new data
exports.deleteEvent = factory.deleteOne(Event);

// EVENT GEOSPATIAL DATA:
/**
 * Shows all events that fit the circle made based on the given lat & lng from the user
 */
exports.getEventsWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; //convert to radians unit

  if (!lat || !lng) {
    next(new AppError('Please provide latitude and longitude in the format lat,lng.', 400));
  }

  const events = await Event.find({
    //geoWithin finds documents between a geometry
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    numbeOfResults: events.length,
    data: {
      data: events,
    },
  });
});

/**
 * Sorts events, displays closest one to coordinate
 */
exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001; //1 meter in miles is '0.000621371' , 1 meter in km is 0.001

  if (!lat || !lng) {
    next(new AppError('Please provide latitutr and longitude in the format lat,lng.', 400));
  }

  const distances = await Event.aggregate([
    {
      // for geospatial aggregation geoNear must be first stage in aggregation pipeline
      // needs to have golocation index for it to work, by default uses the only geolocation index (so here it's startLocation)
      // distance between startLocation & given coordinate(by user)
      // results will automatically be sorted by distance in asc
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1], //convert to num
        },
        distanceField: 'distance', //name of field, where calculated distances will be stored
        distanceMultiplier: multiplier, //multiplies with distance, converts it from meter to km
      },
    },
    {
      //only showing certain fields, if commented shows all fields
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
    },
  });
});
