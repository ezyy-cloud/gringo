const User = require('../models/User');
const Message = require('../models/Message');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const { username } = req.params;
    const { currentUsername } = req.query; // Optional: get the current user to check follow status
    
    const user = await User.findOne({ username }).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Create the response data with follower/following counts
    const responseData = {
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
      likedMessages: user.likedMessages,
      isFollowing: false
    };
    
    // If we have a current username, check if they're following this user
    if (currentUsername && currentUsername !== username) {
      const currentUser = await User.findOne({ username: currentUsername });
      if (currentUser) {
        // Check if currentUser is following the requested user
        responseData.isFollowing = currentUser.following.some(id => 
          id.toString() === user._id.toString()
        );
      }
    }

    // Return user data
    return res.status(200).json({
      success: true,
      data: {
        user: responseData
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Follow a user
const followUser = async (req, res) => {
  try {
    const { username } = req.params; // The user to follow
    const followerUsername = req.body.username; // The user doing the following
    
    // Make sure we have both usernames
    if (!username || !followerUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both usernames are required' 
      });
    }
    
    // Get both users
    const userToFollow = await User.findOne({ username });
    const follower = await User.findOne({ username: followerUsername });
    
    // Check if both users exist
    if (!userToFollow || !follower) {
      return res.status(404).json({ 
        success: false, 
        message: 'One or both users not found' 
      });
    }
    
    // Check if already following
    const alreadyFollowing = follower.following.some(id => 
      id.toString() === userToFollow._id.toString()
    );
    
    if (alreadyFollowing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Already following this user' 
      });
    }
    
    // Update follower's following list
    follower.following.push(userToFollow._id);
    await follower.save();
    
    // Update the followed user's followers list
    userToFollow.followers.push(follower._id);
    await userToFollow.save();
    
    return res.status(200).json({
      success: true,
      message: `Now following ${username}`,
      data: {
        following: follower.following,
        followingCount: follower.following.length
      }
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const { username } = req.params; // The user to unfollow
    const followerUsername = req.body.username; // The user doing the unfollowing
    
    // Make sure we have both usernames
    if (!username || !followerUsername) {
      return res.status(400).json({ 
        success: false, 
        message: 'Both usernames are required' 
      });
    }
    
    // Get both users
    const userToUnfollow = await User.findOne({ username });
    const follower = await User.findOne({ username: followerUsername });
    
    // Check if both users exist
    if (!userToUnfollow || !follower) {
      return res.status(404).json({ 
        success: false, 
        message: 'One or both users not found' 
      });
    }
    
    // Check if actually following
    const followingIndex = follower.following.findIndex(id => 
      id.toString() === userToUnfollow._id.toString()
    );
    
    if (followingIndex === -1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Not following this user' 
      });
    }
    
    // Remove from follower's following list
    follower.following.splice(followingIndex, 1);
    await follower.save();
    
    // Remove from the unfollowed user's followers list
    const followerIndex = userToUnfollow.followers.findIndex(id => 
      id.toString() === follower._id.toString()
    );
    
    if (followerIndex !== -1) {
      userToUnfollow.followers.splice(followerIndex, 1);
      await userToUnfollow.save();
    }
    
    return res.status(200).json({
      success: true,
      message: `Unfollowed ${username}`,
      data: {
        following: follower.following,
        followingCount: follower.following.length
      }
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// Get user's liked messages
const getUserLikes = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        likedMessages: user.likedMessages || []
      }
    });
  } catch (error) {
    console.error('Error fetching user likes:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Get messages liked by a user
const getLikedMessages = async (req, res) => {
  try {
    const { username } = req.params;
    const currentUsername = req.query.currentUser;
    
    console.log(`Fetching liked messages for user: ${username}, current user: ${currentUsername || 'none'}`);
    
    // Find the user and their likedMessages
    const user = await User.findOne({ username }).select('likedMessages');
    
    if (!user) {
      return res.status(404).json({
        success: false, 
        message: 'User not found'
      });
    }
    
    // Debug log the liked messages IDs
    console.log(`User ${username} has ${user.likedMessages.length} liked messages`);
    
    // Check if user has any liked messages
    if (!user.likedMessages || user.likedMessages.length === 0) {
      console.log(`User ${username} has no liked messages`);
      return res.status(200).json({
        success: true,
        likedMessages: []
      });
    }
    
    // Find all the messages that the user has liked
    const likedMessages = await Message.find({
      _id: { $in: user.likedMessages }
    })
    .sort({ createdAt: -1 })
    .populate({
      path: 'userId',
      select: 'username profilePicture'
    });
    
    console.log(`Found ${likedMessages.length} liked messages for user ${username}`);
    
    // Process the messages to add necessary fields for client display
    const processedMessages = likedMessages.map(msg => {
      const msgObject = msg.toObject();
      
      // Add author field with username and profilePicture fields for better client compatibility
      msgObject.author = {
        username: msg.userId ? msg.userId.username : msg.senderUsername,
        profilePicture: msg.userId ? msg.userId.profilePicture : null
      };
      
      // Add liked status - if viewing own likes or specified by query param
      msgObject.likedByCurrentUser = true;
      
      // Make sure IDs are consistent for the client
      msgObject.id = msg._id;
      
      // Handle likes count correctly
      msgObject.likesCount = Array.isArray(msg.likes) ? msg.likes.length : 0;
      
      return msgObject;
    });
    
    return res.status(200).json({
      success: true,
      likedMessages: processedMessages
    });
  } catch (error) {
    console.error('Error fetching liked messages:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

module.exports = {
  getUserProfile,
  followUser,
  unfollowUser,
  getUserLikes,
  getLikedMessages
}; 