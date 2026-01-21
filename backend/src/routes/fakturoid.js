import { Router } from 'express';
import {
  testConnection,
  findSubjectByICO,
  processGroupAndCreateInvoice,
} from '../services/fakturoidService.js';
import { groupByICO } from '../services/excelParser.js';

const router = Router();

/**
 * POST /api/fakturoid/test
 * Otestuje připojení k Fakturoid API
 */
router.post('/test', async (req, res) => {
  try {
    const { slug, apiKey, email } = req.body;

    if (!slug || !apiKey || !email) {
      return res.status(400).json({
        error: 'Chybí povinné parametry: slug, apiKey, email',
      });
    }

    const result = await testConnection(slug, apiKey, email);
    res.json(result);
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fakturoid/check-subjects
 * Ověří, zda existují subjekty pro zadaná IČO
 */
router.post('/check-subjects', async (req, res) => {
  try {
    const { slug, apiKey, email, icos } = req.body;

    if (!slug || !apiKey || !email || !icos) {
      return res.status(400).json({
        error: 'Chybí povinné parametry',
      });
    }

    const results = [];
    for (const ico of icos) {
      try {
        const subject = await findSubjectByICO(slug, apiKey, email, ico);
        results.push({
          ico,
          found: !!subject,
          subjectId: subject?.id,
          subjectName: subject?.name,
        });
      } catch (error) {
        results.push({
          ico,
          found: false,
          error: error.message,
        });
      }
    }

    const found = results.filter(r => r.found).length;
    const notFound = results.filter(r => !r.found).length;

    res.json({
      success: true,
      total: icos.length,
      found,
      notFound,
      results,
    });
  } catch (error) {
    console.error('Error checking subjects:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fakturoid/create-invoices
 * Vytvoří faktury pro vybrané klienty
 */
router.post('/create-invoices', async (req, res) => {
  try {
    const { slug, apiKey, email, clients, options } = req.body;

    if (!slug || !apiKey || !email || !clients) {
      return res.status(400).json({
        error: 'Chybí povinné parametry',
      });
    }

    // Seskup klienty podle IČO
    const groups = groupByICO(clients);

    // Filtruj pouze české a slovenské klienty (první fáze)
    const filteredGroups = groups.filter(g => {
      const firstItem = g.items[0];
      return firstItem && ['CZE', 'SVK'].includes(firstItem.stat);
    });

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const group of filteredGroups) {
      const result = await processGroupAndCreateInvoice(
        slug,
        apiKey,
        email,
        group,
        options || {}
      );

      results.push(result);

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    res.json({
      success: true,
      totalGroups: filteredGroups.length,
      successCount,
      errorCount,
      results,
    });
  } catch (error) {
    console.error('Error creating invoices:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/fakturoid/preview
 * Náhled faktur bez vytvoření
 */
router.post('/preview', async (req, res) => {
  try {
    const { clients, options } = req.body;

    if (!clients) {
      return res.status(400).json({
        error: 'Chybí data klientů',
      });
    }

    // Seskup klienty podle IČO
    const groups = groupByICO(clients);

    // Filtruj pouze české a slovenské klienty
    const filteredGroups = groups.filter(g => {
      const firstItem = g.items[0];
      return firstItem && ['CZE', 'SVK'].includes(firstItem.stat);
    });

    const preview = filteredGroups.map(group => {
      const includePeriodinName = options?.includePeriodinName ?? true;

      const lines = group.items.map(item => {
        let name = item.sluzba || 'Licence';
        if (includePeriodinName && item.datumAktivace && item.datumKonceFO) {
          name = `${name} (${formatDateCZ(item.datumAktivace)} - ${formatDateCZ(item.datumKonceFO)})`;
        }
        return {
          name,
          quantity: 1,
          unitPrice: item.fakturovanaHodnota || 0,
          vatRate: item.platceDPH ? (options?.vatRate || 21) : 0,
        };
      });

      const total = lines.reduce((sum, line) => sum + line.unitPrice, 0);

      return {
        ico: group.ico,
        nazevKlienta: group.nazevKlienta,
        stat: group.items[0]?.stat,
        itemCount: group.items.length,
        lines,
        total,
        taxableFulfillmentDue: group.items[0]?.datumAktivace,
      };
    });

    res.json({
      success: true,
      totalInvoices: preview.length,
      preview,
    });
  } catch (error) {
    console.error('Error generating preview:', error);
    res.status(500).json({ error: error.message });
  }
});

function formatDateCZ(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default router;
