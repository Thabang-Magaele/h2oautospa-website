async function initMap() {
    const location = { lat: -25.3250826, lng: 31.0197776 }; // White River
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 17,
        center: location,
    });
    new google.maps.Marker({
        position: location,
        map: map,
    });
}

async function loadGoogleMaps() {
    try {
        // Fetch the API key securely from PHP
        const response = await fetch('get-key.php');
        const data = await response.json();
        const apiKey = data.key;

        // Dynamically inject the Google Maps script
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    } catch (error) {
        console.error("Error loading Google Maps API:", error);
    }
}

// Don’t load Maps until the user actually needs it
document.addEventListener("DOMContentLoaded", () => {
  const mapSection = document.getElementById("map");

  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      loadGoogleMaps();
      observer.disconnect(); // only load once
    }
  });

  observer.observe(mapSection);
});
