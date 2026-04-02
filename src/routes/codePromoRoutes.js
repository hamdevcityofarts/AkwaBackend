const express = require('express');
const router = express.Router();
const {
  getAllCodes,
  getCodeById,
  createCode,
  updateCode,
  deleteCode,
  verifyCode,
  getCodesByRoom,
  getStats
} = require('../controllers/codePromoController');

const { protect } = require('../middlewares/authMiddleware');

// Routes publiques
router.get('/room/:chambreId', getCodesByRoom);
router.post('/verify', verifyCode);

// Routes protégées (admin)
router.get('/stats', protect, getStats);
router.get('/', protect, getAllCodes);
router.get('/:id', protect, getCodeById);
router.post('/', protect, createCode);
router.put('/:id', protect, updateCode);
router.delete('/:id', protect, deleteCode);

module.exports = router;