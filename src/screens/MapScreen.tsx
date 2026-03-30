import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useUser } from '../context/UserContext';
import { api } from '../api/client';
import type { Place } from '../types';
import type { WalkStatus } from '../types';
import type { PlaceCategory } from '../types';

const { width } = Dimensions.get('window');

type MapMode = 'places' | 'smart' | 'lost';

const STATUS_OPTIONS: { value: WalkStatus; label: string }[] = [
  { value: 'looking_for_company', label: 'Ищем компанию' },
  { value: 'training', label: 'На тренировке' },
  { value: 'do_not_disturb', label: 'Не беспокоить' },
];

const PLACE_STYLES: Record<PlaceCategory, { label: string; color: string }> = {
  vet: { label: 'Ветклиника', color: '#e74c3c' },
  pet_shop: { label: 'Зоомагазин', color: '#3498db' },
  groomer: { label: 'Груминг', color: '#9b59b6' },
  park: { label: 'Парк/площадка', color: '#2ecc71' },
  cafe: { label: 'Dog-friendly кафе', color: '#f39c12' },
};

type UserLocationItem = {
  id: string;
  user_id: string;
  user_name: string;
  latitude: number;
  longitude: number;
  status: string;
};

type LostAlertItem = {
  id: string;
  pet_name: string;
  breed: string;
  description: string;
  contact: string;
  latitude: number;
  longitude: number;
  status: string;
};

const DEFAULT_REGION = {
  latitude: 55.7558,
  longitude: 37.6173,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const LOCATION_UPDATE_INTERVAL_MS = 20000;  // отправка своей позиции каждые 20 с
const USERS_FETCH_INTERVAL_MS = 15000;      // обновление списка пользователей каждые 15 с

export default function MapScreen() {
  const { user } = useUser();
  const [mode, setMode] = useState<MapMode>('places');
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [places, setPlaces] = useState<Place[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocationItem[]>([]);
  const [lostAlerts, setLostAlerts] = useState<LostAlertItem[]>([]);
  const [myStatus, setMyStatus] = useState<WalkStatus>('looking_for_company');
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLost, setLoadingLost] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const loadPlaces = async () => {
    setLoadingPlaces(true);
    try {
      const data = await api.searchDogFriendlyPlaces(region.latitude, region.longitude, 3, 50, false);
      setPlaces(Array.isArray(data.places) ? (data.places as Place[]) : []);
    } catch (e) {
      if (__DEV__) console.warn('MapScreen searchDogFriendlyPlaces:', e);
      setPlaces([]);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const refreshPlacesFromYandex = async () => {
    setLoadingPlaces(true);
    try {
      const data = await api.searchDogFriendlyPlaces(region.latitude, region.longitude, 3, 50, false);
      setPlaces(Array.isArray(data.places) ? (data.places as Place[]) : []);
      Alert.alert('Готово', `Найдено мест: ${data.count}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки мест';
      Alert.alert('Не удалось обновить места', msg);
    } finally {
      setLoadingPlaces(false);
    }
  };

  const loadUserLocations = async () => {
    if (!user) return;
    setLoadingUsers(true);
    try {
      const data = await api.getUserLocations();
      setUserLocations(Array.isArray(data) ? data : []);
    } catch (e) {
      if (__DEV__) console.warn('MapScreen getUserLocations:', e);
      setUserLocations([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadLostAlerts = async () => {
    setLoadingLost(true);
    try {
      const data = await api.getLostAlerts('active');
      setLostAlerts(Array.isArray(data) ? data : []);
    } catch (e) {
      if (__DEV__) console.warn('MapScreen getLostAlerts:', e);
      setLostAlerts([]);
    } finally {
      setLoadingLost(false);
    }
  };

  const sendMyLocation = async (latitude: number, longitude: number) => {
    if (!user) return;
    try {
      await api.updateMyLocation({
        latitude,
        longitude,
        status: myStatus,
      });
    } catch (e) {
      if (__DEV__) console.warn('MapScreen updateMyLocation:', e);
    }
  };

  useEffect(() => {
    if (mode !== 'places') return;
    const timer = setTimeout(() => {
      loadPlaces();
    }, 600);
    return () => clearTimeout(timer);
  }, [mode, region.latitude, region.longitude]);

  useEffect(() => {
    if (mode !== 'smart' || !user) return;
    loadUserLocations();
    const interval = setInterval(loadUserLocations, USERS_FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mode, user?.id]);

  useEffect(() => {
    if (mode !== 'lost') return;
    loadLostAlerts();
    const interval = setInterval(loadLostAlerts, USERS_FETCH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'smart') return;
    let isMounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;
      setLocationPermission(status === 'granted');
      if (status !== 'granted') {
        Alert.alert('Геолокация', 'Разрешите доступ к геолокации для отображения на умной карте.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      if (!isMounted) return;
      const { latitude, longitude } = loc.coords;
      setRegion((r) => ({ ...r, latitude, longitude }));
      await sendMyLocation(latitude, longitude);

      locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: LOCATION_UPDATE_INTERVAL_MS },
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          sendMyLocation(lat, lng);
        }
      );
    })();

    return () => {
      isMounted = false;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [mode, user?.id, myStatus]);

  const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
  const placeLabel = (category: PlaceCategory) =>
    PLACE_STYLES[category]?.label ?? category;
  const placeColor = (category: PlaceCategory) =>
    PLACE_STYLES[category]?.color ?? '#FF9F43';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'places' ? 'Карта мест' : mode === 'smart' ? 'Умная карта' : 'Потерялся питомец'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'places'
            ? 'Ветклиники, парки, зоомагазины, кафе'
            : mode === 'smart'
              ? 'Где гуляют и кто ищет компанию'
              : 'Активные объявления о пропавших питомцах'}
        </Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'places' && styles.toggleBtnActive]}
            onPress={() => setMode('places')}
          >
            <Text style={[styles.toggleText, mode === 'places' && styles.toggleTextActive]}>
              Места
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'smart' && styles.toggleBtnActive]}
            onPress={() => setMode('smart')}
          >
            <Text style={[styles.toggleText, mode === 'smart' && styles.toggleTextActive]}>
              Умная карта
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'lost' && styles.toggleBtnActive]}
            onPress={() => setMode('lost')}
          >
            <Text style={[styles.toggleText, mode === 'lost' && styles.toggleTextActive]}>
              Потерялся
            </Text>
          </TouchableOpacity>
        </View>
        {mode === 'places' && (
          <TouchableOpacity style={styles.syncBtn} onPress={refreshPlacesFromYandex}>
            <Text style={styles.syncBtnText}>Обновить dog-friendly из Яндекс Карт</Text>
          </TouchableOpacity>
        )}
        {mode === 'smart' && user && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Мой статус:</Text>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusBtn, myStatus === opt.value && styles.statusBtnActive]}
                onPress={() => setMyStatus(opt.value)}
              >
                <Text style={[styles.statusBtnText, myStatus === opt.value && styles.statusBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {(loadingPlaces && mode === 'places') || (loadingUsers && mode === 'smart') || (loadingLost && mode === 'lost') ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF9F43" />
        </View>
      ) : null}

      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={mode === 'smart' && locationPermission === true}
      >
        {mode === 'places' &&
          places.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.latitude, longitude: p.longitude }}
              title={p.name}
              description={`${placeLabel(p.category)}${p.address ? ` • ${p.address}` : ''}`}
              pinColor={placeColor(p.category)}
            />
          ))}
        {mode === 'smart' &&
          userLocations.map((u) => (
            <Marker
              key={u.id}
              coordinate={{ latitude: u.latitude, longitude: u.longitude }}
              title={u.user_name}
              description={statusLabel(u.status)}
              pinColor="#2ecc71"
            />
          ))}
        {mode === 'lost' &&
          lostAlerts.map((a) => (
            <Marker
              key={a.id}
              coordinate={{ latitude: a.latitude, longitude: a.longitude }}
              title={`Потерялся: ${a.pet_name}`}
              description={`${a.breed ? `${a.breed} • ` : ''}${a.description || 'Свяжитесь по контактам в приложении'}`}
              pinColor="#c0392b"
            />
          ))}
      </MapView>

      {mode === 'smart' && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Статусы:</Text>
          <Text>🟢 Ищем компанию</Text>
          <Text>🟡 На тренировке</Text>
          <Text>🔴 Не беспокоить</Text>
        </View>
      )}
      {mode === 'places' && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Категории мест:</Text>
          <Text>🔴 Ветклиника</Text>
          <Text>🔵 Зоомагазин</Text>
          <Text>🟣 Груминг</Text>
          <Text>🟢 Парк/площадка</Text>
          <Text>🟠 Dog-friendly кафе</Text>
        </View>
      )}
      {mode === 'lost' && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Потерялся питомец:</Text>
          <Text>🔴 Активные объявления рядом</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    padding: 16,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#333' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  toggleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#FF9F43' },
  toggleText: { fontSize: 14, color: '#666' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  syncBtn: {
    marginTop: 10,
    backgroundColor: '#fff3e8',
    borderColor: '#FF9F43',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  syncBtnText: { color: '#d76c00', fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10, gap: 6 },
  statusLabel: { fontSize: 12, color: '#666', marginRight: 4 },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f0f0f0' },
  statusBtnActive: { backgroundColor: '#2ecc71' },
  statusBtnText: { fontSize: 12, color: '#666' },
  statusBtnTextActive: { color: '#fff', fontWeight: '600' },
  map: { flex: 1, width },
  centered: { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendTitle: { fontWeight: '600', marginBottom: 4 },
});
