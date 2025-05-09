// Determine the protocol based on the environment
const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
const API_BASE_URL = `${protocol}//134.122.17.151:5000`;

export default API_BASE_URL; 