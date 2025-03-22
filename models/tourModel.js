const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./userModel');

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'a tour name must have less or equal 40 characters'],
      minlength: [10, 'a tour name must have more or equal 10 characters'],
    },
    slug: String,
    duration: {
      type: Number,
      required: [true, 'a tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'a tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'a tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'difficulty is either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'rating must be above 1.0'],
      max: [5, 'rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a priced'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          return val < this.price;
        },
        message: 'discount price({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, ' A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image '],
    },
    images: [String],
    createAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJson is mongos way of specifying geospatial data
      // Thisis an embedded object
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      // expects an array of numbers
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [
      // embedded documents
      {
        type: mongoose.Schema.ObjectId,
        // how you specify reference between different collections in mongo, no need to import
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// tourSchema.index({ price: 1 });
tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7;
});

// virtually populate Tour Model with reviews so we dont need ALL the reviews embedded in this model
tourSchema.virtual('reviews', {
  // referencing the review model
  ref: 'Review',
  // also reference the review model , where the field is named Tour
  foreignField: 'tour',
  // but in THIS local model(the tour model), its just named _id
  localField: '_id',
});

// DOCUMENT MIDDLEWARE: runs before the .save() and .create()
tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});
// everytime a tour is saved , this embeds(denormalizes) each user DOCUMENT into Tours>Guides, not just the users id
// tourSchema.pre('save', async function (next) {
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

//QUERY MIDDLEWARE

tourSchema.pre(/^find/, function (next) {
  // tourSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } });

  this.start = Date.now();
  next();
});

// regex to match strings with "find"
tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });
  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   console.log(`query took ${Date.now() - this.start} ms`);
//   next();
// });

// AGGREGATION MIDDLEWARE

//This regex matches any MongoDB operator starting with $geo, like $geoNear, $geoWithin, $geoIntersects, etc.
const GEOSPATIAL_OPERATOR_TEST = /^[$]geo[a-zA-Z]*/;

tourSchema.pre('aggregate', function (next) {
  const geoAggregate = this.pipeline().filter(
    // finding if the pipeline stage name has any geo operator using the regex. 'search' method on a string returns -1 if the match is not found else non zero value
    (stage) => Object.keys(stage)[0].search(GEOSPATIAL_OPERATOR_TEST) !== -1,
  );

  //Placing secretTour query first if no GEO queries exist
  if (geoAggregate.length === 0) {
    this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
  }

  //If GEO queries exist, keep the secret tour functionality by placing the secretTour query after all GEO queries in the pipeline
  else {
    this.pipeline().splice(geoAggregate.length, 0, {
      $match: { secretTour: { $ne: true } },
    });
  }
  // console.log(this.pipeline());
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
