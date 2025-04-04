// Determine the protocol based on the environment
const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const API_BASE_URL = `${protocol}//172.83.13.140:5000`;

export default API_BASE_URL; 