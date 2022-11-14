const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    createdAt: {
      type: Date,
      default: Date.now,
    },
    attending: {
      type: Boolean,
      required: [true, 'Attending field can not be empty!'],
    },

    //Parent referencing (Participant refers Event)
    event: {
      type: mongoose.Schema.ObjectId,
      ref: 'Event',
      required: [true, 'Participant must belong to an event!'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Participant must belong to a user!'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false, //stops getting 2 different ids, with names: 'id' & '_id'
  }
);

participantSchema.index({ event: 1, user: 1 }, { unique: true }); //combination of event & user must be unique

//query middleware must come before creating model
participantSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'tour',
  });

  this.populate({
    path: 'user',
  });

  this.select('-__v'); //removes __v from getting all participantSchema json response
  next();
});

const Participant = mongoose.model('Participant', participantSchema);

module.exports = Participant;
