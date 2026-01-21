import { useState, useMemo } from 'react';

function ClientsTable({ clients, selectedClients, onSelectionChange }) {
  const [filters, setFilters] = useState({
    search: '',
    stat: '',
    sluzba: '',
    typCinnosti: '',
    canInvoice: 'all', // 'all', 'yes', 'no'
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Unique values for filters
  const filterOptions = useMemo(() => {
    return {
      stats: [...new Set(clients.map((c) => c.stat).filter(Boolean))],
      sluzby: [...new Set(clients.map((c) => c.sluzba).filter(Boolean))],
      typyCinnosti: [...new Set(clients.map((c) => c.typCinnosti).filter(Boolean))],
    };
  }, [clients]);

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    let result = clients.filter((client) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          (client.nazevKlienta?.toLowerCase() || '').includes(searchLower) ||
          (client.ico?.toLowerCase() || '').includes(searchLower) ||
          (client.okres?.toLowerCase() || '').includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Stat filter
      if (filters.stat && client.stat !== filters.stat) return false;

      // Sluzba filter
      if (filters.sluzba && client.sluzba !== filters.sluzba) return false;

      // Typ cinnosti filter
      if (filters.typCinnosti && client.typCinnosti !== filters.typCinnosti) return false;

      // Can invoice filter
      if (filters.canInvoice === 'yes' && !client.canInvoice) return false;
      if (filters.canInvoice === 'no' && client.canInvoice) return false;

      return true;
    });

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key] ?? '';
        const bVal = b[sortConfig.key] ?? '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [clients, filters, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // Select all filtered clients (not just canInvoice)
      onSelectionChange(filteredClients);
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectOne = (client, checked) => {
    if (checked) {
      onSelectionChange([...selectedClients, client]);
    } else {
      onSelectionChange(selectedClients.filter((c) => c.id !== client.id));
    }
  };

  const isSelected = (client) => selectedClients.some((c) => c.id === client.id);

  const selectableCount = filteredClients.length;
  const selectedCount = selectedClients.length;

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Hledat (název, IČO, okres)..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm w-64"
          />
          <select
            value={filters.stat}
            onChange={(e) => setFilters({ ...filters, stat: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Všechny státy</option>
            {filterOptions.stats.map((stat) => (
              <option key={stat} value={stat}>
                {stat}
              </option>
            ))}
          </select>
          <select
            value={filters.sluzba}
            onChange={(e) => setFilters({ ...filters, sluzba: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Všechny služby</option>
            {filterOptions.sluzby.map((sluzba) => (
              <option key={sluzba} value={sluzba}>
                {sluzba}
              </option>
            ))}
          </select>
          <select
            value={filters.typCinnosti}
            onChange={(e) => setFilters({ ...filters, typCinnosti: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Všechny typy činnosti</option>
            {filterOptions.typyCinnosti.map((typ) => (
              <option key={typ} value={typ}>
                {typ}
              </option>
            ))}
          </select>
          <select
            value={filters.canInvoice}
            onChange={(e) => setFilters({ ...filters, canInvoice: e.target.value })}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">Vše</option>
            <option value="yes">Lze fakturovat</option>
            <option value="no">Nelze fakturovat</option>
          </select>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          Zobrazeno {filteredClients.length} z {clients.length} záznamů
          {selectedCount > 0 && ` (vybráno: ${selectedCount})`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedCount > 0 && selectedCount === selectableCount}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th
                className="px-3 py-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('ico')}
              >
                IČO {sortConfig.key === 'ico' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-3 py-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('nazevKlienta')}
              >
                Název klienta
              </th>
              <th
                className="px-3 py-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('stat')}
              >
                Stát
              </th>
              <th
                className="px-3 py-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('sluzba')}
              >
                Služba
              </th>
              <th
                className="px-3 py-3 text-left cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('typCinnosti')}
              >
                Typ činnosti
              </th>
              <th
                className="px-3 py-3 text-right cursor-pointer hover:bg-gray-200"
                onClick={() => handleSort('fakturovanaHodnota')}
              >
                Hodnota
              </th>
              <th className="px-3 py-3 text-left">Období</th>
              <th className="px-3 py-3 text-center">Stav</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredClients.map((client) => (
              <tr
                key={client.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  isSelected(client) ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectOne(client, !isSelected(client))}
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isSelected(client)}
                    onChange={(e) => handleSelectOne(client, e.target.checked)}
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{client.ico || '-'}</td>
                <td className="px-3 py-2 max-w-xs truncate" title={client.nazevKlienta}>
                  {client.nazevKlienta}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      client.stat === 'CZE'
                        ? 'bg-blue-100 text-blue-700'
                        : client.stat === 'SVK'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                  >
                    {client.stat}
                  </span>
                </td>
                <td className="px-3 py-2">{client.sluzba || '-'}</td>
                <td className="px-3 py-2">{client.typCinnosti || '-'}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {formatCurrency(client.fakturovanaHodnota)}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {client.datumAktivace && client.datumKonceFO
                    ? `${client.datumAktivace} - ${client.datumKonceFO}`
                    : '-'}
                </td>
                <td className="px-3 py-2 text-center">
                  {client.vyfakturovano === 'ano' || client.vyfakturovano === 'áno' ? (
                    <span className="text-green-600">Vyfakturováno</span>
                  ) : client.canInvoice ? (
                    <span className="text-blue-600">K fakturaci</span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredClients.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          Žádné záznamy neodpovídají filtrům
        </div>
      )}
    </div>
  );
}

export default ClientsTable;
