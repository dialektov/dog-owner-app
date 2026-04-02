import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import EncyclopediaScreen from '../screens/EncyclopediaScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';

export type EncyclopediaArticle = {
  id: string;
  title: string;
  category: string;
  content: string;
  author?: string;
  status?: string;
};

export type EncyclopediaStackParamList = {
  EncyclopediaHome: undefined;
  ArticleDetail: { article: EncyclopediaArticle };
};

const Stack = createNativeStackNavigator<EncyclopediaStackParamList>();

export default function EncyclopediaStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#11131a' },
      }}
    >
      <Stack.Screen name="EncyclopediaHome" component={EncyclopediaScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
    </Stack.Navigator>
  );
}
