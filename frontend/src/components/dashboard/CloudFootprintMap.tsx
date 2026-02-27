import React, { useState } from 'react';
import { Globe2, MapPin } from 'lucide-react';

interface CloudFootprintMapProps {
  regions?: Array<{
    name: string;
    provider: 'aws' | 'azure' | 'gcp';
    latitude: number;
    longitude: number;
    resources: number;
    cost: number;
  }>;
}

const CloudFootprintMap: React.FC<CloudFootprintMapProps> = ({ regions = [] }) => {
  const [hoveredRegion, setHoveredRegion] = useState<number | null>(null);

  const defaultRegions = [
    { name: 'US East (N. Virginia)', provider: 'aws' as const, latitude: 38.9, longitude: -77.0, resources: 8052, cost: 696.79 },
    { name: 'US West (Oregon)', provider: 'aws' as const, latitude: 45.5, longitude: -122.6, resources: 1234, cost: 145.23 },
    { name: 'EU West (Ireland)', provider: 'aws' as const, latitude: 53.3, longitude: -6.2, resources: 2341, cost: 234.56 },
    { name: 'Azure East US', provider: 'azure' as const, latitude: 37.3, longitude: -79.8, resources: 456, cost: 89.12 },
    { name: 'Asia Pacific (Mumbai)', provider: 'aws' as const, latitude: 19.0, longitude: 72.8, resources: 789, cost: 67.45 },
    { name: 'Asia Pacific (Singapore)', provider: 'aws' as const, latitude: 1.3, longitude: 103.8, resources: 543, cost: 56.78 },
  ];

  const displayRegions = regions.length > 0 ? regions : defaultRegions;

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'aws': return '#FF9900';
      case 'azure': return '#0078D4';
      case 'gcp': return '#4285F4';
      default: return '#3b82f6';
    }
  };

  // Mercator projection for positioning markers
  const projectToPercentage = (lat: number, lon: number) => {
    const x = ((lon + 180) / 360) * 100;
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = (1 - mercN / Math.PI) * 50;
    return { x: `${x}%`, y: `${y}%` };
  };

  const getMarkerSize = (resources: number) => {
    if (resources > 5000) return 'w-8 h-8';
    if (resources > 1000) return 'w-6 h-6';
    return 'w-5 h-5';
  };

  const totalResources = displayRegions.reduce((sum, r) => sum + r.resources, 0);
  const totalCost = displayRegions.reduce((sum, r) => sum + r.cost, 0);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-blue-500" />
            Cloud Footprint
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {displayRegions.length} regions • {totalResources.toLocaleString()} resources deployed globally
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            ${totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">Monthly Cost</p>
        </div>
      </div>

      {/* World Map Container */}
      <div className="relative rounded-lg overflow-hidden mb-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800 border border-blue-100 dark:border-slate-700">
        {/* Embedded Wikipedia SVG World Map */}
        <div className="relative w-full" style={{ paddingBottom: '50%' }}>
          <iframe
            src="https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg"
            className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-20"
            style={{ border: 'none' }}
            title="World Map"
          />
          
          {/* Overlay for better contrast */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none"></div>

          {/* Region Markers */}
          <div className="absolute inset-0">
            {displayRegions.map((region, index) => {
              const position = projectToPercentage(region.latitude, region.longitude);
              const markerSize = getMarkerSize(region.resources);
              const color = getProviderColor(region.provider);
              const isHovered = hoveredRegion === index;

              return (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
                  style={{ left: position.x, top: position.y }}
                  onMouseEnter={() => setHoveredRegion(index)}
                  onMouseLeave={() => setHoveredRegion(null)}
                >
                  {/* Pulse Ring */}
                  <div 
                    className={`absolute inset-0 rounded-full ${markerSize} animate-ping`}
                    style={{ backgroundColor: color, opacity: 0.4 }}
                  ></div>

                  {/* Main Marker */}
                  <div 
                    className={`${markerSize} rounded-full border-3 border-white shadow-xl flex items-center justify-center relative z-10 transition-transform ${
                      isHovered ? 'scale-125' : 'scale-100'
                    }`}
                    style={{ backgroundColor: color }}
                  >
                    <MapPin className="w-3 h-3 text-white" />
                  </div>

                  {/* Tooltip */}
                  {isHovered && (
                    <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-3 w-56 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-2xl z-20 animate-fadeIn">
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                      <p className="font-bold text-sm mb-2">{region.name}</p>
                      <div className="space-y-1 text-gray-300">
                        <div className="flex justify-between">
                          <span>Provider:</span>
                          <span className="text-white uppercase font-semibold">{region.provider}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Resources:</span>
                          <span className="text-white font-semibold">{region.resources.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Monthly Cost:</span>
                          <span className="text-green-400 font-bold">${region.cost.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Region Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {displayRegions.map((region, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border-2 transition-all hover:shadow-lg cursor-pointer transform hover:scale-105"
            style={{ 
              borderColor: hoveredRegion === index ? getProviderColor(region.provider) : 'transparent',
              backgroundColor: hoveredRegion === index 
                ? getProviderColor(region.provider) + '10' 
                : 'transparent' 
            }}
            onMouseEnter={() => setHoveredRegion(index)}
            onMouseLeave={() => setHoveredRegion(null)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ backgroundColor: getProviderColor(region.provider) }}
                ></div>
                <p className="text-xs font-bold uppercase" style={{ color: getProviderColor(region.provider) }}>
                  {region.provider}
                </p>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                ${region.cost.toLocaleString()}
              </p>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1 truncate">
              {region.name}
            </p>
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{region.resources.toLocaleString()} resources</span>
              <MapPin className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#FF9900' }}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AWS</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({displayRegions.filter(r => r.provider === 'aws').length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#0078D4' }}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Azure</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({displayRegions.filter(r => r.provider === 'azure').length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#4285F4' }}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">GCP</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({displayRegions.filter(r => r.provider === 'gcp').length})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Globe2 className="w-4 h-4" />
          <span className="font-medium">{totalResources.toLocaleString()} Total Resources</span>
        </div>
      </div>
    </div>
  );
};

export default CloudFootprintMap;
