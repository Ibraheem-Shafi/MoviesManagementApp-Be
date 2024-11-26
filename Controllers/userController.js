const User = require("./../Models/userSchema")
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken');

// Email configuration using nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail', // You can use other services like SendGrid, Mailgun, etc.
    auth: {
        user: process.env.EMAIL, // your email address
        pass: process.env.PASSWORD, // your email password or app password
    },
});

// Generate a random verification code
const generateVerificationCode = () => {
    return crypto.randomBytes(3).toString('hex'); // Generates a 6-digit random code
};

const generateReferralId = () => {
    return crypto.randomBytes(4).toString('hex'); // Generates a random 8-character ID
};

// Add user function
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        let existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email" });
        }

        // Generate verification code
        const verificationCode = generateVerificationCode();

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user with a verification code
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            verificationCode,
            isVerified: false,
        });

        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            const imageURL = result.secure_url;
            newUser.imageURL = imageURL;
        }

        // Save the user to the database
        await newUser.save();

        // Send verification email
            const mailOptions = {
                from: process.env.EMAIL,
                to: email,
                subject: 'Verify Your Email Address',
                text: `Hello,

            Thank you for registering with us ${name}! To complete your registration, please verify your email address by entering the following verification code:

            Verification Code: ${verificationCode}

            If you did not sign up for this account, please ignore this email.

            Best regards,
            Ibraheem
            `,
            };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Error sending email:", err);
                return res.status(500).json({ error: 'Error sending verification email' });
            } else {
                console.log('Verification email sent:', info.response);
                return res.status(200).json({
                    message: 'User registered successfully. Verification email sent.',
                    userId: newUser._id,
                });
            }
        });
    } catch (error) {
        console.error("Error registering user:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Verify user function
exports.verifyUser = async (req, res) => {
    const { userId, code } = req.body;

    try {
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.verificationCode === code) {
            user.verified = true;
            user.verificationCode = undefined; // Clear the verification code after successful verification
            await user.save();
            
            // Generate a JWT token
            const token = jwt.sign(
                { id: user._id, email: user.email }, // Payload
                process.env.JWT_SECRET,             // Secret key
                { expiresIn: '1h' }                 // Token expiration
            );

            // Send response with token
            return res.status(200).json({
                message: 'User verified successfully',
                token, // Send token to the frontend
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                },
            });

        } else {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
    } catch (error) {
        console.error("Error verifying user:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email, baseUrl } = req.body;

        // Check if user exists with this email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found with this email' });
        }

        // Generate a reset token
        const resetToken = crypto.randomBytes(20).toString('hex');
        const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

        // Save reset token and expiry time to the user's record
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpiry = resetTokenExpiry;
        await user.save();

        // Create reset password URL
        const resetURL = `${baseUrl}/reset-password/${resetToken}`;

        // Send reset password email
        const mailOptions = {
            from: process.env.EMAIL,
            to: user.email,
            subject: 'Reset Your Password',
            text: `Hello,

            You have requested to reset your password. Please click the link below or copy and paste it into your browser to reset your password:

            ${resetURL}

            This link will expire in 1 hour.

            If you did not request a password reset, please ignore this email.

            Best regards,
            The Movies Team
            `,
        };

        // Send email using nodemailer
        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error("Error sending email:", err);
                return res.status(500).json({ error: 'Error sending password reset email' });
            } else {
                console.log('Password reset email sent:', info.response);
                return res.status(200).json({
                    message: 'Password reset email sent successfully.',
                });
            }
        });

    } catch (error) {
        console.error("Error in forgot password:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword } = req.body;

        // Find user by reset token and check if token is not expired
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpiry: { $gt: Date.now() } // Check if token is still valid
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password and clear the reset token and expiry time
        user.password = newPassword;
        user.resetPasswordToken = undefined; // Remove the reset token
        user.resetPasswordExpiry = undefined; // Remove the token expiry

        // Save the updated user document
        await user.save();

        // Send a success response
        return res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send({ message: 'Error fetching users', error: error.message });
    }
};

exports.userLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      // Find the user by email
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      // Check the password
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
  
      // Create a JWT token
      const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY, { expiresIn: '1h' });
  
      return res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          userId: user._id,
          name: user.name,
          email: user.email,
          imageURL: user.imageURL,
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
};

exports.getUserById = async (req, res, next) => {
    try {
        const userId = req.params.id; // Extract the user ID from the request parameters
        const user = await User.findById(userId); // Find the user by ID using Mongoose

        if (!user) {
            return res.status(404).send({
                message: "User not found. Please ensure you are using the right credentials"
            });
        }

        // If the user is found, send the user data as JSON
        res.status(200).json({
            message: "User found successfully",
            data: user
        });
    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error', message: error.message });
    }
}

exports.updateProfile = async (req, res) => {
    console.log("Request body:", req.body);
    console.log("Files:", req.file);
    // Parse the form data
    const { name, email, password, userId } = req.body;

    try {
        // Find the user by ID
        console.log("Searching for user with ID:", userId);
        const preuser = await User.findOne({ _id: userId });

        // Check if user exists
        if (!preuser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if the new email already exists for a different user
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            return res.status(400).json({ error: "Email address already in use" });
        }

        // If a new file is uploaded, update the image URL
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            const imageURL = result.secure_url;
            preuser.imageURL = imageURL;
        }

        if (password) {
            // Hash the password before saving
            preuser.password = await bcrypt.hash(password, 10);
        }

        // Update user information
        preuser.email = email;
        preuser.name = name;

        console.log(preuser);

        // Save the updated user
        await preuser.save();

        // Respond with updated user data
        res.status(200).json({ message: "User profile updated successfully", user: preuser });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern.email === 1) {
            // Duplicate email error
            return res.status(400).json({ error: "Email address already in use" });
        } else {
            console.error("Error updating user profile:", error);
            res.status(500).json({ error: "Failed to update user profile" });
        }
    }
};

exports.userLogout = async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token;
        });

        await req.user.save();
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error("Error logging out:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};