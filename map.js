let map;
let markers = [];

window.initMap = async () => {
  const userLocation = await locateMe();

  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 14,
    center: userLocation,
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl: false,
  });

  addMarker(userLocation, "You are here!");

  // ✅ Call this only AFTER map is created and google is loaded
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

function locateMe() {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLocation = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          resolve(userLocation);
        },
        () => {
          alert("Geolocation failed or was denied.");
          resolve({ lat: 1.3521, lng: 103.8198 }); // Default: Singapore
        }
      );
    } else {
      alert("Geolocation is not supported.");
      resolve({ lat: 1.3521, lng: 103.8198 });
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
      map.setCenter(location);
      map.setZoom(16);
      clearMarkers();
      addMarker(location, place.name || "Selected Location");
    } else {
      alert("No details available for input: '" + place.name + "'");
    }
  });
}
