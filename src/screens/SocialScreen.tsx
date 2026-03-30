import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';

type Friend = { id: string; name: string; email: string };
type Post = { id: string; user_id: string; pet_id?: string; text: string; likes: number; created_at?: string };

export default function SocialScreen() {
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [feed, setFeed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState('');
  const [postText, setPostText] = useState('');

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [f, p] = await Promise.all([api.getFriends(user.id), api.getFeed()]);
      setFriends(Array.isArray(f) ? f : []);
      setFeed(Array.isArray(p) ? (p as Post[]) : []);
    } catch (e) {
      if (__DEV__) console.warn('SocialScreen load:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const addByQR = async () => {
    if (!user || !qrData.trim()) {
      Alert.alert('Ошибка', 'Введите QR-код питомца');
      return;
    }
    try {
      const pet = await api.getPetByQR(qrData.trim()) as { owner_id?: string; ownerId?: string };
      const friendId = pet.owner_id || pet.ownerId;
      if (!friendId) throw new Error('Не удалось определить владельца');
      if (friendId === user.id) throw new Error('Это ваш питомец');
      await api.addFriend({ friend_id: friendId });
      setQrData('');
      await loadData();
      Alert.alert('Готово', 'Друг добавлен');
    } catch (e) {
      Alert.alert('Не удалось добавить', e instanceof Error ? e.message : 'Проверьте QR');
    }
  };

  const createPost = async () => {
    if (!user || !postText.trim()) return;
    try {
      await api.createFeedPost({ text: postText.trim() });
      setPostText('');
      await loadData();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось опубликовать пост');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Друзья и общение</Text>
      <Text style={styles.subtitle}>
        Найдите владельцев собак, общайтесь в чатах, делитесь фото
      </Text>

      {/* Поиск / QR */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Добавить друга по QR-коду питомца</Text>
        <TextInput
          style={styles.input}
          placeholder="Например: pet-dogowner-001"
          placeholderTextColor="#999"
          value={qrData}
          onChangeText={setQrData}
        />
        <TouchableOpacity style={styles.qrButton} onPress={addByQR}>
          <Text style={styles.qrButtonText}>📷 Добавить по QR</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Новый пост</Text>
        <TextInput
          style={[styles.input, styles.postInput]}
          placeholder="Напишите, как прошла прогулка..."
          placeholderTextColor="#999"
          value={postText}
          onChangeText={setPostText}
          multiline
        />
        <TouchableOpacity style={styles.postButton} onPress={createPost}>
          <Text style={styles.postButtonText}>Опубликовать</Text>
        </TouchableOpacity>
      </View>

      {/* Друзья */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Мои друзья</Text>
        {loading ? <ActivityIndicator color="#FF9F43" /> : null}
        {!loading && friends.length === 0 ? <Text style={styles.empty}>Пока нет друзей</Text> : null}
        {friends.map((f) => (
          <TouchableOpacity key={f.id} style={styles.friendCard}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.friendName}>{f.name}</Text>
              <Text style={styles.friendPet}>{f.email}</Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                const url = `mailto:${f.email}?subject=DogPaw`;
                const can = await Linking.canOpenURL(url);
                if (can) {
                  await Linking.openURL(url);
                } else {
                  Alert.alert('Связь', `Email: ${f.email}`);
                }
              }}
            >
              <Text style={styles.chatBtn}>💬</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* Лента */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Лента</Text>
        {feed.map((p) => (
          <View key={p.id} style={styles.feedCard}>
            <View style={styles.feedHeader}>
              <View style={styles.avatarSmall} />
              <View>
                <Text style={styles.feedAuthor}>{p.user_id}</Text>
                <Text style={styles.feedPet}>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 10,
  },
  postInput: { minHeight: 90, textAlignVertical: 'top' },
  qrButton: {
    backgroundColor: '#FF9F43',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  postButton: { backgroundColor: '#2ecc71', padding: 14, borderRadius: 12, alignItems: 'center' },
  postButtonText: { color: '#fff', fontWeight: '700' },
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
  empty: { color: '#777' },
});
