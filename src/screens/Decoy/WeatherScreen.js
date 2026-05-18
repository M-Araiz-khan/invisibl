import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function WeatherScreen() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  // Weather states
  const [weatherData, setWeatherData] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);

  // ── Helpers ────────────────────────────────────────────
  const getWeatherDetails = (code) => {
    if (code === 0) return { condition: 'Clear Sky', icon: 'sunny', color: '#FFD700', bg: '#1A3A4A' };
    if (code >= 1 && code <= 3) return { condition: 'Partly Cloudy', icon: 'partly-sunny', color: '#F0F8FF', bg: '#2A3A4A' };
    if (code === 45 || code === 48) return { condition: 'Foggy', icon: 'cloud', color: '#D3D3D3', bg: '#1E2A30' };
    if (code >= 51 && code <= 67) return { condition: 'Rainy', icon: 'rainy', color: '#4DA6FF', bg: '#162030' };
    if (code >= 71 && code <= 77) return { condition: 'Snow', icon: 'snow', color: '#FFFFFF', bg: '#2A3040' };
    if (code >= 80 && code <= 82) return { condition: 'Heavy Rain', icon: 'thunderstorm', color: '#4DA6FF', bg: '#101A24' };
    if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: 'thunderstorm', color: '#FFA500', bg: '#1A1A2E' };
    return { condition: 'Unknown', icon: 'cloud-outline', color: '#FFF', bg: '#0F2027' };
  };

  // ── Fetch Weather ──────────────────────────────────────
  const fetchWeather = async (lat, lon, cityName) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await response.json();

      const current = data.current_weather;
      const details = getWeatherDetails(current.weathercode);

      // Hourly Forecast (next 24 hours)
      const currentHourIndex = data.hourly.time.findIndex((t) =>
        t.startsWith(current.time.slice(0, 13))
      );
      const next24Hours = [];
      for (let i = 0; i < 24; i++) {
        const index = currentHourIndex + i;
        if (data.hourly.time[index]) {
          const timeString = new Date(data.hourly.time[index]).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const hourlyDetails = getWeatherDetails(data.hourly.weathercode[index]);
          next24Hours.push({
            id: index.toString(),
            time: i === 0 ? 'Now' : timeString,
            temp: Math.round(data.hourly.temperature_2m[index]),
            icon: hourlyDetails.icon,
            color: hourlyDetails.color,
          });
        }
      }

      setWeatherData({
        city: cityName,
        temp: Math.round(current.temperature),
        condition: details.condition,
        icon: details.icon,
        iconColor: details.color,
        bgColor: details.bg,
        windSpeed: current.windspeed,
        high: Math.round(data.daily.temperature_2m_max[0]),
        low: Math.round(data.daily.temperature_2m_min[0]),
      });
      setHourlyData(next24Hours);
    } catch (_error) {
      setErrorMsg('Failed to load weather data.');
    } finally {
      setLoading(false);
    }
  };

  // ── Initial Load (GPS) ─────────────────────────────────
  useEffect(() => {
    const fetchLiveWeather = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Location permission denied. Please search a city.');
          setLoading(false);
          return;
        }
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        const cityName = geocode.length > 0
          ? geocode[0].city || geocode[0].region || 'Unknown City'
          : 'Current Location';

        await fetchWeather(latitude, longitude, cityName);
      } catch (_error) {
        setErrorMsg('Error getting location. Try searching.');
        setLoading(false);
      }
    };
    fetchLiveWeather();
  }, );

  // ── Search City ────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setLoading(true);

    try {
      const searchRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`
      );
      const searchData = await searchRes.json();

      if (searchData.results && searchData.results.length > 0) {
        const cityInfo = searchData.results[0];
        await fetchWeather(cityInfo.latitude, cityInfo.longitude, cityInfo.name);
      } else {
        setErrorMsg(`Could not find city: "${searchQuery}"`);
        setLoading(false);
      }
    } catch (_error) {
      setErrorMsg('Search failed. Check your internet.');
      setLoading(false);
    }
  };

  // ── Hourly Item ────────────────────────────────────────
  const renderHourlyItem = ({ item }) => (
    <View style={[styles.hourlyItem, item.time === 'Now' && styles.hourlyItemActive]}>
      <Text style={[styles.hourlyTime, item.time === 'Now' && styles.hourlyTimeActive]}>
        {item.time}
      </Text>
      <Ionicons name={item.icon} size={28} color={item.color} style={styles.hourlyIcon} />
      <Text style={styles.hourlyTemp}>{item.temp}°</Text>
      {/* Temperature bar */}
      <View style={styles.tempBarTrack}>
        <View
          style={[
            styles.tempBarFill,
            {
              height: `${Math.max(10, (item.temp + 10) * 2)}%`,
              backgroundColor: item.color,
            },
          ]}
        />
      </View>
    </View>
  );

  // ── Dynamic Background ─────────────────────────────────
  const bgColor = weatherData?.bgColor || '#0F2027';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={bgColor} />

      {/* ── Search Bar ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="rgba(255,255,255,0.6)" style={{ marginLeft: 4 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search any city..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color="rgba(255,255,255,0.8)" />
          <Text style={styles.loadingText}>Fetching weather...</Text>
        </View>
      )}

      {/* ── Error ── */}
      {!loading && errorMsg && (
        <View style={styles.centerView}>
          <Ionicons name="cloud-offline-outline" size={64} color="#ff4444" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSearch}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Weather Content ── */}
      {!loading && !errorMsg && weatherData && (
        <View style={styles.weatherContent}>
          {/* Main Card */}
          <View style={styles.mainCard}>
            <Text style={styles.cityName}>{weatherData.city}</Text>
            <Ionicons name={weatherData.icon} size={96} color={weatherData.iconColor} />
            <Text style={styles.tempLarge}>{weatherData.temp}°C</Text>
            <Text style={styles.conditionText}>{weatherData.condition}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="arrow-up-outline" size={18} color="#FFF" />
                <Text style={styles.statValue}>{weatherData.high}°</Text>
                <Text style={styles.statLabel}>High</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="arrow-down-outline" size={18} color="#FFF" />
                <Text style={styles.statValue}>{weatherData.low}°</Text>
                <Text style={styles.statLabel}>Low</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="flag-outline" size={18} color="#FFF" />
                <Text style={styles.statValue}>{weatherData.windSpeed}</Text>
                <Text style={styles.statLabel}>km/h</Text>
              </View>
            </View>
          </View>

          {/* Hourly Forecast */}
          <View style={styles.forecastCard}>
            <View style={styles.forecastHeader}>
              <Ionicons name="time-outline" size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.forecastTitle}>Hourly Forecast</Text>
            </View>
            <FlatList
              data={hourlyData}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={renderHourlyItem}
              contentContainerStyle={{ paddingHorizontal: 10 }}
            />
          </View>
        </View>
      )}

      {/* ── Footer ── */}
      <Text style={styles.footer}>Powered by Open‑Meteo</Text>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  /* ── Search ── */
  searchWrapper: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 8,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },

  /* ── Loading / Error ── */
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    fontSize: 15,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6666',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  retryText: {
    color: '#FFF',
    fontSize: 14,
  },

  /* ── Weather ── */
  weatherContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  mainCard: {
    alignItems: 'center',
    marginBottom: 30,
  },
  cityName: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  tempLarge: {
    fontSize: 88,
    color: '#FFF',
    fontWeight: '200',
    marginTop: -6,
  },
  conditionText: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'capitalize',
    marginBottom: 24,
    fontWeight: '400',
  },

  /* ── Stats ── */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 70,
  },
  statValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  statLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
    textTransform: 'uppercase',
  },

  /* ── Forecast ── */
  forecastCard: {
    width: '90%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  forecastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 18,
    marginBottom: 14,
    gap: 6,
  },
  forecastTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hourlyItem: {
    alignItems: 'center',
    marginHorizontal: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  hourlyItemActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  hourlyTime: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 6,
  },
  hourlyTimeActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  hourlyIcon: {
    marginBottom: 6,
  },
  hourlyTemp: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tempBarTrack: {
    width: 4,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  tempBarFill: {
    width: '100%',
    borderRadius: 2,
  },

  /* ── Footer ── */
  footer: {
    position: 'absolute',
    bottom: 18,
    alignSelf: 'center',
    color: 'rgba(255,255,255,0.15)',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});