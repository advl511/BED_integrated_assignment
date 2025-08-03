const profileModel = require('../Model/profileModel.js');

async function getProfile(req, res) {
  try {
    const { userId } = req.params;
    const profile = await profileModel.getProfileByUserId(userId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.status(200).json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function createProfile(req, res) {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    const result = await profileModel.createProfile(userId, profileData);
    const profile = await profileModel.getProfileByUserId(userId);
    
    res.status(201).json(profile);
  } catch (err) {
    console.error('Create profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function updateProfile(req, res) {
  try {
    const { userId } = req.params;
    const profileData = req.body;
    
    const profile = await profileModel.updateProfile(userId, profileData);
    res.status(200).json(profile);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function updateProfilePicture(req, res) {
  try {
    const { userId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate the URL for the uploaded file
    const profile_picture_url = `http://localhost:3000/uploads/${req.file.filename}`;
    
    const profile = await profileModel.updateProfilePicture(userId, profile_picture_url);
    res.status(200).json(profile);
  } catch (err) {
    console.error('Update profile picture error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function deleteProfile(req, res) {
  try {
    const { userId } = req.params;
    
    await profileModel.deleteProfile(userId);
    res.status(200).json({ message: 'Profile deleted successfully' });
  } catch (err) {
    console.error('Delete profile error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function searchProfiles(req, res) {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const profiles = await profileModel.searchProfiles(query, parseInt(limit));
    res.status(200).json(profiles);
  } catch (err) {
    console.error('Search profiles error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  getProfile,
  createProfile,
  updateProfile,
  updateProfilePicture,
  deleteProfile,
  searchProfiles,
};
