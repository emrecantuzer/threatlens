import { getLogsByType } from './logService';
import { getEvents } from './eventService';

export interface GraphNode {
  id: string;
  label: string;
  type: 'internal' | 'external' | 'unknown';
  count: number;
  maxSeverity: number;
  lat: number;
  lng: number;
  country: string;
}

export interface GraphLink {
  source: string;
  target: string;
  count: number;
  maxSeverity: number;
  protocols: Set<string>;
}

export interface CyberMapData {
  nodes: GraphNode[];
  links: GraphLink[];
}

/** RFC1918 private IP kontrolü - on-prem ağ sınıflandırması */
function isPrivateIP(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

function normalizeSeverity(sev: unknown): number {
  if (typeof sev === 'number') return Math.max(1, Math.min(3, sev));
  if (sev === 'high' || sev === 'critical') return 1;
  if (sev === 'medium') return 2;
  if (sev === 'low') return 3;
  return 2;
}

/** IP adresinden sahte ama tutarlı koordinat üretir (Demo için) */
function getIPCoordinates(ip: string): { lat: number; lng: number; country: string } {
  // Özel/Yerel IP'ler için sabit bir merkez (Örn: Ankara/Türkiye HQ)
  if (isPrivateIP(ip)) {
    return { lat: 39.9334, lng: 32.8597, country: 'Türkiye (HQ)' };
  }

  // IP string'inden basit bir hash oluştur
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash |= 0;
  }

  // Rastgele ama IP'ye özel sabit lokasyonlar
  const locations = [
    { lat: 37.0902, lng: -95.7129, country: 'United States' },
    { lat: 51.1657, lng: 10.4515, country: 'Germany' },
    { lat: 35.8617, lng: 104.1954, country: 'China' },
    { lat: 61.5240, lng: 105.3188, country: 'Russia' },
    { lat: -14.2350, lng: -51.9253, country: 'Brazil' },
    { lat: 20.5937, lng: 78.9629, country: 'India' },
    { lat: 55.3781, lng: -3.4360, country: 'United Kingdom' },
    { lat: 46.2276, lng: 2.2137, country: 'France' },
    { lat: 36.2048, lng: 138.2529, country: 'Japan' },
    { lat: -25.2744, lng: 133.7751, country: 'Australia' },
  ];

  return locations[Math.abs(hash) % locations.length];
}

/** Log ve event verilerinden graph verisi üretir */
export function buildGraphFromRecords(records: Array<{
  src_ip?: string;
  dest_ip?: string;
  dst_ip?: string;
  severity?: unknown;
  protocol?: string;
}>): CyberMapData {
  const nodeMap = new Map<string, GraphNode>();
  const linkMap = new Map<string, GraphLink>();

  const ensureNode = (ip: string, severity: number) => {
    if (!ip || ip === '0.0.0.0' || ip === '::') return;
    const key = ip.trim();
    const type = isPrivateIP(key) ? 'internal' : 'external';
    const existing = nodeMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.maxSeverity = Math.min(existing.maxSeverity, severity);
    } else {
      const coords = getIPCoordinates(key);
      nodeMap.set(key, {
        id: key,
        label: key,
        type: type as 'internal' | 'external' | 'unknown',
        count: 1,
        maxSeverity: severity,
        lat: coords.lat,
        lng: coords.lng,
        country: coords.country
      });
    }
  };

  const addLink = (src: string, dest: string, severity: number, protocol?: string) => {
    if (!src || !dest || src === dest) return;
    const key = `${src}->${dest}`;
    const existing = linkMap.get(key);
    if (existing) {
      existing.count += 1;
      existing.maxSeverity = Math.min(existing.maxSeverity, severity);
      if (protocol) existing.protocols.add(protocol);
    } else {
      linkMap.set(key, {
        source: src,
        target: dest,
        count: 1,
        maxSeverity: severity,
        protocols: new Set(protocol ? [protocol] : [])
      });
    }
  };

  for (const r of records) {
    const src = r.src_ip?.trim();
    const dest = (r.dest_ip ?? r.dst_ip)?.trim();
    if (!src || !dest) continue;
    const sev = normalizeSeverity(r.severity);
    ensureNode(src, sev);
    ensureNode(dest, sev);
    addLink(src, dest, sev, r.protocol);
  }

  const nodes = Array.from(nodeMap.values());
  const links = Array.from(linkMap.values()).map(l => ({
    ...l,
    protocols: Array.from(l.protocols)
  }));

  return { nodes, links };
}

/** API'den log ve event verilerini çekip graph'e dönüştürür */
export async function fetchCyberMapData(): Promise<{
  data: CyberMapData;
  isDemo: boolean;
}> {
  const allRecords: Array<{
    src_ip?: string;
    dest_ip?: string;
    dst_ip?: string;
    severity?: unknown;
    protocol?: string;
  }> = [];

  try {
    const [logsRes, eventsRes] = await Promise.allSettled([
      getLogsByType('alert', {}, 1, 500),
      getEvents({ limit: 500 })
    ]);

    if (logsRes.status === 'fulfilled' && logsRes.value?.data) {
      allRecords.push(...(logsRes.value.data as typeof allRecords));
    }
    if (eventsRes.status === 'fulfilled' && eventsRes.value?.data) {
      allRecords.push(...(eventsRes.value.data as typeof allRecords));
    }

    if (allRecords.length > 0) {
      return { data: buildGraphFromRecords(allRecords), isDemo: false };
    }
  } catch {
    // API hatası - demo veri kullan
  }

  return { data: getDemoGraphData(), isDemo: true };
}

/** API yokken gösterilecek örnek veri - on-prem kurulum örneği */
function getDemoGraphData(): CyberMapData {
  const demoRecords = [
    { src_ip: '192.168.1.100', dest_ip: '8.8.8.8', severity: 2, protocol: 'UDP' },
    { src_ip: '45.33.32.156', dest_ip: '192.168.1.10', severity: 1, protocol: 'TCP' },
    { src_ip: '185.220.101.42', dest_ip: '192.168.1.10', severity: 1, protocol: 'TCP' },
    { src_ip: '192.168.1.50', dest_ip: '1.1.1.1', severity: 3, protocol: 'UDP' },
    { src_ip: '91.121.88.12', dest_ip: '192.168.1.100', severity: 2, protocol: 'TCP' },
    { src_ip: '192.168.1.10', dest_ip: '93.184.216.34', severity: 2, protocol: 'TCP' },
    { src_ip: '45.33.32.156', dest_ip: '192.168.1.50', severity: 1, protocol: 'TCP' },
    { src_ip: '185.220.101.42', dest_ip: '192.168.1.100', severity: 1, protocol: 'TCP' },
    { src_ip: '192.168.1.100', dest_ip: '93.184.216.34', severity: 3, protocol: 'HTTP' },
    { src_ip: '71.6.135.131', dest_ip: '192.168.1.10', severity: 2, protocol: 'TCP' },
  ];
  return buildGraphFromRecords(demoRecords);
}
