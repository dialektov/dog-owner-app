import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, View } from 'react-native';
import { UserProvider, useUser } from './src/context/UserContext';
import AppNavigator from './src/navigation/AppNavigator';
import AuthScreen from './src/screens/AuthScreen';

function RootContent() {
  const { user, loading } = useUser();
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF9F43" />
      </View>
    );
  }
  return user ? <AppNavigator /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          <RootContent />
        </NavigationContainer>
      </UserProvider>
    </SafeAreaProvider>
  );
}
