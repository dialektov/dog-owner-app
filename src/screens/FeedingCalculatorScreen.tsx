import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

type ActivityLevel = 'low' | 'medium' | 'high';

export default function FeedingCalculatorScreen() {
  const navigation = useNavigation<any>();
  const [weight, setWeight] = useState('25');
  const [age, setAge] = useState('3');
  const [activity, setActivity] = useState<ActivityLevel>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  // Упрощённая формула: базовое кол-во * коэффициент активности
  // Базовое ≈ 30-40 г на кг веса в день для взрослой собаки
  const calculate = () => {
    const w = parseFloat(weight) || 0;
    const a = parseInt(age, 10) || 0;
    const basePerKg = a < 1 ? 45 : a < 2 ? 35 : 30;
    const mult = activity === 'low' ? 0.9 : activity === 'high' ? 1.2 : 1;
    const grams = Math.round(w * basePerKg * mult);
    setResult(grams);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Назад</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Калькулятор кормления</Text>
      <Text style={styles.subtitle}>
        Подскажет, сколько грамм корма в день нужно вашей собаке
      </Text>

      <View style={styles.form}>
        <Text style={styles.label}>Вес собаки (кг)</Text>
        <TextInput
          style={styles.input}
          value={weight}
          onChangeText={setWeight}
          keyboardType="decimal-pad"
          placeholder="25"
        />

        <Text style={styles.label}>Возраст (лет)</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          keyboardType="number-pad"
          placeholder="3"
        />

        <Text style={styles.label}>Уровень активности</Text>
        <View style={styles.activityRow}>
          {(['low', 'medium', 'high'] as const).map((a) => (
            <TouchableOpacity
              key={a}
              style={[styles.activityBtn, activity === a && styles.activityBtnActive]}
              onPress={() => setActivity(a)}
            >
              <Text style={[styles.activityText, activity === a && styles.activityTextActive]}>
                {a === 'low' ? 'Низкий' : a === 'medium' ? 'Средний' : 'Высокий'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
          <Text style={styles.calcBtnText}>Рассчитать</Text>
        </TouchableOpacity>

        {result !== null && (
          <View style={styles.result}>
            <Text style={styles.resultLabel}>Рекомендуемая норма в день:</Text>
            <Text style={styles.resultValue}>{result} грамм корма</Text>
          </View>
        )}
      </View>

      <View style={styles.reminder}>
        <Text style={styles.reminderLabel}>Напоминания о кормлении</Text>
        <Switch
          value={reminderEnabled}
          onValueChange={setReminderEnabled}
          trackColor={{ false: '#ddd', true: '#FF9F43' }}
          thumbColor="#fff"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 16, color: '#FF9F43', fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  label: { fontSize: 14, color: '#666', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
  activityRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  activityBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  activityBtnActive: { backgroundColor: '#FF9F43' },
  activityText: { fontSize: 12, color: '#666' },
  activityTextActive: { color: '#fff', fontWeight: '600' },
  calcBtn: { backgroundColor: '#FF9F43', padding: 16, borderRadius: 12, alignItems: 'center' },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  result: { marginTop: 20, padding: 16, backgroundColor: '#e8f5e9', borderRadius: 8 },
  resultLabel: { fontSize: 14, color: '#666', marginBottom: 4 },
  resultValue: { fontSize: 20, fontWeight: '700', color: '#2e7d32' },
  reminder: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  reminderLabel: { fontSize: 16, fontWeight: '500', color: '#333' },
});
