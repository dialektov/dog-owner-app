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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WalkStackParamList } from '../navigation/WalkStack';

type Nav = NativeStackNavigationProp<WalkStackParamList, 'WalkMain'>;

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WalkTrackerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useUser();
  const [isWalking, setIsWalking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [petId, setPetId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    distance: 0,
    calories: 0,
  });
  const [elapsedSec, setElapsedSec] = useState(0);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const lastPointRef = useRef<{ latitude: number; longitude: number } | null>(null);
  /** Накопленное расстояние (км) — единственный источник правды, без гонок setState */
  const totalKmRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const routeRef = useRef<{ lat: number; lng: number }[]>([]);

  /** Макс. длина сегмента между двумя точками (км): больше — считаем скачком GPS и не суммируем */
  const MAX_SEGMENT_KM = 0.25;
  /** Мин. сегмент (км): шум меньше не копим */
  const MIN_SEGMENT_KM = 0.00002;
  /** Пропускаем точки с грубой точностью (м), если поле есть */
  const MAX_ACCURACY_M = 80;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const full = await api.getUser(user.id);
        const pets = (full as { pets?: { id: string }[] }).pets ?? [];
        if (!pets.length) {
          setPetId(null);
          return;
        }
        setPetId(pets[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const distanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLng = (b.longitude - a.longitude) * Math.PI / 180;
    const raw =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const aa = Math.min(1, Math.max(0, raw));
    return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(Math.max(1e-12, 1 - aa)));
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
    totalKmRef.current = 0;
    setStats({ distance: 0, calories: 0 });
    setElapsedSec(0);
    routeRef.current = [];
    lastPointRef.current = null;
    startedAtRef.current = new Date();
    setIsWalking(true);

    timerRef.current = setInterval(() => {
      if (!startedAtRef.current) return;
      const sec = Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000);
      setElapsedSec(sec);
      const km = totalKmRef.current;
      setStats((prev) => ({
        ...prev,
        distance: Number(km.toFixed(2)),
        calories: Math.round(km * 52),
      }));
    }, 1000);

    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 15, timeInterval: 10000 },
      (pos) => {
        const acc = pos.coords.accuracy;
        if (acc != null && acc > MAX_ACCURACY_M) {
          return;
        }
        const point = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        routeRef.current.push({ lat: point.latitude, lng: point.longitude });

        if (!lastPointRef.current) {
          lastPointRef.current = point;
          return;
        }

        const add = distanceKm(lastPointRef.current, point);
        lastPointRef.current = point;

        if (add < MIN_SEGMENT_KM) {
          return;
        }
        if (add > MAX_SEGMENT_KM) {
          return;
        }

        totalKmRef.current += add;
        const km = totalKmRef.current;
        setStats((prev) => ({
          ...prev,
          distance: Number(km.toFixed(2)),
          calories: Math.round(km * 52),
        }));
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

    const finalKm = Number(totalKmRef.current.toFixed(2));
    const finalCal = Math.round(finalKm * 52);
    const ended = new Date();
    const elapsedSeconds = Math.floor((ended.getTime() - startedAtRef.current.getTime()) / 1000);
    const durationMinutes = Math.max(1, Math.ceil(elapsedSeconds / 60));

    try {
      await api.createWalk({
        pet_id: petId,
        distance: finalKm,
        duration: durationMinutes,
        calories: finalCal,
        route: JSON.stringify(routeRef.current),
        started_at: startedAtRef.current.toISOString(),
        ended_at: ended.toISOString(),
      });
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
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Трекер прогулок</Text>
      <Text style={styles.subtitle}>Как фитнес-браслет для вашей собаки</Text>

      <TouchableOpacity
        style={styles.historyLink}
        onPress={() => navigation.navigate('WalkHistory')}
        disabled={isWalking}
      >
        <Text style={[styles.historyLinkText, isWalking && styles.historyLinkDisabled]}>История прогулок ›</Text>
      </TouchableOpacity>

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
            <Text style={styles.statValue}>{stats.distance.toFixed(2)}</Text>
            <Text style={styles.statLabel}>км</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatElapsed(elapsedSec)}</Text>
            <Text style={styles.statLabel}>время</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.calories}</Text>
            <Text style={styles.statLabel}>ккал</Text>
          </View>
        </View>
      )}

      {loading ? <ActivityIndicator color="#2b84ff" style={{ marginTop: 16 }} /> : null}
      {!loading && !petId ? (
        <Text style={styles.hint}>Добавьте карточку питомца, чтобы записывать прогулки.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131b' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#e9edf6', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#a5b0c4', marginBottom: 12 },
  historyLink: { alignSelf: 'flex-start', marginBottom: 16 },
  historyLinkText: { fontSize: 16, color: '#5b8cff', fontWeight: '600' },
  historyLinkDisabled: { color: '#4a5568' },
  startButton: {
    backgroundColor: '#2b84ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    gap: 10,
  },
  stopButton: { backgroundColor: '#7b3fe4' },
  startButtonIcon: { fontSize: 24 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  liveStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#161b27',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statBox: { alignItems: 'center', minWidth: 88 },
  statValue: { fontSize: 22, fontWeight: '700', color: '#eef2fb' },
  statLabel: { fontSize: 12, color: '#a5b0c4', marginTop: 4 },
  hint: { color: '#97a2b7', marginTop: 8 },
});
