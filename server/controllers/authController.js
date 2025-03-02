const User = require('../models/User');
const crypto = require('crypto');
const { generateToken } = require('../utils/jwtUtils');
const { sendPasswordResetEmail } = require('../utils/emailUtils');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate username format
    if (username) {
      const usernameRegex = /^[a-z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
          message: 'Username can only contain lowercase letters, numbers, and underscores' 
        });
      }
      
      if (username.length < 4) {
        return res.status(400).json({ 
          message: 'Username must be at least 4 characters long' 
        });
      }
    }

    // Check if user already exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUserByUsername) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email,
      password
    });

    // Save user to database
    try {
      await user.save();
    } catch (error) {
      // Handle duplicate key error (in case of race condition)
      if (error.code === 11000) {
        if (error.keyPattern.username) {
          return res.status(400).json({ message: 'Username already taken' });
        }
        if (error.keyPattern.email) {
          return res.status(400).json({ message: 'Email already registered' });
        }
      }
      throw error; // Re-throw if it's not a duplicate key error
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { credential, password } = req.body;

    // Check if user provided credential
    if (!credential) {
      return res.status(400).json({ message: 'Please provide email or username' });
    }

    // Find user by email or username
    // Check if the credential is an email by testing for "@"
    const isEmail = credential.includes('@');
    
    // Create query object
    const query = isEmail 
      ? { email: credential.toLowerCase() } 
      : { username: credential.toLowerCase() };
    
    // Find the user
    const user = await User.findOne(query).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    // Set token as cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Update user's online status
    user.isOnline = true;
    user.lastSeen = Date.now();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profilePicture: user.profilePicture,
          darkMode: user.darkMode,
          isOnline: user.isOnline,
          lastSeen: user.lastSeen,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // User is authenticated via middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create a clean user object with only the fields we want to return
    const userData = {
      id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      coverColor: user.coverColor,
      bio: user.bio,
      darkMode: user.darkMode,
      isOnline: user.isOnline,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      likedMessages: user.likedMessages || []
    };

    res.status(200).json({
      success: true,
      data: {
        user: userData
      }
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { username, email, profilePicture, darkMode, coverColor, bio } = req.body;
    const updateData = {};
    
    // Only include fields that were provided
    if (username) {
      // Validate username format
      const usernameRegex = /^[a-z0-9_]+$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ 
          success: false,
          message: 'Username can only contain lowercase letters, numbers, and underscores' 
        });
      }
      
      if (username.length < 4) {
        return res.status(400).json({ 
          success: false,
          message: 'Username must be at least 4 characters long' 
        });
      }
      
      updateData.username = username.toLowerCase();
    }
    
    if (email) updateData.email = email;
    if (profilePicture) updateData.profilePicture = profilePicture;
    if (darkMode !== undefined) updateData.darkMode = darkMode;
    if (coverColor) updateData.coverColor = coverColor;
    if (bio !== undefined) updateData.bio = bio;
    
    // Check if new username is already taken (if updating username)
    if (username) {
      const existingUser = await User.findOne({ 
        username: username.toLowerCase(), 
        _id: { $ne: req.user.id } 
      });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'Username already taken' 
        });
      }
    }
    
    // Check if new email is already registered (if updating email)
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return res.status(400).json({ 
          success: false,
          message: 'Email already registered' 
        });
      }
    }

    // Find and update user
    try {
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ 
          success: false,
          message: 'User not found' 
        });
      }

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            profilePicture: updatedUser.profilePicture,
            coverColor: updatedUser.coverColor,
            bio: updatedUser.bio,
            darkMode: updatedUser.darkMode,
            isOnline: updatedUser.isOnline,
            lastSeen: updatedUser.lastSeen,
            createdAt: updatedUser.createdAt
          }
        }
      });
    } catch (error) {
      // Handle duplicate key error (in case of race condition)
      if (error.code === 11000) {
        if (error.keyPattern.username) {
          return res.status(400).json({ 
            success: false,
            message: 'Username already taken' 
          });
        }
        if (error.keyPattern.email) {
          return res.status(400).json({ 
            success: false,
            message: 'Email already registered' 
          });
        }
      }
      throw error; // Re-throw if it's not a duplicate key error
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        message: 'If a user with that email exists, a password reset link will be sent'
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetURL = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Send email
    const emailResult = await sendPasswordResetEmail(user.email, resetURL);

    if (!emailResult.success) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({ message: 'Failed to send email', error: emailResult.error });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }

    // Hash the token to match with the one in the database
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 