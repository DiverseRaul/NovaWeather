// OpenWeatherMap API Configuration
const API_KEY = '756c8b3100c1d5776ac9e3edfa0a3243'; // Replace this with your API key from openweathermap.org

// Verify API key has been set
if (API_KEY === '') {
    console.error('Please set up your OpenWeatherMap API key in config.js');
    document.getElementById('error-message').classList.remove('hidden');
    document.getElementById('error-message').innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <p>Please set up your OpenWeatherMap API key in config.js</p>
        <p style="font-size: 0.9em; margin-top: 10px;">
            1. Sign up at <a href="https://openweathermap.org/" style="color: var(--primary-color)">openweathermap.org</a><br>
            2. Get your API key from your account<br>
            3. Replace 'YOUR_API_KEY' in config.js
        </p>
    `;
}
