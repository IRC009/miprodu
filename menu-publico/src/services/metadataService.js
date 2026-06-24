// Provider-based Weather API Interface
// You can change the active provider or implementation here without affecting the rest of the application.
const WEATHER_PROVIDERS = {
  OPEN_METEO: 'open-meteo',
  // WEATHER_API: 'weather-api', // Future expansion
};

const ACTIVE_PROVIDER = WEATHER_PROVIDERS.OPEN_METEO;

/**
 * Fetch weather from Open-Meteo API
 */
const fetchOpenMeteoWeather = async (latitude, longitude) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo status error: ${res.status}`);
    const data = await res.json();
    
    if (data && data.current_weather) {
      const code = data.current_weather.weathercode;
      // Interpret weather codes (WMO Weather interpretation codes)
      // 51-67: Drizzle/Rain, 80-82: Rain showers, 95-99: Thunderstorm
      const isRaining = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
      
      return {
        temperature: data.current_weather.temperature,
        windspeed: data.current_weather.windspeed,
        weathercode: code,
        isRaining,
        provider: 'open-meteo',
        success: true
      };
    }
    return { success: false, error: 'Malformed response' };
  } catch (err) {
    console.warn("[Weather Service] Open-Meteo fetch failed:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Main modular weather function
 */
export const getWeather = async (latitude, longitude) => {
  if (!latitude || !longitude) {
    return { success: false, error: 'Coordinates missing' };
  }
  
  switch (ACTIVE_PROVIDER) {
    case WEATHER_PROVIDERS.OPEN_METEO:
    default:
      return await fetchOpenMeteoWeather(latitude, longitude);
  }
};

/**
 * Extract rich, free client metadata
 */
export const getClientMetadata = () => {
  const ua = navigator.userAgent || '';
  
  // 1. Detect Device Type
  let deviceType = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) {
    deviceType = 'mobile';
  }
  
  // 2. Detect Browser
  let browser = 'Unknown';
  if (ua.includes('Firefox')) {
    browser = 'Firefox';
  } else if (ua.includes('SamsungBrowser')) {
    browser = 'Samsung Browser';
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    browser = 'Opera';
  } else if (ua.includes('Trident')) {
    browser = 'Internet Explorer';
  } else if (ua.includes('Edge') || ua.includes('Edg')) {
    browser = 'Edge';
  } else if (ua.includes('Chrome')) {
    browser = 'Chrome';
  } else if (ua.includes('Safari')) {
    browser = 'Safari';
  }
  
  // 3. Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows NT')) {
    os = 'Windows';
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
  } else if (ua.includes('Android')) {
    os = 'Android';
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    os = 'iOS';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  // 4. Local Date and Time Components
  const now = new Date();
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const monthsOfYear = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  return {
    deviceType,
    browser,
    os,
    hourOfDay: now.getHours(),
    dayOfWeek: daysOfWeek[now.getDay()],
    dayOfWeekIndex: now.getDay(),
    month: monthsOfYear[now.getMonth()],
    monthIndex: now.getMonth() + 1,
    year: now.getFullYear(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
    locale: navigator.language || 'Unknown'
  };
};

/**
 * Combine weather and client metadata
 */
export const getCombinedMetadata = async (latitude, longitude) => {
  const clientMeta = getClientMetadata();
  let weatherMeta = null;
  
  if (latitude && longitude) {
    const weatherRes = await getWeather(latitude, longitude);
    if (weatherRes.success) {
      weatherMeta = {
        temperature: weatherRes.temperature,
        isRaining: weatherRes.isRaining,
        weathercode: weatherRes.weathercode,
        provider: weatherRes.provider
      };
    }
  }
  
  return {
    client: clientMeta,
    weather: weatherMeta,
    collectedAt: new Date().toISOString()
  };
};
