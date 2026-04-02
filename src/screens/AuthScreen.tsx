import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser } from '../context/UserContext';
import { INPUT_PLACEHOLDER_COLOR } from '../theme/input';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { loginUser, registerUser, loading } = useUser();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim() || (mode === 'register' && !name.trim())) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginUser(email, password);
      } else {
        await registerUser(email, name, password);
      }
    } catch (e) {
      Alert.alert('Ошибка', e instanceof Error ? e.message : 'Проверьте данные');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.brand}>DogPaw</Text>
      <Text style={styles.title}>{mode === 'login' ? 'Вход' : 'Регистрация'}</Text>
      <Text style={styles.hint}>
        {mode === 'login' ? 'Войдите в аккаунт, чтобы синхронизировать данные' : 'Создайте аккаунт для доступа ко всем функциям'}
      </Text>

      {mode === 'register' && (
        <TextInput
          style={styles.input}
          placeholder="Имя"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={name}
          onChangeText={setName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.buttonPrimary} onPress={submit} disabled={submitting || loading}>
        {submitting || loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.switchWrap}
        onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
        activeOpacity={0.8}
      >
        <Text style={styles.switchText}>
          {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <Text style={styles.switchAccent}>{mode === 'login' ? 'Зарегистрироваться' : 'Войти'}</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    backgroundColor: '#10131b',
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    color: '#eaf0ff',
    letterSpacing: 0.5,
  },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center', color: '#e9edf6', marginBottom: 8 },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    color: '#9aa6bc',
    marginBottom: 28,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  input: {
    backgroundColor: '#171c29',
    borderWidth: 1,
    borderColor: '#2d3548',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#eaf0ff',
  },
  buttonPrimary: {
    backgroundColor: '#2b84ff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switchWrap: { marginTop: 20, paddingVertical: 8 },
  switchText: { textAlign: 'center', fontSize: 15, color: '#9aa6bc' },
  switchAccent: { color: '#9b7dff', fontWeight: '700' },
});
