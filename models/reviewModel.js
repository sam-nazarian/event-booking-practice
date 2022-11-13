const mongoose = require('mongoose');
const Event = require('./eventModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty!'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      // required: [true, 'review must have rating']
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    //Parent referencing (Review refers Event)
    event: {
      type: mongoose.Schema.ObjectId,
      ref: 'Event',
      required: [true, 'Review must belong to an event'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false, //stops getting 2 different ids, with names: 'id' & '_id'
  }
);

reviewSchema.index({ event: 1, user: 1 }, { unique: true }); //combination of event & user must be unique

//query middleware must come before creating model
reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  this.select('-__v'); //removes __v from getting all reviews json response

  next();
});

//statics adds it to the Review model
reviewSchema.statics.calcAverageRatings = async function (eventId) {
  //'this' points to current model(Review) cause used statics
  const stats = await this.aggregate([
    {
      $match: { event: eventId }, //select the event that user updated
    },
    {
      //columns that the match will have
      $group: {
        _id: '$event',
        nRating: { $sum: 1 }, //for each review 1 will be added
        avgRating: { $avg: '$rating' }, //averaging rating, from schema
      },
    },
  ]);

  //don't need it, no need to put it in var
  if (stats.length > 0) {
    await Event.findByIdAndUpdate(eventId, {
      ratingsQuantity: stats[0].nRating, //
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Event.findByIdAndUpdate(eventId, {
      //set to default values
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

//before each review is created, if we put this after Review, than reviewSchema wouldn't contain this middleware
reviewSchema.post('save', function () {
  // 'this' points to current review/document

  //we don't have acces to review yet so we can't do:
  // Review.calcAverageRatings(this.event);

  //instead we do this: constructor is model of document
  this.constructor.calcAverageRatings(this.event); //event holds value of id
  // next(); //post middleware doesn't have next
});

// data not uptodate at pre middleware, thus need to do it in post middleware, below it
// findByIdAndUpdate & findByIdAndDelete
reviewSchema.pre(/^findOneAnd/, async function (next) {
  //'this' points to current query, only save points to current document
  this.r = await this.findOne(); //returns document & stores in query's object
  // console.log(this.r);

  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  //'this' points to current query
  //await this.findOne(); does NOT work here, query already executed
  await this.r.constructor.calcAverageRatings(this.r.event); //constructor of a document is a model
});

//could do this instead
/*
  reviewSchema.post(/^findOneAnd/, async function(doc) {
  await doc.constructor.calcAverageRatings(doc.event);
});
*/

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
