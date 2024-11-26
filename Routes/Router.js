const express = require("express");
const userController = require("./../Controllers/userController");
const movieController = require("./../Controllers/movieController");
const authenticateUser = require("./../Middlewares/AuthenticateUser");
const router = express.Router()
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const moment = require('moment');
const path = require('path');

const generatePublicId = (req, file) => {
    let ext = path.extname(file.originalname);
    let id = moment().format('YYYYMMDDHHmmss') + '-' + file.originalname.replace(ext, '');
    return id + ext;
  };
  
  cloudinary.config({
    cloud_name: 'dsoekzozv',
    api_key: '985829888449896',
    api_secret: 'QPOxNiCpS9sSAIE4cJkuOga8UOc'
  });
  
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'MoviesManagementSystem',
      public_id: generatePublicId,
    },
  });
  
  const parser = multer({ storage: storage });

router.post('/users/register', parser.single('image'), userController.registerUser);
router.post('/user/verify', userController.verifyUser);
router.post('/user/forgot-password', userController.forgotPassword);
router.post('/user/reset-password/:token', userController.resetPassword);
router.get("/users", userController.getAllUsers)
router.post("/user/login", userController.userLogin)
router.get("/user/:id", userController.getUserById);
router.post("/user/updateProfile",parser.single('image') ,authenticateUser, userController.updateProfile)

// movies
router.post("/movie/add-to-favorites/:userId", authenticateUser, movieController.addMovieToFavorites)
router.get("/movies/get-favorite-movies/:userId", authenticateUser, movieController.getFavoriteMovies)
router.put("/movie/remove-from-favorites/:userId", authenticateUser, movieController.removeFavoriteMovie)
router.get("/movies", movieController.getMovies)

module.exports = router;