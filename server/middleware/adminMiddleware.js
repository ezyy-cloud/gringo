const User = require('../models/User');
const { verifyToken } = require('../utils/jwtUtils');

/**
 * Middleware to protect admin routes
 * Ensures that the user is authenticated and has admin privileges
 */
exports.adminProtect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in the authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Extract token from Bearer token
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      // Or check if token exists in cookies
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or token expired' 
      });
    }

    // Find user by ID
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Check if user is an admin
    if (!user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to access this resource' 
      });
    }

    // Attach user to request object
    req.user = {
      id: user._id,
      username: user.username,
      isAdmin: user.isAdmin
    };

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Not authorized to access this route',
      error: error.message 
    });
  }
}; 