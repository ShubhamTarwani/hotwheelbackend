const axios = require('axios');

// Known lat/lng for supported pincodes (avoids geocoding API calls)
const PINCODE_COORDS = {
  '440014': { lat: 21.1775074, lng: 79.0899245 },
  '440001': { lat: 21.1466, lng: 79.0849 },  // Nagpur central
  '110001': { lat: 28.6353, lng: 77.2250 },  // Delhi
  '110002': { lat: 28.6328, lng: 77.2197 },  // Delhi
  '400001': { lat: 18.9388, lng: 72.8354 },  // Mumbai
  '560001': { lat: 12.9716, lng: 77.5946 },  // Bangalore
  '500001': { lat: 17.3850, lng: 78.4867 },  // Hyderabad
};

async function pincodeToLatLng(pincode) {
  if (PINCODE_COORDS[pincode]) {
    return PINCODE_COORDS[pincode];
  }

  try {
    const geo = await axios.get(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json`,
      { headers: { 'User-Agent': 'HWTracker/1.0' }, timeout: 5000 }
    );
    if (geo.data?.[0]) {
      return { lat: parseFloat(geo.data[0].lat), lng: parseFloat(geo.data[0].lon) };
    }
  } catch (error) {
    console.warn('Geocoding fallback triggered:', error.message);
  }
  return { lat: 21.1458, lng: 79.0882 }; // fallback: Nagpur
}

module.exports = { pincodeToLatLng };
