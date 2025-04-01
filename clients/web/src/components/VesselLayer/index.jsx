import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Popup } from 'mapbox-gl';
import './styles.css';

const VesselLayer = ({ map, visible = true, refreshInterval = 10000 }) => {
  const [vessels, setVessels] = useState([]);
  const showVesselNames = false;
  const [darkMode, setDarkMode] = useState(false);
  const vesselGeoJSON = useRef({
    type: 'FeatureCollection',
    features: []
  });
  const popupRef = useRef(null);
  const mapLoadedRef = useRef(false);
  const sourceAddedRef = useRef(false);

  // Check system preference for dark mode on component mount
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDarkMode);

    // Listen for changes to color scheme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply dark mode class to document when dark mode changes
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('vessel-dark-mode');
    } else {
      document.documentElement.classList.remove('vessel-dark-mode');
    }
  }, [darkMode]);

  // Fetch vessel data from the API
  const fetchVessels = useCallback(async () => {
    if (!visible) return;

    try {
      const response = await axios.get('/api/vessels');

      if (response.data.success) {
        setVessels(response.data.vessels);
      }
    } catch {
      // No error handling needed
    }
  }, [visible]);

  // Initial fetch and set up interval for refreshing data
  useEffect(() => {
    fetchVessels();

    const intervalId = setInterval(fetchVessels, refreshInterval);

    return () => clearInterval(intervalId);
  }, [fetchVessels, refreshInterval]);

  // Convert vessels to GeoJSON format for Mapbox
  useEffect(() => {
    if (!vessels || !Array.isArray(vessels)) {
      return;
    }

    try {
      const features = vessels.map(vessel => {
        if (!vessel.latitude && !vessel.longitude) {
          // Try to find coordinates in Message or MetaData
          if (vessel.MetaData && vessel.MetaData.latitude && vessel.MetaData.longitude) {
            vessel.latitude = vessel.MetaData.latitude;
            vessel.longitude = vessel.MetaData.longitude;
          } else if (vessel.Message && vessel.Message.PositionReport) {
            vessel.latitude = vessel.Message.PositionReport.Latitude;
            vessel.longitude = vessel.Message.PositionReport.Longitude;
          } else {
            return null;
          }
        }

        // Extract all possible vessel identifiers
        const mmsi =
          vessel.mmsi ||
          (vessel.MetaData && vessel.MetaData.MMSI) ||
          (vessel.Message && vessel.Message.PositionReport && vessel.Message.PositionReport.UserID) ||
          null;

        // Extract vessel name with extensive logging
        let vesselName = null;

        // Check MetaData.ShipName first (most likely based on sample)
        if (vessel.MetaData && vessel.MetaData.ShipName) {
          vesselName = vessel.MetaData.ShipName;
        }
        // Then check for other name properties
        else if (vessel.shipname) {
          vesselName = vessel.shipname;
        }
        else if (vessel.SHIPNAME) {
          vesselName = vessel.SHIPNAME;
        }
        else if (vessel.name) {
          vesselName = vessel.name;
        }
        else if (vessel.NAME) {
          vesselName = vessel.NAME;
        }
        else if (vessel.vessel_name) {
          vesselName = vessel.vessel_name;
        }
        else if (vessel.ship_name) {
          vesselName = vessel.ship_name;
        }
        // Default name if none found
        else {
          vesselName = `Vessel ${mmsi || ''}`;
        }

        // Handle nested structure for all vessel properties
        return {
          type: 'Feature',
          properties: {
            id: mmsi || `vessel-${Math.random().toString(36).substr(2, 9)}`,
            mmsi: mmsi,
            name: vesselName,
            callsign: vessel.callsign,
            // Handle nested ship type information
            shipType:
              vessel.shiptype ||
              (vessel.MetaData && vessel.MetaData.ShipType) ||
              null,
            shipTypeText: getShipTypeText(
              vessel.shiptype ||
              (vessel.MetaData && vessel.MetaData.ShipType) ||
              null
            ),
            length: vessel.length,
            width: vessel.width,
            // Handle nested heading/course/speed
            heading:
              vessel.heading ||
              (vessel.Message && vessel.Message.PositionReport && vessel.Message.PositionReport.TrueHeading) ||
              null,
            course:
              vessel.course ||
              vessel.cog ||
              (vessel.Message && vessel.Message.PositionReport && vessel.Message.PositionReport.Cog) ||
              null,
            speed:
              vessel.speed ||
              vessel.sog ||
              (vessel.Message && vessel.Message.PositionReport && vessel.Message.PositionReport.Sog) ||
              0,
            // Handle nested timestamps
            lastUpdate:
              vessel.timestamp ||
              (vessel.MetaData && vessel.MetaData.time_utc) ||
              new Date().toISOString(),
            destination: vessel.destination,
            status:
              vessel.navigationStatus ||
              (vessel.Message && vessel.Message.PositionReport && vessel.Message.PositionReport.NavigationalStatus) ||
              null
          },
          geometry: {
            type: 'Point',
            coordinates: [parseFloat(vessel.longitude), parseFloat(vessel.latitude)]
          }
        };
      }).filter(Boolean);

      vesselGeoJSON.current = {
        type: 'FeatureCollection',
        features
      };

      // Update the source if it exists and map is loaded
      if (map && mapLoadedRef.current && sourceAddedRef.current) {
        const source = map.getSource('vessels-source');
        if (source) {
          source.setData(vesselGeoJSON.current);
        }
      }
    } catch {
      // No error handling needed as per the new code
    }
  }, [vessels, map]);

  // Get text description of ship type
  const getShipTypeText = (shipType) => {
    if (!shipType) return 'Unknown';

    // Common ship types based on AIS type codes
    const shipTypes = {
      30: 'Fishing',
      31: 'Tug',
      32: 'Tug',
      33: 'Dredger',
      34: 'Dive Vessel',
      35: 'Military',
      36: 'Sailing Vessel',
      37: 'Pleasure Craft',
      40: 'High-Speed Vessel',
      50: 'Pilot Vessel',
      51: 'Search & Rescue',
      52: 'Tug',
      53: 'Port Tender',
      54: 'Anti-Pollution',
      55: 'Law Enforcement',
      58: 'Medical Transport',
      59: 'Special Craft',
      60: 'Passenger',
      61: 'Passenger',
      62: 'Passenger',
      63: 'Passenger',
      64: 'Passenger',
      65: 'Passenger',
      66: 'Passenger',
      67: 'Passenger',
      68: 'Passenger',
      69: 'Passenger',
      70: 'Cargo',
      71: 'Cargo',
      72: 'Cargo',
      73: 'Cargo',
      74: 'Cargo',
      75: 'Cargo',
      76: 'Cargo',
      77: 'Cargo',
      78: 'Cargo',
      79: 'Cargo',
      80: 'Tanker',
      81: 'Tanker',
      82: 'Tanker',
      83: 'Tanker',
      84: 'Tanker',
      85: 'Tanker',
      86: 'Tanker',
      87: 'Tanker',
      88: 'Tanker',
      89: 'Tanker',
      90: 'Other',
      91: 'Other',
      92: 'Other',
      93: 'Other',
      94: 'Other',
      95: 'Other',
      96: 'Other',
      97: 'Other',
      98: 'Other',
      99: 'Other'
    };

    return shipTypes[shipType] || 'Other';
  };

  // Initialize map layer once map is available
  useEffect(() => {
    if (!map) return;

    // Function to add vessel layer to map
    const addVesselLayer = () => {
      // Mark the map as loaded
      mapLoadedRef.current = true;

      // Add source if it doesn't exist
      if (!map.getSource('vessels-source')) {
        try {
          map.addSource('vessels-source', {
            type: 'geojson',
            data: vesselGeoJSON.current
          });
          sourceAddedRef.current = true;
        } catch {
          return; // Exit if we can't add the source
        }
      }

      // Add ship icon if it's not already loaded
      if (!map.hasImage('ship-icon')) {

        // Create an oval ship icon (top view) using canvas
        const size = 50;  // Increased size from 38 to 50
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Ship shape drawing function - longer and thinner oval
        const drawShip = (ctx, color) => {
          ctx.clearRect(0, 0, size, size);

          // Begin ship shape
          ctx.fillStyle = color;
          ctx.beginPath();

          // Draw a longer, thinner oval shape with pointed top and bottom
          // Start at the bow (front/top point)
          ctx.moveTo(size / 2, 1);                 // Front point (sharp bow)

          // Right side - single smooth curve from top to bottom
          ctx.bezierCurveTo(
            size * 0.75, size * 0.25,               // Control point 1 - moved inward for thinner shape
            size * 0.75, size * 0.75,               // Control point 2 - symmetric to create continuous curve
            size / 2, size - 1                      // End point (stern/bottom point)
          );

          // Left side - single smooth curve from bottom to top
          ctx.bezierCurveTo(
            size * 0.25, size * 0.75,               // Control point 1 - moved inward for thinner shape
            size * 0.25, size * 0.25,               // Control point 2 - symmetric to create continuous curve
            size / 2, 1                           // End point (back to bow)
          );

          ctx.closePath();
          ctx.fill();

          // Fine outline for better definition
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.2;                  // Reduced from 1.5 to 1.2 for finer outline
          ctx.stroke();
        };

        // Draw the default green ship
        drawShip(ctx, '#2ECC40');

        // Add the image to the map
        map.addImage('ship-icon', {
          width: size,
          height: size,
          data: new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer)
        });

        // Add red ship icon (for fast vessels)
        ctx.clearRect(0, 0, size, size);
        drawShip(ctx, '#FF4136');
        map.addImage('ship-icon-fast', {
          width: size,
          height: size,
          data: new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer)
        });

        // Add orange ship icon (for medium speed vessels)
        ctx.clearRect(0, 0, size, size);
        drawShip(ctx, '#FF851B');
        map.addImage('ship-icon-medium', {
          width: size,
          height: size,
          data: new Uint8Array(ctx.getImageData(0, 0, size, size).data.buffer)
        });


      }

      // Replace circle layer with ship symbol layer

      if (!map.getLayer('vessels-circle')) {
        map.addLayer({
          id: 'vessels-circle',
          type: 'symbol',
          source: 'vessels-source',
          layout: {
            // Use appropriate ship icon based on speed
            'icon-image': [
              'case',
              ['>=', ['get', 'speed'], 15], 'ship-icon-fast',     // Fast: Red
              ['>=', ['get', 'speed'], 5], 'ship-icon-medium',    // Medium: Orange
              'ship-icon'                                           // Slow: Green
            ],
            // Size based on zoom level - increased sizes further
            'icon-size': [
              'interpolate', ['linear'], ['zoom'],
              0, 0.1,    // Increased from 0.8 to 1.0 at global zoom
              10, 0.5,   // Increased from 1.2 to 1.4 at medium zoom
              14, 0.8    // Increased from 1.5 to 1.8 at high zoom
            ],
            // Rotate the ship based on heading or course
            'icon-rotate': [
              'case',
              ['!=', ['get', 'heading'], null],
              ['get', 'heading'],
              ['!=', ['get', 'course'], null],
              ['get', 'course'],
              0
            ],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'visibility': visible ? 'visible' : 'none'
          }
        });
      }


      // Add vessel label layer

      if (!map.getLayer('vessels-label')) {
        map.addLayer({
          id: 'vessels-label',
          type: 'symbol',
          source: 'vessels-source',
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Open Sans Regular'],
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-size': [
              'interpolate', ['linear'], ['zoom'],
              8, 10,  // Small text at low zoom
              14, 14  // Larger text at high zoom
            ],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'visibility': showVesselNames ? 'visible' : 'none'
          },
          paint: {
            'text-color': '#ffffff',
            'text-halo-color': 'rgba(0, 0, 0, 0.75)',
            'text-halo-width': 1.5
          }
        });
      }

      // Remove the separate direction indicator layer since we've integrated direction into the ship icon

      if (map.getLayer('vessels-direction')) {
        map.removeLayer('vessels-direction');
      }


      // Add click event for vessel popups if not already added
      if (!map._clickHandlerAdded) {
        map.on('click', 'vessels-circle', (e) => {
          if (e.features.length === 0) return;

          const feature = e.features[0];
          const coordinates = feature.geometry.coordinates.slice();
          const properties = feature.properties;

          // Format speed in knots (nautical miles per hour)
          const speedKnots = parseFloat(properties.speed).toFixed(1);

          // Format last update time
          let lastUpdateText = 'Unknown';
          if (properties.lastUpdate) {
            const lastUpdate = new Date(properties.lastUpdate);
            lastUpdateText = lastUpdate.toLocaleString();
          }

          // Create HTML content for popup
          const popupContent = document.createElement('div');
          popupContent.className = 'vessel-popup';

          popupContent.innerHTML = `
            <div class="vessel-popup-header">
              ${properties.name || 'Unknown Vessel'}
            </div>
            <div class="vessel-popup-content">
              <div class="vessel-popup-row">
                <span class="vessel-popup-label">MMSI:</span>
                <span class="vessel-popup-value">${properties.mmsi || 'N/A'}</span>
              </div>
              <div class="vessel-popup-row">
                <span class="vessel-popup-label">Type:</span>
                <span class="vessel-popup-value">${properties.shipTypeText || 'Unknown'}</span>
              </div>
              <div class="vessel-popup-row">
                <span class="vessel-popup-label">Speed:</span>
                <span class="vessel-popup-value">${speedKnots} knots</span>
              </div>
              <div class="vessel-popup-row">
                <span class="vessel-popup-label">Heading:</span>
                <span class="vessel-popup-value">${properties.heading ? properties.heading + '°' : 'N/A'}</span>
              </div>
              <div class="vessel-popup-row">
                <span class="vessel-popup-label">Destination:</span>
                <span class="vessel-popup-value">${properties.destination || 'Not specified'}</span>
              </div>
              <div class="vessel-popup-row">
                <span class="vessel-popup-label">Last Update:</span>
                <span class="vessel-popup-value">${lastUpdateText}</span>
              </div>
            </div>
          `;

          // Apply dark mode class if active
          if (darkMode) {
            popupContent.classList.add('dark-mode');
          }

          // Remove existing popup if any
          if (popupRef.current) popupRef.current.remove();

          // Create new popup
          popupRef.current = new Popup({
            closeButton: true,
            closeOnClick: true,
            className: darkMode ? 'custom-popup dark-mode' : 'custom-popup'
          })
            .setLngLat(coordinates)
            .setDOMContent(popupContent)
            .addTo(map);
        });

        // Add hover event for vessel names
        map.on('mouseenter', 'vessels-circle', (e) => {
          if (e.features.length === 0) return;

          map.getCanvas().style.cursor = 'pointer';

          const feature = e.features[0];
          const coordinates = feature.geometry.coordinates.slice();
          const properties = feature.properties;

          // Create a simple hover popup that shows just the name and type
          const popupContent = document.createElement('div');
          popupContent.className = darkMode ? 'vessel-hover-popup dark-mode' : 'vessel-hover-popup';
          popupContent.innerHTML = `
            <div class="vessel-hover-header">${properties.name || 'Unknown Vessel'}</div>
            <div class="vessel-hover-content">
              ${properties.shipTypeText || 'Unknown'} · ${parseFloat(properties.speed).toFixed(1)} knots
            </div>
          `;

          // Create a popup but don't add it to the map yet
          const hoverPopup = new Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 15,
            className: darkMode ? 'hover-popup dark-mode' : 'hover-popup' // Add class for styling
          })
            .setLngLat(coordinates)
            .setDOMContent(popupContent);

          // Store the popup reference
          const hoverPopupRef = { current: hoverPopup };

          // Add the popup to the map
          hoverPopupRef.current.addTo(map);

          // Store popup reference on the map object for cleanup
          map._hoverPopup = hoverPopupRef.current;
        });

        map.on('mouseleave', 'vessels-circle', () => {
          map.getCanvas().style.cursor = '';

          // Remove hover popup if it exists
          if (map._hoverPopup) {
            map._hoverPopup.remove();
            map._hoverPopup = null;
          }
        });

        map._clickHandlerAdded = true;
      }
    };

    // Wait for map to be loaded before adding layers
    const checkMapLoaded = () => {
      if (map.loaded()) {
        addVesselLayer();
      } else {
        // If map is not loaded yet, wait for the load event
        map.once('load', addVesselLayer);
      }
    };

    // Call the check immediately
    checkMapLoaded();

    // Cleanup on unmount
    return () => {
      try {
        if (map?.getLayer) {
          if (map.getLayer('vessels-circle')) {
            map.removeLayer('vessels-circle');
          }
          if (map.getLayer('vessels-direction')) {
            map.removeLayer('vessels-direction');
          }
          if (map.getLayer('vessels-label')) {
            map.removeLayer('vessels-label');
          }
          if (map.getSource('vessels-source')) {
            map.removeSource('vessels-source');
          }
        }
      } catch (error) {
        console.warn('Error cleaning up vessel layers:', error);
      }
    };
  }, [map, visible, showVesselNames, darkMode]);

  // Update layer visibility when visible prop changes
  useEffect(() => {
    if (!map || !mapLoadedRef.current) return;


    if (map.getLayer('vessels-circle')) {
      map.setLayoutProperty(
        'vessels-circle',
        'visibility',
        visible ? 'visible' : 'none'
      );
    }

    if (map.getLayer('vessels-label')) {
      map.setLayoutProperty(
        'vessels-label',
        'visibility',
        showVesselNames ? 'visible' : 'none'
      );
    }

  }, [map, visible, showVesselNames]);
};

VesselLayer.propTypes = {
  map: PropTypes.object,
  visible: PropTypes.bool,
  refreshInterval: PropTypes.number
};

export default VesselLayer;