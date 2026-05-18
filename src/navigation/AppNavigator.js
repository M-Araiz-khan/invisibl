import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// Screens
import ForgotPinScreen from '../screens/Auth/ForgotPinScreen';
import PinScreen from '../screens/Auth/PinScreen';
import AddContactScreen from '../screens/Chat/AddContactScreen';
import ChatListScreen from '../screens/Chat/ChatListScreen';
import ChatRoomScreen from '../screens/Chat/ChatRoomScreen';
import WeatherScreen from '../screens/Decoy/WeatherScreen';
import SettingsScreen from '../screens/Profile/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="PinAuth">
        {/* 1. Auth Screens */}
        <Stack.Screen
          name="PinAuth"
          component={PinScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ForgotPin"
          component={ForgotPinScreen}
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />

        {/* 2. Main Chat List (header managed by screen itself) */}
        <Stack.Screen
          name="ChatList"
          component={ChatListScreen}
          options={{
            title: 'Chats',
            headerStyle: { backgroundColor: '#121212' },
            headerTintColor: '#00FFCC',
            headerBackVisible: false,
          }}
        />

        {/* 3. Individual Chat Room */}
        <Stack.Screen
          name="ChatRoom"
          component={ChatRoomScreen}
          options={({ route }) => ({
            title: route.params?.contact?.name || 'Chat',
            headerStyle: { backgroundColor: '#1E1E1E' },
            headerTintColor: '#00FFCC',
          })}
        />

        {/* 4. Add Contact (QR scanner) */}
        <Stack.Screen
          name="AddContact"
          component={AddContactScreen}
          options={{
            title: 'Secure Connection',
            headerStyle: { backgroundColor: '#1E1E1E' },
            headerTintColor: '#00FFCC',
          }}
        />

        {/* 5. Settings / Profile */}
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Profile Settings',
            headerStyle: { backgroundColor: '#1E1E1E' },
            headerTintColor: '#00FFCC',
          }}
        />

        {/* 6. Decoy Weather Screen (shake‑activated) */}
        <Stack.Screen
          name="WeatherDecoy"
          component={WeatherScreen}
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}