// Geolocation and India Post reverse geocoding

export async function getPincodeFromCoords(lat: number, lng: number): Promise<string | null> {
  // Use a reverse geocoding service. 
  // Note: The prompt mentioned api.postalpincode.in but that API takes Pincode -> Branch details or Branch Name -> Pincode details. 
  // It doesn't natively support lat/lng. 
  // We'll use a free open reverse geocoding API (Nominatim / OpenStreetMap) as a fallback since postalpincode.in doesn't support lat/lng directly.
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const data = await res.json();
    
    if (data && data.address && data.address.postcode) {
      return data.address.postcode;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export function isValidCity(pincode: string): { valid: boolean; city?: string } {
  // Simplified validation based on common prefixes
  if (pincode.startsWith('11')) return { valid: true, city: 'Delhi' };
  if (pincode.startsWith('40')) return { valid: true, city: 'Mumbai' };
  if (pincode.startsWith('56')) return { valid: true, city: 'Bangalore' };
  if (pincode.startsWith('50')) return { valid: true, city: 'Hyderabad' };
  return { valid: false };
}

export function watchLocation(onLocationUpdate: (pincode: string, city: string) => void, onError: (error: string) => void) {
  if (!('geolocation' in navigator)) {
    onError('Geolocation is not supported by your browser');
    return null;
  }

  const watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      const pincode = await getPincodeFromCoords(latitude, longitude);
      
      if (pincode) {
        const { valid, city } = isValidCity(pincode);
        if (valid && city) {
          onLocationUpdate(pincode, city);
        } else {
          onError(`Detected location outside supported cities. Pincode: ${pincode}`);
        }
      } else {
        onError('Could not determine pincode from location');
      }
    },
    (error) => {
      onError(error.message);
    },
    {
      enableHighAccuracy: false,
      maximumAge: 60000,
      timeout: 10000
    }
  );

  return watchId;
}
