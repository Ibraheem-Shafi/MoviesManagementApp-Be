const axios = require('axios');
const Movie = require('../Models/movieSchema');
const User = require("../Models/userSchema");

// Controller function to add movie to favorites
exports.addMovieToFavorites = async (req, res) => {
  try {
    const { userId } = req.params;
    const { movieData } = req.body;

    // Check if movieData exists
    if (!movieData || !movieData.trackId) {
      return res.status(400).json({ message: "Movie data is incomplete" });
    }

    // Check if the movie already exists in the database, if not, create it
    let movie = await Movie.findOne({ trackId: movieData.trackId });
    if (!movie) {
      movie = new Movie(movieData);
      await movie.save(); // Save the movie in the database
    }

    // Add the movie's ID to the user's favorites array
    const user = await User.findById(userId); // Find the user by ID
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.favorites) {
      user.favorites = []; // Initialize favorites as an empty array if undefined
    }

    // Check if the movie is already in the user's favorites
    if (user?.favorites?.includes(movie._id)) {
      return res.status(400).json({ message: "Movie is already in favorites" });
    }

    // Add movie to favorites
    user.favorites.push(movie._id);
    await user.save(); // Save the updated user

    return res.status(200).json({ message: "Movie added to favorites", success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", success: false });
  }
};

exports.getFavoriteMovies = async (req, res) => {
  try {
    const {userId} = req.params; // Get userId from request parameters

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Find the user by ID and populate their favorites with movie details
    const user = await User.findById(userId).populate("favorites");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the user's favorite movies
    return res.status(200).json({ favorites: user.favorites });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.removeFavoriteMovie = async (req, res) => {
  try {
    const { userId } = req.params;
    const { movieId } = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!movieId) {
      return res.status(404).json({ message: "MovieId not received" });
    }

    // Check if the movie is in the user's favorites
    const movieIndex = user.favorites.indexOf(movieId);
    if (movieIndex === -1) {
      return res.status(400).json({ message: "Movie not found in favorites" });
    }

    // Remove the movie from favorites
    user.favorites.splice(movieIndex, 1);
    await user.save();

    return res.status(200).json({ message: "Movie removed from favorites" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.getMovies = async (req, res) => {
  try {
    const { term = "star", offset = 0, limit = 10, genre, priceRange, yearRange } = req.query;

    // Fetch movies from iTunes API
    const params = {
      term,
      media: "movie",
      limit: 200, // Fetch the maximum results to filter later
    };

    const response = await axios.get("https://itunes.apple.com/search", { params });

    // Map movies and replace artwork URLs
    const allMovies = response.data.results.map((movie) => ({
      ...movie,
      artworkUrlHighRes: movie.artworkUrl100?.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg"),
    }));

    // Apply manual filtering for genre, price, and year ranges
    const filteredMovies = allMovies.filter((movie) => {
      let matchesGenre = true;
      let matchesPrice = true;
      let matchesYear = true;

      // Filter by genre if provided
      if (genre && movie.primaryGenreName) {
        // Check if the selected genre is part of the genre name
        matchesGenre = movie.primaryGenreName.toLowerCase().includes(genre.toLowerCase());
      }

      // Filter by price range if provided
      if (priceRange && movie.trackPrice != null) {
        const [minPrice, maxPrice] = priceRange.split("-").map(Number);
        matchesPrice = movie.trackPrice >= minPrice && movie.trackPrice <= maxPrice;
      }

      // Filter by year range if provided
      if (yearRange && movie.releaseDate) {
        const releaseYear = new Date(movie.releaseDate).getFullYear();
        const [minYear, maxYear] = yearRange.split("-").map(Number);
        matchesYear = releaseYear >= minYear && releaseYear <= maxYear;
      }

      return matchesGenre && matchesPrice && matchesYear;
    });

    // Slice the results for pagination
    const paginatedMovies = filteredMovies.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    res.status(200).json({
      success: true,
      data: paginatedMovies,
      totalPages: Math.ceil(filteredMovies.length / limit), // Calculate total pages
      totalResults: filteredMovies.length, // Total number of filtered movies
    });
  } catch (error) {
    console.error("Error fetching movies:", error.message);
    res.status(500).json({ success: false, message: "Failed to fetch movies." });
  }
};
