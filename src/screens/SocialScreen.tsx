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
  Image,
  Modal,
} from 'react-native';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_PLACEHOLDER_COLOR, INPUT_TEXT_COLOR } from '../theme/input';

type Friend = { id: string; name: string; email: string };
type Comment = { id: string; user_id: string; author_name: string; text: string; created_at?: string };
type Post = {
  id: string;
  user_id: string;
  author_name: string;
  pet_id?: string;
  text: string;
  media_url?: string;
  likes: number;
  comments_count: number;
  comments: Comment[];
  created_at?: string;
};

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [feed, setFeed] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendEmail, setFriendEmail] = useState('');
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState<string | null>(null);
  const [sort, setSort] = useState<'interesting' | 'newest' | 'likes' | 'comments'>('interesting');
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannedPet, setScannedPet] = useState<any | null>(null);
  const [scanLocked, setScanLocked] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [f, p] = await Promise.all([api.getFriends(user.id), api.getFeed(sort)]);
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
  }, [user?.id, sort]);

  const addByEmail = async () => {
    if (!user || !friendEmail.trim()) {
      Alert.alert('Ошибка', 'Введите email пользователя');
      return;
    }
    try {
      await api.addFriend({ friend_email: friendEmail.trim().toLowerCase() });
      setFriendEmail('');
      await loadData();
      Alert.alert('Готово', 'Друг добавлен');
    } catch (e) {
      Alert.alert('Не удалось добавить', e instanceof Error ? e.message : 'Проверьте QR');
    }
  };

  const createPost = async () => {
    if (!user || !postText.trim()) return;
    try {
      await api.createFeedPost({ text: postText.trim(), media_url: postImage ?? undefined });
      setPostText('');
      setPostImage(null);
      await loadData();
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось опубликовать пост');
    }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нужен доступ', 'Разрешите доступ к фото для публикации изображений');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      const mime = result.assets[0].mimeType || 'image/jpeg';
      setPostImage(`data:${mime};base64,${result.assets[0].base64}`);
    }
  };

  const addByScannedQR = async (value: string) => {
    if (scanLocked) return;
    setScanLocked(true);
    if (!user) return;
    try {
      const pet = (await api.getPetByQR(value.trim())) as any;
      setScannedPet(pet);
      setScannerOpen(false);
    } catch (e) {
      Alert.alert('Не удалось добавить', e instanceof Error ? e.message : 'Проверьте QR');
    } finally {
      setTimeout(() => setScanLocked(false), 800);
    }
  };

  const openScanner = async () => {
    if (!cameraPermission?.granted) {
      const req = await requestCameraPermission();
      if (!req.granted) {
        Alert.alert('Нужен доступ', 'Разрешите доступ к камере для сканирования QR');
        return;
      }
    }
    setScannerOpen(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.title}>Сообщество</Text>
      <Text style={styles.subtitle}>
        Добавляйте друзей, публикуйте посты и обсуждайте новости
      </Text>

      {/* Поиск / QR */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Добавить друга</Text>
        <TextInput
          style={styles.input}
          placeholder="Email пользователя"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={friendEmail}
          onChangeText={setFriendEmail}
        />
        <TouchableOpacity style={styles.postButton} onPress={addByEmail}>
          <Text style={styles.postButtonText}>Добавить по email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qrButton} onPress={openScanner}>
          <Text style={styles.qrButtonText}>Сканировать QR питомца</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Новый пост</Text>
        <TextInput
          style={[styles.input, styles.postInput]}
          placeholder="Напишите, как прошла прогулка..."
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={postText}
          onChangeText={setPostText}
          multiline
        />
        <TouchableOpacity style={styles.photoBtn} onPress={choosePhoto}>
          <Text style={styles.photoBtnText}>{postImage ? 'Фото выбрано' : 'Выбрать фото с телефона'}</Text>
        </TouchableOpacity>
        {postImage ? <Image source={{ uri: postImage }} style={styles.postImagePreview} /> : null}
        <TouchableOpacity style={styles.postButton} onPress={createPost}>
          <Text style={styles.postButtonText}>Опубликовать</Text>
        </TouchableOpacity>
      </View>

      {/* Друзья */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Мои друзья</Text>
        {loading ? <ActivityIndicator color="#2b84ff" /> : null}
        {!loading && friends.length === 0 ? <Text style={styles.empty}>Пока нет друзей</Text> : null}
        {friends.map((f) => (
          <TouchableOpacity key={f.id} style={styles.friendCard}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.friendName}>{f.name}</Text>
              <Text style={styles.friendPet}>{f.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.textAction}
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
              <Text style={styles.textActionLabel}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.textAction}
              onPress={async () => {
                try {
                  await api.removeFriend(f.id);
                  await loadData();
                } catch (e) {
                  Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось удалить друга');
                }
              }}
            >
              <Text style={styles.textActionLabelDanger}>Удалить</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>

      {/* Лента */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Лента</Text>
        <View style={styles.sortRow}>
          {[
            { id: 'interesting', label: 'Интересные' },
            { id: 'newest', label: 'Новые' },
            { id: 'likes', label: 'По лайкам' },
            { id: 'comments', label: 'По комментариям' },
          ].map((s) => (
            <TouchableOpacity key={s.id} style={[styles.sortBtn, sort === s.id && styles.sortBtnActive]} onPress={() => setSort(s.id as typeof sort)}>
              <Text style={[styles.sortBtnText, sort === s.id && styles.sortBtnTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {feed.map((p) => (
          <View key={p.id} style={styles.feedCard}>
            <View style={styles.feedHeader}>
              <View style={styles.avatarSmall} />
              <View>
                <Text style={styles.feedAuthor}>{p.author_name || 'Пользователь'}</Text>
                <Text style={styles.feedPet}>{p.created_at ? new Date(p.created_at).toLocaleString() : ''}</Text>
              </View>
            </View>
            <Text style={styles.feedText}>{p.text}</Text>
            {p.media_url ? <Image source={{ uri: p.media_url }} style={styles.feedImage} /> : null}
            <View style={styles.feedActions}>
              <TouchableOpacity style={styles.smallAction} onPress={async () => { await api.toggleFeedLike(p.id); await loadData(); }}>
                <Text style={styles.smallActionText}>Нравится ({p.likes})</Text>
              </TouchableOpacity>
              <Text style={styles.commentsCount}>Комментарии: {p.comments_count}</Text>
              {user?.is_admin ? (
                <TouchableOpacity style={styles.smallActionDanger} onPress={async () => { await api.deleteFeedPost(p.id); await loadData(); }}>
                  <Text style={styles.adminDelete}>Удалить</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {p.comments.map((cmt) => (
              <Text key={cmt.id} style={styles.commentLine}><Text style={styles.commentAuthor}>{cmt.author_name}:</Text> {cmt.text}</Text>
            ))}
            <View style={styles.commentRow}>
              <TextInput
                style={[styles.input, styles.commentInput]}
                placeholder="Ваш комментарий"
                placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
                value={commentDraft[p.id] ?? ''}
                onChangeText={(v) => setCommentDraft((prev) => ({ ...prev, [p.id]: v }))}
              />
              <TouchableOpacity
                style={styles.commentSend}
                onPress={async () => {
                  const text = (commentDraft[p.id] ?? '').trim();
                  if (!text) return;
                  await api.addFeedComment(p.id, text);
                  setCommentDraft((prev) => ({ ...prev, [p.id]: '' }));
                  await loadData();
                }}
              >
                <Text style={styles.commentSendText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      <Modal visible={scannerOpen} animationType="slide">
        <View style={styles.scannerWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => addByScannedQR(data)}
          />
          <TouchableOpacity style={styles.closeScanner} onPress={() => setScannerOpen(false)}>
            <Text style={styles.closeScannerText}>Закрыть</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal visible={!!scannedPet} transparent animationType="fade">
        <View style={styles.petModalOverlay}>
          <View style={styles.petModalCard}>
            <Text style={styles.sectionTitle}>Карточка питомца</Text>
            <Text style={styles.petLine}>Кличка: {scannedPet?.name}</Text>
            <Text style={styles.petLine}>Порода: {scannedPet?.breed}</Text>
            <Text style={styles.petLine}>Возраст: {scannedPet?.age}</Text>
            <Text style={styles.petLine}>QR: {scannedPet?.qr_code_data}</Text>
            <TouchableOpacity
              style={styles.postButton}
              onPress={async () => {
                const friendId = scannedPet?.owner_id || scannedPet?.ownerId;
                if (!friendId || friendId === user?.id) {
                  setScannedPet(null);
                  return;
                }
                await api.addFriend({ friend_id: friendId });
                setScannedPet(null);
                await loadData();
                Alert.alert('Готово', 'Владелец добавлен в друзья');
              }}
            >
              <Text style={styles.postButtonText}>Добавить владельца в друзья</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.qrButton} onPress={() => setScannedPet(null)}>
              <Text style={styles.qrButtonText}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11131a' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#eceff4', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#aeb7c5', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#2c3240',
    borderRadius: 10,
    backgroundColor: '#181c26',
    padding: 12,
    marginBottom: 10,
    color: INPUT_TEXT_COLOR,
    fontSize: 15,
  },
  postInput: { minHeight: 90, textAlignVertical: 'top' },
  photoBtn: { backgroundColor: '#2a2f3e', padding: 10, borderRadius: 10, marginBottom: 10, alignItems: 'center' },
  photoBtnText: { color: '#dce3ff', fontWeight: '600' },
  postImagePreview: { width: '100%', height: 180, borderRadius: 10, marginBottom: 10 },
  qrButton: {
    marginTop: 8,
    backgroundColor: '#5b46ff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  postButton: { backgroundColor: '#2b84ff', padding: 14, borderRadius: 12, alignItems: 'center' },
  postButtonText: { color: '#fff', fontWeight: '700' },
  qrButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { backgroundColor: '#151925', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#2b3242' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#e5e9f0', marginBottom: 12 },
  friendCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#2a3040' },
  friendName: { fontSize: 16, fontWeight: '600', color: '#e9ecf3' },
  friendPet: { fontSize: 12, color: '#a5afbf' },
  textAction: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: '#22293a' },
  textActionLabel: { color: '#afc8ff', fontSize: 12, fontWeight: '600' },
  textActionLabelDanger: { color: '#ff9aa4', fontSize: 12, fontWeight: '600' },
  feedCard: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2a3040' },
  feedAuthor: { fontSize: 14, fontWeight: '600', color: '#e8edf7' },
  feedPet: { fontSize: 12, color: '#9da7b8' },
  feedText: { fontSize: 14, color: '#dbe2f1', marginBottom: 8 },
  feedLikes: { fontSize: 14, color: '#ff8493' },
  commentsCount: { fontSize: 13, color: '#9fabc1' },
  feedImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  feedActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  smallAction: { backgroundColor: '#252d40', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  smallActionText: { color: '#dbe6ff', fontSize: 12, fontWeight: '600' },
  smallActionDanger: { backgroundColor: '#3b2730', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  commentLine: { color: '#ced5e3', marginBottom: 4 },
  commentAuthor: { fontWeight: '700', color: '#f4f6fa' },
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, marginBottom: 0 },
  commentSend: { backgroundColor: '#6d4dff', width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  commentSendText: { color: '#fff' },
  adminDelete: { color: '#ff6f7a', fontWeight: '600' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  sortBtn: { backgroundColor: '#232938', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 14 },
  sortBtnActive: { backgroundColor: '#2b84ff' },
  sortBtnText: { color: '#aeb8ca', fontSize: 12 },
  sortBtnTextActive: { color: '#fff' },
  scannerWrap: { flex: 1, backgroundColor: '#000' },
  closeScanner: { position: 'absolute', bottom: 40, alignSelf: 'center', backgroundColor: '#ffffffcc', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  closeScannerText: { color: '#000', fontWeight: '600' },
  petModalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'center', padding: 20 },
  petModalCard: { backgroundColor: '#161b27', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#2a3247' },
  petLine: { color: '#dce4f5', marginBottom: 6 },
  empty: { color: '#8d97ab' },
});
