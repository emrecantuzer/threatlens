export interface SecurityEvent {
  src_ip: string;
  dest_ip: string;
  severity: number;
  protocol: string;
  signature: string;
  timestamp: string;
}

export const getEvents = async (filters: Record<string, any> = {}): Promise<SecurityEvent[]> => {
  try {
    const queryParams = new URLSearchParams(filters);
    const response = await fetch(`/api/events?${queryParams}`);
    if (!response.ok) throw new Error('Failed to fetch events');
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch events:', error);
    throw error;
  }
};