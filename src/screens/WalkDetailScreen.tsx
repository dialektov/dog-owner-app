import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/client';
import type { WalkStackParamList } from '../navigation/WalkStack';

type Nav = NativeStackNavigationProp<WalkStackParamList, 'WalkDetail'>;
type R = RouteProp<WalkStackParamList, 'WalkDetail'>;

export default function WalkDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const { walk } = route.params;
  const [deleting, setDeleting] = useState(false);

  const routePoints = useMemo(() => {
    if (!walk.route) return 0;
    try {
      const parsed = JSON.parse(walk.route) as unknown;
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }, [walk.route]);

  const onDelete = () => {
    Alert.alert('Удалить прогулку?', 'Запись будет удалена без восстановления.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.deleteWalk(walk.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось удалить');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: 40 }]}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
        <Text style={styles.backText}>‹ Назад</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Прогулка</Text>
      <Text style={styles.date}>{new Date(walk.started_at).toLocaleString('ru-RU')}</Text>
      <Text style={styles.subdate}>до {new Date(walk.ended_at).toLocaleString('ru-RU')}</Text>

      <View style={styles.card}>
        <Row label="Расстояние" value={`${walk.distance} км`} />
        <Row label="Длительность" value={`${walk.duration} мин`} />
        <Row label="Калории" value={`${walk.calories} ккал`} />
        {routePoints > 0 ? <Row label="Точек маршрута" value={String(routePoints)} /> : null}
      </View>

      <TouchableOpacity
        style={[styles.deleteBtn, deleting && styles.deleteBtnDisabled]}
        onPress={onDelete}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.deleteText}>Удалить прогулку</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131b' },
  content: { paddingHorizontal: 20 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 12 },
  backText: { color: '#5b8cff', fontSize: 17 },
  title: { fontSize: 24, fontWeight: '700', color: '#e9edf6', marginBottom: 8 },
  date: { fontSize: 16, color: '#cdd6e7' },
  subdate: { fontSize: 14, color: '#7f8aa0', marginBottom: 20 },
  card: {
    backgroundColor: '#161b27',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2c3448',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a3244',
  },
  rowLabel: { color: '#a5b0c4', fontSize: 15 },
  rowValue: { color: '#e9edf6', fontSize: 15, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#c43d3d',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteBtnDisabled: { opacity: 0.6 },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
