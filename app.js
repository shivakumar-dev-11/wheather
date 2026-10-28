const form = document.querySelector('#location-form');
const locationInput = document.querySelector('#location-input');
const formMessage = document.querySelector('#form-message');
const weatherContent = document.querySelector('#weather-content');
const refreshButton = document.querySelector('#refresh-button');
const hourlyList = document.querySelector('#hourly-list');
const rangeButtons = [...document.querySelectorAll('.range-button')];

let selectedLocation = '';
let weatherData = null;
let activeRange = 'previous';

const getDateString = (date) => date.toISOString().slice(0, 10);

const getRequestRange = () => {
  const start = new Date();
  const end = new Date();
  start.setUTCDate(start.getUTCDate() - 2);
  end.setUTCDate(end.getUTCDate() + 2);
  return { start: getDateString(start), end: getDateString(end) };
};

const fetchForecast = async (location) => {
  const { start, end } = getRequestRange();
  const params = new URLSearchParams({
    unitGroup: 'metric',
    include: 'days,hours,current',
    key: WEATHER_API_KEY,
    contentType: 'json',
  });
  const encodedLocation = encodeURIComponent(location);
  const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodedLocation}/${start}/${end}?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('The weather service rejected the API key. Check that it is active and has timeline access.');
    }
    if (response.status === 400) throw new Error('We couldn’t find that location. Check the spelling and try again.');
    throw new Error('Weather data is unavailable right now. Please try again.');
  }
  return response.json();
};

const formatWeatherIcon = (icon) => {
  if (!icon) return '☁';
  if (icon.includes('thunder')) return '⛈';
  if (icon.includes('snow')) return '❄';
  if (icon.includes('rain') || icon.includes('showers')) return '🌧';
  if (icon.includes('fog')) return '〰';
  if (icon.includes('cloud')) return icon.includes('partly') ? '⛅' : '☁';
  if (icon.includes('clear') || icon.includes('sun')) return '☀';
  return '☁';
};

const setMessage = (message, isError = false) => {
  formMessage.textContent = message;
  formMessage.classList.toggle('error', isError);
};

const getLocalDate = (epoch, timezone) => new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date(epoch * 1000));

const getClosestHourIndex = (hours, epoch) => hours.reduce((closestIndex, hour, index) => {
  const currentDistance = Math.abs(hour.datetimeEpoch - epoch);
  const closestDistance = Math.abs(hours[closestIndex].datetimeEpoch - epoch);
  return currentDistance < closestDistance ? index : closestIndex;
}, 0);

const renderCurrentWeather = (data) => {
  const current = data.currentConditions;
  const dateToday = getLocalDate(Date.now() / 1000, data.timezone);
  const today = data.days.find((day) => day.datetime === dateToday) || data.days[0];
  const currentEpoch = current.datetimeEpoch || Date.now() / 1000;
  const currentHour = data.days.flatMap((day) => day.hours || []).reduce((closest, hour) => {
    if (!closest) return hour;
    return Math.abs(hour.datetimeEpoch - currentEpoch) < Math.abs(closest.datetimeEpoch - currentEpoch) ? hour : closest;
  }, null);
  const placeName = data.resolvedAddress || data.address;

  document.querySelector('#place-name').textContent = placeName;
  document.querySelector('#current-date').textContent = new Intl.DateTimeFormat('en', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: data.timezone,
  }).format(new Date(currentEpoch * 1000));
  document.querySelector('#condition-label').textContent = current.conditions || 'Current conditions';
  document.querySelector('#condition-icon').textContent = formatWeatherIcon(current.icon);
  document.querySelector('#temperature').innerHTML = `${Math.round(current.temp)}<sup>°</sup>`;
  document.querySelector('#feels-like').textContent = `Local time ${current.datetime.slice(0, 5)}`;
  document.querySelector('#wind-speed').textContent = `${Math.round(current.windspeed)} km/h`;
  document.querySelector('#rain-chance').textContent = `${Math.round(currentHour?.precipprob ?? today?.precipprob ?? 0)}%`;
  document.querySelector('#day-range').textContent = `${Math.round(today?.tempmin ?? current.temp)}° / ${Math.round(today?.tempmax ?? current.temp)}°`;
};

const renderHourly = () => {
  if (!weatherData) return;
  const allHours = weatherData.days.flatMap((day) => day.hours || []).sort((first, second) => first.datetimeEpoch - second.datetimeEpoch);
  const nowEpoch = Date.now() / 1000;
  const currentIndex = getClosestHourIndex(allHours, nowEpoch);
  const firstIndex = activeRange === 'previous' ? Math.max(0, currentIndex - 23) : currentIndex;
  const finalIndex = activeRange === 'previous' ? currentIndex + 1 : Math.min(allHours.length, currentIndex + 24);
  const hours = allHours.slice(firstIndex, finalIndex);

  hourlyList.innerHTML = hours.map((hour, index) => {
    const isNow = firstIndex + index === currentIndex;
    const time = isNow ? 'Now' : new Intl.DateTimeFormat('en', {
      hour: 'numeric', timeZone: weatherData.timezone,
    }).format(new Date(hour.datetimeEpoch * 1000));
    const icon = formatWeatherIcon(hour.icon);
    return `<article class="hour-card"><div class="hour-time">${time}</div><div class="hour-icon" aria-hidden="true">${icon}</div><div class="hour-temp">${Math.round(hour.temp)}°</div><div class="hour-rain">${Math.round(hour.precipprob ?? 0)}% rain</div><div class="hour-wind">${Math.round(hour.windspeed)} km/h</div></article>`;
  }).join('');
};

const loadWeather = async (location) => {
  setMessage('Finding your forecast…');
  refreshButton.disabled = true;
  try {
    const data = await fetchForecast(location);
    if (!data.currentConditions || !data.days?.length) throw new Error('The weather service returned incomplete weather data.');
    weatherData = data;
    selectedLocation = location;
    renderCurrentWeather(data);
    renderHourly();
    weatherContent.hidden = false;
    setMessage('Forecast updated just now.');
  } catch (error) {
    setMessage(error.message || 'Something went wrong. Please try again.', true);
  } finally {
    refreshButton.disabled = false;
  }
};

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const query = locationInput.value.trim();
  if (!query) {
    setMessage('Enter a location to see its forecast.', true);
    locationInput.focus();
    return;
  }
  if (!/^[\p{L}]+(?: [\p{L}]+)*$/u.test(query)) {
    setMessage('Use letters and single spaces only. Numbers and special characters aren’t allowed.', true);
    locationInput.focus();
    return;
  }
  await loadWeather(query);
});

refreshButton.addEventListener('click', () => {
  if (selectedLocation) loadWeather(selectedLocation);
});

rangeButtons.forEach((button) => button.addEventListener('click', () => {
  activeRange = button.dataset.range;
  rangeButtons.forEach((item) => item.classList.toggle('active', item === button));
  renderHourly();
}));
