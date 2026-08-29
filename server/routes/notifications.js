const router = require('express').Router();
const { authMiddleware } = require('../middleware/auth');
const Notification = require('../models/Notification');

// GET /api/notifications — fetch for current user (by role or recipientId)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;
    const notifications = await Notification.find({
      $or: [
        { recipientRole: role },
        { recipientId: id },
      ],
    }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;
    const updated = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        $or: [{ recipientRole: role }, { recipientId: id }],
      },
      { read: true }
    );
    if (!updated) return res.status(404).json({ message: 'Notification not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    const { role, id } = req.user;
    await Notification.updateMany(
      { $or: [{ recipientRole: role }, { recipientId: id }] },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
