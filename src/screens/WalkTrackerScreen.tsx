import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';

type ApiWalk = {
  id: string;
  distance: number;
  duration: number;
  calories: number;
  started_at: string;
  ended_at: string;
};

export default function WalkTrackerScreen() {
  const { user } = useUser();
  const [isWalking, setIsWalking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [petId, setPetId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    distance: 0,
    duration: 0,
    calories: 0,
  });
  const [walks, setWalks] = useState<ApiWalk[]>([]);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const routeRef = useRef<{ lat: number; lng: number }[]>([]);

  const loadWalks = async (targetPetId: string) => {
    try {
      const data = await api.getWalks(targetPetId);
      setWalks(Array.isArray(data) ? (data as ApiWalk[]) : []);
    } catch {
      setWalks([]);
    }
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const full = await api.getUser(user.id);
        const pets = (full as { pets?: { id: string }[] }).pets ?? [];
        if (!pets.length) {
          setPetId(null);
          setWalks([]);
          return;
        }
        setPetId(pets[0].id);
        await loadWalks(pets[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLng = (b.longitude - a.longitude) * Math.PI / 180;
    const aa =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  };

  const startWalk = async () => {
    if (!petId) {
      Alert.alert('Нет питомца', 'Добавьте питомца, чтобы начать прогулку');
      return;
    }
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Нет доступа', 'Разрешите геолокацию для трекинга');
      return;
    }
    setStats({ distance: 0, duration: 0, calories: 0 });
    routeRef.current = [];
    lastPointRef.current = null;
    startedAtRef.current = new Date();
    setIsWalking(true);

    timerRef.current = setInterval(() => {
      setStats((prev) => {
        const duration = prev.duration + 1;
        const calories = Math.round(prev.distance * 52);
        return { ...prev, duration, calories };
      });
    }, 60_000);

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 12000 },
      (pos) => {
        const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        routeRef.current.push({ lat: point.latitude, lng: point.longitude });
        if (lastPointRef.current) {
          const add = distanceKm(lastPointRef.current, point);
          setStats((prev) => ({ ...prev, distance: Number((prev.distance + add).toFixed(2)), calories: Math.round((prev.distance + add) * 52) }));
        }
        lastPointRef.current = point;
      }
    );
  };

  const stopWalk = async () => {
    if (!petId || !startedAtRef.current) return;
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsWalking(false);

    try {
      await api.createWalk({
        pet_id: petId,
        distance: stats.distance,
        duration: stats.duration,
        calories: stats.calories,
        route: JSON.stringify(routeRef.current),
        started_at: startedAtRef.current.toISOString(),
        ended_at: new Date().toISOString(),
      });
      await loadWalks(petId);
      Alert.alert('Готово', 'Прогулка сохранена');
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось сохранить прогулку');
    }
  };

  useEffect(() => {
    return () => {
      if (watchRef.current) watchRef.current.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Трекер прогулок</Text>
      <Text style={styles.subtitle}>Как фитнес-браслет для вашей собаки</Text>

      {/* Кнопка старта прогулки */}
      <TouchableOpacity
        style={[styles.startButton, isWalking && styles.stopButton]}
        onPress={() => (isWalking ? stopWalk() : startWalk())}
      >
        <Text style={styles.startButtonIcon}>{isWalking ? '⏹' : '▶'}</Text>
        <Text style={styles.startButtonText}>
          {isWalking ? 'Завершить прогулку' : 'Начать прогулку'}
        </Text>
      </TouchableOpacity>

      {/* Статистика во время прогулки */}
      {isWalking && (
        <View style={styles.liveStats}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.distance.toFixed(1)}</Text>
            <Text style={styles.statLabel}>км</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.duration}</Text>
            <Text style={styles.statLabel}>мин</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.calories}</Text>
            <Text style={styles.statLabel}>ккал</Text>
          </View>
        </View>
      )}

      {/* История прогулок */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>История прогулок</Text>
        {loading ? <ActivityIndicator color="#FF9F43" /> : null}
        {!loading && walks.length === 0 ? <Text style={styles.empty}>Пока нет прогулок</Text> : null}
        {walks.map((walk) => (
          <View key={walk.id} style={styles.walkCard}>
            <Text style={styles.walkDate}>{new Date(walk.started_at).toLocaleString()}</Text>
            <View style={styles.walkStats}>
              <Text>📍 {walk.distance} км</Text>
              <Text>⏱ {walk.duration} мин</Text>
              <Text>🔥 {walk.calories} ккал</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  startButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    gap: 10,
  },
  stopButton: { backgroundColor: '#e74c3c' },
  startButtonIcon: { fontSize: 24 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  liveStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700', color: '#333' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  walkCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  walkDate: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
  walkStats: { flexDirection: 'row', gap: 16 },
  empty: { color: '#777' },
});
