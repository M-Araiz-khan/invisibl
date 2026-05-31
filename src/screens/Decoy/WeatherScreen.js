
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
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

// 🚀 PRO FIX: Helper function ko component se bahar nikal diya taake memory bache
const getWeatherDetails = (code) => {
  if (code === 0) return { condition: 'Clear Sky', icon: 'sunny', color: '#FFD700', bg: '#0F2027' };
  if (code >= 1 && code <= 3) return { condition: 'Partly Cloudy', icon: 'partly-sunny', color: '#F0F8FF', bg: '#203A43' };
  if (code === 45 || code === 48) return { condition: 'Foggy', icon: 'cloud', color: '#B0BEC5', bg: '#2C3E50' };
  if (code >= 51 && code <= 67) return { condition: 'Rainy', icon: 'rainy', color: '#64B5F6', bg: '#1A2980' };
  if (code >= 71 && code <= 77) return { condition: 'Snow', icon: 'snow', color: '#FFFFFF', bg: '#546D74' };
  if (code >= 80 && code <= 82) return { condition: 'Heavy Rain', icon: 'thunderstorm', color: '#4DA6FF', bg: '#000C40' };
  if (code >= 95 && code <= 99) return { condition: 'Thunderstorm', icon: 'thunderstorm', color: '#FFCA28', bg: '#141E30' };
  return { condition: 'Unknown', icon: 'cloud-outline', color: '#FFF', bg: '#232526' };
};

export default function WeatherScreen() {
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);

  const [weatherData, setWeatherData] = useState(null);
  const [hourlyData, setHourlyData] = useState([]);

  // 🚀 PRO FIX: useCallback laga diya taake ESLint warning khatam ho jaye
  const fetchWeather = useCallback(async (lat, lon, cityName) => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
      );
      const data = await response.json();

      const current = data.current_weather;
      const details = getWeatherDetails(current.weathercode);

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
  }, []); // <-- Empty array here with useCallback

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
        
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced, 
        });
        
        const { latitude, longitude } = location.coords;
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        const cityName = geocode.length > 0
          ? geocode[0].city || geocode[0].region || 'Current Location'
          : 'Current Location';

        await fetchWeather(latitude, longitude, cityName);
      } catch (_error) {
        setErrorMsg('Error getting location. Try searching.');
        setLoading(false);
      }
    };
    fetchLiveWeather();
  }, [fetchWeather]); // 🚀 PRO FIX: Ab fetchWeather safely array mein aa gaya hai

  // ... (Baaki neeche ka saara code handleSearch aur renderHourlyItem waghaira waisa hi rahega)

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

  // ── Hourly Item (🚀 PRO FIX: useCallback for 0 lag while typing) ──
  const renderHourlyItem = useCallback(({ item }) => (
    <View style={[styles.hourlyItem, item.time === 'Now' && styles.hourlyItemActive]}>
      <Text style={[styles.hourlyTime, item.time === 'Now' && styles.hourlyTimeActive]}>
        {item.time}
      </Text>
      <Ionicons name={item.icon} size={32} color={item.color} style={styles.hourlyIcon} />
      <Text style={styles.hourlyTemp}>{item.temp}°</Text>
    </View>
  ), []);

  // ── Dynamic Background ─────────────────────────────────
  const bgColor = weatherData?.bgColor || '#0F2027';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={bgColor} />

      {/* ── Search Bar ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" style={{ marginLeft: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search any city..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.centerView}>
          <ActivityIndicator size="large" color="#00FFCC" />
          <Text style={styles.loadingText}>Loading Weather Data...</Text>
        </View>
      )}

      {/* ── Error ── */}
      {!loading && errorMsg && (
        <View style={styles.centerView}>
          <Ionicons name="warning-outline" size={80} color="rgba(255, 68, 68, 0.8)" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleSearch}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Weather Content ── */}
      {!loading && !errorMsg && weatherData && (
        <View style={styles.weatherContent}>
          <View style={styles.mainCard}>
            <Text style={styles.cityName}>{weatherData.city}</Text>
            
            <View style={styles.tempContainer}>
               <Text style={styles.tempLarge}>{weatherData.temp}</Text>
               <Text style={styles.degreeSymbol}>°</Text>
            </View>

            <View style={styles.conditionRow}>
               <Ionicons name={weatherData.icon} size={28} color={weatherData.iconColor} />
               <Text style={styles.conditionText}>{weatherData.condition}</Text>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="thermometer-outline" size={22} color="rgba(255,255,255,0.8)" />
                <Text style={styles.statValue}>{weatherData.high}°</Text>
                <Text style={styles.statLabel}>Max Temp</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statCard}>
                <Ionicons name="snow-outline" size={22} color="rgba(255,255,255,0.8)" />
                <Text style={styles.statValue}>{weatherData.low}°</Text>
                <Text style={styles.statLabel}>Min Temp</Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statCard}>
                <Ionicons name="navigate-outline" size={22} color="rgba(255,255,255,0.8)" style={{ transform: [{ rotate: '45deg' }] }}/>
                <Text style={styles.statValue}>{weatherData.windSpeed}</Text>
                <Text style={styles.statLabel}>Wind km/h</Text>
              </View>
            </View>
          </View>

          <View style={styles.forecastCard}>
            <View style={styles.forecastHeader}>
              <Ionicons name="calendar-outline" size={18} color="rgba(255,255,255,0.8)" />
              <Text style={styles.forecastTitle}>Today</Text>
            </View>
            <View style={styles.forecastDivider} />
            <FlatList
              data={hourlyData}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={renderHourlyItem}
              contentContainerStyle={{ paddingHorizontal: 5 }}
            />
          </View>
        </View>
      )}

      <Text style={styles.footer}>Weather API by Open‑Meteo</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  searchWrapper: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 50 : 15, paddingBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.15)', height: 52, borderRadius: 16, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  searchInput: { flex: 1, color: '#FFF', fontSize: 17, marginLeft: 10, paddingVertical: 0, fontWeight: '500' },
  clearBtn: { padding: 6 },
  loadingText: { color: 'rgba(255,255,255,0.8)', marginTop: 15, fontSize: 16, fontWeight: '500', letterSpacing: 0.5 },
  errorText: { fontSize: 18, color: 'rgba(255, 255, 255, 0.9)', marginTop: 20, textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  retryBtn: { marginTop: 25, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  retryText: { color: '#FFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
  weatherContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 30 },
  mainCard: { alignItems: 'center', marginTop: 10 },
  cityName: { fontSize: 36, color: '#FFF', fontWeight: '600', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6 },
  tempContainer: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  tempLarge: { fontSize: 110, color: '#FFF', fontWeight: '200', letterSpacing: -4 },
  degreeSymbol: { fontSize: 40, color: '#FFF', fontWeight: '300', marginTop: 15, marginLeft: -5 },
  conditionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.2)', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 30, marginTop: -5 },
  conditionText: { fontSize: 22, color: '#FFF', textTransform: 'capitalize', fontWeight: '500', marginLeft: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 10, marginTop: 40, width: '90%' },
  statCard: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '700', marginTop: 8 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4, fontWeight: '500' },
  forecastCard: { width: '90%', backgroundColor: 'rgba(0, 0, 0, 0.25)', borderRadius: 25, paddingVertical: 20, marginBottom: 20 },
  forecastHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  forecastTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', letterSpacing: 0.5, marginLeft: 8 },
  forecastDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 15, marginHorizontal: 20 },
  hourlyItem: { alignItems: 'center', marginHorizontal: 8, paddingVertical: 12, paddingHorizontal: 15, borderRadius: 20 },
  hourlyItemActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  hourlyTime: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 10, fontWeight: '500' },
  hourlyTimeActive: { color: '#FFF', fontWeight: '700' },
  hourlyIcon: { marginBottom: 10 },
  hourlyTemp: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  footer: { position: 'absolute', bottom: 12, alignSelf: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: '500' },
});