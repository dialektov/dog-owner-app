import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');

type MapMode = 'places' | 'smart'; // Места / Умная карта

const DEMO_PLACES = [
  { id: '1', name: 'Ветклиника "Друг"', category: 'vet', lat: 55.7558, lng: 37.6173 },
  { id: '2', name: 'Зоопарк "Москва"', category: 'park', lat: 55.7620, lng: 37.6150 },
  { id: '3', name: 'Зоомагазин "Лапа"', category: 'pet_shop', lat: 55.7580, lng: 37.6120 },
];

const DEMO_USERS = [
  { id: 'u1', name: 'Анна', status: 'looking_for_company', lat: 55.7565, lng: 37.6180 },
  { id: 'u2', name: 'Иван', status: 'training', lat: 55.7600, lng: 37.6140 },
];

const STATUS_LABELS: Record<string, string> = {
  looking_for_company: 'Ищем компанию',
  training: 'На тренировке',
  do_not_disturb: 'Не беспокоить',
};

export default function MapScreen() {
  const [mode, setMode] = useState<MapMode>('places');
  const [region] = useState({
    latitude: 55.7558,
    longitude: 37.6173,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {mode === 'places' ? 'Карта мест' : 'Умная карта'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'places'
            ? 'Ветклиники, парки, зоомагазины, кафе'
            : 'Где гуляют друзья и кто ищет компанию'}
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
        </View>
      </View>

      <MapView style={styles.map} region={region} showsUserLocation>
        {mode === 'places' &&
          DEMO_PLACES.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              title={p.name}
              pinColor="#FF9F43"
            />
          ))}
        {mode === 'smart' &&
          DEMO_USERS.map((u) => (
            <Marker
              key={u.id}
              coordinate={{ latitude: u.lat, longitude: u.lng }}
              title={u.name}
              description={STATUS_LABELS[u.status]}
              pinColor="#2ecc71"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 16, paddingTop: 40, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 22, fontWeight: '700', color: '#333' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  toggleRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  toggleBtnActive: { backgroundColor: '#FF9F43' },
  toggleText: { fontSize: 14, color: '#666' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  map: { flex: 1, width },
  legend: { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: '#fff', padding: 12, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
  legendTitle: { fontWeight: '600', marginBottom: 4 },
});
