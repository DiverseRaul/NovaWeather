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
const windUnitSelect = document.getElementById('wind-unit');
const timeFormatSelect = document.getElementById('time-format');
const animationToggle = document.getElementById('animation-toggle');
const mapContainer = document.getElementById('map');
const weatherIcon = document.getElementById('weather-icon');
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const forecastContainer = document.getElementById('forecast-scroll');
const weatherAlert = document.getElementById('weather-alert');

// Map layer buttons
const showTempLayerBtn = document.getElementById('show-temp-layer');
const showPrecipitationLayerBtn = document.getElementById('show-precipitation-layer');
const showWindLayerBtn = document.getElementById('show-wind-layer');
const showCloudsLayerBtn = document.getElementById('show-clouds-layer');

let currentWeather;
let forecastData;
let airQualityData;
let map;
let marker;
let precipitationLayer;
let temperatureLayer;
let cloudsLayer;
let windLayer;
let currentCity;
let currentCoords;

// Initialize settings
let settings = {
    temperatureUnit: 'metric',
    windUnit: 'ms',
    timeFormat: '12h',
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    animations: true
};

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('weatherSettings');
    if (savedSettings) {
        settings = { ...settings, ...JSON.parse(savedSettings) };
        
        // Apply saved settings to UI elements
        tempUnitSelect.value = settings.temperatureUnit;
        if (windUnitSelect) windUnitSelect.value = settings.windUnit || 'ms';
        if (timeFormatSelect) timeFormatSelect.value = settings.timeFormat || '12h';
        updateTheme(settings.darkMode);
        updateAnimationToggle(settings.animations);
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

// Update animation toggle
function updateAnimationToggle(isEnabled) {
    if (animationToggle) {
        const icon = animationToggle.querySelector('i');
        const text = animationToggle.querySelector('span');
        if (isEnabled) {
            icon.className = 'fas fa-toggle-on';
            text.textContent = 'Enabled';
            document.body.classList.remove('no-animations');
        } else {
            icon.className = 'fas fa-toggle-off';
            text.textContent = 'Disabled';
            document.body.classList.add('no-animations');
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

// Animation toggle
if (animationToggle) {
    animationToggle.addEventListener('click', () => {
        settings.animations = !settings.animations;
        updateAnimationToggle(settings.animations);
        saveSettings();
    });
}

// Tab functionality
if (tabButtons && tabButtons.length > 0) {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to current button and tab
            button.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Resize map if map tab is activated
            if (tabName === 'map' && map) {
                setTimeout(() => {
                    map.invalidateSize();
                }, 100);
            }
        });
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    loadSettings();
    updateTheme(settings.darkMode);
    updateAnimationToggle(settings.animations);
    
    // Initialize collapsible content
    initCollapsibleContent();
    
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
        currentCoords = { lat: latitude, lon: longitude };
        
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Could not get location');
        }
        
        const [locationData] = await response.json();
        if (locationData) {
            searchInput.value = locationData.name;
            currentCity = locationData.name;
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

// Map layer buttons
if (showTempLayerBtn) {
    showTempLayerBtn.addEventListener('click', () => toggleMapLayer('temp'));
}

if (showPrecipitationLayerBtn) {
    showPrecipitationLayerBtn.addEventListener('click', () => toggleMapLayer('precipitation'));
}

if (showWindLayerBtn) {
    showWindLayerBtn.addEventListener('click', () => toggleMapLayer('wind'));
}

if (showCloudsLayerBtn) {
    showCloudsLayerBtn.addEventListener('click', () => toggleMapLayer('clouds'));
}

// Wind unit selection
if (windUnitSelect) {
    windUnitSelect.addEventListener('change', () => {
        settings.windUnit = windUnitSelect.value;
        saveSettings();
        if (currentWeather) {
            updateWindDisplay(currentWeather.wind.speed, currentWeather.wind.gust);
        }
    });
}

// Time format selection
if (timeFormatSelect) {
    timeFormatSelect.addEventListener('change', () => {
        settings.timeFormat = timeFormatSelect.value;
        saveSettings();
        if (currentWeather) {
            updateTimeDisplay(currentWeather.sys.sunrise, currentWeather.sys.sunset);
        }
    });
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
        currentCity = data.name;
        currentCoords = { lat: data.coord.lat, lon: data.coord.lon };
        
        // Get forecast data
        await getForecast(data.coord.lat, data.coord.lon);
        
        // Get air quality data
        await getAirQuality(data.coord.lat, data.coord.lon);
        
        // Display weather data
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

// Get forecast data
async function getForecast(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=${settings.temperatureUnit}`
        );
        
        if (!response.ok) {
            throw new Error('Could not get forecast data');
        }
        
        const data = await response.json();
        forecastData = data;
        return data;
    } catch (error) {
        console.error('Error getting forecast:', error);
        return null;
    }
}

// Get air quality data
async function getAirQuality(lat, lon) {
    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Could not get air quality data');
        }
        
        const data = await response.json();
        airQualityData = data;
        displayAirQuality(data);
        return data;
    } catch (error) {
        console.error('Error getting air quality:', error);
        return null;
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

    const temp = data.main.temp;
    const feelsLike = data.main.feels_like;
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
    
    // Update wind display with correct units
    updateWindDisplay(data.wind.speed, data.wind.gust);
    
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

    // Update time display with correct format
    updateTimeDisplay(data.sys.sunrise, data.sys.sunset);
    
    document.getElementById('visibility').textContent = `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('clouds').textContent = `${data.clouds.all}%`;
    
    // Additional weather details
    if (document.getElementById('wind-direction')) {
        const windDirection = getWindDirection(data.wind.deg);
        document.getElementById('wind-direction').textContent = windDirection;
    }
    
    if (document.getElementById('wind-gust')) {
        const gustText = data.wind.gust ? formatWindSpeed(data.wind.gust) : 'N/A';
        document.getElementById('wind-gust').textContent = gustText;
    }
    
    if (document.getElementById('temp-min')) {
        document.getElementById('temp-min').textContent = `${Math.round(data.main.temp_min)}${unit}`;
    }
    
    if (document.getElementById('temp-max')) {
        document.getElementById('temp-max').textContent = `${Math.round(data.main.temp_max)}${unit}`;
    }
    
    // Check for weather alerts
    if (data.alerts && data.alerts.length > 0) {
        const alert = data.alerts[0];
        document.getElementById('alert-title').textContent = alert.event || 'Weather Alert';
        document.getElementById('alert-description').textContent = alert.description || 'Potential hazardous weather conditions.';
        weatherAlert.classList.remove('hidden');
    } else {
        weatherAlert.classList.add('hidden');
    }
    
    // Display forecast if available
    if (forecastData) {
        displayForecast(forecastData);
    }

    // Initialize/update map
    initMap(data.coord.lat, data.coord.lon);
}

// Update wind display based on selected unit
function updateWindDisplay(speed, gust) {
    if (!currentWeather) return;
    
    document.getElementById('wind-speed').textContent = formatWindSpeed(speed);
    
    if (document.getElementById('wind-gust')) {
        const gustText = gust ? formatWindSpeed(gust) : 'N/A';
        document.getElementById('wind-gust').textContent = gustText;
    }
}

// Format wind speed based on selected unit
function formatWindSpeed(speed) {
    let formattedSpeed;
    let unit;
    
    switch (settings.windUnit) {
        case 'kmh':
            formattedSpeed = (speed * 3.6).toFixed(1);
            unit = 'km/h';
            break;
        case 'mph':
            formattedSpeed = (speed * 2.237).toFixed(1);
            unit = 'mph';
            break;
        default: // m/s
            formattedSpeed = speed.toFixed(1);
            unit = 'm/s';
    }
    
    return `${formattedSpeed} ${unit}`;
}

// Get wind direction from degrees
function getWindDirection(degrees) {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return `${directions[index]} (${degrees}°)`;
}

// Update time display based on selected format
function updateTimeDisplay(sunrise, sunset) {
    if (!currentWeather) return;
    
    const formatTime = (timestamp) => {
        const date = new Date(timestamp * 1000);
        if (settings.timeFormat === '24h') {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
        } else {
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        }
    };
    
    document.getElementById('sunrise').textContent = formatTime(sunrise);
    document.getElementById('sunset').textContent = formatTime(sunset);
}

// Display forecast data
function displayForecast(data) {
    if (!forecastContainer) return;
    
    // Clear previous forecast
    forecastContainer.innerHTML = '';
    
    // Get one forecast per day (excluding current day)
    const dailyForecasts = [];
    const today = new Date().setHours(0, 0, 0, 0);
    const processedDays = new Set();
    
    data.list.forEach(forecast => {
        const forecastDate = new Date(forecast.dt * 1000);
        const forecastDay = forecastDate.setHours(0, 0, 0, 0);
        
        // Skip current day
        if (forecastDay === today) return;
        
        // Only take one forecast per day (at noon)
        const hour = new Date(forecast.dt * 1000).getHours();
        if (hour >= 11 && hour <= 13 && !processedDays.has(forecastDay)) {
            dailyForecasts.push(forecast);
            processedDays.add(forecastDay);
        }
    });
    
    // Limit to 5 days
    const forecasts = dailyForecasts.slice(0, 5);
    
    // Create forecast items
    forecasts.forEach(forecast => {
        const date = new Date(forecast.dt * 1000);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const temp = Math.round(forecast.main.temp);
        const unit = settings.temperatureUnit === 'imperial' ? '°F' : '°C';
        const icon = forecast.weather[0].icon;
        const description = forecast.weather[0].description;
        
        const forecastItem = document.createElement('div');
        forecastItem.className = 'forecast-item';
        forecastItem.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${icon}.png" alt="${description}">
            <div class="forecast-temp">${temp}${unit}</div>
            <div class="forecast-desc">${description}</div>
        `;
        
        forecastContainer.appendChild(forecastItem);
    });
}

// Display air quality data
function displayAirQuality(data) {
    if (!data || !data.list || !data.list[0]) return;
    
    const aqiValue = data.list[0].main.aqi;
    const components = data.list[0].components;
    
    // Update AQI value
    if (document.getElementById('aqi-value')) {
        document.getElementById('aqi-value').textContent = aqiValue;
    }
    
    // Update AQI level bar
    if (document.getElementById('aqi-level')) {
        const levelBar = document.getElementById('aqi-level');
        const percentage = (aqiValue / 5) * 100;
        levelBar.style.width = `${percentage}%`;
        
        // Remove all classes and add the appropriate one
        levelBar.classList.remove('aqi-good', 'aqi-moderate', 'aqi-poor');
        
        if (aqiValue <= 2) {
            levelBar.classList.add('aqi-good');
        } else if (aqiValue <= 4) {
            levelBar.classList.add('aqi-moderate');
        } else {
            levelBar.classList.add('aqi-poor');
        }
    }
    
    // Update AQI text
    if (document.getElementById('aqi-text')) {
        let aqiText;
        
        switch (aqiValue) {
            case 1:
                aqiText = 'Good';
                break;
            case 2:
                aqiText = 'Fair';
                break;
            case 3:
                aqiText = 'Moderate';
                break;
            case 4:
                aqiText = 'Poor';
                break;
            case 5:
                aqiText = 'Very Poor';
                break;
            default:
                aqiText = 'Unknown';
        }
        
        document.getElementById('aqi-text').textContent = aqiText;
    }
    
    // Update pollutant values with color coding
    if (document.getElementById('pm25')) {
        const pm25Value = components.pm2_5.toFixed(1);
        document.getElementById('pm25').textContent = `${pm25Value} μg/m³`;
        colorCodePollutant('pm25', pm25Value, [10, 25]); // Thresholds for good, moderate, poor
    }
    
    if (document.getElementById('pm10')) {
        const pm10Value = components.pm10.toFixed(1);
        document.getElementById('pm10').textContent = `${pm10Value} μg/m³`;
        colorCodePollutant('pm10', pm10Value, [20, 50]); // Thresholds for good, moderate, poor
    }
    
    if (document.getElementById('o3')) {
        const o3Value = components.o3.toFixed(1);
        document.getElementById('o3').textContent = `${o3Value} μg/m³`;
        colorCodePollutant('o3', o3Value, [60, 120]); // Thresholds for good, moderate, poor
    }
    
    if (document.getElementById('no2')) {
        const no2Value = components.no2.toFixed(1);
        document.getElementById('no2').textContent = `${no2Value} μg/m³`;
        colorCodePollutant('no2', no2Value, [40, 70]); // Thresholds for good, moderate, poor
    }
}

// Color code pollutant values based on thresholds
function colorCodePollutant(elementId, value, thresholds) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Remove existing color classes
    element.classList.remove('text-good', 'text-moderate', 'text-poor');
    
    // Add appropriate color class
    const numValue = parseFloat(value);
    if (numValue <= thresholds[0]) {
        element.classList.add('text-good');
    } else if (numValue <= thresholds[1]) {
        element.classList.add('text-moderate');
    } else {
        element.classList.add('text-poor');
    }
}

// Initialize collapsible content
function initCollapsibleContent() {
    const collapsibleButtons = document.querySelectorAll('.collapsible-btn, .pollutant-info-btn');
    
    collapsibleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            
            // Toggle active class on button
            this.classList.toggle('active');
            
            // Toggle active class on content
            if (targetContent) {
                targetContent.classList.toggle('active');
            }
        });
    });
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

// Toggle map layers
function toggleMapLayer(layerType) {
    if (!map || !currentCoords) return;
    
    // Remove existing layers
    if (temperatureLayer) map.removeLayer(temperatureLayer);
    if (precipitationLayer) map.removeLayer(precipitationLayer);
    if (cloudsLayer) map.removeLayer(cloudsLayer);
    if (windLayer) map.removeLayer(windLayer);
    
    // Reset active state on all buttons
    document.querySelectorAll('.map-layer-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add selected layer
    switch (layerType) {
        case 'temp':
            temperatureLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
                maxZoom: 19,
                attribution: 'OpenWeatherMap'
            }).addTo(map);
            document.getElementById('show-temp-layer').classList.add('active');
            break;
        case 'precipitation':
            precipitationLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
                maxZoom: 19,
                attribution: 'OpenWeatherMap'
            }).addTo(map);
            document.getElementById('show-precipitation-layer').classList.add('active');
            break;
        case 'clouds':
            cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
                maxZoom: 19,
                attribution: 'OpenWeatherMap'
            }).addTo(map);
            document.getElementById('show-clouds-layer').classList.add('active');
            break;
        case 'wind':
            windLayer = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`, {
                maxZoom: 19,
                attribution: 'OpenWeatherMap'
            }).addTo(map);
            document.getElementById('show-wind-layer').classList.add('active');
            break;
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
        
        // Refresh weather data with new unit
        if (currentCity) {
            getWeather(currentCity);
        }
    });
}

// Add animation classes to elements when they become visible
function animateOnScroll() {
    const elements = document.querySelectorAll('.detail, .forecast-item');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(element => {
        observer.observe(element);
    });
}

// Call animation function when page loads
window.addEventListener('load', animateOnScroll);
