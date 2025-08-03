const statusModel = require('../Model/statusModel.js');

async function createStatus(req, res) {
  try {
    const { userId, content, attachments = [] } = req.body;
    
    if (!userId || !content) {
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    const status = await statusModel.createStatus(userId, content, attachments);
    res.status(201).json(status);
  } catch (err) {
    console.error('Create status error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getStatuses(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const statuses = await statusModel.getStatusesByUserId(userId, parseInt(limit), parseInt(offset));
    res.status(200).json(statuses);
  } catch (err) {
    console.error('Get statuses error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getStatus(req, res) {
  try {
    const { statusId } = req.params;
    
    const status = await statusModel.getStatusById(statusId);
    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }
    
    res.status(200).json(status);
  } catch (err) {
    console.error('Get status error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function updateStatus(req, res) {
  try {
    const { statusId } = req.params;
    const { content, userId } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const status = await statusModel.updateStatus(statusId, content, userId);
    res.status(200).json(status);
  } catch (err) {
    console.error('Update status error:', err);
    if (err.message === 'Status not found or unauthorized') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

async function deleteStatus(req, res) {
  try {
    const { statusId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    await statusModel.deleteStatus(statusId, userId);
    res.status(200).json({ message: 'Status deleted successfully' });
  } catch (err) {
    console.error('Delete status error:', err);
    if (err.message === 'Status not found or unauthorized') {
      res.status(404).json({ error: err.message });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
}

async function getFeed(req, res) {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;
    
    const feed = await statusModel.getFeed(userId, parseInt(limit), parseInt(offset));
    res.status(200).json(feed);
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getRecentStatuses(req, res) {
  try {
    const { limit = 50 } = req.query;
    
    const statuses = await statusModel.getRecentStatuses(parseInt(limit));
    res.status(200).json(statuses);
  } catch (err) {
    console.error('Get recent statuses error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function searchStatuses(req, res) {
  try {
    const { q: query, limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const statuses = await statusModel.searchStatuses(query, parseInt(limit));
    res.status(200).json(statuses);
  } catch (err) {
    console.error('Search statuses error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getStatusCount(req, res) {
  try {
    const { userId } = req.params;
    
    const count = await statusModel.getStatusCount(userId);
    res.status(200).json({ count });
  } catch (err) {
    console.error('Get status count error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function createStatusWithAttachments(req, res) {
  try {
    console.log('=== CREATE STATUS WITH ATTACHMENTS ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files count:', req.files ? req.files.length : 0);
    
    const { userId, content } = req.body;
    
    if (!userId || !content) {
      console.log('Missing required fields - userId:', userId, 'content:', content);
      return res.status(400).json({ error: 'User ID and content are required' });
    }
    
    // Process uploaded files
    const attachments = req.files ? req.files.map(file => {
      console.log('Processing file:', file.originalname, 'size:', file.size);
      return {
        filename: file.originalname,
        url: `http://localhost:3000/uploads/${file.filename}`,
        type: file.mimetype,
        size: file.size
      };
    }) : [];
    
    console.log('Processed attachments:', attachments);
    
    const status = await statusModel.createStatus(userId, content, attachments);
    console.log('Status created successfully:', status.status_id);
    res.status(201).json(status);
  } catch (err) {
    console.error('Create status with attachments error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createStatus,
  createStatusWithAttachments,
  getStatuses,
  getStatus,
  updateStatus,
  deleteStatus,
  getFeed,
  getRecentStatuses,
  searchStatuses,
  getStatusCount,
};
