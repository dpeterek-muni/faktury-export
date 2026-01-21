function groupByICO(clients) {
  const groups = new Map();

  for (const client of clients) {
    if (!client.ico) continue;

    if (!groups.has(client.ico)) {
      groups.set(client.ico, {
        ico: client.ico,
        nazevKlienta: client.nazevKlienta,
        stat: client.stat,
        platceDPH: client.platceDPH,
        items: [],
      });
    }

    groups.get(client.ico).items.push(client);
  }

  return Array.from(groups.values());
}

function formatDateCZ(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { clients, options } = req.body;

    if (!clients) {
      return res.status(400).json({ error: 'Missing clients data' });
    }

    const groups = groupByICO(clients);

    // Filter CZE and SVK only
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
    res.status(500).json({ error: error.message });
  }
}
