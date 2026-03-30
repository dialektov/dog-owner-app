import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useUser } from '../context/UserContext';

export default function AuthScreen() {
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
    <View style={styles.container}>
      <Text style={styles.title}>DogPaw</Text>
      <Text style={styles.subtitle}>{mode === 'login' ? 'Вход' : 'Регистрация'}</Text>
      {mode === 'register' && (
        <TextInput style={styles.input} placeholder="Имя" value={name} onChangeText={setName} />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Пароль"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting || loading}>
        {submitting || loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{mode === 'login' ? 'Войти' : 'Создать аккаунт'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switchText}>
          {mode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войти'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#f8f9fa' },
  title: { fontSize: 34, fontWeight: '700', textAlign: 'center', marginBottom: 10, color: '#333' },
  subtitle: { fontSize: 18, textAlign: 'center', color: '#666', marginBottom: 20 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#FF9F43', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  switchText: { textAlign: 'center', color: '#666', marginTop: 14 },
});
