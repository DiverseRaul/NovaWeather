// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const weatherInfo = document.querySelector('.weather-info');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeBtn = document.querySelector('.close');
const themeToggle = document.getElementById('theme-toggle');
const tempUnit = document.getElementById('temp-unit');

let currentWeather;

// Event Listeners
searchBtn.addEventListener('click', getWeather);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') getWeather();
});

// Get weather data from API
async function getWeather() {
    const city = searchInput.value.trim();
    if (!city) {
        showCustomError('Please enter a city name');
        return;
    }

    showLoading();

    try {
        const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
        console.log('Fetching weather data...');
        
        const response = await fetch(apiUrl);
        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error:', errorData);
            
            if (response.status === 401) {
                throw new Error('Invalid API key. Note: It may take a few hours for a new API key to become active.');
            } else if (response.status === 404) {
                throw new Error('City not found. Please check the spelling and try again');
            } else {
                throw new Error(`Weather API Error: ${errorData.message || 'Unable to fetch weather data'}`);
            }
        }

        const data = await response.json();
        console.log('Weather data received:', data);
        displayWeather(data);
    } catch (error) {
        console.error('Error fetching weather:', error);
        showCustomError(error.message);
    }
}

// Display weather data
function displayWeather(data) {
    currentWeather = data;
    
    const temp = settings.temperatureUnit === 'celsius' 
        ? Math.round(data.main.temp)
        : Math.round((data.main.temp * 9/5) + 32);
    const feelsLike = settings.temperatureUnit === 'celsius'
        ? Math.round(data.main.feels_like)
        : Math.round((data.main.feels_like * 9/5) + 32);
    const unit = settings.temperatureUnit === 'celsius' ? '°C' : '°F';
    const windSpeed = Math.round(data.wind.speed * 3.6); // Convert m/s to km/h

    // Format sunrise and sunset times
    const formatTime = (timestamp) => {
        const date = new Date(timestamp * 1000);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    document.getElementById('city').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('temp').textContent = `${temp}${unit}`;
    document.getElementById('weather-icon').src = 
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`;
    document.getElementById('description').textContent = 
        data.weather[0].description.charAt(0).toUpperCase() + 
        data.weather[0].description.slice(1);

    // Update main weather details
    document.getElementById('wind-speed').textContent = `${windSpeed} km/h`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('feels-like').textContent = `${feelsLike}${unit}`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;

    // Update additional information
    document.getElementById('sunrise').textContent = formatTime(data.sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(data.sys.sunset);
    document.getElementById('visibility').textContent = `${Math.round(data.visibility / 1000)} km`;
    document.getElementById('clouds').textContent = `${data.clouds.all}%`;

    document.querySelector('.weather-info').classList.remove('hidden');
    loading.classList.add('hidden');
    errorMessage.classList.add('hidden');
}

// Show/hide loading state
function showLoading() {
    weatherInfo.classList.add('hidden');
    errorMessage.classList.add('hidden');
    loading.classList.remove('hidden');
}

function hideLoading() {
    loading.classList.add('hidden');
}

// Show error message
function showCustomError(message) {
    hideLoading();
    weatherInfo.classList.add('hidden');
    errorMessage.classList.remove('hidden');
    errorMessage.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
    `;
}

function showError() {
    showCustomError('Unable to fetch weather data. Please try again later');
}

// Get user's location weather on page load
window.addEventListener('load', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const response = await fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${position.coords.latitude}&lon=${position.coords.longitude}&appid=${API_KEY}&units=metric`
                );
                
                if (!response.ok) throw new Error('Unable to fetch weather');
                
                const data = await response.json();
                displayWeather(data);
            } catch (error) {
                showCustomError(error.message);
            }
        }, () => {
            // If user denies location access, we won't show any error
            weatherInfo.classList.add('hidden');
        });
    }
});

// Settings functionality
let settings = JSON.parse(localStorage.getItem('weatherSettings')) || {
    darkMode: false,
    temperatureUnit: 'celsius'
};

// Theme toggle functionality
function updateTheme() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    document.body.classList.toggle('dark-mode', isDarkMode);
    const themeToggleIcon = document.querySelector('#theme-toggle i');
    const themeToggleText = document.querySelector('#theme-toggle');
    
    if (isDarkMode) {
        themeToggleIcon.className = 'fas fa-sun';
        themeToggleText.innerHTML = '<i class="fas fa-sun"></i>Light Mode';
    } else {
        themeToggleIcon.className = 'fas fa-moon';
        themeToggleText.innerHTML = '<i class="fas fa-moon"></i>Dark Mode';
    }
}

// Theme toggle event listener
themeToggle.addEventListener('click', () => {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    localStorage.setItem('darkMode', !isDarkMode);
    updateTheme();
});

// Initialize theme on page load
const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (!localStorage.getItem('darkMode')) {
    localStorage.setItem('darkMode', prefersDarkMode);
}
updateTheme();

// Initialize settings
function initSettings() {
    tempUnit.value = settings.temperatureUnit;
}

// Save settings
function saveSettings() {
    localStorage.setItem('weatherSettings', JSON.stringify(settings));
}

// Settings event listeners
tempUnit.addEventListener('change', () => {
    settings.temperatureUnit = tempUnit.value;
    saveSettings();
    if (currentWeather) {
        displayWeather(currentWeather);
    }
});

// Modal event listeners
settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.style.display = 'none';
    }
});
