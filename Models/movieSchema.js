const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  trackId: {
    type: String, // Unique identifier for the movie
    required: true,
    unique: true
  },
  trackName: {
    type: String, // Name of the movie (e.g., title)
    required: true
  },
  trackPrice: {
    type: Number,
    required: false
  },
  artistName: {
    type: String, // Director or artist associated with the movie
    default: "Not listed"
  },
  releaseDate: {
    type: Date, // Release date of the movie
    default: Date.now
  },
  longDescription: {
    type: String, // Full description of the movie
    default: "No description available."
  },
  shortDescription: {
    type: String, // A short description if available
    default: "No description available."
  },
  primaryGenreName: {
    type: String, // Genre of the movie
    required: true
  },
  cast: {
    type: String, // Cast of the movie
    default: "Not listed"
  },
  artworkUrl100: {
    type: String, // URL for the smaller artwork (100px)
    required: true
  },
  artworkUrlHighRes: {
    type: String, // URL for the high-resolution artwork
    default: null
  },
  previewUrl: {
    type: String, // URL of the movie trailer (if available)
    default: null
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const Movie = mongoose.model("Movie", movieSchema);

module.exports = Movie;
