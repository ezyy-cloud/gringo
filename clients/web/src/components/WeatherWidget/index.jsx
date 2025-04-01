import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {  GoCloud, GoCloudOffline } from "react-icons/go";
import { WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, WiFog } from "react-icons/wi";
import WeatherForecastModal from '../WeatherForecastModal';
import './styles.css';

const WeatherWidget = ({ latitude, longitude, isDarkMode, onWeatherUpdate }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForecast, setShowForecast] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const timeoutRef = useRef(null);
  const lastCoordsRef = useRef({ latitude, longitude });
  const hasInitialFetchRef = useRef(false);

  const getWeatherIcon = (weatherCode) => {
    // Weather codes based on OpenWeatherMap API
    if (weatherCode >= 200 && weatherCode < 300) return <WiThunderstorm className="weather-icon" />;
    if (weatherCode >= 300 && weatherCode < 600) return <WiRain className="weather-icon" />;
    if (weatherCode >= 600 && weatherCode < 700) return <WiSnow className="weather-icon" />;
    if (weatherCode >= 700 && weatherCode < 800) return <WiFog className="weather-icon" />;
    if (weatherCode === 800) return <WiDaySunny className="weather-icon" />;
    if (weatherCode > 800) return <WiCloudy className="weather-icon" />;
    return <GoCloud className="weather-icon" />;
  };

  // Function to check if coordinates have changed significantly (more than 0.05 degrees ~ 5.5km)
  const hasSignificantCoordinateChange = (oldLat, oldLng, newLat, newLng) => {
    const threshold = 0.05; // ~5.5km
    return (
      Math.abs(oldLat - newLat) > threshold || 
      Math.abs(oldLng - newLng) > threshold
    );
  };

  useEffect(() => {
    const fetchWeather = async () => {
      if (!latitude || !longitude) return;
  
      
      try {
        if (!weather) {
          setLoading(true); // Only set loading if there's no current weather data
        }
        
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        setWeather(data);
        setError(null);
        lastCoordsRef.current = { latitude, longitude }; // Update last successful coordinates
        hasInitialFetchRef.current = true;
        
        // Call the callback to notify the parent component about the weather update
        if (onWeatherUpdate && typeof onWeatherUpdate === 'function') {
          onWeatherUpdate(data);
        }
      } catch {
        const errorMessage = 'Could not load weather data';
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch when component mounts - fetch immediately
    if (!hasInitialFetchRef.current) {
      fetchWeather();
      return;
    }

    // Check if coordinates have changed significantly
    const significantChange = hasSignificantCoordinateChange(
      lastCoordsRef.current.latitude, 
      lastCoordsRef.current.longitude,
      latitude,
      longitude
    );

    // If no significant change, don't reset the timeout or loading state
    if (!significantChange) {
      return;
    }

    // Clear any existing timeout if coordinates have changed significantly
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to fetch weather data after 10 seconds of no significant coordinate changes
    // This is much quicker than the previous 1 minute delay

    timeoutRef.current = setTimeout(() => {
      fetchWeather();
      
      // Set up the 5-minute refresh interval after the initial fetch
      const interval = setInterval(() => {
        fetchWeather();
      }, 5 * 60 * 1000);
      
      return () => {
        clearInterval(interval);
      };
    }, 10 * 1000); // 10 seconds delay instead of 1 minute

    // Cleanup function to clear the timeout when coordinates change or component unmounts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [latitude, longitude, weather, onWeatherUpdate]);

  const handleWidgetClick = () => {
    if (showDetails) {
      setShowForecast(true);
    } else {
      setShowDetails(true);
    }
  };

  const handleWidgetBlur = () => {
    if (!showForecast) {
      setShowDetails(false);
    }
  };

  if (loading && !weather) {
    return (
      <div className={`weather-widget icon-only ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="weather-loading">
          <GoCloud className="weather-icon spinning" />
        </div>
      </div>
    );
  }

  if (error && !weather) {
    return (
      <div className={`weather-widget icon-only ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="weather-error">
          <GoCloudOffline className="weather-icon" />
        </div>
      </div>
    );
  }

  // Show the last known weather data even if we're loading new data
  // This prevents the spinning icon from showing repeatedly
  return (
    <>
      <div 
        className={`weather-widget ${showDetails ? '' : 'icon-only'} ${isDarkMode ? 'dark-mode' : ''} ${loading ? 'updating' : ''}`}
        onClick={handleWidgetClick}
        onBlur={handleWidgetBlur}
        role="button"
        tabIndex={0}
        onKeyPress={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleWidgetClick();
          }
        }}
      >
        <div className="weather-content">
          {weather && getWeatherIcon(weather.weather[0].id)}
          {!weather && <GoCloud className="weather-icon" />}
          {showDetails && weather && (
            <div className="weather-info">
              <div className="weather-temp">{Math.round(weather.main.temp)}°C</div>
              <div className="weather-desc">{weather.weather[0].description}</div>
              <div className="weather-details">
                <span>Humidity: {weather.main.humidity}%</span>
                <span>Wind: {Math.round(weather.wind.speed)} m/s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {showForecast && (
        <WeatherForecastModal
          latitude={latitude}
          longitude={longitude}
          isDarkMode={isDarkMode}
          onClose={() => {
            setShowForecast(false);
            setShowDetails(false);
          }}
        />
      )}
    </>
  );
};

WeatherWidget.propTypes = {
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
  isDarkMode: PropTypes.bool,
  onWeatherUpdate: PropTypes.func
};

WeatherWidget.defaultProps = {
  isDarkMode: false,
  onWeatherUpdate: null
};

export default WeatherWidget; 