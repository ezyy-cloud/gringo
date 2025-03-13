import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import React from 'react';
import ReactMapGL, { Marker, Popup, Source, Layer } from 'react-map-gl';
import { useNavigate } from 'react-router-dom';
import { GoHeart, GoHeartFill, GoLocation, GoHome, GoStack } from "react-icons/go";
import AvatarPlaceholder from '../AvatarPlaceholder';
import WeatherWidget from '../WeatherWidget';
import FloatingActionButton from '../FloatingActionButton';
import { timeAgo } from '../../utils/dateUtils';
import { renderTextWithLinks } from '../../utils/textUtils.jsx';
import apiService from '../../services/apiService';
import 'mapbox-gl/dist/mapbox-gl.css';
import './styles.css';
import '../MapView3D/styles.css';

// Weather effect settings for different weather conditions
const WEATHER_EFFECTS = {
  // Thunderstorm intensities (200-299)
  thunderLight: {
    rain: {
      opacity: 0.5,
      color: "#cccccc",
      size: 0.8,
      intensity: 0.5
    },
    fog: {
      color: 'rgb(186, 186, 205)',
      'horizon-blend': 0.08,
      range: [1.5, 10] // Raised atmosphere
    }
  },
  thunderModerate: {
    rain: {
      opacity: 0.7,
      color: "#cccccc",
      size: 1.0,
      intensity: 0.8
    },
    fog: {
      color: 'rgb(186, 186, 205)',
      'horizon-blend': 0.1,
      range: [1.2, 10] // Raised atmosphere
    }
  },
  thunderHeavy: {
    rain: {
      opacity: 0.9,
      color: "#aaaaaa",
      size: 1.2,
      intensity: 1.0
    },
    fog: {
      color: 'rgb(166, 166, 195)',
      'horizon-blend': 0.15,
      range: [1.0, 8] // Raised atmosphere
    }
  },
  
  // Rain intensities (300-599)
  rainLight: {
    rain: {
      opacity: 0.4,
      color: "#ffffff",
      size: 0.6,
      intensity: 0.3
    },
    fog: {
      color: 'rgb(196, 206, 215)',
      'horizon-blend': 0.03,
      range: [1.8, 12] // Raised atmosphere
    }
  },
  rainModerate: {
    rain: {
      opacity: 0.6,
      color: "#ffffff",
      size: 0.8,
      intensity: 0.5
    },
    fog: {
      color: 'rgb(186, 196, 205)',
      'horizon-blend': 0.05,
      range: [1.5, 10] // Raised atmosphere
    }
  },
  rainHeavy: {
    rain: {
      opacity: 0.8,
      color: "#dddddd",
      size: 1.0,
      intensity: 0.8
    },
    fog: {
      color: 'rgb(176, 186, 195)',
      'horizon-blend': 0.08,
      range: [1.2, 9] // Raised atmosphere
    }
  },
  
  // Snow intensities (600-699)
  snowLight: {
    snow: {
      opacity: 0.5,
      color: "#ffffff",
      size: 0.8,
      intensity: 0.3
    },
    fog: {
      color: 'rgb(240, 240, 240)',
      'horizon-blend': 0.02,
      range: [1.8, 10] // Raised atmosphere
    }
  },
  snowModerate: {
    snow: {
      opacity: 0.7,
      color: "#ffffff",
      size: 1.0,
      intensity: 0.5
    },
    fog: {
      color: 'rgb(230, 230, 230)',
      'horizon-blend': 0.04,
      range: [1.5, 9] // Raised atmosphere
    }
  },
  snowHeavy: {
    snow: {
      opacity: 0.9,
      color: "#ffffff",
      size: 1.2,
      intensity: 0.8
    },
    fog: {
      color: 'rgb(220, 220, 220)',
      'horizon-blend': 0.06,
      range: [1.2, 8] // Raised atmosphere
    }
  },
  
  // Atmosphere conditions (700-799)
  fogLight: {
    fog: {
      color: 'rgb(196, 206, 225)',
      'high-color': 'rgb(136, 152, 193)',
      'horizon-blend': 0.05,
      range: [1.0, 6] // Raised atmosphere (less for fog conditions)
    }
  },
  fogModerate: {
    fog: {
      color: 'rgb(186, 196, 215)',
      'high-color': 'rgb(116, 132, 173)',
      'horizon-blend': 0.1,
      range: [0.8, 5] // Raised atmosphere (less for fog conditions)
    }
  },
  fogHeavy: {
    fog: {
      color: 'rgb(176, 186, 205)',
      'high-color': 'rgb(96, 112, 153)',
      'horizon-blend': 0.2,
      range: [0.5, 4] // Raised atmosphere (less for fog conditions)
    }
  },
  
  // Clear (800)
  clear: {
    fog: {
      color: 'rgb(156, 180, 205)',
      'high-color': 'rgb(36, 92, 223)',
      'horizon-blend': 0.02,
      range: [2.0, 14] // Raised atmosphere significantly for clear skies
    }
  },
  
  // Clouds intensities (801-899)
  cloudsLight: {
    fog: {
      color: 'rgb(176, 196, 215)',
      'high-color': 'rgb(106, 162, 223)',
      'horizon-blend': 0.015,
      range: [1.8, 12] // Raised atmosphere
    }
  },
  cloudsModerate: {
    fog: {
      color: 'rgb(166, 186, 205)',
      'high-color': 'rgb(86, 142, 213)',
      'horizon-blend': 0.03,
      range: [1.5, 10] // Raised atmosphere
    }
  },
  cloudsHeavy: {
    fog: {
      color: 'rgb(156, 176, 195)',
      'high-color': 'rgb(66, 122, 193)',
      'horizon-blend': 0.05,
      range: [1.2, 9] // Raised atmosphere
    }
  }
};

// Create a memoized version of WeatherWidget
const MemoizedWeatherWidget = React.memo(WeatherWidget);

// Helper function to apply weather effects to the map based on weather conditions
const applyWeatherEffectsToMap = (map, weatherCode) => {
  if (!map || !map.setFog || !map.setSnow || !map.setRain) {
    console.warn('Map or weather effect methods unavailable');
    return;
  }
  
  let effects = null;
  
  // Match specific weather code to intensity-appropriate effects
  if (weatherCode >= 200 && weatherCode < 300) {
    // Thunderstorm intensity
    if (weatherCode >= 200 && weatherCode <= 201) {
      effects = WEATHER_EFFECTS.thunderLight;      // Light thunderstorm
    } else if (weatherCode >= 202 && weatherCode <= 211) {
      effects = WEATHER_EFFECTS.thunderModerate;   // Moderate thunderstorm
    } else {
      effects = WEATHER_EFFECTS.thunderHeavy;      // Heavy/severe thunderstorm
    }
  } else if (weatherCode >= 300 && weatherCode < 600) {
    // Rain/drizzle intensity
    if ((weatherCode >= 300 && weatherCode <= 311) || weatherCode === 500 || weatherCode === 520) {
      effects = WEATHER_EFFECTS.rainLight;         // Light rain/drizzle
    } else if ((weatherCode >= 312 && weatherCode <= 321) || weatherCode === 501 || weatherCode === 521 || weatherCode === 531) {
      effects = WEATHER_EFFECTS.rainModerate;      // Moderate rain/drizzle
    } else {
      effects = WEATHER_EFFECTS.rainHeavy;         // Heavy rain/downpour
    }
  } else if (weatherCode >= 600 && weatherCode < 700) {
    // Snow intensity
    if (weatherCode === 600 || weatherCode === 612 || weatherCode === 620) {
      effects = WEATHER_EFFECTS.snowLight;         // Light snow
    } else if (weatherCode === 601 || weatherCode === 613 || weatherCode === 621) {
      effects = WEATHER_EFFECTS.snowModerate;      // Moderate snow
    } else {
      effects = WEATHER_EFFECTS.snowHeavy;         // Heavy snow/blizzard
    }
  } else if (weatherCode >= 700 && weatherCode < 800) {
    // Atmosphere conditions intensity
    if (weatherCode === 701 || weatherCode === 721) {
      effects = WEATHER_EFFECTS.fogLight;          // Light fog/mist
    } else if (weatherCode === 711 || weatherCode === 731 || weatherCode === 751 || weatherCode === 761 || weatherCode === 762) {
      effects = WEATHER_EFFECTS.fogModerate;       // Moderate fog/dust/sand
    } else {
      effects = WEATHER_EFFECTS.fogHeavy;          // Dense fog/dust storm
    }
  } else if (weatherCode === 800) {
    effects = WEATHER_EFFECTS.clear;               // Clear sky
  } else if (weatherCode > 800) {
    // Cloud coverage
    if (weatherCode === 801) {
      effects = WEATHER_EFFECTS.cloudsLight;       // Few clouds (11-25%)
    } else if (weatherCode === 802 || weatherCode === 803) {
      effects = WEATHER_EFFECTS.cloudsModerate;    // Scattered/broken clouds (25-75%)
    } else {
      effects = WEATHER_EFFECTS.cloudsHeavy;       // Overcast (>84%)
    }
  } else {
    effects = WEATHER_EFFECTS.clear;               // Default to clear if unknown
  }
  
  console.log(`Applying weather effects for weather code ${weatherCode}`);
  
  // Apply the appropriate effects
  if (effects.snow) {
    map.setSnow(effects.snow);
    // Clear rain if showing snow
    map.setRain(null);
  } else if (effects.rain) {
    map.setRain(effects.rain);
    // Clear snow if showing rain
    map.setSnow(null);
  } else {
    // Clear precipitation if not needed
    map.setRain(null);
    map.setSnow(null);
  }
  
  // Always set fog for atmosphere effects
  if (effects.fog) {
    map.setFog(effects.fog);
  }
};

// Helper function to determine the appropriate light preset based on time of day
const getLightPresetForTime = (date, latitude, longitude) => {
  if (!date) return 'day'; // Default to day if no date
  
  try {
    // Get local time at the viewed location by calculating timezone offset
    // This is a more accurate approach using the browser's Intl API
    const timeZone = getTimezoneFromCoordinates(latitude, longitude);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    
    // Get the time parts in the proper timezone
    const localTimeStr = formatter.format(date);
    const [hours, minutes] = localTimeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    
    console.log(`Local time at ${latitude.toFixed(2)}, ${longitude.toFixed(2)}: ${localTimeStr}`);
    
    // Calculate sunrise/sunset more accurately using a solar calculator
    const {sunrise, sunset, dawn, dusk} = calculateSolarTimes(date, latitude, longitude);
    
    // Convert solar times to minute-of-day for easier comparison
    const sunriseMinutes = sunrise.getHours() * 60 + sunrise.getMinutes();
    const sunsetMinutes = sunset.getHours() * 60 + sunset.getMinutes();
    const dawnMinutes = dawn.getHours() * 60 + dawn.getMinutes();
    const duskMinutes = dusk.getHours() * 60 + dusk.getMinutes();
    
    console.log(`Solar times: dawn=${formatTime(dawn)}, sunrise=${formatTime(sunrise)}, sunset=${formatTime(sunset)}, dusk=${formatTime(dusk)}`);
    
    // Check for special case: sunset before sunrise (spanning midnight)
    if (sunsetMinutes < sunriseMinutes) {
      // This can happen in some edge cases or due to calculation errors
      // In this case, check if we're between sunset and midnight OR between midnight and sunrise
      if (totalMinutes >= sunsetMinutes && totalMinutes <= 24*60) {
        return 'night';
      } else if (totalMinutes >= 0 && totalMinutes <= sunriseMinutes) {
        return 'night';
      } else if (totalMinutes >= dawnMinutes && totalMinutes < sunriseMinutes) {
        return 'dawn';
      } else if (totalMinutes > sunsetMinutes && totalMinutes <= duskMinutes) {
        return 'dusk';
      } else {
        return 'day';
      }
    } else {
      // Normal case: sunrise before sunset
      // Determine the light preset based on solar times
      if (totalMinutes >= dawnMinutes && totalMinutes < sunriseMinutes) {
        return 'dawn';
      } else if (totalMinutes > sunsetMinutes && totalMinutes <= duskMinutes) {
        return 'dusk';
      } else if (totalMinutes >= sunriseMinutes && totalMinutes <= sunsetMinutes) {
        return 'day';
      } else {
        return 'night';
      }
    }
  } catch (error) {
    console.error('Error calculating light preset:', error);
    
    // Fall back to the simple calculation method on error
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    
    // Simplified dawn/dusk times
    if (totalMinutes >= 330 && totalMinutes <= 390) {
      return 'dawn'; // 5:30 AM - 6:30 AM
    } else if (totalMinutes >= 1050 && totalMinutes <= 1110) {
      return 'dusk'; // 5:30 PM - 6:30 PM
    } else if (totalMinutes > 390 && totalMinutes < 1050) {
      return 'day'; // 6:30 AM - 5:30 PM
    } else {
      return 'night';
    }
  }
};

// Helper to format time objects for logging
const formatTime = (time) => {
  if (!time) return 'unknown';
  return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
};

// Get timezone from coordinates using a best-effort approach
const getTimezoneFromCoordinates = (latitude, longitude) => {
  try {
    // Calculate an approximate timezone based on longitude
    // Each 15° of longitude represents roughly 1 hour time difference
    const timezoneOffset = Math.round(longitude / 15);
    
    // The Etc/GMT format is counterintuitive:
    // Etc/GMT+8 means 8 hours BEHIND UTC (like Pacific Standard Time)
    // Etc/GMT-8 means 8 hours AHEAD of UTC (like China Standard Time)
    // Also, we can't use leading zeros in the format (Etc/GMT+08 is invalid)
    
    // Clamp the offset to valid range (-14 to +12)
    const clampedOffset = Math.max(-14, Math.min(12, timezoneOffset));
    
    // Invert the sign for Etc/GMT format and remove leading zeros
    const sign = clampedOffset <= 0 ? '+' : '-';
    const hours = Math.abs(clampedOffset);
    
    // Etc/GMT+0 or Etc/GMT-0 are both invalid, use "UTC" instead
    if (hours === 0) {
      return "UTC";
    }
    
    const timezone = `Etc/GMT${sign}${hours}`;
    
    // Validate the timezone
    try {
      // This will throw if the timezone is invalid
      Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return timezone;
    } catch (formatError) {
      console.warn(`Invalid timezone format: ${timezone}, falling back to UTC`);
      return 'UTC';
    }
  } catch (error) {
    console.warn('Error calculating timezone from coordinates, using UTC:', error);
    return 'UTC'; // Default to UTC if we can't determine timezone
  }
};

// Solar calculations for sunrise, sunset, dawn, and dusk
const calculateSolarTimes = (date, latitude, longitude) => {
  try {
    // Get timezone to ensure we use the right date for calculations
    const timeZone = getTimezoneFromCoordinates(latitude, longitude);
    
    // Get the local date at the location
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    
    // Get local date components
    const localDateParts = formatter.formatToParts(date);
    const year = parseInt(localDateParts.find(part => part.type === 'year').value);
    const month = parseInt(localDateParts.find(part => part.type === 'month').value);
    const day = parseInt(localDateParts.find(part => part.type === 'day').value);
    
    // Create the local date for the location
    const today = new Date(year, month - 1, day);
    
    // Calculate day of year (approximate)
    const startOfYear = new Date(year, 0, 1);
    const dayOfYear = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000)) + 1;
    
    // NOAA solar calculation
    // Calculations based on https://www.esrl.noaa.gov/gmd/grad/solcalc/calcdetails.html
    
    // Convert latitude and longitude to radians
    const lat = latitude * (Math.PI / 180);
    const lng = longitude * (Math.PI / 180);
    
    // Time in Julian centuries from 2000-01-01 12:00:00 GMT
    const jd2000 = 2451545.0;
    const unixTime2000 = 946728000000; // milliseconds on 2000-01-01 12:00:00 UTC
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    
    // Calculate current julian day (days since Jan 1, 4713 BCE at noon UTC)
    const julianDay = (today.getTime() - unixTime2000) / millisecondsPerDay + jd2000;
    
    // Calculate solar noon for this day
    const julianCycle = Math.round(julianDay - 2451545.0 + longitude / 360);
    const solarNoon = 2451545.0 + julianCycle - longitude / 360;
    
    // Calculate the Sun's mean anomaly at noon
    const meanSolarAnomaly = (357.5291 + 0.98560028 * (solarNoon - 2451545.0)) % 360;
    const meanSolarAnomalyRad = meanSolarAnomaly * (Math.PI / 180);
    
    // Calculate the equation of center
    const equationCenter = 1.9148 * Math.sin(meanSolarAnomalyRad) +
                          0.0200 * Math.sin(2 * meanSolarAnomalyRad) +
                          0.0003 * Math.sin(3 * meanSolarAnomalyRad);
    
    // Calculate the Sun's ecliptic longitude
    const eclipticLongitude = (meanSolarAnomaly + equationCenter + 180 + 102.9372) % 360;
    const eclipticLongitudeRad = eclipticLongitude * (Math.PI / 180);
    
    // Calculate the Sun's declination
    const sinDeclination = Math.sin(eclipticLongitudeRad) * Math.sin(23.44 * (Math.PI / 180));
    const sunDeclination = Math.asin(sinDeclination);
    
    // Calculate the hour angle
    const cosHourAngle = (Math.sin(-0.83 * (Math.PI / 180)) - Math.sin(lat) * Math.sin(sunDeclination)) /
                        (Math.cos(lat) * Math.cos(sunDeclination));
    
    // Handle polar day or night
    if (cosHourAngle > 1) {
      console.log(`Polar night: no sunrise at ${latitude}, ${longitude}`);
      return getPolarTimes(date, month, latitude, true);
    } else if (cosHourAngle < -1) {
      console.log(`Polar day: no sunset at ${latitude}, ${longitude}`);
      return getPolarTimes(date, month, latitude, false);
    }
    
    // Calculate sunrise and sunset in hours from solar noon
    const hourAngle = Math.acos(cosHourAngle) * (180 / Math.PI);
    
    // Convert to hours (15 degrees = 1 hour)
    const hourOffset = hourAngle / 15;
    
    // Calculate solar noon in local time
    // Solar noon is when the sun is at its highest point in the sky
    const solarNoonLocal = 12 - (longitude % 15) / 15;
    
    // Calculate sunrise and sunset times (in hours)
    const sunriseTime = solarNoonLocal - hourOffset;
    const sunsetTime = solarNoonLocal + hourOffset;
    
    // Convert hours to Date objects for today
    const createTimeDate = (hourDecimal) => {
      // Handle times that wrap around to the next or previous day
      let targetDate = new Date(today);
      
      const hours = Math.floor(hourDecimal);
      const minutes = Math.floor((hourDecimal - hours) * 60);
      
      // Handle the potential need to add or subtract a day
      if (hours < 0) {
        targetDate.setDate(targetDate.getDate() - 1);
        targetDate.setHours(hours + 24, minutes, 0, 0);
      } else if (hours >= 24) {
        targetDate.setDate(targetDate.getDate() + 1);
        targetDate.setHours(hours - 24, minutes, 0, 0);
      } else {
        targetDate.setHours(hours, minutes, 0, 0);
      }
      
      return targetDate;
    };
    
    // Create Date objects for sunrise, sunset, dawn, and dusk
    const sunriseDate = createTimeDate(sunriseTime);
    const sunsetDate = createTimeDate(sunsetTime);
    
    // Dawn is 30 minutes before sunrise, dusk is 30 minutes after sunset
    const dawnDate = new Date(sunriseDate.getTime() - 30 * 60 * 1000);
    const duskDate = new Date(sunsetDate.getTime() + 30 * 60 * 1000);
    
    console.log(`Solar calculation for ${latitude}, ${longitude} (Day ${dayOfYear}):`);
    console.log(`Timezone: ${timeZone}`);
    console.log(`Solar mean anomaly: ${meanSolarAnomaly.toFixed(4)}°, Declination: ${(sunDeclination * 180 / Math.PI).toFixed(4)}°`);
    console.log(`Hour angle: ${hourAngle.toFixed(4)}°, Solar noon: ${solarNoonLocal.toFixed(4)} hours`);
    console.log(`Sunrise: ${sunriseTime.toFixed(4)} hours, Sunset: ${sunsetTime.toFixed(4)} hours`);
    
    return {
      sunrise: sunriseDate,
      sunset: sunsetDate,
      dawn: dawnDate,
      dusk: duskDate
    };
  } catch (error) {
    console.error('Error calculating solar times:', error);
    
    // Fallback to reasonable defaults
    const fallbackDate = new Date(date);
    
    const fallbackSunrise = new Date(fallbackDate);
    fallbackSunrise.setHours(6, 0, 0, 0);
    
    const fallbackSunset = new Date(fallbackDate);
    fallbackSunset.setHours(18, 0, 0, 0);
    
    const fallbackDawn = new Date(fallbackDate);
    fallbackDawn.setHours(5, 30, 0, 0);
    
    const fallbackDusk = new Date(fallbackDate);
    fallbackDusk.setHours(18, 30, 0, 0);
    
    return {
      sunrise: fallbackSunrise,
      sunset: fallbackSunset,
      dawn: fallbackDawn,
      dusk: fallbackDusk
    };
  }
};

// Helper for polar regions with no sunrise or sunset
const getPolarTimes = (date, month, latitude, isNight) => {
  // Create a copy of the date to avoid modifying the original
  const newDate = new Date(date);
  
  // For polar regions, set artificial sunrise/sunset based on date
  const isSummer = (month >= 4 && month <= 9); // Northern hemisphere summer
  const isNorthern = latitude > 0;
  
  // Determine polar day or night based on hemisphere and season
  if ((isNorthern && isSummer) || (!isNorthern && !isSummer)) {
    // Polar day or near-polar bright nights
    return {
      sunrise: new Date(newDate.setHours(3, 0, 0, 0)),
      sunset: new Date(newDate.setHours(21, 0, 0, 0)),
      dawn: new Date(newDate.setHours(2, 30, 0, 0)),
      dusk: new Date(newDate.setHours(21, 30, 0, 0))
    };
  } else {
    // Polar night or near-polar short days
    return {
      sunrise: new Date(newDate.setHours(10, 0, 0, 0)),
      sunset: new Date(newDate.setHours(14, 0, 0, 0)),
      dawn: new Date(newDate.setHours(9, 30, 0, 0)),
      dusk: new Date(newDate.setHours(14, 30, 0, 0))
    };
  }
};

const MapView = ({ messages, currentUsername, onlineUsers, userLocation, isDarkMode, isLoading, onRefreshMap, onOpenModal }) => {
  // Debug log for received messages
  console.log(`🗺️ MapView: Received ${messages?.length || 0} messages`);
  console.log('🗺️ MapView: Current userLocation:', userLocation);

  const [viewState, setViewState] = useState({
    longitude: 0,  // Center on prime meridian initially
    latitude: 20,  // Slight northward tilt for a more natural view
    zoom: 1.2,     // Zoomed out to see most of the globe
    pitch: 20,     // Slight pitch for 3D effect
    bearing: 0
  });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [likedMessagesCache, setLikedMessagesCache] = useState(null);
  const [is3DMode, setIs3DMode] = useState(false);
  const [is3DLoaded, setIs3DLoaded] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [lightPreset, setLightPreset] = useState('day'); // Default light preset, will be updated automatically
  const mapRef = useRef();
  const navigate = useNavigate();
  const likeButtonRef = useRef(null);
  // Add a ref to track if initial position has been set
  const hasSetInitialPosition = useRef(false);
  // Add a ref to store the previous messages count to detect refreshes
  const prevMessagesCountRef = useRef(0);
  // Store the last auto-update time to prevent too frequent updates
  const lastLightUpdateRef = useRef(0);
  // Store the timeout ID for detecting when map movement stops
  const moveTimeoutRef = useRef(null);
  // Track the last viewport location to detect significant changes
  const lastViewportRef = useRef({ latitude: null, longitude: null });

  // State for weather data
  const [currentWeather, setCurrentWeather] = useState(null);

  // Immediately calculate and apply light preset when component mounts
  useEffect(() => {
    // Get the user's current location or use default viewport
    const location = userLocation || {
      latitude: viewState.latitude,
      longitude: viewState.longitude
    };
    
    // Calculate light preset immediately on mount
    const now = new Date();
    const initialPreset = getLightPresetForTime(now, location.latitude, location.longitude);
    
    console.log(`🌓 Initial light preset on mount: ${initialPreset} for location ${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`);
    
    // Set the preset state which will be used by the map when it renders
    setLightPreset(initialPreset);
    
    // Schedule periodic updates (every 5 minutes) to account for time passing
    const intervalId = setInterval(() => {
      const currentTime = new Date();
      const currentLocation = mapRef.current ? {
        latitude: viewState.latitude,
        longitude: viewState.longitude
      } : location;
      
      const updatedPreset = getLightPresetForTime(currentTime, currentLocation.latitude, currentLocation.longitude);
      
      if (updatedPreset !== lightPreset) {
        console.log(`🌓 Updating light preset to ${updatedPreset} based on time change`);
        setLightPreset(updatedPreset);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(intervalId);
  }, []); // Empty dependency array ensures this runs only once on mount

  // Fetch messages when the map component mounts, but only once
  useEffect(() => {
    // Only fetch messages on first mount, not on re-renders
    const hasFetchedKey = 'mapview_has_fetched_messages';
    
    // Check if we've already fetched messages in this session
    const hasFetched = sessionStorage.getItem(hasFetchedKey);
    
    if (!hasFetched) {
      console.log('🗺️ MapView: First mount, calling refresh function');
      // Call the provided refresh function instead of dispatching an event
      if (onRefreshMap) {
        onRefreshMap();
      }
      
      // Mark that we've fetched messages in this session
      sessionStorage.setItem(hasFetchedKey, 'true');
    } else {
      console.log('🗺️ MapView: Already fetched messages in this session, skipping');
    }
    
    // Clear the fetch flag when the component is unmounted
    return () => {
      // Only clear if we're actually navigating away, not just re-rendering
      if (document.visibilityState === 'hidden') {
        sessionStorage.removeItem(hasFetchedKey);
      }
    };
  }, [onRefreshMap]); // Add onRefreshMap as a dependency

  // Monitor messages count changes and log when they change
  useEffect(() => {
    const messagesCount = messages?.length || 0;
    
    if (prevMessagesCountRef.current !== messagesCount) {
      console.log(`MapView: Message count changed from ${prevMessagesCountRef.current} to ${messagesCount}`);
      prevMessagesCountRef.current = messagesCount;
    }
  }, [messages]);

  // We'll add a function to safely request refresh without causing page reloads
  const safeRefreshMap = useCallback(() => {
    console.log('🗺️ MapView: Safe refresh requested');
    if (onRefreshMap) {
      // Use the provided function from props rather than triggering global events
      onRefreshMap();
    }
  }, [onRefreshMap]);

  // Handle the manual refresh button click
  const handleRefreshButtonClick = useCallback((e) => {
    // Prevent default behavior that might cause page reloads
    e.preventDefault();
    console.log('🗺️ MapView: Manual refresh requested via button');
    safeRefreshMap();
  }, [safeRefreshMap]);

  // Set up automatic refresh on visibility change (when tab becomes active)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🗺️ MapView: Document became visible, triggering refresh');
        // Wait a moment before refreshing to ensure the browser is ready
        setTimeout(() => {
          safeRefreshMap();
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [safeRefreshMap]);

  // Handle navigation to user profile
  const navigateToProfile = (username, e) => {
    e.stopPropagation();
    navigate(`/profile/${username}`);
    setSelectedMessage(null); // Close popup after navigation
  };

  // Toggle 3D mode with loading state
  const toggle3DMode = useCallback(() => {
    if (!is3DMode) {
      // When turning on 3D mode, set loading state first
      setIs3DLoaded(false);
      
      // Then enable 3D mode
      setIs3DMode(true);
      
      // Set appropriate pitch for 3D view - this tilts the map to show buildings better
      setViewState(prev => ({
        ...prev,
        pitch: 45, // Tilt the map for 3D view
        zoom: Math.max(prev.zoom, 15) // Ensure we're zoomed in enough to see buildings
      }));
      
      // Enable 3D objects for Standard style if map is loaded
      if (mapRef.current?.getMap()?.isStyleLoaded()) {
        const map = mapRef.current.getMap();
        map.setConfigProperty('basemap', 'show3dObjects', true);
      }
      
      // Show hint message after 3D mode is loaded
      setTimeout(() => {
        setIs3DLoaded(true);
        // Show hint message briefly
        setShowHint(true);
        // Hide it after 5 seconds
        setTimeout(() => {
          setShowHint(false);
        }, 5000);
      }, 1000);
    } else {
      // When turning off, reset the pitch and disable 3D
      setViewState(prev => ({
        ...prev,
        pitch: 0, // Reset tilt
      }));
      
      // Disable 3D objects for Standard style if map is loaded
      if (mapRef.current?.getMap()?.isStyleLoaded()) {
        const map = mapRef.current.getMap();
        map.setConfigProperty('basemap', 'show3dObjects', false);
      }
      
      // Disable 3D mode
      setIs3DMode(false);
      setIs3DLoaded(false);
      setShowHint(false);
    }
  }, [is3DMode]);

  // Cache user's liked messages
  useEffect(() => {
    if (currentUsername && !likedMessagesCache) {
      apiService.getUserByUsername(currentUsername)
        .then(response => {
          if (response.success && response.data && response.data.user && response.data.user.likedMessages) {
            setLikedMessagesCache(response.data.user.likedMessages);
          } else {
            if (response.success) {
              setLikedMessagesCache([]);
            }
          }
        })
        .catch(error => {
          setLikedMessagesCache([]);
        });
    }
  }, [currentUsername, likedMessagesCache]);

  // Track changes to likedMessagesCache
  useEffect(() => {
    // Debug statements removed
  }, [likedMessagesCache, currentUsername]);

  // Check if a message is liked using cache when possible
  const isMessageLiked = useCallback((messageId) => {
    if (!messageId || !likedMessagesCache) return false;
    
    // Convert both to strings to ensure consistent comparison
    const messageIdStr = messageId.toString();
    return likedMessagesCache.some(id => id.toString() === messageIdStr);
  }, [likedMessagesCache]);

  // Handle marking a message when selected
  const onSelectMessage = (e, message) => {
    e.originalEvent.stopPropagation();
    
    // If we have the cache, use it instead of making an API call
    if (likedMessagesCache && message.dbId) {
      const isLiked = isMessageLiked(message.dbId);
      const updatedMessage = {
        ...message,
        likedByCurrentUser: isLiked
      };
      
      setSelectedMessage(updatedMessage);
      setIsLiked(isLiked);
      setLikesCount(message.likesCount || 0);
      
      if (likedMessagesCache && likedMessagesCache.length > 0) {
        // Check if message exists in liked messages
      }
    } 
    // If message already has the like status, use it
    else if (message.hasOwnProperty('likedByCurrentUser')) {
      setSelectedMessage(message);
      setIsLiked(message.likedByCurrentUser);
      setLikesCount(message.likesCount || 0);
      
      // Log the selected message's like status
    } 
    // Otherwise fetch from API
    else if (currentUsername && message.dbId) {
      
      apiService.getUserByUsername(currentUsername)
        .then(response => {
          // Log the raw response for debugging
          
          // Fixed: Access the correct response structure (response.data.user)
          if (response.success && response.data && response.data.user && response.data.user.likedMessages) {
            const messageIdStr = message.dbId.toString();
            const isLiked = response.data.user.likedMessages.some(id => id.toString() === messageIdStr);
            
            setSelectedMessage({
              ...message,
              likedByCurrentUser: isLiked
            });
            setIsLiked(isLiked);
            setLikesCount(message.likesCount || 0);
            
            // Log the selected message's like status after API check with IDs
          } else {
            setSelectedMessage(message);
            setIsLiked(false);
            setLikesCount(message.likesCount || 0);
            
            // Log the selected message's like status (default to false if API doesn't return expected data)
          }
        })
        .catch(error => {
          console.error('Error checking if message is liked:', error);
          // Set default values in case of error
          setSelectedMessage(message);
          setIsLiked(false);
          setLikesCount(message.likesCount || 0);
        });
    } else {
      setSelectedMessage(message);
      setIsLiked(false);
      setLikesCount(message.likesCount || 0);
    }
  };

  // Handle liking a message
  const handleLikeMessage = async (e) => {
    e.stopPropagation();
    if (!selectedMessage || !selectedMessage.dbId || !currentUsername) return;

    try {
      
      const response = await apiService.likeMessage(selectedMessage.dbId);
      if (response.success) {
        setIsLiked(response.liked);
        setLikesCount(response.likesCount);
        
        // Update the selected message with new like count
        setSelectedMessage(prev => ({
          ...prev,
          likesCount: response.likesCount,
          likedByCurrentUser: response.liked
        }));
        
        // Update cache
        if (response.liked) {
          // Add to cache if not already there
          const messageIdStr = selectedMessage.dbId.toString();
          setLikedMessagesCache(prev => {
            if (!prev) return [selectedMessage.dbId];
            
            // Check if it's already in the cache using string comparison
            const exists = prev.some(id => id.toString() === messageIdStr);
            return exists ? prev : [...prev, selectedMessage.dbId];
          });
        } else {
          // Remove from cache
          const messageIdStr = selectedMessage.dbId.toString();
          setLikedMessagesCache(prev => {
            if (!prev) return [];
            return prev.filter(id => id.toString() !== messageIdStr);
          });
        }
        
        
        // Update cache immediately to avoid delay in UI updates
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Filter messages that have valid location data with useMemo
  const messagesWithLocation = useMemo(() => {
    console.log('🗺️ MapView: Filtering messages with location data');
    return messages.filter(msg => 
      msg.location && !msg.location.error && 
      msg.location.latitude && msg.location.longitude
    );
  }, [messages]);

  // Set map view only when component mounts or userLocation changes (but NOT when messages update)
  useEffect(() => {
    // Only set the initial position once
    if (!hasSetInitialPosition.current) {
      // First priority: Use user's current location if available
      if (userLocation && userLocation.latitude && userLocation.longitude) {
        setViewState({
          longitude: userLocation.longitude,
          latitude: userLocation.latitude,
          zoom: 1.5, // Use a more zoomed out view for globe projection
          pitch: 0,
          bearing: 0
        });
        hasSetInitialPosition.current = true;
        return;
      }
      
      // Second priority: Use location from messagesWithLocation
      if (messagesWithLocation.length > 0) {
        // Use the location of the most recent message
        const latestMessage = messagesWithLocation[messagesWithLocation.length - 1];
        setViewState({
          longitude: latestMessage.location.longitude,
          latitude: latestMessage.location.latitude,
          zoom: 1.5, // Use a more zoomed out view for globe projection
          pitch: 0,
          bearing: 0
        });
        hasSetInitialPosition.current = true;
      }
    }
  }, [userLocation, messagesWithLocation]); // Include messagesWithLocation

  // Track message refreshes for debugging and handle selected message updates
  useEffect(() => {
    const messagesCount = messages.length;
    
    // Only log when count changes
    if (messagesCount !== prevMessagesCountRef.current) {
      console.log(`MapView: Message count changed from ${prevMessagesCountRef.current} to ${messagesCount}`);
      
      // When messages are refreshed, update selected message data if needed
      if (selectedMessage) {
        const refreshedMessage = messages.find(msg => msg.dbId === selectedMessage.dbId);
        if (refreshedMessage) {
          setSelectedMessage(refreshedMessage);
          setIsLiked(refreshedMessage.likedByCurrentUser || false);
          setLikesCount(refreshedMessage.likesCount || 0);
        }
      }
      
      prevMessagesCountRef.current = messagesCount;
    }
  }, [messages, selectedMessage]);
  
  // Log the like status for all messages on the map
  useEffect(() => {
    if (messagesWithLocation.length > 0 && currentUsername) {
      messagesWithLocation.forEach(message => {
        const messageId = message.dbId || message._id;
        
        // Check if liked using either the message property or the cache
        const isLiked = message.likedByCurrentUser || 
          (likedMessagesCache && likedMessagesCache.some(id => {
            // Convert both to strings to ensure consistent comparison
            return messageId && id.toString() === messageId.toString();
          }));
        
        // Get the text content (might be in either content or text property)
        const messageText = message.content || message.text || '';
        
      });
    }
  }, [messagesWithLocation, likedMessagesCache, currentUsername]);

  // Add detailed logging of liked messages with message content
  const logDetailedLikedMessages = useCallback(async () => {
    if (!currentUsername || !likedMessagesCache || likedMessagesCache.length === 0) return;
    
    try {
      // Get all messages from the API
      const response = await apiService.getAllMessages(null, currentUsername);
      
      // Check for the correct response structure for the API
      if (response && response.messages && Array.isArray(response.messages)) {
        // Filter for messages that are in the user's liked messages
        const likedMessagesDetails = response.messages.filter(message => {
          const messageId = message._id || message.dbId; // Server may use _id
          return messageId && likedMessagesCache.some(id => 
            id.toString() === messageId.toString()
          );
        });
        
        
        // Sort by most recent first and log details
        const sortedMessages = likedMessagesDetails.sort((a, b) => 
          new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp)
        );
        
        if (sortedMessages.length === 0) {
        } else {
          sortedMessages.forEach((message, index) => {
            const messageText = message.text || message.content || '';
            const timestamp = new Date(message.createdAt || message.timestamp).toLocaleString();
          });
        }
        
      } else {
      }
    } catch (error) {
      console.error('Error fetching detailed liked messages:', error);
    }
  }, [currentUsername, likedMessagesCache]);
  
  // Call the detailed logger when likedMessagesCache changes
  useEffect(() => {
    if (likedMessagesCache && likedMessagesCache.length > 0) {
      logDetailedLikedMessages();
    }
  }, [likedMessagesCache, logDetailedLikedMessages]);

  // Remove focus from like button when popup opens
  useEffect(() => {
    if (selectedMessage && likeButtonRef.current) {
      // Wait a tiny bit for the DOM to update
      setTimeout(() => {
        // Blur the like button if it's focused
        if (document.activeElement === likeButtonRef.current) {
          likeButtonRef.current.blur();
        }
      }, 50);
    }
  }, [selectedMessage]);

  // Function to update light preset based on current viewport location
  const updateLightPresetForLocation = useCallback(() => {
    if (!mapRef.current) return;
    
    const now = new Date();
    const preset = getLightPresetForTime(now, viewState.latitude, viewState.longitude);
    
    // Log the location and calculated preset
    console.log(`Recalibrating light preset at ${viewState.latitude.toFixed(2)}, ${viewState.longitude.toFixed(2)} - now ${preset}`);
    
    // Update the light preset if it's different
    if (preset !== lightPreset) {
      setLightPreset(preset);
      
      if (mapRef.current?.getMap()?.isStyleLoaded()) {
    const map = mapRef.current.getMap();
        map.setConfigProperty('basemap', 'lightPreset', preset);
      }
    }
    
    // Update last viewport position
    lastViewportRef.current = {
      latitude: viewState.latitude,
      longitude: viewState.longitude
    };
    
    // Update timestamp
    lastLightUpdateRef.current = now.getTime();
  }, [viewState.latitude, viewState.longitude, lightPreset]);

  // Update light preset based on time of day at viewport location
  useEffect(() => {
    // Set initial light preset when component mounts
    if (lastViewportRef.current.latitude === null) {
      updateLightPresetForLocation();
    }
    
    // Set up interval to periodically check for time changes (every minute)
    const intervalId = setInterval(() => {
      const updatedNow = new Date();
      const updatedPreset = getLightPresetForTime(updatedNow, viewState.latitude, viewState.longitude);
      
      if (updatedPreset !== lightPreset) {
        console.log(`Updating light preset to ${updatedPreset} based on current time`);
        setLightPreset(updatedPreset);
        lastLightUpdateRef.current = updatedNow.getTime();
        
        if (mapRef.current?.getMap()?.isStyleLoaded()) {
          const map = mapRef.current.getMap();
          map.setConfigProperty('basemap', 'lightPreset', updatedPreset);
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(intervalId);
  }, [lightPreset, viewState.latitude, viewState.longitude, updateLightPresetForLocation]);

  // Calculate initial light preset before map loads
  useEffect(() => {
    // Calculate initial light preset based on current location
    const initialLocation = userLocation || {
      latitude: viewState.latitude,
      longitude: viewState.longitude
    };
    
    const now = new Date();
    const initialPreset = getLightPresetForTime(now, initialLocation.latitude, initialLocation.longitude);
    console.log(`Setting initial light preset: ${initialPreset} at ${initialLocation.latitude.toFixed(2)}, ${initialLocation.longitude.toFixed(2)}`);
    setLightPreset(initialPreset);
  }, []);

  // Add a listener for weather updates from the WeatherWidget
  const handleWeatherUpdate = useCallback((weatherData) => {
    setCurrentWeather(weatherData);
    
    // Apply weather effects to map if we have both map and weather data
    if (mapRef.current && weatherData && weatherData.weather && weatherData.weather[0]) {
      const map = mapRef.current.getMap();
      const weatherCode = weatherData.weather[0].id;
      applyWeatherEffectsToMap(map, weatherCode);
    }
  }, []);

  // Apply configuration when the map style loads
  useEffect(() => {
    const handleStyleLoad = () => {
      if (mapRef.current) {
        const map = mapRef.current.getMap();
        
        // Apply current light preset immediately when style loads
        console.log(`Applying light preset ${lightPreset} on map style load`);
        map.setConfigProperty('basemap', 'lightPreset', lightPreset);
        
        // Apply globe projection
        console.log('Setting globe projection on map style load');
        map.setProjection('globe');

        // Add atmosphere effect
        try {
          // Add atmosphere effect with improved settings for less bright skyline
          map.setFog({
            'color': 'rgb(156, 180, 205)', // softer light blue
            'high-color': 'rgb(36, 92, 223)', // deep blue
            'horizon-blend': 0.015, // reduced blend for sharper horizon
            'space-color': 'rgb(11, 11, 25)', // dark space color
            'star-intensity': 0.7, // slightly more visible stars
            'range': [2.0, 14] // Raised fog layer significantly higher to clear skyline
          });
          
          // Apply weather effects if we have weather data
          if (currentWeather && currentWeather.weather && currentWeather.weather[0]) {
            applyWeatherEffectsToMap(map, currentWeather.weather[0].id);
          }
          
          console.log('Applied atmosphere and star field to globe view');
        } catch (err) {
          console.warn('Could not apply globe effects:', err);
        }
        
        // Then recalculate based on current viewport (which might have changed)
        updateLightPresetForLocation();
        
        // Enable 3D objects if in 3D mode
    if (is3DMode) {
          map.setConfigProperty('basemap', 'show3dObjects', true);
        }
      }
    };

    // Add event listener for style load
    if (mapRef.current && mapRef.current.getMap()) {
      const map = mapRef.current.getMap();
      
      if (map.isStyleLoaded()) {
        handleStyleLoad();
      } else {
        map.once('style.load', handleStyleLoad);
      }
      
      return () => {
        if (map) {
          map.off('style.load', handleStyleLoad);
        }
      };
    }
  }, [is3DMode, updateLightPresetForLocation, lightPreset, currentWeather]);

  // Memoize the weather widget props to prevent re-renders when only messages change
  const weatherWidgetProps = useMemo(() => ({
    latitude: viewState.latitude,
    longitude: viewState.longitude,
    isDarkMode: isDarkMode
  }), [viewState.latitude, viewState.longitude, isDarkMode]);

  // Handle map movement and update lighting when movement stops
  const handleMapMove = useCallback((evt) => {
    // Update viewState with the new map position
    setViewState(evt.viewState);
    
    // Clear any existing timeout to reset the timer
    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }
    
    // Create a new timeout to detect when movement stops
    moveTimeoutRef.current = setTimeout(() => {
      // Check if we've moved a significant distance (0.05 degrees ~ 5-6km)
      const hasMovedSignificantly = !lastViewportRef.current.latitude || 
        Math.abs(lastViewportRef.current.latitude - evt.viewState.latitude) > 0.05 ||
        Math.abs(lastViewportRef.current.longitude - evt.viewState.longitude) > 0.05;
      
      // Only recalculate if we've moved significantly or it's been more than 5 minutes
      const currentTime = new Date().getTime();
      if (hasMovedSignificantly || currentTime - lastLightUpdateRef.current > 5 * 60 * 1000) {
        updateLightPresetForLocation();
      }
      
      // Add globe-specific smoothing if needed
      if (evt.viewState.zoom < 1.5) {
        // For very zoomed out globe views, ensure we don't get too close to the poles
        setViewState(prevState => ({
          ...prevState,
          latitude: Math.max(-80, Math.min(80, prevState.latitude)), // Prevent getting too close to poles
        }));
      }
    }, 500); // Wait 500ms after movement stops before recalibrating
  }, [updateLightPresetForLocation]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  // Add a new effect to force-apply the light preset whenever it changes
  useEffect(() => {
    if (mapRef.current?.getMap()?.isStyleLoaded()) {
      const map = mapRef.current.getMap();
      console.log(`Light preset changed to ${lightPreset}, applying to map immediately`);
      map.setConfigProperty('basemap', 'lightPreset', lightPreset);
    }
  }, [lightPreset]);

  return (
    <div className={`map-container globe-view light-preset-${lightPreset}`}>
      <ReactMapGL
        ref={mapRef}
        {...viewState}
        onMove={handleMapMove}
        mapStyle={isDarkMode ? "mapbox://styles/mapbox/standard" : "mapbox://styles/mapbox/standard"}
        mapboxAccessToken="pk.eyJ1IjoiZGFya25pZ2h0MDA3IiwiYSI6ImNqOXpiMWF3MjhuajEyeHFzcjhzdDVzN20ifQ.DlcipLyUIsK1pVHRtPK9Mw"
        terrain={is3DMode ? { source: 'mapbox-dem', exaggeration: 1.5 } : undefined}
        projection="globe"
        initialViewState={{
          ...viewState,
          renderWorldCopies: false // Disable world copies in globe mode
        }}
        mapOptions={{
          localIdeographFontFamily: "'Noto Sans', 'Noto Sans CJK SC', sans-serif",
          basemap: {
            lightPreset: lightPreset,
            show3dObjects: is3DMode
          },
          fadeDuration: 1000 // Smoother transitions when changing light preset
        }}
        onStyleLoad={(map) => {
          console.log(`Map style loaded, immediately applying light preset: ${lightPreset}`);
          map.setConfigProperty('basemap', 'lightPreset', lightPreset);
          
          // Apply globe projection and effects
          map.setProjection('globe');
          
          // Add atmosphere effect with improved settings for less bright skyline
          map.setFog({
            'color': 'rgb(156, 180, 205)', // softer light blue
            'high-color': 'rgb(36, 92, 223)', // deep blue
            'horizon-blend': 0.015, // reduced blend for sharper horizon
            'space-color': 'rgb(11, 11, 25)', // dark space color
            'star-intensity': 0.7, // slightly more visible stars
            'range': [2.0, 14] // Raised fog layer significantly higher to clear skyline
          });
          
          // Apply weather effects if we have weather data
          if (currentWeather && currentWeather.weather && currentWeather.weather[0]) {
            applyWeatherEffectsToMap(map, currentWeather.weather[0].id);
          }
        }}
      >
        {/* Loading indicator */}
        {isLoading && (
          <div className="map-loading-indicator">
            <div className="spinner"></div>
            <p>Refreshing pins...</p>
          </div>
        )}
        
        <MemoizedWeatherWidget 
          {...weatherWidgetProps}
          onWeatherUpdate={handleWeatherUpdate}
        />
        
        {messagesWithLocation.map((message, index) => (
          <Marker
            key={index}
            longitude={message.location.longitude}
            latitude={message.location.latitude}
            anchor="top"
            onClick={e => onSelectMessage(e, message)}
          >
            <div className="map-marker">
              <AvatarPlaceholder 
                username={message.sender} 
                size="40px" 
                className="marker-avatar" 
              />
              {onlineUsers && onlineUsers[message.sender] && (
                <span className="online-indicator-map"></span>
              )}
            </div>
          </Marker>
        ))}

        {selectedMessage && (
          <Popup
            longitude={selectedMessage.location.longitude}
            latitude={selectedMessage.location.latitude}
            anchor="bottom"
            offsetTop={-65}
            onClose={() => setSelectedMessage(null)}
            closeOnClick={false}
            closeButton={true}
            className={`map-popup ${isDarkMode ? 'dark-mode' : ''}`}
            maxWidth="300px"
          >
            <div 
              className={`message-card ${isDarkMode ? 'dark-mode' : ''}`}
              onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling up to map
            >
              <div className="message-card-header">
                <AvatarPlaceholder 
                  username={selectedMessage.sender} 
                  size="40px" 
                  className="message-avatar"
                  onClick={(e) => navigateToProfile(selectedMessage.sender, e)}
                  style={{ cursor: 'pointer' }}
                />
                <div className="message-sender-info">
                  <span 
                    className="message-sender"
                    onClick={(e) => navigateToProfile(selectedMessage.sender, e)}
                    style={{ cursor: 'pointer' }}
                  >
                    {selectedMessage.sender}
                    {onlineUsers && onlineUsers[selectedMessage.sender] && (
                      <span className="online-indicator"></span>
                    )}
                  </span>
                  <span className="message-timestamp">
                    {timeAgo(selectedMessage.timestamp)}
                  </span>
                </div>
              </div>
              {selectedMessage.image && (
                <div className="message-card-image">
                  <img src={selectedMessage.image} alt="Message attachment" />
                </div>
              )}
              <div className="message-card-content">
                {renderTextWithLinks(selectedMessage.content)}
              </div>
              <div className="message-card-footer">
                <button 
                  ref={likeButtonRef}
                  className={`like-button ${isLiked ? 'liked' : ''}`}
                  onClick={handleLikeMessage}
                  disabled={!currentUsername}
                  title={currentUsername ? 'Like this message' : 'Sign in to like messages'}
                  tabIndex="-1"
                >
                  {isLiked ? 
                    <GoHeartFill className="heart-filled" /> : 
                    <GoHeart className="heart-outline" />
                  }
                  <span className="like-count">{likesCount > 0 ? likesCount : ''}</span>
                </button>
                <button 
                  className="location-button"
                  onClick={() => alert(`Location: ${selectedMessage.location.latitude}, ${selectedMessage.location.longitude}${selectedMessage.location.fuzzyLocation === false ? ' (Exact)' : ' (Approximate)'}`)}
                  title="View location details"
                  tabIndex="-1"
                >
                  <GoLocation className="location-icon" /> 
                  {selectedMessage.location.fuzzyLocation === false ? 'Exact' : 'Approximate'}
                </button>
              </div>
            </div>
          </Popup>
        )}
      </ReactMapGL>

      {/* Time indicator in top right */}
      <div className="time-preset-indicator">
        <div className={`time-indicator ${lightPreset}`} title={`Current lighting: ${lightPreset}`}>
          {lightPreset === 'day' && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          )}
          {lightPreset === 'dawn' && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v8"/>
              <path d="M5.2 11.2l1.4 1.4"/>
              <path d="M2 18h2"/>
              <path d="M20 18h2"/>
              <path d="M17.4 12.6l1.4-1.4"/>
              <path d="M22 22H2"/>
              <path d="M8 6l4-4 4 4"/>
              <path d="M16 18a4 4 0 0 0-8 0"/>
            </svg>
          )}
          {lightPreset === 'dusk' && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 10v2"/>
              <path d="M12 22v-2"/>
              <path d="M5.2 11.2l1.4 1.4"/>
              <path d="M2 18h2"/>
              <path d="M20 18h2"/>
              <path d="M17.4 12.6l1.4-1.4"/>
              <path d="M22 22H2"/>
              <path d="M16 6l-4 4-4-4"/>
              <path d="M16 18a4 4 0 0 0-8 0"/>
            </svg>
          )}
          {lightPreset === 'night' && (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          )}
          <span className="light-label">{lightPreset}</span>
        </div>
      </div>

      {/* Map controls */}
      <div className={`map-controls ${isDarkMode ? 'dark-mode' : ''}`}>
        <button 
          className={`map-control-button ${is3DMode ? 'active' : ''}`} 
          onClick={toggle3DMode}
          title={is3DMode ? "Switch to 2D view" : "Switch to 3D view"}
        >
          <GoStack />
          <span className="control-label">{is3DMode ? "2D" : "3D"}</span>
        </button>
      </div>

      {/* Group location button and compose button together */}
      <div className="map-action-buttons">
        {/* User location button */}
        {userLocation && (
          <button 
            className="location-control-button"
            onClick={() => {
              setViewState({
                longitude: userLocation.longitude,
                latitude: userLocation.latitude,
                zoom: 14, // Closer zoom for user's location
                pitch: is3DMode ? 45 : 0, // Maintain pitch if in 3D mode
                bearing: 0 // Set to 0 to prevent the "null" bearing error
              });
            }}
            title="Go to your location"
          >
            <GoHome />
          </button>
        )}

        {/* FloatingActionButton positioned under location button */}
        <div className="compose-button-container">
          <FloatingActionButton 
            onClick={onOpenModal}
            isDarkMode={isDarkMode}
            style={{ position: 'relative' }}
            aria-label="Create new message"
          />
        </div>
      </div>

      {/* Empty state message */}
      {messagesWithLocation.length === 0 && (
        <div className={`no-location-messages ${isDarkMode ? 'dark-mode' : ''}`}>
          <GoLocation size={32} className="empty-state-icon" />
          <p>The map is looking a bit empty!</p>
          <p>Share what's happening around you to drop a pin!</p>
          {isLoading && <div className="loading-spinner"></div>}
        </div>
      )}
    </div>
  );
};

MapView.propTypes = {
  messages: PropTypes.arrayOf(
    PropTypes.shape({
      sender: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired,
      timestamp: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      isReceived: PropTypes.bool,
      location: PropTypes.shape({
        latitude: PropTypes.number,
        longitude: PropTypes.number,
        error: PropTypes.string
      }),
      likesCount: PropTypes.number
    })
  ),
  currentUsername: PropTypes.string,
  onlineUsers: PropTypes.object,
  userLocation: PropTypes.shape({
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    isFallback: PropTypes.bool
  }),
  isDarkMode: PropTypes.bool,
  isLoading: PropTypes.bool,
  onRefreshMap: PropTypes.func,
  onOpenModal: PropTypes.func
};

MapView.defaultProps = {
  messages: [],
  currentUsername: null,
  onlineUsers: {},
  userLocation: null,
  isDarkMode: false,
  isLoading: false,
  onRefreshMap: null,
  onOpenModal: () => console.log("Open modal function not provided")
};

export default MapView; 