export interface PcapFile {
  name: string;
  size: number;
  date: string;
}

export async function getPcapFiles(): Promise<PcapFile[]> {
  const response = await fetch('/api/pcap/list');
  if (!response.ok) {
    throw new Error('PCAP listesi alınamadı');
  }
  return response.json();
}

export function getPcapDownloadUrl(filename: string): string {
  return `/api/pcap/download/${filename}`;
}