import { Ionicons } from '@expo/vector-icons';
import { ZegoSendCallInvitationButton } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { Audio, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import {
  off,
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database';
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { database, storage } from '../../config/firebaseClient';
import { useShake } from '../../hooks/useShake';
import { useZegoReady } from '../../hooks/useZegoReady';
import {
  cacheMediaFile,
  downloadAndCacheMedia,
  getMyProfile,
  startSelfDestructTimer,
} from '../../utils/storage';

export default function ChatRoomScreen({ route, navigation }) {
  const contact = route.params?.contact;
  const contactId = contact?.id;
  const contactName = contact?.name || 'Secure Chat';

  useShake(() => navigation.replace('WeatherDecoy'));

  const [myProfile, setMyProfile] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [destructTimer, setDestructTimer] = useState(0);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);

  const flatListRef = useRef(null);
  const soundObject = useRef(new Audio.Sound());
  const isRecordingRef = useRef(false);
  const recordingInterval = useRef(null);

  // Zego ready state from hook
  const isZegoReady = useZegoReady();

  const chatId = useMemo(() => {
    if (!myProfile || !contactId) return null;
    return contactId > myProfile.id
      ? `${contactId}_${myProfile.id}`
      : `${myProfile.id}_${contactId}`;
  }, [myProfile, contactId]);

  // ---------- Load Profile ----------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (!profile) return navigation.goBack();
        setMyProfile(profile);
      } catch (_error) {
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [navigation]);

  // ---------- Sound cleanup ----------
  useEffect(() => {
    const sound = soundObject.current;
    return () => {
      sound?.unloadAsync?.().catch(() => {});
    };
  }, []);

  // ---------- Real‑time DB Listeners ----------
  useEffect(() => {
    if (!chatId || !myProfile || !contactId) return;

    const messagesRef = ref(database, `chats/${chatId}/messages`);
    const typingRef = ref(database, `chats/${chatId}/typing/${contactId}`);
    const myTypingRef = ref(database, `chats/${chatId}/typing/${myProfile.id}`);

    const messagesCallback = (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loaded = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        setMessages(loaded);
      } else {
        setMessages([]);
      }
    };

    onValue(messagesRef, messagesCallback);
    onValue(typingRef, (snap) => setIsTyping(snap.val() || false));
    onDisconnect(myTypingRef).remove().catch(() => {});

    return () => {
      off(messagesRef);
      off(typingRef);
      remove(myTypingRef).catch(() => {});
    };
  }, [chatId, myProfile, contactId]);

  // ---------- Background media caching for received messages ----------
  useEffect(() => {
    messages.forEach(async (msg) => {
      if (!msg.isUploading) {
        if (msg.imageUrl && msg.imageUrl !== 'uploading' && !msg.localImageUri) {
          const localUri = await downloadAndCacheMedia(msg.imageUrl, `img_${msg.id}.jpg`);
          if (localUri) {
            setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, localImageUri: localUri } : m)));
          }
        }
        if (msg.videoUrl && msg.videoUrl !== 'uploading' && !msg.localVideoUri) {
          const localUri = await downloadAndCacheMedia(msg.videoUrl, `vid_${msg.id}.mp4`);
          if (localUri) {
            setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, localVideoUri: localUri } : m)));
          }
        }
        if (msg.audioUrl && msg.audioUrl !== 'uploading' && !msg.localAudioUri) {
          const localUri = await downloadAndCacheMedia(msg.audioUrl, `aud_${msg.id}.m4a`);
          if (localUri) {
            setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, localAudioUri: localUri } : m)));
          }
        }
      }
    });
  }, [messages]);

  // ---------- Message Selection & Deletion ----------
  const toggleSelection = (id) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((msgId) => msgId !== id) : [...prev, id]
    );
  };

  const deleteSelectedMessages = useCallback(async () => {
    if (!chatId || selectedMessages.length === 0) return;
    const updates = {};
    selectedMessages.forEach((id) => {
      updates[`chats/${chatId}/messages/${id}`] = null;
    });
    await update(ref(database), updates);
    setSelectedMessages([]);
  }, [chatId, selectedMessages]);

  // ---------- Header (Zego call buttons or loading spinner) ----------
  useLayoutEffect(() => {
    if (selectedMessages.length > 0) {
      navigation.setOptions({
        title: `${selectedMessages.length} Selected`,
        headerLeft: () => (
          <TouchableOpacity onPress={() => setSelectedMessages([])} style={{ marginLeft: 10 }}>
            <Ionicons name="close" size={26} color="#00FFCC" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={deleteSelectedMessages} style={{ marginRight: 15 }}>
            <Ionicons name="trash-outline" size={24} color="#ff4444" />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        title: contactName,
        headerLeft: undefined,
        headerRight: () => (
          <View style={styles.headerIconsContainer}>
            {isZegoReady ? (
              <>
                <ZegoSendCallInvitationButton
                  invitees={[{ userID: String(contactId), userName: contactName }]}
                  isVideoCall={false}
                  resourceID="invisible_calls"
                  backgroundColor="transparent"
                />
                <View style={{ width: 10 }} />
                <ZegoSendCallInvitationButton
                  invitees={[{ userID: String(contactId), userName: contactName }]}
                  isVideoCall={true}
                  resourceID="invisible_calls"
                  backgroundColor="transparent"
                />
              </>
            ) : (
              <ActivityIndicator size="small" color="#00FFCC" />
            )}
          </View>
        ),
      });
    }
  }, [navigation, contactName, selectedMessages, contactId, deleteSelectedMessages, isZegoReady]);

  // ---------- Helpers ----------
  const getFileExtension = (uri, type) => {
    const ext = uri.split('.').pop();
    if (ext && ext.length <= 4) return ext;
    if (type === 'video') return 'mp4';
    if (type === 'audio') return 'm4a';
    return 'jpg';
  };

  const uploadFileToCloud = async (uri, folder, type) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const ext = getFileExtension(uri, type);
    const fileRef = storageRef(storage, `${folder}/${Date.now()}_${myProfile.id}.${ext}`);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  };

  // ---------- Send Message (optimistic + background upload + permanent cache) ----------
  const sendMessage = async (imageUri = null, audioUri = null, videoUri = null) => {
    try {
      if (!inputText.trim() && !imageUri && !audioUri && !videoUri) return;
      if (!chatId || !myProfile || !contactId) return;

      if (isRecordingRef.current) await cancelRecording();

      const newMessageKey = push(ref(database, `chats/${chatId}/messages`)).key;
      const now = Date.now();

      // Permanent local caching for sender
      let localImagePath = null, localVideoPath = null, localAudioPath = null;
      if (imageUri) localImagePath = await cacheMediaFile(imageUri, `img_${newMessageKey}.jpg`);
      else if (videoUri) localVideoPath = await cacheMediaFile(videoUri, `vid_${newMessageKey}.mp4`);
      else if (audioUri) localAudioPath = await cacheMediaFile(audioUri, `aud_${newMessageKey}.m4a`);

      // Optimistic message (Firebase mein local path nahi jayega)
      const messageData = {
        text: inputText.trim(),
        imageUrl: imageUri ? 'uploading' : null,
        videoUrl: videoUri ? 'uploading' : null,
        audioUrl: audioUri ? 'uploading' : null,
        localImageUri: localImagePath,
        localVideoUri: localVideoPath,
        localAudioUri: localAudioPath,
        sender: myProfile.id,
        timestamp: now,
        localTimestamp: now,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isExpiring: destructTimer > 0,
        isUploading: !!(imageUri || videoUri || audioUri),
      };

      let lastMsgText = inputText.trim();
      if (imageUri) lastMsgText = '📷 Image';
      else if (videoUri) lastMsgText = '🎥 Video';
      else if (audioUri) lastMsgText = '🎤 Voice Note';

      const updates = {};
      updates[`chats/${chatId}/messages/${newMessageKey}`] = messageData;
      updates[`users/${myProfile.id}/recentChats/${contactId}`] = {
        contactId: contactId,
        contactName: contactName,
        lastMessage: lastMsgText,
        timestamp: now,
      };
      updates[`users/${contactId}/recentChats/${myProfile.id}`] = {
        contactId: myProfile.id,
        contactName: myProfile.name || 'Unknown Agent',
        lastMessage: lastMsgText,
        timestamp: now,
        unread: true,
      };

      await update(ref(database), updates);
      setInputText('');
      remove(ref(database, `chats/${chatId}/typing/${myProfile.id}`)).catch(() => {});

      if (destructTimer > 0 && !messageData.isUploading) {
        startSelfDestructTimer(chatId, newMessageKey, destructTimer);
      }

      // Background upload
      if (messageData.isUploading) {
        let remoteUrl = null;
        let updateField = '';
        if (imageUri) {
          remoteUrl = await uploadFileToCloud(localImagePath || imageUri, 'chat_images', 'image');
          updateField = 'imageUrl';
        } else if (videoUri) {
          remoteUrl = await uploadFileToCloud(localVideoPath || videoUri, 'chat_videos', 'video');
          updateField = 'videoUrl';
        } else if (audioUri) {
          remoteUrl = await uploadFileToCloud(localAudioPath || audioUri, 'chat_audio', 'audio');
          updateField = 'audioUrl';
        }

        if (remoteUrl) {
          await update(ref(database, `chats/${chatId}/messages/${newMessageKey}`), {
            [updateField]: remoteUrl,
            isUploading: false,
            timestamp: serverTimestamp(),
          });

          if (destructTimer > 0) {
            startSelfDestructTimer(chatId, newMessageKey, destructTimer);
          }
        }
      }
    } catch (_error) {
      Alert.alert('Error', 'Message send failed');
    }
  };

  // ---------- Typing ----------
  const handleTyping = async (text) => {
    setInputText(text);
    if (!chatId || !myProfile) return;
    if (text.length > 0 && isRecordingRef.current) await cancelRecording();

    const typingRef = ref(database, `chats/${chatId}/typing/${myProfile.id}`);
    try {
      if (text.length > 0) await set(typingRef, true);
      else await remove(typingRef);
    } catch (_error) {}
  };

  // ---------- Media Picker ----------
  const handleAttachMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission Required', 'Gallery access required');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.5,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.type === 'video') {
        sendMessage(null, null, asset.uri);
      } else {
        sendMessage(asset.uri, null, null);
      }
    }
  };

  // ---------- Audio Recording ----------
  const startRecording = async () => {
    if (isRecordingRef.current) return;
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert('Permission Required', 'Mic access required');
    }
    isRecordingRef.current = true;
    setIsRecording(true);
    setRecordingTime(0);
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    setRecording(recording);
    recordingInterval.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
  };

  const cancelRecording = async () => {
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    try {
      if (recording) await recording.stopAndUnloadAsync();
    } catch (_e) {}
    setRecording(null);
    setRecordingTime(0);
    isRecordingRef.current = false;
    setIsRecording(false);
  };

  const stopRecordingAndSend = async () => {
    if (!recording) return;
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    try {
      setIsRecording(false);
      isRecordingRef.current = false;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingTime(0);
      if (uri) sendMessage(null, uri, null);
    } catch (_error) {}
  };

  // ---------- Play audio message ----------
  const playAudio = async (audioUrl, messageId) => {
    try {
      if (playingAudioId === messageId) {
        await soundObject.current.stopAsync();
        setPlayingAudioId(null);
        return;
      }
      await soundObject.current.unloadAsync();
      await soundObject.current.loadAsync({ uri: audioUrl });
      setPlayingAudioId(messageId);
      await soundObject.current.playAsync();
      soundObject.current.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) setPlayingAudioId(null);
      });
    } catch (_error) {
      setPlayingAudioId(null);
    }
  };

  const toggleTimer = () => {
    if (destructTimer === 0) setDestructTimer(10);
    else if (destructTimer === 10) setDestructTimer(60);
    else if (destructTimer === 60) setDestructTimer(3600);
    else setDestructTimer(0);
  };

  // ---------- Render Message ----------
  const renderMessage = ({ item }) => {
    const isMe = item.sender === myProfile?.id;
    const isSelected = selectedMessages.includes(item.id);

    const imageSrc = item.localImageUri || (item.imageUrl !== 'uploading' ? item.imageUrl : null);
    const videoSrc = item.localVideoUri || (item.videoUrl !== 'uploading' ? item.videoUrl : null);
    const audioSrc = item.localAudioUri || (item.audioUrl !== 'uploading' ? item.audioUrl : null);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => toggleSelection(item.id)}
        onPress={() => {
          if (selectedMessages.length > 0) toggleSelection(item.id);
        }}
        style={[
          styles.messageWrapper,
          isMe ? styles.messageWrapperMe : styles.messageWrapperOther,
          isSelected && styles.selectedMessageOverlay,
        ]}
      >
        <View style={[styles.messageBubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {(imageSrc || item.imageUrl === 'uploading') && (
            <View>
              {imageSrc ? <Image source={{ uri: imageSrc }} style={styles.msgImage} resizeMode="cover" /> : <View style={[styles.msgImage, { backgroundColor: '#2A2A2A' }]} />}
              {item.isUploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#00FFCC" />
                </View>
              )}
            </View>
          )}

          {(videoSrc || item.videoUrl === 'uploading') && (
            <View>
              {videoSrc ? (
                <Video
                  source={{ uri: videoSrc }}
                  style={styles.msgImage}
                  useNativeControls
                  resizeMode="cover"
                  isLooping={false}
                />
              ) : (
                <View style={[styles.msgImage, { backgroundColor: '#2A2A2A' }]} />
              )}
              {item.isUploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="small" color="#00FFCC" />
                </View>
              )}
            </View>
          )}

          {(audioSrc || item.audioUrl === 'uploading') && (
            <View style={styles.audioButton}>
              <TouchableOpacity
                onPress={() => audioSrc && playAudio(audioSrc, item.id)}
                disabled={selectedMessages.length > 0 || item.isUploading || !audioSrc}
              >
                <Ionicons
                  name={playingAudioId === item.id ? 'pause' : 'play'}
                  size={20}
                  color={isMe ? '#121212' : '#00FFCC'}
                />
              </TouchableOpacity>
              <Text style={[styles.audioText, { color: isMe ? '#121212' : '#FFFFFF' }]}>
                Voice Note
              </Text>
              {item.isUploading && (
                <ActivityIndicator style={{ marginLeft: 10 }} size="small" color={isMe ? '#121212' : '#00FFCC'} />
              )}
            </View>
          )}

          {!!item.text && (
            <Text style={[styles.messageText, { color: isMe ? '#121212' : '#FFFFFF' }]}>
              {item.text}
            </Text>
          )}

          <View style={styles.timeRow}>
            {item.isExpiring && (
              <Ionicons
                name="timer-outline"
                size={12}
                color={isMe ? 'rgba(0,0,0,0.5)' : '#ff4444'}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.timeText, { color: isMe ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)' }]}>
              {item.time}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || !myProfile || !contactId) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#00FFCC" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      enabled
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContainer}
        removeClippedSubviews
        initialNumToRender={15}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {isTyping && (
        <View style={styles.typingContainer}>
          <Text style={styles.typingText}>{contactName} is typing...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        {isRecording ? (
          <View style={styles.recordingActiveContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.redDot} />
              <Text style={styles.recordingTimeText}>
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                {(recordingTime % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelRecording}>
              <Text style={styles.slideCancelText}>{'< Cancel'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.timerButton} onPress={toggleTimer}>
              <Ionicons
                name={destructTimer > 0 ? 'timer' : 'timer-outline'}
                size={26}
                color={destructTimer > 0 ? '#ff4444' : 'rgba(255,255,255,0.4)'}
              />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachButton} onPress={handleAttachMedia}>
              <Ionicons name="add-circle-outline" size={28} color="#00FFCC" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Secure message..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={inputText}
              onChangeText={handleTyping}
              multiline
            />
          </>
        )}

        <TouchableOpacity
          style={styles.sendButton}
          onPress={
            inputText.trim()
              ? () => sendMessage()
              : isRecording
              ? stopRecordingAndSend
              : startRecording
          }
        >
          <Ionicons
            name={inputText.trim() ? 'send' : isRecording ? 'arrow-up' : 'mic'}
            size={20}
            color={isRecording ? '#FFFFFF' : '#121212'}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 15 },
  headerIconsContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  messageWrapper: { marginBottom: 15, flexDirection: 'row', padding: 2 },
  messageWrapperMe: { justifyContent: 'flex-end' },
  messageWrapperOther: { justifyContent: 'flex-start' },
  selectedMessageOverlay: { backgroundColor: 'rgba(0, 255, 204, 0.15)', borderRadius: 10 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 18, minWidth: 100 },
  bubbleMe: { backgroundColor: '#00FFCC', borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  msgImage: { width: 220, height: 220, borderRadius: 10, marginBottom: 5 },
  uploadOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 5 },
  timeText: { fontSize: 11 },
  typingContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  typingText: { color: '#00FFCC', fontSize: 12, fontStyle: 'italic' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2A2A',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 120,
  },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00FFCC', justifyContent: 'center', alignItems: 'center' },
  attachButton: { marginRight: 10 },
  timerButton: { marginRight: 10 },
  audioButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  audioText: { marginLeft: 10, fontWeight: 'bold' },
  recordingActiveContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4444', marginRight: 5 },
  recordingTimeText: { color: '#FFF', fontSize: 16 },
  slideCancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontStyle: 'italic' },
});