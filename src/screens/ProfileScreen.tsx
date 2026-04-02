import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useUser } from '../context/UserContext';
import { api } from '../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INPUT_PLACEHOLDER_COLOR } from '../theme/input';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, logoutUser } = useUser();
  const [friendEmail, setFriendEmail] = useState('');

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      Alert.alert('Ошибка', 'Не удалось выйти из аккаунта');
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.hint}>Требуется вход в аккаунт.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Профиль</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Аккаунт</Text>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.badge}>{user.is_admin ? 'Администратор' : 'Авторизован'}</Text>
        </View>
        {user.email.toLowerCase() === 'idialektov@gmail.com' ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Выдать права администратора другу</Text>
            <TextInput
              style={styles.input}
              value={friendEmail}
              onChangeText={setFriendEmail}
              placeholder="email друга"
              placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
            />
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={async () => {
                try {
                  await api.grantAdmin({ friend_email: friendEmail.trim().toLowerCase() });
                  setFriendEmail('');
                  Alert.alert('Готово', 'Права администратора выданы');
                } catch (e) {
                  Alert.alert('Ошибка', e instanceof Error ? e.message : 'Не удалось выдать права');
                }
              }}
            >
              <Text style={styles.buttonText}>Выдать права</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#11131a' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#ecf0f7', marginBottom: 20 },
  card: {
    backgroundColor: '#161b27',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontSize: 14, color: '#9aa5ba', marginBottom: 8 },
  userName: { fontSize: 18, fontWeight: '600', color: '#e9ecf3' },
  userEmail: { fontSize: 14, color: '#a5b0c4', marginTop: 4 },
  badge: { marginTop: 8, fontSize: 12, color: '#6ac2ff', fontWeight: '600' },
  hint: { fontSize: 13, color: '#9ea8bc', marginBottom: 12, lineHeight: 18 },
  input: { backgroundColor: '#1f2533', borderRadius: 10, borderWidth: 1, borderColor: '#313b52', color: '#eaf0ff', padding: 12, marginBottom: 10 },
  buttonPrimary: { backgroundColor: '#2b84ff', padding: 14, borderRadius: 10, alignItems: 'center' },
  button: {
    backgroundColor: '#c0392b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
