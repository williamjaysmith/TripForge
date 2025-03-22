const mongoose = require('mongoose');
const { callbackPromise } = require('nodemailer/lib/shared');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'must write a review, cannot be empty'],
    },
    rating: {
      type: Number,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  //   when a field is not stored in DB but is calculated using some other value, you want it to show up
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);
// This will make it so a user cant write multiple reviews on one tour. Makes sure the combination of user&tour is unique
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// regex to match strings with "find"
reviewSchema.pre(/^find/, function (next) {
  // this.populate({
  //   // this will populate the tour property
  //   path: 'tour',
  //   select: 'name',
  // }).populate({
  //   path: 'user',
  //   select: 'name photo',
  // });

  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// create a static method because statics .this calls to a model which is handy for calling the aggregate method
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  // console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  // this points to current review being saved and stores it in the db
  this.constructor.calcAverageRatings(this.tour);
});

// Handle updates and deletions of reviews
reviewSchema.post(/^findOneAnd/, async function (reviewDoc) {
  if (reviewDoc) {
    await reviewDoc.constructor.calcAverageRatings(reviewDoc.tour);
  }
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
