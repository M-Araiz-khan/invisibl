import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { onValue, ref, remove } from 'firebase/database';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { database } from '../../config/firebaseClient';
import { useShake } from '../../hooks/useShake';
import { deleteContacts, getContacts, getMyProfile } from '../../utils/storage';

export default function ChatListScreen({ navigation }) {
  // --- STATES ---
  const [myProfile, setMyProfile] = useState(null);
  const [localContacts, setLocalContacts] = useState([]);
  const [firebaseChats, setFirebaseChats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // --- HOOKS & SENSORS ---
  useShake(() => {
    navigation.replace('WeatherDecoy');
  });

  // --- DATA LOADING (Local & Profile) ---
  const loadInitData = useCallback(async () => {
    try {
      const profile = await getMyProfile();
      setMyProfile(profile);
      const contacts = await getContacts();
      setLocalContacts(contacts || []);
    } catch (error) {
      console.log("Error loading data", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInitData();
    }, [loadInitData])
  );

  // --- REAL-TIME FIREBASE LISTENER ---
  useEffect(() => {
    if (!myProfile?.id) return;
    const recentChatsRef = ref(database, `users/${myProfile.id}/recentChats`);

    const unsubscribe = onValue(recentChatsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setFirebaseChats(data);
      } else {
        setFirebaseChats({});
      }
    });

    return () => unsubscribe();
  }, [myProfile?.id]);

  // --- SMART MERGE LOGIC ---
  const mergedChats = useMemo(() => {
    const map = new Map();

    localContacts.forEach(c => {
      map.set(c.id, { ...c, isLocal: true, id: c.id, name: c.name });
    });

    Object.keys(firebaseChats).forEach(key => {
      const fbChat = firebaseChats[key];
      if (map.has(key)) {
        map.set(key, { ...map.get(key), ...fbChat, id: key });
      } else {
        map.set(key, { ...fbChat, id: key, name: fbChat.contactName });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.timestamp || 0;
      const timeB = b.timestamp || 0;
      return timeB - timeA;
    });
  }, [localContacts, firebaseChats]);

  // --- LOGIC FUNCTIONS ---
  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      'Delete Chats',
      `Are you sure you want to delete ${selectedIds.length} chat(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteContacts(selectedIds);
            if (myProfile?.id) {
              selectedIds.forEach(id => {
                remove(ref(database, `users/${myProfile.id}/recentChats/${id}`)).catch(()=>{});
              });
            }
            setIsSelectionMode(false);
            setSelectedIds([]);
            loadInitData();
          },
        },
      ]
    );
  }, [selectedIds, loadInitData, myProfile]);

  const handleSelectAll = () => {
    if (mergedChats.length === 0) return;
    const allIds = mergedChats.map((c) => c.id);
    setSelectedIds(allIds);
    setIsSelectionMode(true);
    setMenuVisible(false);
  };

  // --- TIME FORMATTER ---
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  };

  // --- HEADER CONFIGURATION ---
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {isSelectionMode ? (
            <>
              <TouchableOpacity onPress={handleDeleteSelected} style={{ marginRight: 15 }}>
                <Ionicons name="trash-outline" size={24} color="#ff4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }}>
                <Ionicons name="close-circle-outline" size={24} color="#00FFCC" />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginRight: 10 }}>
              <Ionicons name="ellipsis-vertical" size={24} color="#00FFCC" />
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [navigation, isSelectionMode, handleDeleteSelected]);

  // --- FILTER ---
  const filteredContacts = mergedChats.filter((contact) =>
    (contact.name || 'Unknown').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- RENDER CHAT ITEM ---
  const renderChatItem = ({ item }) => {
    const isSelected = selectedIds.includes(item.id);
    const isUnread = item.unread;

    return (
      <TouchableOpacity
        style={[styles.chatItem, isSelected && styles.chatItemActive]}
        activeOpacity={0.7}
        onLongPress={() => {
          if (!isSelectionMode) setIsSelectionMode(true);
          toggleSelection(item.id);
        }}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelection(item.id);
          } else {
            if (isUnread && myProfile?.id) {
              remove(ref(database, `users/${myProfile.id}/recentChats/${item.id}/unread`));
            }
            navigation.navigate('ChatRoom', { contact: item });
          }
        }}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#1E1E1E" />
          </View>
          {isSelectionMode && (
            <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#121212" />}
            </View>
          )}
        </View>

        <View style={styles.chatDetails}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
            <Text style={[styles.chatTime, isUnread && styles.chatTimeUnread]}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
          <View style={styles.messageRow}>
            <Text
              style={[styles.lastMessage, isUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.lastMessage || 'Tap to chat...'}
            </Text>
            {isUnread && <View style={styles.unreadBadge} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // --- MAIN UI ---
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search secure chats..."
          placeholderTextColor="rgba(255,255,255,0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {mergedChats.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={60} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>No secure chats found.</Text>
          <Text style={styles.emptySubText}>Tap + to connect via QR code.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredContacts}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {!isSelectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('AddContact')}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={28} color="#121212" />
        </TouchableOpacity>
      )}

      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); setIsSelectionMode(true); }}>
              <Text style={styles.menuText}>Select Chats</Text>
            </TouchableOpacity>

            {mergedChats.length > 0 && (
              <TouchableOpacity style={styles.menuItem} onPress={handleSelectAll}>
                <Text style={styles.menuText}>Select All</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuVisible(false); navigation.navigate('Settings'); }}>
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// --- STYLES ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', margin: 15, borderRadius: 10, paddingHorizontal: 15, height: 45 },
  searchInput: { flex: 1, color: '#FFF', marginLeft: 10, fontSize: 16 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50 },
  emptyText: { color: '#FFF', fontSize: 18, marginTop: 15, fontWeight: 'bold' },
  emptySubText: { color: 'rgba(255,255,255,0.5)', marginTop: 5 },
  chatItem: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 12, alignItems: 'center' },
  chatItemActive: { backgroundColor: 'rgba(0, 255, 204, 0.1)' },
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#00FFCC', justifyContent: 'center', alignItems: 'center' },
  checkbox: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#121212', backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#00FFCC', borderColor: '#121212' },
  chatDetails: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: '#2A2A2A', paddingBottom: 12 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  chatName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', flex: 1 },
  chatTime: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginLeft: 5 },
  chatTimeUnread: { color: '#00FFCC', fontWeight: 'bold' },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { color: 'rgba(255,255,255,0.6)', fontSize: 14, flex: 1 },
  lastMessageUnread: { color: '#FFF', fontWeight: 'bold' },
  unreadBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#00FFCC', marginLeft: 10 },
  fab: { position: 'absolute', bottom: 30, right: 20, backgroundColor: '#00FFCC', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#00FFCC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 60, paddingRight: 10 },
  menuContainer: { width: 200, backgroundColor: '#1E1E1E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden', elevation: 5 },
  menuItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  menuText: { color: '#FFF', fontSize: 16 },
});