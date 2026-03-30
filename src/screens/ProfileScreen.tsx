import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useUser } from '../context/UserContext';

export default function ProfileScreen() {
  const { user, logoutUser } = useUser();

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
      <View style={styles.content}>
        <Text style={styles.title}>Профиль</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Аккаунт</Text>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.badge}>Авторизован</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
  userName: { fontSize: 18, fontWeight: '600', color: '#333' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 4 },
  badge: { marginTop: 8, fontSize: 12, color: '#2ecc71', fontWeight: '600' },
  hint: { fontSize: 13, color: '#666', marginBottom: 12, lineHeight: 18 },
  button: {
    backgroundColor: '#c0392b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
