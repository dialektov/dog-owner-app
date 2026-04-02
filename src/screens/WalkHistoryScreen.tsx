import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import type { WalkStackParamList } from '../navigation/WalkStack';
import type { WalkRecord } from '../types';

type Nav = NativeStackNavigationProp<WalkStackParamList, 'WalkHistory'>;

export default function WalkHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useUser();
  const [petId, setPetId] = useState<string | null>(null);
  const [walks, setWalks] = useState<WalkRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWalks = async (id: string) => {
    try {
      const data = await api.getWalks(id);
      setWalks(Array.isArray(data) ? (data as WalkRecord[]) : []);
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
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (petId) {
        loadWalks(petId);
      }
    }, [petId])
  );

  const renderItem = ({ item }: { item: WalkRecord }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('WalkDetail', { walk: item })}
      activeOpacity={0.7}
    >
      <Text style={styles.rowDate}>{new Date(item.started_at).toLocaleString('ru-RU')}</Text>
      <View style={styles.rowStats}>
        <Text style={styles.rowStat}>{item.distance} км</Text>
        <Text style={styles.rowStat}>{item.duration} мин</Text>
        <Text style={styles.rowStat}>{item.calories} ккал</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backText}>‹ Назад</Text>
        </TouchableOpacity>
        <Text style={styles.title}>История прогулок</Text>
      </View>

      {!petId && !loading ? (
        <Text style={styles.empty}>Добавьте питомца, чтобы вести историю</Text>
      ) : null}

      {loading ? <ActivityIndicator color="#2b84ff" style={{ marginTop: 24 }} /> : null}

      {!loading && petId && walks.length === 0 ? (
        <Text style={styles.empty}>Пока нет сохранённых прогулок</Text>
      ) : null}

      <FlatList
        data={walks}
        keyExtractor={(w) => w.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#10131b' },
  header: { paddingHorizontal: 16, marginBottom: 8 },
  backBtn: { alignSelf: 'flex-start', marginBottom: 8 },
  backText: { color: '#5b8cff', fontSize: 17 },
  title: { fontSize: 22, fontWeight: '700', color: '#e9edf6' },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    backgroundColor: '#161b27',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2c3448',
  },
  rowDate: { fontSize: 14, fontWeight: '600', color: '#e9edf6', marginBottom: 6 },
  rowStats: { flexDirection: 'row', gap: 14, flexWrap: 'wrap' },
  rowStat: { color: '#a5b0c4', fontSize: 14 },
  empty: { color: '#97a2b7', paddingHorizontal: 20, marginTop: 16 },
});
