const mongoose = require('mongoose');
const slugify = require('slugify');
const validator = require('validator');

//Schema is a constructor which takes a parameter of an object, that's why we do 'new'
const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'An event must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'An event name must have less or equal then 40 characters'],
      minLength: [10, 'An event name must have more or equal then 10 characters'],
      validate: {
        validator: function (value) {
          return validator.isAlpha(value, 'en-US', { ignore: ' ' });
        },
        message: 'Event name must only contain characters.',
      },
    },
    slug: String,
    //user doesn't need to enter this data, so not required
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.66666 46.6666, 47, 4.7 rounds to closer integer(NOT decimal)
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'An event must have a price'],
    },
    // when on front page of website, it's required
    summary: {
      type: String,
      trim: true,
      required: [true, 'An event must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      // required: [true, 'An event must have a cover image!'],
    },
    images: {
      type: String,
      // required: [true, 'An event must have THREE images!'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDate: {
      type: Date,
      required: [true, 'An event must have a startDate'],
    },
    // GeoJSON - must have type and coordinates - https://mongoosejs.com/docs/geojson.html
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: [true, 'An address TYPE is required!'],
      },
      coordinates: {
        type: [Number],
        required: [true, 'An address COORDINATE is required!'],
      }, //must have coordinates
      address: {
        type: String,
        required: [true, 'An address is required!'],
      },
      // description: String, //make it in the virtual based on address
    },

    //child referencing, Event(parent) references User(child)
    organiser: {
      type: mongoose.Schema.ObjectId, //mongoDB id
      ref: 'User', //can set ref to a model name, (referencing child which is user)
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // id: false //stops getting 2 different ids, with names: 'id' & '_id'
  }
);

//indexes makes getting results faster
eventSchema.index({ price: 1, ratingsAverage: -1 }); //'1':acsending, '2':descending
eventSchema.index({ slug: 1 });
eventSchema.index({ location: '2dsphere' }); //allows geospatial queries for location

//DOCUMENT MIDDLEWARE: runs before .save() and .create()(emits 'save' event)
eventSchema.pre('save', function (next) {
  //'this' points to created document
  this.slug = slugify(this.name, { lower: true });
  next();
});

//Virtual Populate, creates reviews[] on eventSchema
eventSchema.virtual('reviews', {
  //_id in localField is called event in review model
  localField: '_id',
  ref: 'Review',
  foreignField: 'event',
});

/**
 * query middleware: populates, the organiser (which is a user)
 */
eventSchema.pre(/^find/, function (next) {
  //'this' points to current query
  this.populate({
    path: 'organiser',
    select: '-__v', //-passwordChangedAt
  });

  next();
});

const Event = mongoose.model('Event', eventSchema); //creates the collection

module.exports = Event;
