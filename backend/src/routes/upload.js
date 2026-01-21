import { Router } from 'express';
import multer from 'multer';
import { parseExcelFile, groupByICO } from '../services/excelParser.js';

const router = Router();

// Konfigurace multer pro upload souborů do paměti
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Povolené jsou pouze Excel soubory (.xlsx, .xls)'));
    }
  },
});

/**
 * POST /api/upload
 * Nahraje a zpracuje Excel soubor
 */
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nebyl nahrán žádný soubor' });
    }

    const result = parseExcelFile(req.file.buffer);

    res.json({
      success: true,
      filename: req.file.originalname,
      sheets: result.sheets,
      totalClients: result.clients.length,
      clients: result.clients,
    });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/upload/group
 * Seskupí vybrané klienty podle IČO
 */
router.post('/group', async (req, res) => {
  try {
    const { clients } = req.body;

    if (!clients || !Array.isArray(clients)) {
      return res.status(400).json({ error: 'Neplatná data klientů' });
    }

    const groups = groupByICO(clients);

    res.json({
      success: true,
      totalGroups: groups.length,
      groups: groups,
    });
  } catch (error) {
    console.error('Error grouping clients:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
