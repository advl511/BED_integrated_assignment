let map;
let markers = [];
let savedLocations = [];
let savedLocationMarkers = [];
let directionsService;
let directionsRenderer;
let currentRoute = null;
const apiBaseUrl = "http://localhost:3000";

// Transport modes
const TRANSPORT_MODES = {
  DRIVING: 'DRIVING',
  WALKING: 'WALKING',
  BICYCLING: 'BICYCLING',
  TRANSIT: 'TRANSIT'
};

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

async function saveLocation(locationData) {
  try {
    const response = await fetch(`${apiBaseUrl}/map/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
}

async function saveRoute(routeData) {
  try {
    const response = await fetch(`${apiBaseUrl}/map/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routeData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving route:', error);
    throw error;
  }
}

async function fetchSavedRoutes() {
  try {
    const response = await fetch(`${apiBaseUrl}/map/routes`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching saved routes:', error);
    throw error;
  }
}

// Initialize the map application
async function initializeApp() {
  try {
    console.log('Loading Google Maps API...');
    
    // Load Google Maps API dynamically
    await window.mapConfig.loadGoogleMapsAPI();
    
    console.log('Google Maps API loaded, initializing map...');
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await initMap();
    
  } catch (error) {
    console.error('Failed to initialize map application:', error);
    alert('Failed to load the map. Please check your internet connection and try again.');
  }
}

async function initMap() {
  const defaultLocation = { lat: 1.3521, lng: 103.8198 };

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
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

  // Initialize directions service and renderer
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    draggable: true,
    panel: document.getElementById('directionsPanel')
  });
  directionsRenderer.setMap(map);

  // Listen for route changes
  directionsRenderer.addListener('directions_changed', () => {
    const directions = directionsRenderer.getDirections();
    currentRoute = directions;
    
    // Only display route info if we have actual routes (not when clearing)
    if (directions.routes && directions.routes.length > 0) {
      displayRouteInfo(directions);
    }
  });

  addMarker(defaultLocation, "Singapore (Default Location)");
  searchLocation();
  initializeTransportControls();
}

// Initialize transport controls
function initializeTransportControls() {
  // Add click listener for directions
  map.addListener('click', (event) => {
    if (document.getElementById('directionsMode') && document.getElementById('directionsMode').checked) {
      handleDirectionsClick(event.latLng);
    }
  });

  // Add listener for directions mode toggle
  document.getElementById('directionsMode').addEventListener('change', function() {
    const routePoints = document.getElementById('routePoints');
    const locationNav = document.getElementById('locationNav');
    
    if (this.checked) {
      routePoints.style.display = 'block';
      locationNav.classList.add('directions-active');
      initializeRouteSearches();
      showDirectionsPanel();
      loadSavedRoutes(); // Load saved routes when panel opens
      showNotification("Directions mode enabled. Search for locations or click on map to set start/end points.");
    } else {
      routePoints.style.display = 'none';
      locationNav.classList.remove('directions-active');
      hideDirectionsPanel();
      clearRoutePoints();
    }
  });
}

// Initialize autocomplete for route search inputs
function initializeRouteSearches() {
  const startInput = document.getElementById('startPoint');
  const endInput = document.getElementById('endPoint');
  
  // Prevent initialization if already done
  if (startInput.autocomplete && endInput.autocomplete) {
    return;
  }
  
  // Initialize start point autocomplete
  const startAutocomplete = new google.maps.places.Autocomplete(startInput);
  startInput.autocomplete = startAutocomplete;
  
  startAutocomplete.addListener('place_changed', () => {
    const place = startAutocomplete.getPlace();
    if (place.geometry) {
      setAsStartPoint(
        place.geometry.location.lat(),
        place.geometry.location.lng(),
        place.name || place.formatted_address || 'Selected Location'
      );
    }
  });

  // Initialize end point autocomplete
  const endAutocomplete = new google.maps.places.Autocomplete(endInput);
  endInput.autocomplete = endAutocomplete;
  
  endAutocomplete.addListener('place_changed', () => {
    const place = endAutocomplete.getPlace();
    if (place.geometry) {
      setAsEndPoint(
        place.geometry.location.lat(),
        place.geometry.location.lng(),
        place.name || place.formatted_address || 'Selected Location'
      );
    }
  });
}

// Route point management variables
let startPoint = null;
let endPoint = null;

// Set saved location as starting point
function setAsStartPoint(lat, lng, name) {
  startPoint = { lat: parseFloat(lat), lng: parseFloat(lng), name: name };
  document.getElementById('startPoint').value = name;
  document.getElementById('directionsMode').checked = true;
  document.getElementById('routePoints').style.display = 'block';
  document.getElementById('locationNav').classList.add('directions-active');
  showDirectionsPanel();
  loadSavedRoutes(); // Load saved routes when panel opens
  updateCalculateButton();
  showNotification(`Starting point set to: ${name}`);
  
  // Initialize searches if not already done
  if (!document.getElementById('startPoint').autocomplete) {
    initializeRouteSearches();
  }
}

// Set saved location as ending point
function setAsEndPoint(lat, lng, name) {
  endPoint = { lat: parseFloat(lat), lng: parseFloat(lng), name: name };
  document.getElementById('endPoint').value = name;
  document.getElementById('directionsMode').checked = true;
  document.getElementById('routePoints').style.display = 'block';
  document.getElementById('locationNav').classList.add('directions-active');
  showDirectionsPanel();
  loadSavedRoutes(); // Load saved routes when panel opens
  updateCalculateButton();
  showNotification(`Destination set to: ${name}`);
  
  // Initialize searches if not already done
  if (!document.getElementById('endPoint').autocomplete) {
    initializeRouteSearches();
  }
}

// Use current location as starting point
async function useCurrentLocation() {
  try {
    const userLocation = await locateMe();
    setAsStartPoint(userLocation.lat, userLocation.lng, "My Current Location");
  } catch (error) {
    console.error('Error getting current location:', error);
    showNotification("Could not get your current location. Please try again.");
  }
}

// Clear starting point
function clearStartPoint() {
  startPoint = null;
  document.getElementById('startPoint').value = '';
  updateCalculateButton();
}

// Clear ending point
function clearEndPoint() {
  endPoint = null;
  document.getElementById('endPoint').value = '';
  updateCalculateButton();
}

// Clear all route points
function clearRoutePoints() {
  startPoint = null;
  endPoint = null;
  
  const startInput = document.getElementById('startPoint');
  const endInput = document.getElementById('endPoint');
  
  if (startInput) {
    startInput.value = '';
    startInput.placeholder = 'Enter starting location...';
  }

  if (endInput) {
    endInput.value = '';
    endInput.placeholder = 'Enter destination...';
  }
  
  updateCalculateButton();
  clearMarkers();
  
  // Also clear any existing route display
  if (directionsRenderer) {
    directionsRenderer.setDirections({routes: []});
  }
}

// Update calculate button state
function updateCalculateButton() {
  const calculateBtn = document.getElementById('calculateBtn');
  if (startPoint && endPoint) {
    calculateBtn.disabled = false;
    calculateBtn.style.background = '#4CAF50';
  } else {
    calculateBtn.disabled = true;
    calculateBtn.style.background = '#ccc';
  }
}

// Calculate route from input points
function calculateRouteFromInputs() {
  if (startPoint && endPoint) {
    calculateRoute(startPoint, endPoint);
  }
}

// Update travel mode when dropdown changes
function updateTravelMode() {
  const travelMode = document.getElementById('travelMode').value;
  
  // If we have both start and end points, recalculate with new travel mode
  if (startPoint && endPoint) {
    calculateRoute(startPoint, endPoint, travelMode);
  }
}

// Handle clicks for directions
let directionsClicks = [];
function handleDirectionsClick(location) {
  // If we don't have a start point, set it
  if (!startPoint) {
    setAsStartPoint(location.lat(), location.lng(), `Map location (${location.lat().toFixed(4)}, ${location.lng().toFixed(4)})`);
    addMarker(location, "Origin", 'green');
    showNotification("Starting point set. Now select destination.");
  }
  // If we have start but no end, set end point
  else if (!endPoint) {
    setAsEndPoint(location.lat(), location.lng(), `Map location (${location.lat().toFixed(4)}, ${location.lng().toFixed(4)})`);
    addMarker(location, "Destination", 'red');
    calculateRouteFromInputs();
  }
  // If both are set, reset and start over
  else {
    clearMarkers();
    clearRoutePoints();
    setAsStartPoint(location.lat(), location.lng(), `Map location (${location.lat().toFixed(4)}, ${location.lng().toFixed(4)})`);
    addMarker(location, "Origin", 'green');
    showNotification("New starting point set. Now select destination.");
  }
}

// Reset directions mode
function resetDirectionsMode() {
  directionsClicks = [];
  clearMarkers();
  clearDirections();
}

// Calculate and display route
async function calculateRoute(origin, destination, travelMode = null) {
  try {
    // Get travel mode from dropdown if not specified
    if (!travelMode) {
      const travelModeSelect = document.getElementById('travelMode');
      travelMode = travelModeSelect ? travelModeSelect.value : 'DRIVING';
    }
    
    const request = {
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode[travelMode],
      unitSystem: google.maps.UnitSystem.METRIC,
      avoidHighways: false,
      avoidTolls: false
    };

    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        clearMarkers();
        showDirectionsPanel();
      } else {
        console.error('Directions request failed:', status);
        alert('Could not calculate route: ' + status);
      }
    });
  } catch (error) {
    console.error('Error calculating route:', error);
    alert('Error calculating route. Please try again.');
  }
}

// Extract location name from address
function extractLocationName(address) {
  if (!address) return 'Unknown Location';
  
  // Common patterns to extract meaningful names
  const patterns = [
    // Educational institutions
    /^([^,]+(?:University|Polytechnic|School|College|Institute))/i,
    // Shopping centers and malls
    /^([^,]+(?:Mall|Centre|Center|Plaza|Hub))/i,
    // Hotels and resorts
    /^([^,]+(?:Hotel|Resort|Inn))/i,
    // Hospitals and clinics
    /^([^,]+(?:Hospital|Clinic|Medical))/i,
    // Parks and recreation
    /^([^,]+(?:Park|Garden|Stadium|Sports))/i,
    // Transport hubs
    /^([^,]+(?:Airport|Station|Terminal|Port))/i,
    // Government buildings
    /^([^,]+(?:Ministry|Building|Tower|Office))/i,
    // Religious places
    /^([^,]+(?:Temple|Church|Mosque|Cathedral))/i,
    // General building names (before comma)
    /^([A-Za-z0-9\s&'-]+)(?:,|\s+\d)/
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    const match = address.match(pattern);
    if (match && match[1] && match[1].trim().length > 3) {
      return match[1].trim();
    }
  }
  
  // Fallback: take first part before comma if it's meaningful
  const parts = address.split(',');
  if (parts.length > 0) {
    const firstPart = parts[0].trim();
    // If first part is just a number/block, try second part
    if (/^(BLK|Block|blk|\d+[A-Za-z]?)\s/.test(firstPart) && parts.length > 1) {
      const secondPart = parts[1].trim();
      if (secondPart.length > 3) {
        return secondPart;
      }
    }
    // Return first part if it's not just numbers
    if (!/^\d+$/.test(firstPart) && firstPart.length > 3) {
      return firstPart;
    }
  }
  
  // Last resort: return original address truncated
  return address.length > 30 ? address.substring(0, 30) + '...' : address;
}

// Display route information
function displayRouteInfo(directions) {
  const route = directions.routes[0];
  const leg = route.legs[0];
  
  // Extract meaningful location names
  const fromName = extractLocationName(leg.start_address);
  const toName = extractLocationName(leg.end_address);
  
  const routeInfo = document.getElementById('routeInfo');
  if (routeInfo) {
    routeInfo.innerHTML = `
      <div class="route-summary">
        <h4>Route Summary</h4>
        <p><strong>Distance:</strong> ${leg.distance.text}</p>
        <p><strong>Duration:</strong> ${leg.duration.text}</p>
        <p><strong>From:</strong> ${fromName}</p>
        <p><strong>To:</strong> ${toName}</p>
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 12px; color: #64748b; margin: 0;"><strong>Full addresses:</strong></p>
          <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">${leg.start_address}</p>
          <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 0;">${leg.end_address}</p>
        </div>
      </div>
      <button onclick="saveCurrentRoute()" class="save-route-btn">Save Route</button>
      <button onclick="clearDirections()" class="clear-route-btn">Clear Route</button>
    `;
    
    // Ensure the route info is visible
    routeInfo.style.display = 'block';
  }
}

// Save current route
async function saveCurrentRoute() {
  if (!currentRoute) {
    alert('No route to save');
    return;
  }

  const routeName = prompt('Enter a name for this route:');
  if (!routeName) return;

  const route = currentRoute.routes[0];
  const leg = route.legs[0];
  
  // Use extracted location names for better display
  const fromName = extractLocationName(leg.start_address);
  const toName = extractLocationName(leg.end_address);
  
  const routeData = {
    name: routeName,
    origin: {
      name: fromName, // Use extracted name instead of full address
      lat: leg.start_location.lat(),
      lng: leg.start_location.lng()
    },
    destination: {
      name: toName, // Use extracted name instead of full address
      lat: leg.end_location.lat(),
      lng: leg.end_location.lng()
    },
    travelMode: document.getElementById('travelMode')?.value || 'DRIVING',
    distance: leg.distance.text,
    duration: leg.duration.text,
    polyline: route.overview_polyline
  };

  try {
    const response = await saveRoute(routeData);
    showNotification('Route saved successfully!');
    loadSavedRoutes();
  } catch (error) {
    console.error('Error saving route:', error);
    alert('Failed to save route. Please try again.');
  }
}

// Clear directions
function clearDirections() {
  // Reset current route first to prevent re-triggering
  currentRoute = null;
  
  // Clear and completely hide route info section (including clear button) BEFORE clearing directions
  const routeInfo = document.getElementById('routeInfo');
  if (routeInfo) {
    routeInfo.innerHTML = '';
    routeInfo.style.display = 'none';
  }
  
  // Clear the directions renderer more safely
  if (directionsRenderer) {
    try {
      // Clear the panel first
      directionsRenderer.setPanel(null);
      // Clear directions
      directionsRenderer.setDirections({routes: []});
      // Reset the panel
      directionsRenderer.setPanel(document.getElementById('directionsPanel'));
    } catch (error) {
      console.log('Error clearing directions renderer:', error);
      // If there's an error, try recreating the renderer
      directionsRenderer.setMap(null);
      directionsRenderer = new google.maps.DirectionsRenderer({
        draggable: true,
        panel: document.getElementById('directionsPanel')
      });
      directionsRenderer.setMap(map);
      
      // Re-add the event listener
      directionsRenderer.addListener('directions_changed', () => {
        const directions = directionsRenderer.getDirections();
        currentRoute = directions;
        
        // Only display route info if we have actual routes (not when clearing)
        if (directions.routes && directions.routes.length > 0) {
          displayRouteInfo(directions);
        }
      });
    }
  }
  
  // Clear directions panel content
  const directionsPanel = document.getElementById('directionsPanel');
  if (directionsPanel) {
    directionsPanel.innerHTML = '';
  }
  
  // Clear route points and inputs
  clearRoutePoints();
  
  // Clear any route markers
  clearMarkers();
  
  // Reset travel mode to default
  const travelModeSelect = document.getElementById('travelMode');
  if (travelModeSelect) {
    travelModeSelect.value = 'DRIVING';
  }
  
  // Reset calculate button
  updateCalculateButton();
  
  // Reset placeholder text in search inputs
  const startInput = document.getElementById('startPoint');
  const endInput = document.getElementById('endPoint');
  if (startInput) {
    startInput.value = '';
    startInput.placeholder = 'Enter starting location...';
  }
  if (endInput) {
    endInput.value = '';
    endInput.placeholder = 'Enter destination...';
  }
  
  showNotification("Route and summary cleared successfully");
}

// Show/hide directions panel
function showDirectionsPanel() {
  const panel = document.getElementById('directionsContainer');
  if (panel) {
    panel.style.display = 'block';
  }
}

function hideDirectionsPanel() {
  const panel = document.getElementById('directionsContainer');
  if (panel) {
    panel.style.display = 'none';
  }
  
  // Also uncheck directions mode and hide route points when panel is closed
  const directionsMode = document.getElementById('directionsMode');
  const routePoints = document.getElementById('routePoints');
  const locationNav = document.getElementById('locationNav');
  
  if (directionsMode) {
    directionsMode.checked = false;
  }
  if (routePoints) {
    routePoints.style.display = 'none';
  }
  if (locationNav) {
    locationNav.classList.remove('directions-active');
  }
  
  // Clear any route points and route
  clearRoutePoints();
}

// Load saved routes
async function loadSavedRoutes() {
  try {
    const routes = await fetchSavedRoutes();
    const routesList = document.getElementById('savedRoutesList');
    if (routesList) {
      if (routes.length === 0) {
        routesList.innerHTML = '<div class="no-routes">No saved routes found.</div>';
      } else {
        routesList.innerHTML = `
          <h4 style="padding: 20px 20px 10px 20px; margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">Saved Routes</h4>
          <div style="padding: 0 20px 20px 20px; flex: 1; overflow-y: auto;">
            ${routes.map(route => `
              <div class="saved-route-item" onclick="loadRoute(${route.id})">
                <h5>${route.route_name}</h5>
                <p>${route.origin_name} → ${route.destination_name}</p>
                <small>${route.distance_text} • ${route.duration_text}</small>
              </div>
            `).join('')}
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading saved routes:', error);
    const routesList = document.getElementById('savedRoutesList');
    if (routesList) {
      routesList.innerHTML = '<div class="error-message">Failed to load routes. Please try again.</div>';
    }
  }
}

// Load a specific route
async function loadRoute(routeId) {
  try {
    const response = await fetch(`${apiBaseUrl}/map/routes/${routeId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const route = await response.json();
    
    // Set travel mode
    const travelModeSelect = document.getElementById('travelMode');
    if (travelModeSelect) {
      travelModeSelect.value = route.travel_mode || 'DRIVING';
    }
    
    // Calculate route
    const origin = { lat: route.origin_lat, lng: route.origin_lng };
    const destination = { lat: route.destination_lat, lng: route.destination_lng };
    
    calculateRoute(origin, destination, route.travel_mode);
    showNotification(`Loaded route: ${route.route_name}`);
  } catch (error) {
    console.error('Error loading route:', error);
    alert('Failed to load route. Please try again.');
  }
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 1000;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    document.body.removeChild(notification);
  }, 3000);
}

// Enhanced marker function
function addMarker(location, title, color = 'red') {
  const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: title,
    icon: color !== 'red' ? `http://maps.google.com/mapfiles/ms/icons/${color}-dot.png` : undefined
  });
  markers.push(marker);
  return marker;
}

// ... (keep all your existing functions: UI functions, toggleSavedLocations, etc.)
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
  uiContainer.classList.add('panel-open');
  
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
  uiContainer.classList.remove('panel-open');
  
  clearSavedLocationMarkers();
}

function displayLocationsList(locations) {
  const locationsList = document.getElementById('locationsList');
  
  if (!locations || locations.length === 0) {
    locationsList.innerHTML = '<div class="no-locations">No saved locations found.</div>';
    return;
  }
  
  const locationsHTML = locations.map(location => `
    <div class="location-item">
      <div class="location-info" onclick="goToLocation(${location.latitude}, ${location.longitude}, '${location.location_name}')">
        <div class="location-name">${location.location_name}</div>
      </div>
      <div class="location-actions">
        <button onclick="setAsStartPoint(${location.latitude}, ${location.longitude}, '${location.location_name}')" class="action-btn start-btn">Start</button>
        <button onclick="setAsEndPoint(${location.latitude}, ${location.longitude}, '${location.location_name}')" class="action-btn end-btn">End</button>
      </div>
    </div>
  `).join('');
  
  locationsList.innerHTML = locationsHTML;
}

function displayLocationsOnMap(locations) {
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
      
      setTimeout(() => {
        tempMarker.setAnimation(google.maps.Animation.BOUNCE);
      }, 100);
      
      setTimeout(() => {
        tempMarker.setAnimation(null);
      }, 2100);
      
      setTimeout(() => {
        tempMarker.setMap(null);
      }, 5000);
    }, 1200);
  }
}

function clearMarkers() {
  markers.forEach(marker => marker.setMap(null));
  markers = [];
}

function locateMe(){
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const userLocation = {
            lat: parseFloat(pos.coords.latitude.toFixed(4)),
            lng: parseFloat(pos.coords.longitude.toFixed(4)),
          };

          if (map) {
            map.panTo(userLocation);
            clearMarkers();
            
            setTimeout(() => {
              map.setZoom(18);
            }, 800);
            
            setTimeout(async () => {
              // Get address from coordinates using reverse geocoding
              let locationName = "You are here!";
              let fullAddress = "";
              
              try {
                const geocoder = new google.maps.Geocoder();
                const result = await new Promise((resolve, reject) => {
                  geocoder.geocode(
                    { location: { lat: userLocation.lat, lng: userLocation.lng } },
                    (results, status) => {
                      if (status === 'OK' && results[0]) {
                        resolve(results[0]);
                      } else {
                        reject(new Error('Geocoding failed'));
                      }
                    }
                  );
                });
                
                // Extract a meaningful location name from the result
                locationName = extractLocationName(result.formatted_address) || result.formatted_address || "Your Current Location";
                fullAddress = result.formatted_address;
              } catch (error) {
                console.log('Reverse geocoding failed:', error);
                locationName = `Your Location (${userLocation.lat}, ${userLocation.lng})`;
                fullAddress = locationName;
              }
              
              const userMarker = new google.maps.Marker({
                position: userLocation,
                map: map,
                title: locationName
              });
              
              markers.push(userMarker);
              
              // Update the search input with the location address
              const searchInput = document.getElementById("search");
              if (searchInput) {
                searchInput.value = fullAddress;
              }
              
              // Show notification with the location name
              showNotification(`Located: ${locationName}`);
              
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
        
        // Add click listener to the marker for route setting
        searchMarker.addListener('click', () => {
          showLocationActionDialog(location, place.name || "Selected Location");
        });
        
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

// Show action dialog for searched location
function showLocationActionDialog(location, name) {
  const actions = [
    { text: 'Set as Start', action: () => setAsStartPoint(location.lat, location.lng, name) },
    { text: 'Set as End', action: () => setAsEndPoint(location.lat, location.lng, name) },
    { text: 'Just View', action: () => {} }
  ];
  
  const actionText = actions.map((action, index) => 
    `${index + 1}. ${action.text}`
  ).join('\n');
  
  const choice = prompt(`What would you like to do with "${name}"?\n\n${actionText}\n\nEnter choice (1-3):`);
  
  if (choice >= 1 && choice <= 3) {
    actions[choice - 1].action();
  }
}

// Start the application when the page loads
document.addEventListener('DOMContentLoaded', initializeApp);