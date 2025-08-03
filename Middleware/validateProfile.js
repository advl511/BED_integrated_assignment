//middleware to validate user input for profile operations
function validateProfile(req, res, next) {
  const { bio, location, website, birthday, privacy_settings } = req.body;
  
  // Validate bio length
  if (bio && bio.length > 500) {
    return res.status(400).json({ error: 'Bio must be 500 characters or less' });
  }
  
  // Validate location length
  if (location && location.length > 100) {
    return res.status(400).json({ error: 'Location must be 100 characters or less' });
  }
  
  // Validate website URL format
  if (website) {
    if (website.length > 255) {
      return res.status(400).json({ error: 'Website URL must be 255 characters or less' });
    }
    const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlPattern.test(website)) {
      return res.status(400).json({ error: 'Invalid website URL format' });
    }
  }
  
  // Validate birthday format (YYYY-MM-DD)
  if (birthday) {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(birthday)) {
      return res.status(400).json({ error: 'Birthday must be in YYYY-MM-DD format' });
    }
    
    const birthDate = new Date(birthday);
    const today = new Date();
    if (birthDate > today) {
      return res.status(400).json({ error: 'Birthday cannot be in the future' });
    }
  }
  
  // Validate privacy_settings JSON format
  if (privacy_settings) {
    try {
      JSON.parse(privacy_settings);
    } catch (error) {
      return res.status(400).json({ error: 'Privacy settings must be valid JSON' });
    }
  }
  
  next();
}

function validateProfilePicture(req, res, next) {
  if (!req.file) {
    return res.status(400).json({ error: 'Profile picture file is required' });
  }
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Profile picture must be JPEG, PNG, or GIF format' });
  }
  
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return res.status(400).json({ error: 'Profile picture must be less than 5MB' });
  }
  
  next();
}

module.exports = {
  validateProfile,
  validateProfilePicture
};
