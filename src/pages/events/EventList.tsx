import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getEvents, SecurityEvent } from '../../services/eventService';

export default function EventList() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await getEvents();
      // Backend direkt array dönüyor, obje içinde data değil
      setEvents(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Olaylar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 30000); // 30 saniyede bir otomatik yenile
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'bg-red-100 text-red-800 border-red-200'; // Yüksek/Kritik
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200'; // Orta
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200'; // Düşük
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getSeverityLabel = (severity: number) => {
    switch (severity) {
      case 1: return 'Kritik';
      case 2: return 'Yüksek';
      case 3: return 'Orta';
      default: return 'Bilgi';
    }
  };

  const filteredEvents = events.filter(event =>
    (event.signature || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (event.src_ip || '').includes(searchTerm) ||
    (event.dest_ip || '').includes(searchTerm)
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-red-600" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Olay Yönetimi</h1>
            <p className="text-sm text-gray-500">Güvenlik ihlalleri ve tehdit uyarıları</p>
          </div>
        </div>
        <div className="flex gap-3">
           <div className="relative">
            <input
              type="text"
              placeholder="Ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
          <button
            onClick={loadEvents}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Yenile"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 font-semibold text-gray-900">Zaman</th>
                <th className="px-6 py-3 font-semibold text-gray-900">Önem</th>
                <th className="px-6 py-3 font-semibold text-gray-900">İmza / Mesaj</th>
                <th className="px-6 py-3 font-semibold text-gray-900">Kaynak</th>
                <th className="px-6 py-3 font-semibold text-gray-900">Hedef</th>
                <th className="px-6 py-3 font-semibold text-gray-900">Proto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Yükleniyor...' : 'Görüntülenecek olay bulunamadı.'}
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(event.timestamp || Date.now()).toLocaleString('tr-TR')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                        {getSeverityLabel(event.severity)}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {event.signature}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{event.src_ip}</td>
                    <td className="px-6 py-4 font-mono text-xs">{event.dest_ip}</td>
                    <td className="px-6 py-4 uppercase">{event.protocol}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}