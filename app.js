// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');
const loadingScreen = document.getElementById('loading-screen');
const mainContent = document.getElementById('main-content');
const weatherInfo = document.querySelector('.weather-info');
const settingsBtn = document.getElementById('settings-btn');
const modal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close-btn');
const themeToggle = document.getElementById('theme-toggle');
const tempUnitSelect = document.getElementById('temp-unit');
const mapContainer = document.getElementById('map');
const weatherIcon = document.getElementById('weather-icon');

let currentWeather;
let map;
let marker;
let precipitationLayer;
let temperatureLayer;
let cloudsLayer;

// Initialize settings
let settings = {
    temperatureUnit: 'metric',
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('weatherSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        tempUnitSelect.value = settings.temperatureUnit;
        updateTheme(settings.darkMode);
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('weatherSettings', JSON.stringify(settings));
}

// Update theme
function updateTheme(isDark) {
    document.body.classList.toggle('dark-mode', isDark);
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        const text = themeToggle.querySelector('span');
        if (isDark) {
            icon.className = 'fas fa-sun';
            text.textContent = 'Light Mode';
        } else {
            icon.className = 'fas fa-moon';
            text.textContent = 'Dark Mode';
        }
    }
}

// Theme toggle
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        settings.darkMode = !settings.darkMode;
        updateTheme(settings.darkMode);
        saveSettings();
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    updateTheme(settings.darkMode);
    
    // Show loading screen while getting location
    loadingScreen.classList.remove('hidden');
    mainContent.classList.add('hidden');
    weatherInfo.classList.add('hidden');
    
    // Try to get user's location immediately
    try {
        if (!navigator.geolocation) {
            throw new Error('Geolocation not supported');
        }

        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                maximumAge: 0,
                enableHighAccuracy: true
            });
        });
        
        const { latitude, longitude } = position.coords;
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Could not get location');
        }
        
        const [locationData] = await response.json();
        if (locationData) {
            searchInput.value = locationData.name;
            await getWeather(locationData.name);
        } else {
            throw new Error('Location not found');
        }
    } catch (error) {
        console.error('Error getting initial location:', error);
        loadingScreen.classList.add('hidden');
        showError('Please enter a city name to get the weather.');
    }
});

// Event Listeners
if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
        const city = searchInput.value.trim();
        if (city) {
            getWeather(city);
        }
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const city = searchInput.value.trim();
            if (city) {
                getWeather(city);
            }
        }
    });
}

if (locationBtn) {
    locationBtn.addEventListener('click', getUserLocation);
}

// Get weather data from API
async function getWeather(city) {
    try {
        // Show loading screen
        loadingScreen.classList.remove('hidden');
        mainContent.classList.add('hidden');
        weatherInfo.classList.add('hidden');
        
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=${settings.temperatureUnit}`
        );

        if (!response.ok) {
            throw new Error('City not found');
        }

        const data = await response.json();
        currentWeather = data;
        displayWeather(data);
    } catch (error) {
        console.error('Error:', error);
        loadingScreen.classList.add('hidden');
        mainContent.classList.add('hidden');
        weatherInfo.classList.add('hidden');
        showError(error.message === 'City not found' 
            ? 'City not found. Please check the spelling and try again.' 
            : 'Error getting weather data. Please try again.');
    }
}

// Display weather data
function displayWeather(data) {
    // Hide loading screen
    loadingScreen.classList.add('hidden');
    mainContent.classList.remove('hidden');
    weatherInfo.classList.remove('hidden');

    // Update weather information
    document.getElementById('city').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const temp = settings.temperatureUnit === 'imperial' 
        ? (data.main.temp * 9/5) + 32 
        : data.main.temp;
    const feelsLike = settings.temperatureUnit === 'imperial' 
        ? (data.main.feels_like * 9/5) + 32 
        : data.main.feels_like;
    const unit = settings.temperatureUnit === 'imperial' ? '°F' : '°C';

    // Set weather icon
    weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    weatherIcon.alt = data.weather[0].description;

    // Main weather info
    document.getElementById('temp').textContent = `${Math.round(temp)}${unit}`;
    document.getElementById('feels-like').textContent = `${Math.round(feelsLike)}${unit}`;
    document.getElementById('description').textContent = data.weather[0].description
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('wind-speed').textContent = `${Math.round(data.wind.speed)} m/s`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

    // Format and display sunrise/sunset times
    const formatTime = (timestamp) => {
        return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    document.getElementById('sunrise').textContent = formatTime(data.sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(data.sys.sunset);
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('clouds').textContent = `${data.clouds.all}%`;

    // Initialize/update map
    initMap(data.coord.lat, data.coord.lon);
}

// Initialize and update map
function initMap(lat, lon) {
    try {
        // Wait for the map container to be visible
        setTimeout(() => {
            if (!map) {
                map = L.map('map').setView([lat, lon], 10);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: ' OpenStreetMap contributors'
                }).addTo(map);
            } else {
                map.setView([lat, lon], 10);
                map.invalidateSize();
            }

            // Clear existing markers
            if (window.marker) {
                map.removeLayer(window.marker);
            }

            // Add new marker with popup
            window.marker = L.marker([lat, lon])
                .bindPopup(`<b>${currentWeather.name}</b><br>${currentWeather.weather[0].description}`)
                .addTo(map);
            
            // Force a resize to ensure proper display
            map.invalidateSize();
        }, 100); // Small delay to ensure container is visible
    } catch (error) {
        console.error('Error initializing map:', error);
    }
}

// Get user's location and weather
async function getUserLocation() {
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    timeout: 5000,
                    maximumAge: 0
                });
            });
            
            const { latitude, longitude } = position.coords;
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
            );
            
            if (!response.ok) {
                throw new Error('Could not get location');
            }
            
            const [locationData] = await response.json();
            
            if (locationData) {
                searchInput.value = locationData.name;
                await getWeather(locationData.name);
            } else {
                throw new Error('Location not found');
            }
        } catch (error) {
            console.error('Error getting location:', error);
            showError('Unable to get your location. Please try again.');
        }
    } else {
        showError('Geolocation not supported. Please enter a city name to get the weather.');
    }
}

// Show/hide loading state
function showLoading() {
    weatherInfo.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
}

function hideLoading() {
    loadingScreen.classList.add('hidden');
}

// Show error message
function showCustomError(message) {
    hideLoading();
    weatherInfo.classList.add('hidden');
    document.getElementById('error-message').classList.remove('hidden');
    document.getElementById('error-message').innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;
}

function showError(message) {
    showCustomError(message || 'Unable to fetch weather data. Please try again later');
}

// Initialize with empty state
window.addEventListener('load', () => {
    setTimeout(() => {
        if (loadingScreen) {
            loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }, 1500);
});

// Settings functionality
if (settingsBtn && modal && closeBtn) {
    settingsBtn.addEventListener('click', () => {
        modal.classList.add('show');
    });

    closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('show');
        }
    });
}

if (tempUnitSelect) {
    tempUnitSelect.addEventListener('change', () => {
        const selectedUnit = tempUnitSelect.value;
        settings.temperatureUnit = selectedUnit;
        saveSettings();
        if (currentWeather) {
            const temp = selectedUnit === 'imperial' 
                ? (currentWeather.main.temp * 9/5) + 32 
                : currentWeather.main.temp;
            const feelsLike = selectedUnit === 'imperial' 
                ? (currentWeather.main.feels_like * 9/5) + 32 
                : currentWeather.main.feels_like;
            const unit = selectedUnit === 'imperial' ? '°F' : '°C';
            document.getElementById('temp').textContent = `${Math.round(temp)}${unit}`;
            document.getElementById('feels-like').textContent = `${Math.round(feelsLike)}${unit}`;
        }
    });
}
