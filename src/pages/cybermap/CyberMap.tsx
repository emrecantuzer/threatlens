import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
// @ts-ignore
import Globe from 'react-globe.gl';
import { fetchCyberMapData, CyberMapData, GraphNode, GraphLink } from '../../services/cyberMapService';
import { RefreshCw, AlertTriangle, Globe as GlobeIcon, Info, ShieldAlert, Activity } from 'lucide-react';

export default function CyberMap() {
  const [data, setData] = useState<CyberMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ w: 800, h: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>();

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0]?.contentRect ?? { width: 800, height: 600 };
      setDimensions({ w: Math.max(400, width), h: Math.max(400, height) });
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: graphData, isDemo: demo } = await fetchCyberMapData();
      setData(graphData);
      setIsDemo(demo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  const graphData = React.useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    return {
      nodes: data.nodes.map(n => ({ ...n })),
      links: data.links.map(l => ({
        source: l.source,
        target: l.target,
        count: l.count,
        maxSeverity: l.maxSeverity
      }))
    };
  }, [data]);

  // Fast access map to find coordinates of links
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>();
    if (data) {
      data.nodes.forEach(n => map.set(n.id, n));
    }
    return map;
  }, [data]);

  // Prepare recent events for live feed list
  const liveFeed = useMemo(() => {
    if (!data) return [];
    // Get the latest added ones (simulating recent 5-6 items)
    return data.links.slice(0, 8).map((link, i) => {
      const src = nodeMap.get(link.source);
      const dst = nodeMap.get(link.target);
      return {
        id: i,
        srcCountry: src?.country || 'Unknown',
        dstCountry: dst?.country || 'Unknown',
        severity: link.maxSeverity
      };
    });
  }, [data, nodeMap]);

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'internal') return '#22c55e';
    if (node.maxSeverity === 1) return '#ef4444';
    if (node.maxSeverity === 2) return '#f59e0b';
    return '#3b82f6';
  };

  const getLinkColor = (link: GraphLink) => {
    if (link.maxSeverity === 1) return '#ef4444';
    if (link.maxSeverity === 2) return '#f59e0b';
    return '#3b82f6';
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={48} />
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-center gap-4">
          <AlertTriangle className="text-red-500 flex-shrink-0" size={32} />
          <div>
            <h3 className="font-semibold text-red-800">Failed to load data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <GlobeIcon className="text-blue-600" size={28} />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Threat Topology</h1>
            <p className="text-sm text-gray-500">
              Live visual representation of Suricata network activity
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isDemo && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Info size={18} className="text-amber-600" />
              <span className="text-sm text-amber-800">Demo mode - API not connected</span>
            </div>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-gray-600">Internal network (RFC1918)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-gray-600">High severity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-sm text-gray-600">Medium severity</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm text-gray-600">Low / External</span>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-[500px] bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-xl relative">
        
        {/* LIVE THREAT FEED PANEL (HUD) */}
        <div className="absolute top-4 right-4 w-72 bg-gray-900/90 backdrop-blur-sm border border-gray-700 rounded-lg p-4 text-white z-10 shadow-2xl">
          <h3 className="font-bold mb-3 flex items-center gap-2 text-red-400 border-b border-gray-700 pb-2">
            <Activity size={18} className="animate-pulse" />
            LIVE THREAT FEED
          </h3>
          <div className="space-y-2 max-h-60 overflow-hidden">
            {liveFeed.map((feed) => (
              <div key={feed.id} className="flex items-center justify-between text-xs animate-in fade-in slide-in-from-right-4 duration-500">
                <span className="text-gray-300 w-24 truncate text-right">{feed.srcCountry}</span>
                <div className="flex-1 px-2 flex justify-center">
                  <span className={`text-[10px] px-1 rounded ${feed.severity === 1 ? 'bg-red-900 text-red-200' : 'bg-yellow-900 text-yellow-200'}`}>➔</span>
                </div>
                <span className="text-green-400 w-24 truncate text-left">{feed.dstCountry}</span>
              </div>
            ))}
          </div>
        </div>

        {graphData.nodes.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            <p>No connection data to display</p>
          </div>
        ) : (
          <Globe
            ref={graphRef}
            width={dimensions.w}
            height={dimensions.h}
            globeImageUrl="/maps/earth-night.jpg"
            bumpImageUrl="/maps/earth-topology.png"
            backgroundImageUrl="/maps/night-sky.png"
            backgroundColor="#000011"
            atmosphereColor="#4a90e2"
            atmosphereAltitude={0.25}
            autoRotate={true}
            autoRotateSpeed={0.6}
            
            // Points (IPs)
            pointsData={graphData.nodes}
            pointLat="lat"
            pointLng="lng"
            pointColor={node => getNodeColor(node as GraphNode)}
            pointRadius={node => Math.min(1.0, 0.2 + Math.log2((node as any).count + 1) * 0.3)}
            pointAltitude={0.01}
            pointLabel={node => `
              <div style="color: white; background: rgba(10,10,20,0.9); padding: 8px 12px; border: 1px solid #3b82f6; border-radius: 4px; font-family: sans-serif; box-shadow: 0 0 10px rgba(59,130,246,0.5);">
                <div style="font-weight: bold; font-size: 14px; color: #60a5fa; margin-bottom: 4px;">${(node as any).country}</div>
                <div style="font-size: 12px; color: #9ca3af;">IP: ${(node as any).label}</div>
                <div style="font-size: 12px; color: #ef4444; margin-top: 2px;">Threat Count: ${(node as any).count}</div>
              </div>
            `}

            // Arcs (Attacks/Connections)
            arcsData={graphData.links}
            arcStartLat={d => {
              const srcId = typeof d.source === 'object' ? (d.source as any).id : d.source;
              return nodeMap.get(srcId)?.lat ?? 0;
            }}
            arcStartLng={d => {
              const srcId = typeof d.source === 'object' ? (d.source as any).id : d.source;
              return nodeMap.get(srcId)?.lng ?? 0;
            }}
            arcEndLat={d => {
              const dstId = typeof d.target === 'object' ? (d.target as any).id : d.target;
              return nodeMap.get(dstId)?.lat ?? 0;
            }}
            arcEndLng={d => {
              const dstId = typeof d.target === 'object' ? (d.target as any).id : d.target;
              return nodeMap.get(dstId)?.lng ?? 0;
            }}
            arcColor={link => getLinkColor(link as GraphLink)}
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={2000} // Live flow speed
            arcStroke={0.5}
            arcAltitude={link => (link as any).count ? Math.min(0.5, (link as any).count * 0.05) : 0.1}
          />
        )}
      </div>
    </div>
  );
}
