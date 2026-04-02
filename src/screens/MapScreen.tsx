import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

/**
 * На iOS у стандартного маркера только red / green / purple — иначе цвет не меняется.
 * Android принимает и hex, но для единообразия те же три оттенка.
 */
function smartMapPinColor(status: string): string {
  switch (status as WalkStatus) {
    case 'training':
      return Platform.OS === 'ios' ? 'purple' : '#9b59b6';
    case 'do_not_disturb':
      return Platform.OS === 'ios' ? 'red' : '#e74c3c';
    case 'looking_for_company':
    default:
      return Platform.OS === 'ios' ? 'green' : '#27ae60';
  }
}

const SUPPORTED_PLACE_CATEGORIES: PlaceCategory[] = ['vet', 'pet_shop', 'groomer', 'park'];
const PLACE_STYLES: Partial<Record<PlaceCategory, { label: string; color: string }>> = {
  vet: { label: 'Ветклиника', color: '#e74c3c' },
  pet_shop: { label: 'Зоомагазин', color: '#3498db' },
  groomer: { label: 'Груминг', color: '#9b59b6' },
  park: { label: 'Парк/площадка', color: '#2ecc71' },
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

/** ~100 м: не дергаем API при каждом микродвижении карты */
const roundCoord = (x: number) => Math.round(x * 1000) / 1000;
const PLACES_SEARCH_DEBOUNCE_MS = 1100;

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [mode, setMode] = useState<MapMode>('places');
  const [region, setRegion] = useState(DEFAULT_REGION);
  const [places, setPlaces] = useState<Place[]>([]);
  const [userLocations, setUserLocations] = useState<UserLocationItem[]>([]);
  const [lostAlerts, setLostAlerts] = useState<LostAlertItem[]>([]);
  const [myStatus, setMyStatus] = useState<WalkStatus>('do_not_disturb');
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingLost, setLoadingLost] = useState(false);
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<PlaceCategory[]>(SUPPORTED_PLACE_CATEGORIES);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const placesAbortRef = useRef<AbortController | null>(null);
  const placesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationDeniedAlertShownRef = useRef(false);

  const searchLat = roundCoord(region.latitude);
  const searchLng = roundCoord(region.longitude);
  const categoriesKey = selectedCategories.join(',');

  const loadPlaces = useCallback(
    async (lat: number, lng: number, opts?: { manualRefresh?: boolean }) => {
      placesAbortRef.current?.abort();
      const ac = new AbortController();
      placesAbortRef.current = ac;
      setLoadingPlaces(true);
      try {
        const data = await api.searchDogFriendlyPlaces(
          lat,
          lng,
          3,
          30,
          false,
          selectedCategories as Array<'vet' | 'pet_shop' | 'groomer' | 'park'>,
          { signal: ac.signal, timeoutMs: 78_000 }
        );
        if (placesAbortRef.current !== ac) return;
        setPlaces(Array.isArray(data.places) ? (data.places as Place[]) : []);
        if (opts?.manualRefresh) {
          const src = (data as { source?: string }).source;
          const cached = (data as { cached?: boolean }).cached;
          const label =
            src === 'yandex' ? 'Яндекс Карты' : src === 'openstreetmap' ? 'OpenStreetMap' : 'онлайн';
          Alert.alert(
            'Онлайн',
            `${cached ? 'Из кэша сервера. ' : ''}Источник: ${label}. Найдено мест: ${data.count}`
          );
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return;
        if (__DEV__) console.warn('MapScreen searchDogFriendlyPlaces:', e);
        if (placesAbortRef.current === ac) setPlaces([]);
      } finally {
        if (placesAbortRef.current === ac) setLoadingPlaces(false);
      }
    },
    [selectedCategories]
  );

  const refreshPlacesFromYandex = () => {
    loadPlaces(searchLat, searchLng, { manualRefresh: true });
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

  const loadLostAlerts = useCallback(async () => {
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
  }, []);

  /** Таб «Карта» не размонтируется — после снятия объявления в профиле нужно обновить маркеры при возврате */
  useFocusEffect(
    useCallback(() => {
      if (mode !== 'lost') return;
      loadLostAlerts();
    }, [mode, loadLostAlerts])
  );

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
    if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
    placesDebounceRef.current = setTimeout(() => {
      loadPlaces(searchLat, searchLng);
    }, PLACES_SEARCH_DEBOUNCE_MS);
    return () => {
      if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
    };
  }, [mode, searchLat, searchLng, categoriesKey, loadPlaces]);

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
  }, [mode, loadLostAlerts]);

  /** Разрешение и начальная позиция: режимы «Места» и «Умная карта» */
  useEffect(() => {
    if (mode !== 'places' && mode !== 'smart') return;
    let isMounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!isMounted) return;
      const granted = status === 'granted';
      setLocationPermission(granted);
      if (!granted) {
        if (!locationDeniedAlertShownRef.current) {
          locationDeniedAlertShownRef.current = true;
          Alert.alert(
            'Геолокация',
            'Разрешите доступ к геолокации, чтобы видеть своё положение на карте.'
          );
        }
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      if (!isMounted) return;
      const { latitude, longitude } = loc.coords;
      setRegion((r) => ({ ...r, latitude, longitude }));
      if (mode === 'smart' && user) {
        await sendMyLocation(latitude, longitude);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [mode, user?.id]);

  /** Периодическая отправка координат на сервер только в режиме «Умная карта» */
  useEffect(() => {
    if (mode !== 'smart' || !user || locationPermission !== true) {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      return;
    }

    let cancelled = false;

    (async () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      const sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 50, timeInterval: LOCATION_UPDATE_INTERVAL_MS },
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          sendMyLocation(lat, lng);
        }
      );
      if (cancelled) {
        sub.remove();
        return;
      }
      locationSubscription.current = sub;
    })();

    return () => {
      cancelled = true;
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
    };
  }, [mode, user?.id, myStatus, locationPermission]);

  const statusLabel = (s: string) => STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s;
  const placeLabel = (category: PlaceCategory) =>
    PLACE_STYLES[category]?.label ?? category;
  const placeColor = (category: PlaceCategory) =>
    PLACE_STYLES[category]?.color ?? '#2b84ff';
  /** Не показываем заглушку под маркером (в т.ч. из старых записей БД). */
  const placeAddressLine = (address?: string) => {
    const t = address?.trim() ?? '';
    if (!t || t === 'Адрес не указан') return '';
    return t;
  };
  const visiblePlaces = places.filter((p) => selectedCategories.includes(p.category));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>
          {mode === 'places' ? 'Карта мест' : mode === 'smart' ? 'Умная карта' : 'Потерялся питомец'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'places'
            ? 'Ветклиники, парки, зоомагазины, груминг'
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
            <Text style={styles.syncBtnText}>Обновить места (онлайн)</Text>
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

      {(loadingUsers && mode === 'smart') || (loadingLost && mode === 'lost') ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2b84ff" />
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={
            (mode === 'places' || mode === 'smart') && locationPermission === true
          }
          showsPointsOfInterest={false}
          showsBuildings={false}
        >
        {mode === 'places' &&
          visiblePlaces.map((p) => {
            const addr = placeAddressLine(p.address);
            return (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.latitude, longitude: p.longitude }}
                title={p.name}
                description={addr ? `${placeLabel(p.category)} • ${addr}` : placeLabel(p.category)}
                pinColor={placeColor(p.category)}
              />
            );
          })}
        {mode === 'smart' &&
          userLocations.map((u) => {
            const isMe = user?.id === u.user_id;
            const statusForPin = isMe ? myStatus : u.status;
            return (
              <Marker
                key={u.id}
                coordinate={{ latitude: u.latitude, longitude: u.longitude }}
                title={u.user_name}
                description={statusLabel(statusForPin)}
                pinColor={smartMapPinColor(statusForPin)}
              />
            );
          })}
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
        {loadingPlaces && mode === 'places' ? (
          <View style={styles.placesLoadingStrip} pointerEvents="none">
            <ActivityIndicator size="small" color="#2b84ff" />
            <Text style={styles.placesLoadingText}>Загрузка мест…</Text>
          </View>
        ) : null}
      </View>

      {mode === 'places' && (
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Категории мест:</Text>
          <View style={styles.categoryChips}>
            {SUPPORTED_PLACE_CATEGORIES.map((cat) => {
              const active = selectedCategories.includes(cat);
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, { borderColor: PLACE_STYLES[cat]?.color }, active && { backgroundColor: PLACE_STYLES[cat]?.color }]}
                  onPress={() =>
                    setSelectedCategories((prev) =>
                      prev.includes(cat) ? prev.filter((x) => x !== cat) : [...prev, cat]
                    )
                  }
                >
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{PLACE_STYLES[cat]?.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
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
  container: { flex: 1, backgroundColor: '#10131b' },
  header: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#151a25',
    borderBottomWidth: 1,
    borderBottomColor: '#283144',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#e9edf6' },
  subtitle: { fontSize: 13, color: '#a5b0c2', marginTop: 4 },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 8 },
  toggleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#21283a',
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#2b84ff' },
  toggleText: { fontSize: 14, color: '#9ca8bd' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  syncBtn: {
    marginTop: 10,
    backgroundColor: '#1c2437',
    borderColor: '#2b84ff',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  syncBtnText: { color: '#c6d9ff', fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 10, gap: 6 },
  statusLabel: { fontSize: 12, color: '#a6b2c6', marginRight: 4 },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#21283a' },
  statusBtnActive: { backgroundColor: '#2ecc71' },
  statusBtnText: { fontSize: 12, color: '#b0bbce' },
  statusBtnTextActive: { color: '#fff', fontWeight: '600' },
  mapWrap: { flex: 1, position: 'relative', width },
  map: { flex: 1, width: '100%', height: '100%' },
  placesLoadingStrip: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(21, 26, 37, 0.92)',
    borderRadius: 10,
    zIndex: 2,
    borderWidth: 1,
    borderColor: '#283144',
  },
  placesLoadingText: { color: '#a5b0c2', fontSize: 13 },
  centered: { position: 'absolute', top: '50%', left: 0, right: 0, alignItems: 'center', zIndex: 1 },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#151a25',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  legendTitle: { fontWeight: '600', marginBottom: 6, color: '#e5ebf7' },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7 },
  categoryChipText: { color: '#c3cee0', fontSize: 12 },
  categoryChipTextActive: { color: '#fff', fontWeight: '700' },
});
