// DOM Elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const weatherInfo = document.querySelector('.weather-info');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const tempToggle = document.getElementById('temp-toggle');

let currentTemp;
let isCelsius = true;

// Event Listeners
searchBtn.addEventListener('click', getWeather);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') getWeather();
});
tempToggle.addEventListener('click', toggleTemperature);

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
    currentTemp = data.main.temp;
    
    document.getElementById('city').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    document.getElementById('temp').textContent = `${Math.round(currentTemp)}°C`;
    document.getElementById('weather-icon').src = 
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    document.getElementById('wind').textContent = `${Math.round(data.wind.speed * 3.6)} km/h`;
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('description').textContent = 
        data.weather[0].description.charAt(0).toUpperCase() + 
        data.weather[0].description.slice(1);

    hideLoading();
    weatherInfo.classList.remove('hidden');
}

// Toggle temperature between Celsius and Fahrenheit
function toggleTemperature() {
    isCelsius = !isCelsius;
    const tempDisplay = document.getElementById('temp');
    
    if (isCelsius) {
        tempDisplay.textContent = `${Math.round(currentTemp)}°C`;
        tempToggle.textContent = 'Switch to °F';
    } else {
        const fahrenheit = (currentTemp * 9/5) + 32;
        tempDisplay.textContent = `${Math.round(fahrenheit)}°F`;
        tempToggle.textContent = 'Switch to °C';
    }
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
