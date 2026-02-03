// Карточка питомца
export interface Pet {
  id: string;
  name: string;
  breed: string;
  age: number; // в годах
  weight: number; // в кг
  photos: string[];
  allergies?: string;
  vaccinations?: string;
  vetContacts?: string;
  ownerId: string;
  qrCodeData: string;
}

// Пользователь
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  pets: string[]; // pet ids
}

// Прогулка
export interface Walk {
  id: string;
  petId: string;
  date: Date;
  distance: number; // км
  duration: number; // минуты
  calories: number;
  route: { latitude: number; longitude: number }[];
}

// Место на карте
export type PlaceCategory = 'vet' | 'pet_shop' | 'groomer' | 'park' | 'cafe';

export interface Place {
  id: string;
  name: string;
  address: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  rating?: number;
  reviews?: Review[];
}

export interface Review {
  id: string;
  userId: string;
  rating: number;
  text: string;
  date: Date;
}

// Статус на умной карте
export type WalkStatus = 'looking_for_company' | 'training' | 'do_not_disturb';

export interface UserLocation {
  userId: string;
  petId: string;
  latitude: number;
  longitude: number;
  status: WalkStatus;
  lastUpdated: Date;
}

// Статья энциклопедии
export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  author: string;
}
