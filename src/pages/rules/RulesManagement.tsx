import React, { useState, useEffect, useMemo } from 'react';
import { Shield, Plus, Save, X, RefreshCw, AlertTriangle, CheckCircle, FilePlus, Table, FileText, Trash2, Play, Pause } from 'lucide-react';
import { getRules, addBulkRules, saveRules } from '../../services/rulesService';

interface ParsedRule {
  lineIndex: number;
  raw: string;
  action: string;
  protocol: string;
  srcIp: string;
  srcPort: string;
  dstIp: string;
  dstPort: string;
  msg: string;
  sid: string;
  enabled: boolean;
}

export default function RulesManagement() {
  const [rules, setRules] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'raw'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
  const [newRules, setNewRules] = useState('');
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [singleRule, setSingleRule] = useState({
    action: 'alert',
    protocol: 'tcp',
    srcIp: 'any',
    srcPort: 'any',
    dstIp: 'any',
    dstPort: 'any',
    msg: '',
    sid: ''
  });

  const loadRules = async () => {
    setLoading(true);
    try {
      const data = await getRules();
      setRules(data);
      setError(null);
    } catch (err) {
      setError('Kurallar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);
    
    if (!newRules.trim()) return;

    try {
      const result = await addBulkRules(newRules);
      setSubmitStatus({ type: 'success', message: `${result.count} kural başarıyla eklendi.` });
      setNewRules('');
      loadRules(); // Listeyi yenile
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitStatus(null);
      }, 1500);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err instanceof Error ? err.message : 'Ekleme başarısız.' });
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitStatus(null);

    if (!singleRule.sid || !singleRule.msg) {
      setSubmitStatus({ type: 'error', message: 'SID ve Mesaj alanları zorunludur.' });
      return;
    }

    // Suricata kural formatını oluştur
    const ruleString = `${singleRule.action} ${singleRule.protocol} ${singleRule.srcIp} ${singleRule.srcPort} -> ${singleRule.dstIp} ${singleRule.dstPort} (msg:"${singleRule.msg}"; sid:${singleRule.sid}; rev:1;)`;

    try {
      await addBulkRules(ruleString);
      setSubmitStatus({ type: 'success', message: 'Kural başarıyla eklendi.' });
      setSingleRule({
        action: 'alert',
        protocol: 'tcp',
        srcIp: 'any',
        srcPort: 'any',
        dstIp: 'any',
        dstPort: 'any',
        msg: '',
        sid: ''
      });
      loadRules();
      setTimeout(() => {
        setIsSingleModalOpen(false);
        setSubmitStatus(null);
      }, 1500);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: err instanceof Error ? err.message : 'Ekleme başarısız.' });
    }
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSubmitStatus(null);
    try {
      await saveRules(rules);
      setSubmitStatus({ type: 'success', message: 'Tüm değişiklikler kaydedildi.' });
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (err) {
      setSubmitStatus({ type: 'error', message: 'Kaydetme sırasında hata oluştu.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Kuralları metinden nesneye dönüştür (Tablo görünümü için)
  const parsedRules = useMemo(() => {
    return rules.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // Yorum satırı mı kontrol et (Kural pasif mi?)
      const enabled = !trimmed.startsWith('#');
      const content = enabled ? trimmed : trimmed.replace(/^#\s*/, '');

      // Basit bir Suricata kuralı kontrolü (-> ve ( ) içermeli)
      if (!content.includes('->') || !content.includes('(')) return null;

      const parts = content.split(/\s+/);
      if (parts.length < 7) return null;

      // msg ve sid değerlerini regex ile çek
      const optionsStr = content.substring(content.indexOf('(') + 1, content.lastIndexOf(')'));
      const msgMatch = optionsStr.match(/msg\s*:\s*"([^"]+)"/);
      const sidMatch = optionsStr.match(/sid\s*:\s*(\d+)/);

      return {
        lineIndex: index,
        raw: line,
        action: parts[0],
        protocol: parts[1],
        srcIp: parts[2],
        srcPort: parts[3],
        dstIp: parts[5],
        dstPort: parts[6],
        msg: msgMatch ? msgMatch[1] : 'No message',
        sid: sidMatch ? sidMatch[1] : '?',
        enabled
      } as ParsedRule;
    }).filter(Boolean) as ParsedRule[];
  }, [rules]);

  const handleDeleteRule = (lineIndex: number) => {
    const lines = rules.split('\n');
    lines.splice(lineIndex, 1);
    setRules(lines.join('\n'));
  };

  const handleToggleRule = (lineIndex: number, currentEnabled: boolean) => {
    const lines = rules.split('\n');
    const line = lines[lineIndex];
    if (currentEnabled) {
      lines[lineIndex] = `# ${line}`;
    } else {
      lines[lineIndex] = line.replace(/^#\s*/, '');
    }
    setRules(lines.join('\n'));
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <Shield className="text-blue-600" size={32} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kural Yönetimi</h1>
            <p className="text-sm text-gray-500">Suricata IDS/IPS kurallarını yönetin</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="bg-gray-100 p-1 rounded-lg flex mr-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Tablo Görünümü"
            >
              <Table size={18} />
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`p-2 rounded-md transition-all ${viewMode === 'raw' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Metin Görünümü"
            >
              <FileText size={18} />
            </button>
          </div>

          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            onClick={() => setIsSingleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <FilePlus size={18} />
            Tekli Ekle
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            Toplu Ekle
          </button>
        </div>
      </div>

      {/* Kural Listesi / Editör Alanı */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-200px)]">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center backdrop-blur-sm">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
             <h3 className="font-semibold text-gray-700">Mevcut Kurallar (local.rules)</h3>
          </div>
          <button onClick={loadRules} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        {/* Ana sayfa bildirim alanı */}
        {submitStatus && !isModalOpen && !isSingleModalOpen && (
          <div className={`px-4 py-2 text-sm flex items-center gap-2 ${
            submitStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {submitStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {submitStatus.message}
          </div>
        )}

        <div className="flex-1 p-0 relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <RefreshCw className="animate-spin text-blue-500" size={32} />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-500">
              <AlertTriangle className="mx-auto mb-2" size={32} />
              {error}
            </div>
          ) : (
            viewMode === 'raw' ? (
              <textarea
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                className="w-full h-full p-4 font-mono text-sm text-gray-800 resize-none focus:outline-none"
                spellCheck={false}
              />
            ) : (
              <div className="h-full overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50/90 border-b border-gray-200 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-gray-500 w-16 text-xs uppercase tracking-wider">Durum</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 w-24 text-xs uppercase tracking-wider">SID</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 w-24 text-xs uppercase tracking-wider">Aksiyon</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 w-20 text-xs uppercase tracking-wider">Proto</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Kaynak</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Hedef</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Mesaj</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 w-16 text-right text-xs uppercase tracking-wider">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parsedRules.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                          Görüntülenecek kural bulunamadı.
                        </td>
                      </tr>
                    ) : (
                      parsedRules.map((rule) => (
                        <tr key={rule.lineIndex} className={`group hover:bg-blue-50/50 transition-colors ${!rule.enabled ? 'opacity-60 bg-gray-50/50 grayscale' : ''}`}>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => handleToggleRule(rule.lineIndex, rule.enabled)}
                              className={`p-1.5 rounded-md transition-all shadow-sm ${rule.enabled ? 'text-green-700 bg-green-100 hover:bg-green-200' : 'text-gray-500 bg-gray-200 hover:bg-gray-300'}`}
                              title={rule.enabled ? "Kuralı Pasif Yap" : "Kuralı Aktif Yap"}
                            >
                              {rule.enabled ? <Pause size={14} strokeWidth={2.5} /> : <Play size={14} strokeWidth={2.5} />}
                            </button>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-500">{rule.sid}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold capitalize border ${
                              rule.action === 'alert' ? 'bg-red-50 text-red-700 border-red-100' : 
                              rule.action === 'drop' ? 'bg-orange-50 text-orange-700 border-orange-100' : 
                              'bg-blue-50 text-blue-700 border-blue-100'
                            }`}>
                              {rule.action}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                             <span className="font-mono text-xs font-semibold text-gray-600 uppercase bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                               {rule.protocol}
                             </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            <div className="flex flex-col">
                              <span className="font-medium">{rule.srcIp}</span>
                              <span className="text-gray-400 text-[10px]">{rule.srcPort}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">
                            <div className="flex flex-col">
                              <span className="font-medium">{rule.dstIp}</span>
                              <span className="text-gray-400 text-[10px]">{rule.dstPort}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-700 text-sm font-medium">{rule.msg}</td>
                          <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleDeleteRule(rule.lineIndex)}
                              className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              title="Kuralı Sil"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* Toplu Ekleme Modalı */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Plus className="text-blue-600" />
                Toplu Kural Ekle
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleBulkSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suricata Kuralları
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Her satıra bir kural gelecek şekilde yapıştırın. Örnek: <br/>
                    <code className="bg-gray-100 px-1 py-0.5 rounded">alert tcp any any -&gt; any 80 (msg:"TEST"; sid:10001; rev:1;)</code>
                  </p>
                  <textarea
                    value={newRules}
                    onChange={(e) => setNewRules(e.target.value)}
                    placeholder="# Kuralları buraya yapıştırın..."
                    className="w-full h-64 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    required
                  />
                </div>

                {submitStatus && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    submitStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {submitStatus.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    {submitStatus.message}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm"
                >
                  <Save size={18} />
                  Kuralları Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tekli Kural Ekleme Modalı */}
      {isSingleModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FilePlus className="text-blue-600" />
                Tekli Kural Ekle
              </h2>
              <button onClick={() => setIsSingleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSingleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aksiyon</label>
                    <select 
                      value={singleRule.action}
                      onChange={(e) => setSingleRule({...singleRule, action: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="alert">Alert</option>
                      <option value="drop">Drop</option>
                      <option value="pass">Pass</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Protokol</label>
                    <select 
                      value={singleRule.protocol}
                      onChange={(e) => setSingleRule({...singleRule, protocol: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                      <option value="icmp">ICMP</option>
                      <option value="ip">IP</option>
                      <option value="http">HTTP</option>
                      <option value="tls">TLS</option>
                      <option value="dns">DNS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak IP</label>
                    <input 
                      type="text" 
                      value={singleRule.srcIp}
                      onChange={(e) => setSingleRule({...singleRule, srcIp: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kaynak Port</label>
                    <input 
                      type="text" 
                      value={singleRule.srcPort}
                      onChange={(e) => setSingleRule({...singleRule, srcPort: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hedef IP</label>
                    <input 
                      type="text" 
                      value={singleRule.dstIp}
                      onChange={(e) => setSingleRule({...singleRule, dstIp: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Port</label>
                    <input 
                      type="text" 
                      value={singleRule.dstPort}
                      onChange={(e) => setSingleRule({...singleRule, dstPort: e.target.value})}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mesaj (msg)</label>
                  <input 
                    type="text" 
                    value={singleRule.msg}
                    onChange={(e) => setSingleRule({...singleRule, msg: e.target.value})}
                    placeholder="Örn: Şüpheli trafik tespit edildi"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SID (Signature ID)</label>
                  <input 
                    type="number" 
                    value={singleRule.sid}
                    onChange={(e) => setSingleRule({...singleRule, sid: e.target.value})}
                    placeholder="Örn: 1000001"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>

                {submitStatus && (
                  <div className={`p-4 rounded-lg flex items-center gap-3 ${
                    submitStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {submitStatus.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                    {submitStatus.message}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
                <button
                  type="button"
                  onClick={() => setIsSingleModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium shadow-sm"
                >
                  <Save size={18} />
                  Kuralı Ekle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}