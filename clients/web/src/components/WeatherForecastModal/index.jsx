import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, WiFog } from "react-icons/wi";
import { GoX } from "react-icons/go";
import './styles.css';

const WeatherForecastModal = ({ latitude, longitude, isDarkMode, onClose }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const getWeatherIcon = (weatherCode) => {
    if (weatherCode >= 200 && weatherCode < 300) return <WiThunderstorm className="forecast-icon" />;
    if (weatherCode >= 300 && weatherCode < 600) return <WiRain className="forecast-icon" />;
    if (weatherCode >= 600 && weatherCode < 700) return <WiSnow className="forecast-icon" />;
    if (weatherCode >= 700 && weatherCode < 800) return <WiFog className="forecast-icon" />;
    if (weatherCode === 800) return <WiDaySunny className="forecast-icon" />;
    if (weatherCode > 800) return <WiCloudy className="forecast-icon" />;
    return <WiCloudy className="forecast-icon" />;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  useEffect(() => {
    const fetchForecast = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${import.meta.env.VITE_OPENWEATHER_API_KEY}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch forecast data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('🌤️ Weather API: Received forecast data:', data);
        setForecast(data);
        setError(null);
      } catch (err) {
        console.error('🌤️ Weather API Forecast Error:', err);
        setError('Could not load forecast data');
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [latitude, longitude]);

  return (
    <div className={`forecast-modal-overlay ${isDarkMode ? 'dark-mode' : ''}`} onClick={onClose}>
      <div className="forecast-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          <GoX />
        </button>
        
        {loading && (
          <div className="forecast-loading">
            <WiCloudy className="spinning" />
            <span>Loading forecast...</span>
          </div>
        )}

        {error && (
          <div className="forecast-error">
            <span>{error}</span>
          </div>
        )}

        {forecast && (
          <div className="forecast-container">
            <div className="forecast-header">
              <h2>{forecast.city.name}, {forecast.city.country}</h2>
            </div>
            
            <div className="forecast-list">
              {forecast.list.map((item, index) => (
                <div key={index} className="forecast-item">
                  <div className="forecast-time">{formatDate(item.dt)}</div>
                  <div className="forecast-icon-temp">
                    {getWeatherIcon(item.weather[0].id)}
                    <span className="forecast-temp">{Math.round(item.main.temp)}°C</span>
                  </div>
                  <div className="forecast-desc">{item.weather[0].description}</div>
                  <div className="forecast-details">
                    <span>Humidity: {item.main.humidity}%</span>
                    <span>Wind: {Math.round(item.wind.speed)} m/s</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

WeatherForecastModal.propTypes = {
  latitude: PropTypes.number.isRequired,
  longitude: PropTypes.number.isRequired,
  isDarkMode: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

export default WeatherForecastModal; 