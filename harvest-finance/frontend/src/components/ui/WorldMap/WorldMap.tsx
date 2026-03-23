'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';

// GeoJSON URL for world map
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Type definitions
export interface MapMarker {
  id: string;
  coordinates: [number, number]; // [longitude, latitude]
  name: string;
  activity?: 'vault' | 'user' | 'region';
  size?: number;
  color?: string;
}

export interface WorldMapProps {
  markers?: MapMarker[];
  showMarkers?: boolean;
  animateMarkers?: boolean;
  zoomable?: boolean;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
}

// Default markers representing global vault activity
const defaultMarkers: MapMarker[] = [
  { id: '1', coordinates: [-98.5795, 39.8283], name: 'North America', activity: 'region' },
  { id: '2', coordinates: [-51.9253, -14.2350], name: 'South America', activity: 'region' },
  { id: '3', coordinates: [10.4515, 51.1657], name: 'Europe', activity: 'region' },
  { id: '4', coordinates: [55.3793, 25.2048], name: 'Middle East', activity: 'vault' },
  { id: '5', coordinates: [114.1694, 22.3193], name: 'Asia Pacific', activity: 'vault' },
  { id: '6', coordinates: [139.6917, 35.6895], name: 'Japan', activity: 'user' },
  { id: '7', coordinates: [103.8198, 1.3521], name: 'Singapore', activity: 'vault' },
  { id: '8', coordinates: [-74.0060, 40.7128], name: 'New York', activity: 'user' },
  { id: '9', coordinates: [-0.1276, 51.5074], name: 'London', activity: 'user' },
  { id: '10', coordinates: [37.6173, 55.7558], name: 'Moscow', activity: 'vault' },
  { id: '11', coordinates: [18.4241, -33.9249], name: 'Cape Town', activity: 'user' },
  { id: '12', coordinates: [151.2093, -33.8688], name: 'Sydney', activity: 'user' },
  { id: '13', coordinates: [-46.6333, -23.5505], name: 'São Paulo', activity: 'vault' },
  { id: '14', coordinates: [103.8198, 1.3521], name: 'Singapore', activity: 'vault' },
  { id: '15', coordinates: [72.8777, 19.0760], name: 'Mumbai', activity: 'user' },
];

// Marker component with animations
const AnimatedMarker: React.FC<{
  marker: MapMarker;
  index: number;
  animate: boolean;
  onClick?: (marker: MapMarker) => void;
}> = ({ marker, index, animate, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const baseSize = marker.size || 6;
  const color = marker.color || getMarkerColor(marker.activity);
  
  return (
    <Marker
      coordinates={marker.coordinates}
      onClick={() => onClick?.(marker)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Outer glow ring */}
      <motion.circle
        r={baseSize + 8}
        fill="none"
        stroke={color}
        strokeWidth={1}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={animate ? {
          opacity: [0.4, 0.1, 0.4],
          scale: [1, 1.5, 1],
        } : { opacity: 0.4, scale: 1 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          delay: index * 0.2,
          ease: 'easeInOut',
        }}
      />
      
      {/* Middle ring */}
      <motion.circle
        r={baseSize + 4}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={animate ? {
          opacity: [0.6, 0.2, 0.6],
          scale: [1, 1.3, 1],
        } : { opacity: 0.6, scale: 1 }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          delay: index * 0.2 + 0.3,
          ease: 'easeInOut',
        }}
      />
      
      {/* Inner circle */}
      <motion.circle
        r={baseSize}
        fill={color}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.5,
          delay: animate ? index * 0.1 : 0,
          ease: 'easeOut',
        }}
        whileHover={{ scale: 1.5 }}
      />
      
      {/* Center dot */}
      <motion.circle
        r={baseSize / 3}
        fill="white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.3,
          delay: animate ? index * 0.1 + 0.3 : 0.3,
        }}
      />
      
      {/* Tooltip on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.g
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <rect
              x={-50}
              y={-50}
              width={100}
              height={32}
              rx={6}
              fill="white"
              filter="drop-shadow(0 2px 4px rgba(0,0,0,0.1))"
            />
            <text
              textAnchor="middle"
              y={-34}
              fontSize={11}
              fontWeight={600}
              fill="#166534"
              fontFamily="Inter, sans-serif"
            >
              {marker.name}
            </text>
            <text
              textAnchor="middle"
              y={-22}
              fontSize={9}
              fill="#4b5563"
              fontFamily="Inter, sans-serif"
            >
              {marker.activity === 'vault' ? '🦄 Vault Active' : 
               marker.activity === 'user' ? '👤 User Region' : 
               '🌍 Global Hub'}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </Marker>
  );
};

// Helper function to get marker color based on activity
function getMarkerColor(activity?: string): string {
  switch (activity) {
    case 'vault':
      return '#22c55e'; // Primary green
    case 'user':
      return '#16a34a'; // Darker green
    default:
      return '#4ade80'; // Light green
  }
}

// Background particles component
const BackgroundParticles: React.FC<{ count?: number }> = ({ count = 30 }) => {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 10,
    }));
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-harvest-green-200/30"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// Main WorldMap component
export const WorldMap: React.FC<WorldMapProps> = ({
  markers = defaultMarkers,
  showMarkers = true,
  animateMarkers = true,
  zoomable = true,
  className = '',
  onMarkerClick,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle SSR and client-side rendering
  if (!isMounted) {
    return (
      <div className={`relative w-full h-full min-h-[400px] bg-gradient-to-br from-harvest-green-50 via-white to-harvest-green-100 rounded-2xl overflow-hidden ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-harvest-green-200 border-t-harvest-green-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`relative w-full h-full min-h-[400px] bg-gradient-to-br from-harvest-green-50 via-white to-harvest-green-100 rounded-2xl overflow-hidden ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background particles */}
      <BackgroundParticles count={20} />
      
      {/* Decorative gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-harvest-green-100/50 via-transparent to-harvest-green-200/30 pointer-events-none" />
      
      {/* Map container */}
      <div className="relative z-10 w-full h-full">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 140,
            center: [0, 0],
          }}
          style={{ width: '100%', height: '100%' }}
        >
          {zoomable && (
            <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={4}>
              {/* Map background fill */}
              <rect x={0} y={0} width={1000} height={1000} fill="transparent" />
              
              {/* World geographies */}
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#dcfce7"
                      stroke="#86efac"
                      strokeWidth={0.5}
                      style={{
                        default: {
                          outline: 'none',
                        },
                        hover: {
                          fill: '#bbf7d0',
                          outline: 'none',
                          transition: 'fill 200ms ease-out',
                        },
                        pressed: {
                          outline: 'none',
                        },
                      }}
                    />
                  ))
                }
              </Geographies>
              
              {/* Animated markers */}
              {showMarkers && (
                <>
                  {markers.map((marker, index) => (
                    <AnimatedMarker
                      key={marker.id}
                      marker={marker}
                      index={index}
                      animate={animateMarkers && isLoaded}
                      onClick={onMarkerClick}
                    />
                  ))}
                </>
              )}
            </ZoomableGroup>
          )}
          
          {/* Non-zoomable version */}
          {!zoomable && (
            <>
              <rect x={0} y={0} width={1000} height={1000} fill="transparent" />
              
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill="#dcfce7"
                      stroke="#86efac"
                      strokeWidth={0.5}
                      style={{
                        default: {
                          outline: 'none',
                        },
                        hover: {
                          fill: '#bbf7d0',
                          outline: 'none',
                          transition: 'fill 200ms ease-out',
                        },
                        pressed: {
                          outline: 'none',
                        },
                      }}
                    />
                  ))
                }
              </Geographies>
              
              {showMarkers && (
                <>
                  {markers.map((marker, index) => (
                    <AnimatedMarker
                      key={marker.id}
                      marker={marker}
                      index={index}
                      animate={animateMarkers && isLoaded}
                      onClick={onMarkerClick}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </ComposableMap>
      </div>
      
      {/* Loading state */}
      {!isLoaded && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          onAnimationComplete={() => setIsLoaded(true)}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-harvest-green-200 border-t-harvest-green-600 rounded-full animate-spin" />
            <p className="text-sm text-harvest-green-700 font-medium">Loading map...</p>
          </div>
        </motion.div>
      )}
      
      {/* Corner decorations */}
      <div className="absolute top-4 left-4 w-20 h-20 border-l-2 border-t-2 border-harvest-green-300/50 rounded-tl-lg" />
      <div className="absolute bottom-4 right-4 w-20 h-20 border-r-2 border-b-2 border-harvest-green-300/50 rounded-br-lg" />
    </motion.div>
  );
};

// WorldMapSection - A ready-to-use section component for landing pages
export interface WorldMapSectionProps {
  title?: string;
  subtitle?: string;
  markers?: MapMarker[];
  className?: string;
}

export const WorldMapSection: React.FC<WorldMapSectionProps> = ({
  title = 'Global Reach',
  subtitle = 'Harvest Finance connects users from around the world, providing decentralized yield optimization across multiple blockchain networks.',
  markers = defaultMarkers,
  className = '',
}) => {
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);

  return (
    <section className={`relative w-full py-16 md:py-24 bg-gradient-to-b from-white to-harvest-green-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-harvest-green-900 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>
        
        {/* Stats row */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {[
            { value: '50K+', label: 'Active Users' },
            { value: '100+', label: 'Countries' },
            { value: '$500M+', label: 'TVL' },
            { value: '24/7', label: 'Operations' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-harvest-green-100"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              whileHover={{ scale: 1.05, borderColor: '#22c55e' }}
            >
              <div className="text-2xl md:text-3xl font-bold text-harvest-green-600 mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Map container */}
        <motion.div
          className="h-[400px] md:h-[500px] lg:h-[600px]"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <WorldMap
            markers={markers}
            showMarkers={true}
            animateMarkers={true}
            zoomable={true}
            onMarkerClick={(marker) => setSelectedMarker(marker)}
          />
        </motion.div>
        
        {/* Legend */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-harvest-green-500" />
            <span className="text-sm text-gray-600">Active Vaults</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-harvest-green-600" />
            <span className="text-sm text-gray-600">User Regions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-harvest-green-400" />
            <span className="text-sm text-gray-600">Global Hubs</span>
          </div>
        </motion.div>
        
        {/* Selected marker info */}
        <AnimatePresence>
          {selectedMarker && (
            <motion.div
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-xl shadow-xl border border-harvest-green-100 px-6 py-4 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: getMarkerColor(selectedMarker.activity) }} 
                  />
                  <span className="font-semibold text-harvest-green-800">{selectedMarker.name}</span>
                </div>
                <div className="h-6 w-px bg-harvest-green-200" />
                <span className="text-sm text-gray-600">
                  {selectedMarker.activity === 'vault' ? '🦄 Vault Active' : 
                   selectedMarker.activity === 'user' ? '👤 User Region' : 
                   '🌍 Global Hub'}
                </span>
                <button
                  onClick={() => setSelectedMarker(null)}
                  className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-harvest-green-200/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-harvest-green-300/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
    </section>
  );
};

export default WorldMap;
