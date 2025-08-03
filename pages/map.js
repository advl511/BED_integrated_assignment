let map;
let markers = [];
let savedLocations = [];
let savedLocationMarkers = [];
let directionsService;
let directionsRenderer;
let currentRoute = null;

// Detect if running from file system or server
const isFileSystem = window.location.protocol === 'file:';
const apiBaseUrl = "http://localhost:3000";

// User management - will be populated from authentication
let currentUser = null;
let isAuthenticated = false;

// Check authentication status on load
async function checkAuthentication() {
  try {
    console.log('Checking authentication...');
    console.log('Making request to:', `${apiBaseUrl}/auth/me`);
    
    // Prepare headers for the request
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Check if we have a token in localStorage (for Live Server)
    const localToken = localStorage.getItem('auth_token');
    if (localToken) {
      headers['Authorization'] = `Bearer ${localToken}`;
      console.log('Using token from localStorage for authentication');
    }
    
    const response = await fetch(`${apiBaseUrl}/auth/me`, {
      credentials: 'include',
      method: 'GET',
      headers: headers
    });
    
    console.log('Auth response status:', response.status);
    console.log('Auth response headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      isAuthenticated = true;
      console.log('Authenticated user:', currentUser);
      updateUserInterface();
      return true;
    } else {
      const errorData = await response.text();
      console.log('Authentication failed:', response.status, errorData);
      // Not authenticated, allow guest access
      console.log('User not authenticated, allowing guest access');
      currentUser = { user_id: null, username: "Guest User" };
      isAuthenticated = false;
      updateUserInterface();
      return false;
    }
  } catch (error) {
    console.error('Authentication check failed:', error);
    // Allow guest access
    console.log('Authentication failed, allowing guest access');
    currentUser = { user_id: null, username: "Guest User" };
    isAuthenticated = false;
    updateUserInterface();
    return false;
  }
}

// Update UI based on authentication status
function updateUserInterface() {
  // Add user info to the map interface
  const userInfo = document.createElement('div');
  userInfo.id = 'userInfo';
  userInfo.style.cssText = `
    position: fixed;
    top: 20px;
    left: 580px;
    background: rgba(255, 255, 255, 0.9);
    padding: 0;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 1000;
    font-size: 14px;
    border: 1px solid #ddd;
  `;
  
  // Create header area
  const headerArea = document.createElement('div');
  headerArea.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 8px 10px;
    border-radius: 5px 5px 0 0;
    font-weight: bold;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  `;
  
  // Create content area
  const contentArea = document.createElement('div');
  contentArea.style.cssText = `
    padding: 10px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 0 0 5px 5px;
  `;
  
  if (isAuthenticated) {
    headerArea.innerHTML = `
      <span>User: ${currentUser.username}</span>
    `;
    contentArea.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="goToHomepage()" style="padding: 6px 12px; font-size: 12px; border: 1px solid #10b981; background: #10b981; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">Home</button>
        <button onclick="goToHomepage()" style="padding: 6px 12px; font-size: 12px; border: 1px solid #3b82f6; background: #3b82f6; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">Back to Home</button>
      </div>
    `;
  } else {
    headerArea.innerHTML = `
      <span>Guest Mode</span>
    `;
    contentArea.innerHTML = `
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button onclick="goToHomepage()" style="padding: 6px 12px; font-size: 12px; border: 1px solid #10b981; background: #10b981; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">Home</button>
        <button onclick="goToLogin()" style="padding: 6px 12px; font-size: 12px; border: 1px solid #667eea; background: #667eea; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">Login</button>
        <button onclick="goToRegister()" style="padding: 6px 12px; font-size: 12px; border: 1px solid #f59e0b; background: #f59e0b; color: white; border-radius: 4px; cursor: pointer; font-weight: 500;">Register</button>
      </div>
    `;
  }
  
  userInfo.appendChild(headerArea);
  userInfo.appendChild(contentArea);
  
  // Remove existing user info if present
  const existing = document.getElementById('userInfo');
  if (existing) {
    existing.remove();
  }
  
  document.body.appendChild(userInfo);
}

// Make element draggable
function makeDraggable(element, handle) {
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;
  let xOffset = 0;
  let yOffset = 0;

  handle.addEventListener('mousedown', dragStart);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', dragEnd);

  // Touch events for mobile
  handle.addEventListener('touchstart', dragStart);
  document.addEventListener('touchmove', drag);
  document.addEventListener('touchend', dragEnd);

  function dragStart(e) {
    if (e.type === "touchstart") {
      initialX = e.touches[0].clientX - xOffset;
      initialY = e.touches[0].clientY - yOffset;
    } else {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
    }

    if (e.target === handle || handle.contains(e.target)) {
      isDragging = true;
      element.style.transition = 'none';
    }
  }

  function drag(e) {
    if (isDragging) {
      e.preventDefault();
      
      if (e.type === "touchmove") {
        currentX = e.touches[0].clientX - initialX;
        currentY = e.touches[0].clientY - initialY;
      } else {
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
      }

      xOffset = currentX;
      yOffset = currentY;

      // Constrain to viewport
      const rect = element.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;
      
      xOffset = Math.max(0, Math.min(maxX, xOffset));
      yOffset = Math.max(0, Math.min(maxY, yOffset));

      setTranslate(xOffset, yOffset, element);
    }
  }

  function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
    element.style.transition = 'all 0.2s ease';
  }

  function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
  }
}

// Navigation functions
function goToHomepage() {
  window.location.href = 'home.html';
}

function goToProfile() {
  window.location.href = 'profile.html';
}

function goToLogin() {
  window.location.href = 'signin.html';
}

function goToRegister() {
  window.location.href = 'signup.html';
}

async function logout() {
  try {
    // Prepare headers for the request
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Check if we have a token in localStorage (for Live Server)
    const localToken = localStorage.getItem('auth_token');
    if (localToken) {
      headers['Authorization'] = `Bearer ${localToken}`;
    }
    
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: headers
    });
    
    // Clear localStorage data (for Live Server)
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    console.log('Cleared localStorage data');
    
    window.location.href = 'home.html';
  } catch (error) {
    console.error('Logout failed:', error);
    
    // Clear localStorage even if logout request fails
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
    console.log('Cleared localStorage data after error');
    
    window.location.href = 'home.html';
  }
}

// Show connection status
if (isFileSystem) {
  console.log('Running from file system - connecting to backend at', apiBaseUrl);
} else {
  console.log('Running from server at', window.location.origin);
}

// Transport modes
const TRANSPORT_MODES = {
  DRIVING: 'DRIVING',
  WALKING: 'WALKING',
  BICYCLING: 'BICYCLING',
  TRANSIT: 'TRANSIT'
};

// API Functions
async function fetchSavedLocations(userId = null) {
  try {
    let url = `${apiBaseUrl}/locations`;
    if (userId) {
      url = `${apiBaseUrl}/locations/${userId}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    
    // Handle both old and new response formats
    const locations = result.data || result;
    savedLocations = locations;
    return locations;
  } catch (error) {
    console.error('Error fetching saved locations:', error);
    throw error;
  }
}

async function saveLocation(locationData) {
  try {
    // Add user_id if not present (for demo purposes, using user_id = 1)
    if (!locationData.user_id) {
      locationData.user_id = currentUser ? currentUser.user_id : 1;
    }
    
    const response = await fetch(`${apiBaseUrl}/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving location:', error);
    throw error;
  }
}

// Route functionality - now implemented!
async function saveRoute(routeData) {
  try {
    // Add user_id if not present (for demo purposes, using user_id = 1)
    if (!routeData.user_id) {
      routeData.user_id = currentUser ? currentUser.user_id : 1;
    }
    
    const response = await fetch(`${apiBaseUrl}/routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(routeData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving route:', error);
    throw error;
  }
}

async function fetchSavedRoutes(userId = null) {
  try {
    let url = `${apiBaseUrl}/routes`;
    if (userId) {
      url = `${apiBaseUrl}/routes/${userId}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    
    // Handle response format
    return result.data || result;
  } catch (error) {
    console.error('Error fetching routes:', error);
    return [];
  }
}

async function deleteLocation(locationId, userId = null) {
  try {
    const user = userId || (currentUser ? currentUser.user_id : 1);
    const response = await fetch(`${apiBaseUrl}/locations/${user}/${locationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
}

async function updateLocation(locationId, locationData, userId = null) {
  try {
    const user = userId || (currentUser ? currentUser.user_id : 1);
    const response = await fetch(`${apiBaseUrl}/locations/${user}/${locationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(locationData)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating location:', error);
    throw error;
  }
}

async function deleteRoute(routeId, userId = null) {
  try {
    const user = userId || (currentUser ? currentUser.user_id : 1);
    const response = await fetch(`${apiBaseUrl}/routes/${user}/${routeId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting route:', error);
    throw error;
  }
}

async function updateRoute(routeId, newName, userId = null) {
  try {
    const user = userId || (currentUser ? currentUser.user_id : 1);
    const response = await fetch(`${apiBaseUrl}/routes/${user}/${routeId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating route:', error);
    throw error;
  }
}

// Initialize the map application
async function initializeApp() {
  try {
    // Check authentication first
    console.log('Checking user authentication...');
    await checkAuthentication();
    
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
  
  // Show helpful tip about saving locations
  setTimeout(() => {
    showNotification('Tip: Double-click anywhere on the map to save that location!', 'info');
  }, 3000);
}

// Initialize transport controls
function initializeTransportControls() {
  // Add click listener for directions
  map.addListener('click', (event) => {
    if (document.getElementById('directionsMode') && document.getElementById('directionsMode').checked) {
      handleDirectionsClick(event.latLng);
    }
  });

  // Add double-click listener for saving locations
  console.log('Adding double-click listener to map'); // Debug log
  map.addListener('dblclick', (event) => {
    console.log('Double-click detected on map:', event); // Debug log
    
    if (event.latLng) {
      console.log('Opening save location modal for:', event.latLng.lat(), event.latLng.lng());
      showSaveLocationPrompt(event.latLng);
    } else {
      console.error('No latLng available in double-click event');
    }
  });

  // Remove the old contextmenu fallback since we're using double-click now

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

// Show save location prompt
function showSaveLocationPrompt(latLng) {
  // Check if user is authenticated (not a guest)
  if (!isAuthenticated || (currentUser && currentUser.username === "Guest User")) {
    showGuestSavePrompt();
    return;
  }
  
  openSaveLocationModal(latLng);
}

// Variables to store current location data
let currentSaveLocation = null;

// Open save location modal
async function openSaveLocationModal(latLng) {
  currentSaveLocation = {
    lat: latLng.lat(),
    lng: latLng.lng()
  };
  
  const modal = document.getElementById('saveLocationModal');
  const addressElement = document.getElementById('saveModalAddress');
  const nameInput = document.getElementById('locationNameInput');
  
  // Show modal
  modal.style.display = 'flex';
  
  // Clear and focus input after a brief delay to ensure modal is rendered
  nameInput.value = '';
  updateCharacterCounters();
  
  setTimeout(() => {
    nameInput.focus();
  }, 100);
  
  // Try to get address using reverse geocoding
  try {
    addressElement.textContent = 'Finding address...';
    const geocoder = new google.maps.Geocoder();
    const result = await new Promise((resolve, reject) => {
      geocoder.geocode(
        { location: { lat: currentSaveLocation.lat, lng: currentSaveLocation.lng } },
        (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error('Address not found'));
          }
        }
      );
    });
    
    addressElement.textContent = result.formatted_address;
    
    // Display a more focused version of the address
    const focusedAddress = extractFocusedAddress(result.formatted_address);
    addressElement.textContent = focusedAddress;
    
    // Auto-suggest a name based on the address
    const suggestedName = extractLocationName(result.formatted_address);
    if (suggestedName && suggestedName !== 'Unknown Location') {
      nameInput.placeholder = `e.g., ${suggestedName}`;
    }
    
  } catch (error) {
    console.log('Could not get address:', error);
    addressElement.textContent = 'Address not available';
  }
}

// Close save location modal
function closeSaveLocationModal() {
  const modal = document.getElementById('saveLocationModal');
  modal.style.display = 'none';
  currentSaveLocation = null;
  
  // Reset form
  document.getElementById('saveLocationForm').reset();
  updateCharacterCounters();
}

// Handle save location form submission
async function handleSaveLocationSubmit(event) {
  event.preventDefault();
  
  if (!currentSaveLocation) {
    showNotification('Error: No location selected', 'error');
    return;
  }
  
  const nameInput = document.getElementById('locationNameInput');
  const saveBtn = document.getElementById('saveLocationBtn');
  
  const locationName = nameInput.value.trim();
  
  if (!locationName) {
    showNotification('Please enter a name for this location', 'error');
    nameInput.focus();
    return;
  }
  
  // Disable save button and show loading
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<span class="btn-icon">Loading</span> Saving...';
  
  try {
    const locationData = {
      name: locationName,
      latitude: currentSaveLocation.lat,
      longitude: currentSaveLocation.lng,
      user_id: currentUser ? currentUser.user_id : 1
    };
    
    await saveLocationToDatabase(locationData);
    closeSaveLocationModal();
    
  } catch (error) {
    console.error('Error saving location:', error);
    showNotification('Failed to save location. Please try again.', 'error');
  } finally {
    // Reset save button
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span class="btn-icon">Save</span> Save Location';
  }
}

// Update character counters
function updateCharacterCounters() {
  const nameInput = document.getElementById('locationNameInput');
  const nameCounter = document.getElementById('nameCounter');
  
  if (nameInput && nameCounter) {
    const currentLength = nameInput.value.length;
    nameCounter.textContent = currentLength;
    
    // Add visual feedback for character limit
    if (currentLength > 40) {
      nameCounter.style.color = '#f59e0b'; // Warning color
    } else if (currentLength > 45) {
      nameCounter.style.color = '#ef4444'; // Danger color
    } else {
      nameCounter.style.color = '#64748b'; // Default color
    }
  }
}

// Initialize character counter event listeners
document.addEventListener('DOMContentLoaded', () => {
  const nameInput = document.getElementById('locationNameInput');
  
  if (nameInput) {
    nameInput.addEventListener('input', updateCharacterCounters);
  }
  
  // Close modal when clicking outside
  const modal = document.getElementById('saveLocationModal');
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeSaveLocationModal();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const modal = document.getElementById('saveLocationModal');
      if (modal && modal.style.display === 'flex') {
        closeSaveLocationModal();
      }
    }
  });
});

// Save current location function
async function saveCurrentLocation() {
  // Check if user is authenticated (not a guest)
  if (!isAuthenticated || (currentUser && currentUser.username === "Guest User")) {
    showGuestSavePrompt();
    return;
  }
  
  try {
    showNotification('Getting your current location...', 'info');
    
    const userLocation = await locateMe();
    const latLng = {
      lat: () => userLocation.lat,
      lng: () => userLocation.lng
    };
    
    showSaveLocationPrompt(latLng);
    
  } catch (error) {
    console.error('Error getting current location:', error);
    showNotification('Could not get your current location. Please try again or click on the map.', 'error');
  }
}

// Save location to database
async function saveLocationToDatabase(locationData) {
  try {
    console.log('Saving location:', locationData);
    const result = await saveLocation(locationData);
    console.log('Location saved successfully:', result);
    
    showNotification(`Location "${locationData.name}" saved successfully!`);
    
    // Refresh saved locations if panel is open
    const panel = document.getElementById('savedLocationsPanel');
    if (panel.classList.contains('active')) {
      openSavedLocations();
    }
  } catch (error) {
    console.error('Error saving location:', error);
    showNotification(`Error saving location: ${error.message}`, 'error');
  }
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

// Extract a more focused version of the address for display
function extractFocusedAddress(address) {
  if (!address) return 'Location not available';
  
  // Singapore address patterns - focus on key identifying information
  const parts = address.split(',');
  
  if (parts.length >= 2) {
    const streetInfo = parts[0].trim();
    const areaInfo = parts[1].trim();
    
    // For Singapore addresses, typically show street + area
    // Example: "38 Soo Chow Vw, Singapore 575430" -> "38 Soo Chow Vw, Singapore"
    if (areaInfo.match(/Singapore\s+\d+/)) {
      return `${streetInfo}, Singapore`;
    }
    
    // For addresses with postal codes, remove the postal code
    // Example: "Marina Bay Sands, 10 Bayfront Ave, Singapore 018956" -> "Marina Bay Sands, 10 Bayfront Ave"
    const withoutPostal = parts.slice(0, -1).join(', ').replace(/,\s*Singapore\s*$/, '');
    
    // Limit length for better display
    if (withoutPostal.length > 50) {
      const shortForm = parts.slice(0, 2).join(', ');
      return shortForm.length > 50 ? parts[0] : shortForm;
    }
    
    return withoutPostal || streetInfo;
  }
  
  // Fallback: return first part or truncated address
  const firstPart = parts[0].trim();
  return firstPart.length > 50 ? firstPart.substring(0, 47) + '...' : firstPart;
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
  // Check if user is authenticated (not a guest)
  if (!isAuthenticated || (currentUser && currentUser.username === "Guest User")) {
    showGuestSavePrompt();
    return;
  }
  
  if (!currentRoute) {
    alert('No route to save');
    return;
  }

  const routeName = prompt('Enter a name for this route:');
  if (!routeName) return;

  const route = currentRoute.routes[0];
  const leg = route.legs[0];
  
  const routeData = {
    name: routeName,
    start_lat: leg.start_location.lat(),
    start_lng: leg.start_location.lng(),
    end_lat: leg.end_location.lat(),
    end_lng: leg.end_location.lng(),
    user_id: currentUser ? currentUser.user_id : 1
  };

  try {
    showNotification('Saving route...', 'info');
    const response = await saveRoute(routeData);
    
    if (response.success) {
      showNotification('Route saved successfully!', 'success');
      loadSavedRoutes();
    } else {
      showNotification('Failed to save route', 'error');
    }
  } catch (error) {
    console.error('Error saving route:', error);
    showNotification('Failed to save route. Please try again.', 'error');
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
    const routes = await fetchSavedRoutes(currentUser ? currentUser.user_id : 1);
    const routesList = document.getElementById('savedRoutesList');
    if (routesList) {
      if (routes.length === 0) {
        routesList.innerHTML = '<div class="no-routes">No saved routes found.</div>';
      } else {
        routesList.innerHTML = `
          <h4 style="padding: 20px 20px 10px 20px; margin: 0; color: #1e293b; font-size: 16px; font-weight: 600;">Saved Routes</h4>
          <div style="padding: 0 20px 20px 20px; flex: 1; overflow-y: auto;">
            ${routes.map(route => `
              <div class="saved-route-item">
                <div class="route-info" onclick="loadRoute(${route.route_id}, ${route.start_lat}, ${route.start_lng}, ${route.end_lat}, ${route.end_lng})">
                  <h5>${route.route_name}</h5>
                  <p>Start: ${route.start_lat.toFixed(4)}, ${route.start_lng.toFixed(4)}</p>
                  <p>End: ${route.end_lat.toFixed(4)}, ${route.end_lng.toFixed(4)}</p>
                  <small>Saved: ${new Date(route.created_at).toLocaleDateString()}</small>
                </div>
                <div class="route-actions">
                  <button onclick="editRouteName(${route.route_id}, '${route.route_name}')" class="action-btn edit-btn" title="Edit route name">Edit</button>
                  <button onclick="confirmDeleteRoute(${route.route_id}, '${route.route_name}')" class="action-btn delete-btn" title="Delete route">Delete</button>
                </div>
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
async function loadRoute(routeId, startLat, startLng, endLat, endLng) {
  try {
    // Set travel mode to driving by default
    const travelModeSelect = document.getElementById('travelMode');
    if (travelModeSelect) {
      travelModeSelect.value = 'DRIVING';
    }
    
    // Calculate and display the route
    const request = {
      origin: { lat: startLat, lng: startLng },
      destination: { lat: endLat, lng: endLng },
      travelMode: google.maps.TravelMode.DRIVING
    };
    
    directionsService.route(request, (result, status) => {
      if (status === 'OK') {
        directionsRenderer.setDirections(result);
        currentRoute = result;
        displayRouteInfo(result);
        showDirectionsPanel();
      } else {
        console.error('Directions request failed due to ' + status);
        showNotification('Failed to load route directions', 'error');
      }
    });
    
  } catch (error) {
    console.error('Error loading route:', error);
    showNotification('Failed to load route. Please try again.', 'error');
  }
}

// Route management functions
async function editRouteName(routeId, currentName) {
  const newName = prompt('Enter new route name:', currentName);
  if (!newName || newName === currentName) return;
  
  try {
    showNotification('Updating route name...', 'info');
    const result = await updateRoute(routeId, newName, currentUser ? currentUser.user_id : 1);
    
    if (result.success) {
      showNotification('Route name updated successfully!', 'success');
      loadSavedRoutes();
    } else {
      showNotification('Failed to update route name', 'error');
    }
  } catch (error) {
    console.error('Error updating route name:', error);
    showNotification('Error updating route name. Please try again.', 'error');
  }
}

async function confirmDeleteRoute(routeId, routeName) {
  if (confirm(`Are you sure you want to delete the route "${routeName}"?`)) {
    await deleteRouteFromDatabase(routeId);
  }
}

async function deleteRouteFromDatabase(routeId) {
  try {
    showNotification('Deleting route...', 'info');
    
    const result = await deleteRoute(routeId, currentUser ? currentUser.user_id : 1);
    
    if (result.success) {
      showNotification('Route deleted successfully!', 'success');
      loadSavedRoutes();
    } else {
      showNotification('Failed to delete route', 'error');
    }
  } catch (error) {
    console.error('Error deleting route:', error);
    showNotification('Error deleting route. Please try again.', 'error');
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Color scheme based on type
  let backgroundColor = '#4CAF50'; // success (default)
  if (type === 'error') backgroundColor = '#f44336';
  if (type === 'info') backgroundColor = '#2196F3';
  if (type === 'warning') backgroundColor = '#ff9800';
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${backgroundColor};
    color: white;
    padding: 12px 20px;
    border-radius: 4px;
    z-index: 1000;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    font-size: 14px;
    max-width: 300px;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  }, 3000);
}

// Show guest save prompt
function showGuestSavePrompt() {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
  `;
  
  const content = document.createElement('div');
  content.style.cssText = `
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    max-width: 400px;
    width: 90%;
    text-align: center;
    font-family: 'Inter', sans-serif;
  `;
  
  content.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">Lock</div>
    <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 24px; font-weight: 600;">Save Your Locations</h2>
    <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 16px; line-height: 1.5;">
      To save locations and routes, you need to create an account. Join our community to keep track of your favorite places!
    </p>
    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      <button onclick="window.location.href='signup.html'" style="
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 44px;
      " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
        Create Account
      </button>
      <button onclick="window.location.href='signin.html'" style="
        background: transparent;
        color: #3b82f6;
        border: 2px solid #3b82f6;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        min-height: 44px;
      " onmouseover="this.style.background='#f3f4f6'" onmouseout="this.style.background='transparent'">
        Sign In
      </button>
    </div>
    <button onclick="this.closest('.guest-prompt-modal').remove()" style="
      background: transparent;
      color: #9ca3af;
      border: none;
      padding: 8px;
      margin-top: 16px;
      font-size: 14px;
      cursor: pointer;
      transition: color 0.2s ease;
    " onmouseover="this.style.color='#6b7280'" onmouseout="this.style.color='#9ca3af'">
      Continue as Guest
    </button>
  `;
  
  modal.className = 'guest-prompt-modal';
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Close modal when clicking outside
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
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
  
  // Clear search filter
  const filterInput = document.getElementById('locationFilter');
  if (filterInput) {
    filterInput.value = '';
  }
  
  locationsList.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Loading your saved places...</p>
    </div>
  `;
  
  try {
    const locations = await fetchSavedLocations(currentUser ? currentUser.user_id : 1);
    displayLocationsList(locations);
    displayLocationsOnMap(locations);
  } catch (error) {
    console.error('Error loading saved locations:', error);
    locationsList.innerHTML = `
      <div class="error-message">
        <strong>Oops! Something went wrong</strong><br>
        Failed to load your saved locations. Please check your connection and try again.
      </div>
    `;
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

// Delete location functionality
async function confirmDeleteLocation(locationId, locationName) {
  if (confirm(`Are you sure you want to delete "${locationName}"?`)) {
    await deleteLocationFromDatabase(locationId);
  }
}

async function deleteLocationFromDatabase(locationId) {
  try {
    showNotification('Deleting location...', 'info');
    
    const result = await deleteLocation(locationId, currentUser ? currentUser.user_id : 1);
    
    if (result.success) {
      showNotification('Location deleted successfully!', 'success');
      // Refresh the locations list
      await openSavedLocations();
    } else {
      showNotification('Failed to delete location', 'error');
    }
  } catch (error) {
    console.error('Error deleting location:', error);
    showNotification('Error deleting location. Please try again.', 'error');
  }
}

function displayLocationsList(locations) {
  const locationsList = document.getElementById('locationsList');
  
  if (!locations || locations.length === 0) {
    locationsList.innerHTML = `
      <div class="no-locations">
        <h4 style="margin: 0 0 8px 0; color: #374151;">No saved places yet</h4>
        <p style="margin: 0; font-size: 13px;">Start exploring and save your favorite locations!</p>
      </div>
    `;
    return;
  }
  
  const locationsHTML = locations.map(location => {
    const createdDate = new Date(location.created_at);
    const formattedDate = createdDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: createdDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
    
    return `
      <div class="location-item" role="listitem" data-location-name="${location.location_name.toLowerCase()}">
        <div class="location-info" onclick="goToLocation(${location.latitude}, ${location.longitude}, '${location.location_name.replace(/'/g, "\\'")}')" 
             role="button" tabindex="0" aria-label="Go to ${location.location_name}">
          <div class="location-name">${location.location_name}</div>
          <div class="location-coords">${parseFloat(location.latitude).toFixed(4)}°, ${parseFloat(location.longitude).toFixed(4)}°</div>
          <div class="location-date">Saved ${formattedDate}</div>
        </div>
        <div class="location-actions">
          <button onclick="setAsStartPoint(${location.latitude}, ${location.longitude}, '${location.location_name.replace(/'/g, "\\'")}')" 
                  class="action-btn start-btn" 
                  title="Set as starting point for directions"
                  aria-label="Use ${location.location_name} as starting point">Start</button>
          <button onclick="setAsEndPoint(${location.latitude}, ${location.longitude}, '${location.location_name.replace(/'/g, "\\'")}')" 
                  class="action-btn end-btn" 
                  title="Set as destination for directions"
                  aria-label="Use ${location.location_name} as destination">End</button>
          <button onclick="confirmDeleteLocation(${location.location_id}, '${location.location_name.replace(/'/g, "\\'")}')" 
                  class="action-btn delete-btn" 
                  title="Delete this saved location"
                  aria-label="Delete ${location.location_name}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  locationsList.innerHTML = locationsHTML;
  
  // Initialize search functionality
  initializeLocationFilter();
  
  // Add keyboard support for location items
  const locationInfoElements = locationsList.querySelectorAll('.location-info[role="button"]');
  locationInfoElements.forEach(element => {
    element.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        element.click();
      }
    });
  });
}

// Initialize location search/filter functionality
function initializeLocationFilter() {
  const filterInput = document.getElementById('locationFilter');
  if (!filterInput) return;
  
  // Remove existing event listener
  filterInput.removeEventListener('input', handleLocationFilter);
  
  // Add new event listener
  filterInput.addEventListener('input', handleLocationFilter);
}

// Handle location filtering
function handleLocationFilter(event) {
  const searchTerm = event.target.value.toLowerCase().trim();
  const locationItems = document.querySelectorAll('.location-item');
  let visibleCount = 0;
  
  locationItems.forEach(item => {
    const locationName = item.getAttribute('data-location-name');
    const isVisible = locationName.includes(searchTerm);
    
    if (isVisible) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Show/hide "no results" message
  const locationsList = document.getElementById('locationsList');
  let noResultsMsg = locationsList.querySelector('.no-filter-results');
  
  if (visibleCount === 0 && searchTerm.length > 0) {
    if (!noResultsMsg) {
      noResultsMsg = document.createElement('div');
      noResultsMsg.className = 'no-filter-results';
      noResultsMsg.innerHTML = `
        <div style="text-align: center; padding: 30px 20px; color: #64748b;">
          <div style="font-size: 32px; margin-bottom: 12px;">Search</div>
          <h4 style="margin: 0 0 8px 0; color: #374151;">No locations found</h4>
          <p style="margin: 0; font-size: 13px;">Try searching with different keywords</p>
        </div>
      `;
      locationsList.appendChild(noResultsMsg);
    }
    noResultsMsg.style.display = 'block';
  } else if (noResultsMsg) {
    noResultsMsg.style.display = 'none';
  }
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