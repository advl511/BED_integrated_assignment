let map;
let markers = [];
let savedLocations = [];
let savedLocationMarkers = [];
const apiBaseUrl = "http://localhost:3000";

// API Functions
async function fetchSavedLocations() {
  try {
    const response = await fetch(`${apiBaseUrl}/map/locations`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const locations = await response.json();
    savedLocations = locations;
    return locations;
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    throw error;
  }
}

// UI Functions for Saved Locations Panel
function toggleSavedLocations() {
  const panel = document.getElementById('savedLocationsPanel');
  const btn = document.getElementById('savedLocationsBtn');
  
  if (panel.classList.contains('active')) {
    closeSavedLocations();
  } else {
    openSavedLocations();
  }
}

async function openSavedLocations() {
  const panel = document.getElementById('savedLocationsPanel');
  const btn = document.getElementById('savedLocationsBtn');
  const locationsList = document.getElementById('locationsList');
  const uiContainer = document.getElementById('UI-container');
  
  panel.classList.add('active');
  btn.classList.add('active');
  uiContainer.classList.add('panel-open'); // Add class to move search bar
  
  // Show loading state
  locationsList.innerHTML = '<div class="loading">Loading locations...</div>';
  
  try {
    const locations = await fetchSavedLocations();
    displayLocationsList(locations);
    displayLocationsOnMap(locations);
  } catch (error) {
    locationsList.innerHTML = '<div class="error-message">Failed to load locations. Please try again.</div>';
  }
}

function closeSavedLocations() {
  const panel = document.getElementById('savedLocationsPanel');
  const btn = document.getElementById('savedLocationsBtn');
  const uiContainer = document.getElementById('UI-container');
  
  panel.classList.remove('active');
  btn.classList.remove('active');
  uiContainer.classList.remove('panel-open'); // Remove class to move search bar back
  
  // Hide saved location markers
  clearSavedLocationMarkers();
}

function displayLocationsList(locations) {
  const locationsList = document.getElementById('locationsList');
  
  if (!locations || locations.length === 0) {
    locationsList.innerHTML = '<div class="no-locations">No saved locations found.</div>';
    return;
  }
  
  const locationsHTML = locations.map(location => `
    <div class="location-item" onclick="goToLocation(${location.latitude}, ${location.longitude}, '${location.location_name}')">
      <div class="location-name">${location.location_name}</div>
    </div>
  `).join('');
  
  locationsList.innerHTML = locationsHTML;
}

function displayLocationsOnMap(locations) {
  // Clear existing saved location markers
  clearSavedLocationMarkers();
  
  locations.forEach(location => {
    const marker = new google.maps.Marker({
      position: { lat: parseFloat(location.latitude), lng: parseFloat(location.longitude) },
      map: map,
      title: location.location_name,
      icon: {
        url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="%234285f4"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>',
        scaledSize: new google.maps.Size(24, 24),
        anchor: new google.maps.Point(12, 24)
      }
    });
    
    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="max-width: 200px;">
          <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${location.location_name}</h4>
          <p style="margin: 0; color: #666; font-size: 12px;">
            <strong>Coordinates:</strong><br>
            ${location.latitude}°, ${location.longitude}°
          </p>
          <p style="margin: 8px 0 0 0; color: #888; font-size: 11px;">
            <strong>Saved:</strong> ${new Date(location.created_at).toLocaleDateString()}
          </p>
        </div>
      `
    });
    
    marker.addListener('click', () => {
      // Close all other info windows
      savedLocationMarkers.forEach(m => m.infoWindow && m.infoWindow.close());
      infoWindow.open(map, marker);
    });
    
    marker.infoWindow = infoWindow;
    savedLocationMarkers.push(marker);
  });
}

function clearSavedLocationMarkers() {
  savedLocationMarkers.forEach(marker => {
    marker.infoWindow && marker.infoWindow.close();
    marker.setMap(null);
  });
  savedLocationMarkers = [];
}

function goToLocation(lat, lng, name) {
  const location = { lat: parseFloat(lat), lng: parseFloat(lng) };
  
  if (map) {
    map.panTo(location);
    
    setTimeout(() => {
      map.setZoom(16);
    }, 800);
    
    setTimeout(() => {
      closeSavedLocations();
    }, 200);
    
    setTimeout(() => {
      const tempMarker = new google.maps.Marker({
        position: location,
        map: map,
        title: name
      });
      
      // Add bounce animation
      setTimeout(() => {
        tempMarker.setAnimation(google.maps.Animation.BOUNCE);
      }, 100);
      
      // Stop bouncing after 2 seconds
      setTimeout(() => {
        tempMarker.setAnimation(null);
      }, 2100);
      
      // Remove temp marker after 5 seconds
      setTimeout(() => {
        tempMarker.setMap(null);
      }, 5000);
    }, 1200); // Increased delay to let zoom complete
  }
}

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
  const defaultLocation = { lat: 1.3521, lng: 103.8198 };

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14, // Wider zoom level for better initial view
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
            lat: parseFloat(pos.coords.latitude.toFixed(4)),
            lng: parseFloat(pos.coords.longitude.toFixed(4)),
          };

          if (map) {
            map.panTo(userLocation);
            
            clearMarkers();
            
            // Smooth zoom transition
            setTimeout(() => {
              map.setZoom(18); // Closer zoom for user location
            }, 800);
            
            setTimeout(() => {
              const userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: "You are here!"
              });
              
              markers.push(userMarker);
              
              setTimeout(() => {
                userMarker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => {
                  userMarker.setAnimation(null);
                }, 1000);
              }, 100);
              
            }, 1200);
          }

          resolve(userLocation);
        },
        () => {
          alert("Geolocation failed or was denied.");
          const defaultLocation = { lat: 1.3521, lng: 103.8198 };
          resolve(defaultLocation);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } else {
      const defaultLocation = { lat: 1.3521, lng: 103.8198 };
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
      
      clearMarkers();
      
      setTimeout(() => {
        map.setZoom(16);
      }, 800);
      
      setTimeout(() => {
        const searchMarker = new google.maps.Marker({
          position: location,
          map: map,
          title: place.name || "Selected Location"
        });
        
        markers.push(searchMarker);
        
        setTimeout(() => {
          searchMarker.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(() => {
            searchMarker.setAnimation(null);
          }, 1000);
        }, 100);
        
      }, 1200);
      
    } else {
      alert("No details available for input: '" + place.name + "'");
    }
  });
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);