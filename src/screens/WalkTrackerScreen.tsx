import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function WalkTrackerScreen() {
  const [isWalking, setIsWalking] = useState(false);
  const [stats, setStats] = useState({
    distance: 0,
    duration: 0,
    calories: 0,
  });

  const demoWalks = [
    { date: 'Сегодня', distance: 2.3, duration: 45, calories: 120 },
    { date: 'Вчера', distance: 3.1, duration: 55, calories: 165 },
    { date: '28 янв', distance: 1.8, duration: 30, calories: 95 },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Трекер прогулок</Text>
      <Text style={styles.subtitle}>Как фитнес-браслет для вашей собаки</Text>

      {/* Кнопка старта прогулки */}
      <TouchableOpacity
        style={[styles.startButton, isWalking && styles.stopButton]}
        onPress={() => setIsWalking(!isWalking)}
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
        {demoWalks.map((walk, i) => (
          <View key={i} style={styles.walkCard}>
            <Text style={styles.walkDate}>{walk.date}</Text>
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
});
