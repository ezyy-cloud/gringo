import axios from 'axios';

const API_URL = '/api/vessels';

/**
 * Initialize vessel tracking with server-side API key
 * @returns {Promise<Object>} - Response data
 */
const initializeTracking = async () => {

    const response = await axios.post(`${API_URL}/init`);
    return response.data;

};

/**
 * Get all tracked vessels
 * @returns {Promise<Object>} - Response data with vessels array
 */
const getVessels = async () => {

    const response = await axios.get(API_URL);
    return response.data;

};

const vesselService = {
  initializeTracking,
  getVessels
};

export default vesselService; 