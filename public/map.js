let map;
let markers = [];


// Initialize the map application
async function initializeApp() {
  try {
    console.log('Loading Google Maps API...');
    
    // Load Google Maps API dynamically
    await window.mapConfig.loadGoogleMapsAPI();
    
    console.log('Google Maps API loaded, initializing map...');
    
    // Wait a moment for Google Maps to be fully ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initialize the map
    await initMap();
    
  } catch (error) {
    console.error('Failed to initialize map application:', error);
    alert('Failed to load the map. Please check your internet connection and try again.');
  }
}

async function initMap() {
  // Set default location (Singapore) without calling locateMe()
  const defaultLocation = { lat: 1.3521, lng: 103.8198 };

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14, // Start with a wider view since we're not at user's location
    center: defaultLocation,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
    gestureHandling: 'cooperative',
    clickableIcons: false,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    zoomControl: true,
    zoomControlOptions: {
      position: google.maps.ControlPosition.RIGHT_CENTER
    },
  });

  // Optional: Add a default marker
  addMarker(defaultLocation, "Singapore (Default Location)");

  searchLocation();
};

function addMarker(location, title) {
  const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: title,
  });
  markers.push(marker);
}

function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function locateMe(){

  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLocation = {
            lat: parseFloat(pos.coords.latitude.toFixed(5)),
            lng: parseFloat(pos.coords.longitude.toFixed(5)),
          };

          if (map) {
            map.panTo(userLocation);
            setTimeout(() => {
              map.setZoom(16);
            }, 500);
            clearMarkers();
            setTimeout(() => {
              addMarker(userLocation, "You are here!");
            }, 800);
          }

          resolve(userLocation);
        },
        () => {
          alert("Geolocation failed or was denied.");
          resolve(defaultLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      resolve(defaultLocation);
    }
  });
}


function searchLocation() {
  const input = document.getElementById("search");
  const autocomplete = new google.maps.places.Autocomplete(input);

  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      map.panTo(location);
      setTimeout(() => {
        map.setZoom(16);
      }, 500);
      clearMarkers();
      setTimeout(() => {
        addMarker(location, place.name || "Selected Location");
      }, 800);
    } else {
      alert("No details available for input: '" + place.name + "'");
    }
  });
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);