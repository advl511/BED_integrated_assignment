// config.js - Configuration and API loading
class MapConfig {
  constructor() {
    this.apiKey = null;
    this.isLoaded = false;
    this.loadPromise = null;
  }

  // Load API key from environment (in a real app, this would come from your backend)
  async loadApiKey() {
    // In a production environment, you'd fetch this from your backend API
    try {
      this.apiKey = await this.fetchApiKeyFromBackend();
      return this.apiKey;
    } catch (error) {
      console.error('Failed to load API key:', error);
      throw error;
    }
  }

  // Fetch API key from backend
  async fetchApiKeyFromBackend() {
    try {
      // Determine the correct API URL based on current environment
      const apiUrl = window.location.port === '5501' 
        ? 'http://localhost:3000/map/config'  // Live Server pointing to backend
        : '/map/config';  // Same server

      console.log('Fetching API key from:', apiUrl);
      
      // Make actual API call to your backend
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.googleMapsApiKey) {
        throw new Error('Google Maps API key not found in response');
      }
      
      return data.googleMapsApiKey;
    } catch (error) {
      console.error('Error fetching API key from backend:', error);
      
      // Fallback for development - you should remove this in production
      console.warn('Using fallback API key for development');
      return 'AIzaSyDEOJ5uSsWR77w5mxxATEI3BWZBngyTtx8';
    }
  }

  // Dynamically load Google Maps JavaScript API
  async loadGoogleMapsAPI() {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise(async (resolve, reject) => {
      try {
        // Load API key first
        await this.loadApiKey();

        // Create script element
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;

        // Handle script load
        script.onload = () => {
          this.isLoaded = true;
          console.log('Google Maps API loaded successfully');
          resolve();
        };

        script.onerror = (error) => {
          console.error('Failed to load Google Maps API:', error);
          reject(error);
        };

        // Add script to head
        document.head.appendChild(script);

      } catch (error) {
        reject(error);
      }
    });

    return this.loadPromise;
  }

  // Check if API is ready
  isGoogleMapsReady() {
    return this.isLoaded && window.google && window.google.maps;
  }
}

// Export singleton instance
window.mapConfig = new MapConfig();