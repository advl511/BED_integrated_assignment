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
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        map.setCenter(userLocation);
        map.setZoom(16);
        clearMarkers();
        addMarker(userLocation, "You are here!");
        return userLocation
      },
      () => alert("Geolocation failed or was denied.")
    );
  } else {
    alert("Geolocation is not supported.");
  }
}

initMap()