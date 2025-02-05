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
    if (!city) return;

    showLoading();

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&units=metric`
        );

        if (!response.ok) {
            throw new Error('City not found');
        }

        const data = await response.json();
        displayWeather(data);
    } catch (error) {
        showError();
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
function showError() {
    hideLoading();
    weatherInfo.classList.add('hidden');
    errorMessage.classList.remove('hidden');
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
                showError();
            }
        }, () => {
            // If user denies location access, we won't show any error
            weatherInfo.classList.add('hidden');
        });
    }
});
