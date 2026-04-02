const CodePromo = require('../models/codePromoModel');

// GET /api/codepromo
exports.getAllCodes = async (req, res) => {
  try {
    const codesPromo = await CodePromo.find()
      .populate('chambres', 'name number type')
      .sort({ createdAt: -1 });
    res.json({ success: true, codesPromo });
  } catch (error) {
    console.error('❌ Erreur getAllCodes:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/codepromo/:id
exports.getCodeById = async (req, res) => {
  try {
    const code = await CodePromo.findById(req.params.id)
      .populate('chambres', 'name number type');
    if (!code) return res.status(404).json({ message: 'Code promo introuvable' });
    res.json({ success: true, codePromo: code });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/codepromo
exports.createCode = async (req, res) => {
  try {
    console.log('📥 Création code promo:', req.body);
    const existing = await CodePromo.findOne({ code: req.body.code?.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: 'Ce code promo existe déjà' });
    }
    const codePromo = new CodePromo(req.body);
    await codePromo.save();
    console.log('✅ Code promo créé:', codePromo._id);
    res.status(201).json({ success: true, codePromo });
  } catch (error) {
    console.error('❌ Erreur createCode:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Ce code promo existe déjà' });
    }
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// PUT /api/codepromo/:id
exports.updateCode = async (req, res) => {
  try {
    const codePromo = await CodePromo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('chambres', 'name number type');
    if (!codePromo) return res.status(404).json({ message: 'Code promo introuvable' });
    res.json({ success: true, codePromo });
  } catch (error) {
    console.error('❌ Erreur updateCode:', error);
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// DELETE /api/codepromo/:id
exports.deleteCode = async (req, res) => {
  try {
    const codePromo = await CodePromo.findByIdAndDelete(req.params.id);
    if (!codePromo) return res.status(404).json({ message: 'Code promo introuvable' });
    res.json({ success: true, message: 'Code promo supprimé' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// POST /api/codepromo/verify
exports.verifyCode = async (req, res) => {
  try {
    const { code, chambreId, nights } = req.body;
    const codePromo = await CodePromo.findOne({ code: code?.toUpperCase() });

    if (!codePromo) return res.status(404).json({ message: 'Code promo invalide' });

    const now = new Date();
    if (codePromo.statut !== 'actif') return res.status(400).json({ message: 'Code promo inactif' });
    if (new Date(codePromo.dateFin) < now) return res.status(400).json({ message: 'Code promo expiré' });
    if (new Date(codePromo.dateDebut) > now) return res.status(400).json({ message: 'Code promo pas encore actif' });
    if (codePromo.utilisationActuelle >= codePromo.utilisationMax) return res.status(400).json({ message: 'Code promo épuisé' });
    if (nights && nights < codePromo.minimumStay) {
      return res.status(400).json({ message: `Séjour minimum de ${codePromo.minimumStay} nuit(s) requis` });
    }
    if (!codePromo.applicableToAll && chambreId) {
      const applicable = codePromo.chambres.some(id => id.toString() === chambreId);
      if (!applicable) return res.status(400).json({ message: 'Code non applicable à cette chambre' });
    }

    res.json({ success: true, codePromo, message: 'Code valide' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/codepromo/room/:chambreId
exports.getCodesByRoom = async (req, res) => {
  try {
    const { chambreId } = req.params;
    const codes = await CodePromo.find({
      statut: 'actif',
      $or: [
        { applicableToAll: true },
        { chambres: chambreId }
      ]
    });
    res.json({ success: true, codesPromo: codes });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};

// GET /api/codepromo/stats
exports.getStats = async (req, res) => {
  try {
    const now = new Date();
    const [total, actifs, expires, epuises] = await Promise.all([
      CodePromo.countDocuments(),
      CodePromo.countDocuments({ statut: 'actif', dateFin: { $gte: now } }),
      CodePromo.countDocuments({ dateFin: { $lt: now } }),
      CodePromo.countDocuments({ $expr: { $gte: ['$utilisationActuelle', '$utilisationMax'] } })
    ]);
    res.json({ success: true, stats: { total, actifs, expires, epuises } });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur', error: error.message });
  }
};