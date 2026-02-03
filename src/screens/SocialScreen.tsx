import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';

const DEMO_FRIENDS = [
  { id: '1', name: 'Анна', pet: 'Рекс' },
  { id: '2', name: 'Иван', pet: 'Белка' },
];

const DEMO_FEED = [
  { id: '1', author: 'Анна', pet: 'Рекс', text: 'Отличная прогулка в парке! 🐕', likes: 5 },
  { id: '2', author: 'Иван', pet: 'Белка', text: 'Новая игрушка — восторг!', likes: 3 },
];

export default function SocialScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Друзья и общение</Text>
      <Text style={styles.subtitle}>
        Найдите владельцев собак, общайтесь в чатах, делитесь фото
      </Text>

      {/* Поиск / QR */}
      <TouchableOpacity style={styles.qrButton}>
        <Text style={styles.qrButtonText}>📷 Отсканировать QR-код на ошейнике</Text>
      </TouchableOpacity>

      {/* Друзья */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Мои друзья</Text>
        {DEMO_FRIENDS.map((f) => (
          <TouchableOpacity key={f.id} style={styles.friendCard}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.friendName}>{f.name}</Text>
              <Text style={styles.friendPet}>Питомец: {f.pet}</Text>
            </View>
            <Text style={styles.chatBtn}>💬</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Лента */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Лента</Text>
        {DEMO_FEED.map((p) => (
          <View key={p.id} style={styles.feedCard}>
            <View style={styles.feedHeader}>
              <View style={styles.avatarSmall} />
              <View>
                <Text style={styles.feedAuthor}>{p.author}</Text>
                <Text style={styles.feedPet}>{p.pet}</Text>
              </View>
            </View>
            <Text style={styles.feedText}>{p.text}</Text>
            <Text style={styles.feedLikes}>❤️ {p.likes}</Text>
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
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  qrButton: {
    backgroundColor: '#FF9F43',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  qrButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  friendCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#e9ecef' },
  friendName: { fontSize: 16, fontWeight: '600', color: '#333' },
  friendPet: { fontSize: 12, color: '#666' },
  chatBtn: { marginLeft: 'auto', fontSize: 20 },
  feedCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e9ecef' },
  feedAuthor: { fontSize: 14, fontWeight: '600', color: '#333' },
  feedPet: { fontSize: 12, color: '#666' },
  feedText: { fontSize: 14, color: '#333', marginBottom: 8 },
  feedLikes: { fontSize: 12, color: '#999' },
});
