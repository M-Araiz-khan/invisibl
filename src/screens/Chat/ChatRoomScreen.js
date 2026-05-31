import { Ionicons } from '@expo/vector-icons';
import { ZegoSendCallInvitationButton } from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { Audio, Video } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ✅ SUPABASE IMPORTS
import { supabase } from '../../config/supabaseclient';
import { useShake } from '../../hooks/useShake';
import { useZegoReady } from '../../hooks/useZegoReady';
import { cacheMediaFile, downloadAndCacheMedia, getMyProfile, startSelfDestructTimer } from '../../utils/storage';

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
  
  const [menuVisible, setMenuVisible] = useState(false);

  const flatListRef = useRef(null);
  const soundObject = useRef(new Audio.Sound());
  const isRecordingRef = useRef(false);
  const recordingInterval = useRef(null);

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

  // ---------- Real‑time Supabase Listeners ----------
  useEffect(() => {
    if (!chatId || !myProfile || !contactId) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });
        
      if (!error && data) {
         setMessages(data);
      }
    };

    loadMessages();

    const messagesChannel = supabase
      .channel(`chat_${chatId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          // ✅ Prevent Double Echo: Check if message already exists locally via _id
          setMessages(prev => {
            const exists = prev.find(msg => msg._id === payload.new._id || msg.id === payload.new.id);
            if (exists) {
              return prev.map(msg => (msg._id === payload.new._id || msg.id === payload.new.id) ? payload.new : msg);
            }
            return [...prev, payload.new];
          });
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(msg => msg.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(msg => msg.id === payload.new.id ? payload.new : msg));
        }
      })
      .subscribe();
      
    const typingChannel = supabase.channel(`typing_${chatId}`);
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if(payload.payload.userId === contactId) {
           setIsTyping(payload.payload.isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [chatId, myProfile, contactId]);

  // ---------- Background media caching ----------
  useEffect(() => {
    messages.forEach(async (msg) => {
      if (!msg.isUploading) {
        if (msg.imageUrl && msg.imageUrl !== 'uploading' && !msg.localImageUri) {
          const localUri = await downloadAndCacheMedia(msg.imageUrl, `img_${msg.id}.jpg`);
          if (localUri) setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, localImageUri: localUri } : m)));
        }
        if (msg.videoUrl && msg.videoUrl !== 'uploading' && !msg.localVideoUri) {
          const localUri = await downloadAndCacheMedia(msg.videoUrl, `vid_${msg.id}.mp4`);
          if (localUri) setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, localVideoUri: localUri } : m)));
        }
        if (msg.audioUrl && msg.audioUrl !== 'uploading' && !msg.localAudioUri) {
          const localUri = await downloadAndCacheMedia(msg.audioUrl, `aud_${msg.id}.m4a`);
          if (localUri) setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, localAudioUri: localUri } : m)));
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
    
    await supabase
      .from('messages')
      .delete()
      .in('id', selectedMessages);
      
    setSelectedMessages([]);
  }, [chatId, selectedMessages]);

  // ---------- MENU ACTION HANDLERS ----------
  const handleBlockUser = () => {
    setMenuVisible(false);
    Alert.alert(
      "Block User", 
      `Are you sure you want to block ${contactName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Block", 
          style: "destructive",
          onPress: () => {
            Alert.alert("Blocked", `${contactName} has been blocked.`);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleUserInfo = () => {
    setMenuVisible(false);
    Alert.alert("User Information", `Name: ${contactName}\nID: ${contactId}\nStatus: Secured Agent`);
  };

  const handleViewMedia = () => {
    setMenuVisible(false);
    const mediaMessages = messages.filter(m => m.imageUrl || m.videoUrl);
    Alert.alert(mediaMessages.length === 0 ? "No Media" : "Media Found", `You have ${mediaMessages.length} media files.`);
  };

  const handleClearChat = () => {
    setMenuVisible(false);
    Alert.alert(
      "Clear Chat", 
      "Are you sure you want to delete ALL messages in this chat permanently?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clear All", 
          style: "destructive",
          onPress: async () => {
            if (!chatId) return;
            await supabase.from('messages').delete().eq('chat_id', chatId);
            setMessages([]);
          }
        }
      ]
    );
  };

  // ---------- Header ----------
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
                <View style={{ width: 5 }} />
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
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ marginLeft: 10, padding: 5 }}>
              <Ionicons name="ellipsis-vertical" size={22} color="#00FFCC" />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [navigation, contactName, selectedMessages, contactId, deleteSelectedMessages, isZegoReady]);

  // ---------- Supabase Storage Upload Helper ----------
  const uploadFileToCloud = async (uri, folder, type) => {
    try {
      const ext = uri.split('.').pop() || (type === 'video' ? 'mp4' : type === 'audio' ? 'm4a' : 'jpg');
      const fileName = `${Date.now()}_${myProfile.id}.${ext}`;
      const formData = new FormData();
      
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        name: fileName,
        type: `${type}/${ext}`,
      });

      const { error } = await supabase.storage.from('chat_media').upload(`${folder}/${fileName}`, formData);
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage.from('chat_media').getPublicUrl(`${folder}/${fileName}`);
      return publicUrl;
    } catch (err) {
      console.error("Upload error", err);
      return null;
    }
  };

  // ---------- Send Message (✅ FIXED & PROFESSIONAL) ----------
  const sendMessage = async (imageUri = null, audioUri = null, videoUri = null) => {
    try {
      if (!inputText.trim() && !imageUri && !audioUri && !videoUri) return;
      if (!chatId || !myProfile || !contactId) return;

      if (isRecordingRef.current) await cancelRecording();

      const now = Date.now();
      const tempId = `temp_${now}`; 

      let localImagePath = null, localVideoPath = null, localAudioPath = null;
      if (imageUri) localImagePath = await cacheMediaFile(imageUri, `img_${tempId}.jpg`);
      else if (videoUri) localVideoPath = await cacheMediaFile(videoUri, `vid_${tempId}.mp4`);
      else if (audioUri) localAudioPath = await cacheMediaFile(audioUri, `aud_${tempId}.m4a`);

      // ✅ ADDED MISSING REQUIRED DATABASE COLUMNS HERE
      const messageData = {
        _id: tempId,
        chat_id: chatId,
        roomId: chatId,
        text: inputText.trim() || null,
        imageUrl: imageUri ? 'uploading' : null,
        videoUrl: videoUri ? 'uploading' : null,
        audioUrl: audioUri ? 'uploading' : null,
        localImageUri: localImagePath,
        localVideoUri: localVideoPath,
        localAudioUri: localAudioPath,
        sender: myProfile.id,
        senderId: myProfile.id,
        receiverId: contactId,
        timestamp: now,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isExpiring: destructTimer > 0,
        isUploading: !!(imageUri || videoUri || audioUri),
      };

      // Optimistic UI Update
      setMessages(prev => [...prev, { ...messageData, id: tempId }]);
      setInputText('');

      const { data: insertedMsg, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select()
        .single();
        
      if (error) {
          console.error("Supabase Database Error:", error);
          throw error;
      }

      let lastMsgText = messageData.text;
      if (imageUri) lastMsgText = '📷 Image';
      else if (videoUri) lastMsgText = '🎥 Video';
      else if (audioUri) lastMsgText = '🎤 Voice Note';

      await supabase.from('recent_chats').upsert([
        { user_id: myProfile.id, contact_id: contactId, contact_name: contactName, last_message: lastMsgText, timestamp: new Date(now).toISOString(), unread: false },
        { user_id: contactId, contact_id: myProfile.id, contact_name: myProfile.name, last_message: lastMsgText, timestamp: new Date(now).toISOString(), unread: true }
      ]);

      if (destructTimer > 0 && !messageData.isUploading) {
        startSelfDestructTimer(chatId, insertedMsg.id, destructTimer);
      }

      if (messageData.isUploading) {
        let remoteUrl = null;
        let updateField = '';
        
        if (imageUri) {
          remoteUrl = await uploadFileToCloud(localImagePath || imageUri, 'images', 'image');
          updateField = 'imageUrl';
        } else if (videoUri) {
          remoteUrl = await uploadFileToCloud(localVideoPath || videoUri, 'videos', 'video');
          updateField = 'videoUrl';
        } else if (audioUri) {
          remoteUrl = await uploadFileToCloud(localAudioPath || audioUri, 'audio', 'audio');
          updateField = 'audioUrl';
        }

        if (remoteUrl) {
          await supabase.from('messages').update({
            [updateField]: remoteUrl,
            isUploading: false
          }).eq('id', insertedMsg.id);

          if (destructTimer > 0) {
            startSelfDestructTimer(chatId, insertedMsg.id, destructTimer);
          }
        }
      }
    } catch (error) {
      console.error("Send Message Failed:", error);
      Alert.alert('Error', `Message failed: ${error.message || 'Unknown error'}`);
    }
  };

  // ---------- Typing ----------
  const handleTyping = (text) => {
    setInputText(text);
    if (!chatId || !myProfile) return;
    
    supabase.channel(`typing_${chatId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId: myProfile.id, isTyping: text.length > 0 }
    });
  };

  // ---------- Media Picker ----------
  const handleAttachMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission Required', 'Gallery access required');
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.5,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.type === 'video') sendMessage(null, null, asset.uri);
      else sendMessage(asset.uri, null, null);
    }
  };

  // ---------- Audio Recording ----------
  const startRecording = async () => {
    if (isRecordingRef.current) return;
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) return Alert.alert('Permission Required', 'Mic access required');
    
    isRecordingRef.current = true;
    setIsRecording(true);
    setRecordingTime(0);
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    setRecording(recording);
    
    recordingInterval.current = setInterval(() => {
      setRecordingTime((t) => t + 1);
    }, 1000);
  };

  const cancelRecording = async () => {
    if (recordingInterval.current) clearInterval(recordingInterval.current);
    try { if (recording) await recording.stopAndUnloadAsync(); } catch (_e) {}
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
        onPress={() => { if (selectedMessages.length > 0) toggleSelection(item.id); }}
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
              {item.isUploading && <View style={styles.uploadOverlay}><ActivityIndicator size="small" color="#00FFCC" /></View>}
            </View>
          )}

          {(videoSrc || item.videoUrl === 'uploading') && (
            <View>
              {videoSrc ? <Video source={{ uri: videoSrc }} style={styles.msgImage} useNativeControls resizeMode="cover" isLooping={false} /> : <View style={[styles.msgImage, { backgroundColor: '#2A2A2A' }]} />}
              {item.isUploading && <View style={styles.uploadOverlay}><ActivityIndicator size="small" color="#00FFCC" /></View>}
            </View>
          )}

          {(audioSrc || item.audioUrl === 'uploading') && (
            <View style={styles.audioButton}>
              <TouchableOpacity onPress={() => audioSrc && playAudio(audioSrc, item.id)} disabled={selectedMessages.length > 0 || item.isUploading || !audioSrc}>
                <Ionicons name={playingAudioId === item.id ? 'pause' : 'play'} size={20} color={isMe ? '#121212' : '#00FFCC'} />
              </TouchableOpacity>
              <Text style={[styles.audioText, { color: isMe ? '#121212' : '#FFFFFF' }]}>Voice Note</Text>
              {item.isUploading && <ActivityIndicator style={{ marginLeft: 10 }} size="small" color={isMe ? '#121212' : '#00FFCC'} />}
            </View>
          )}

          {!!item.text && <Text style={[styles.messageText, { color: isMe ? '#121212' : '#FFFFFF' }]}>{item.text}</Text>}

          <View style={styles.timeRow}>
            {item.isExpiring && <Ionicons name="timer-outline" size={12} color={isMe ? 'rgba(0,0,0,0.5)' : '#ff4444'} style={{ marginRight: 4 }} />}
            <Text style={[styles.timeText, { color: isMe ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)' }]}>{item.time}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading || !myProfile || !contactId) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#00FFCC" /></View>;
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80} 
      enabled
    >
      
      {/* ✅ MODAL FOR 3-DOT MENU */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem} onPress={handleUserInfo}>
              <Ionicons name="person-circle-outline" size={20} color="#00FFCC" />
              <Text style={styles.menuText}>User Info</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleViewMedia}>
              <Ionicons name="images-outline" size={20} color="#00FFCC" />
              <Text style={styles.menuText}>View Media</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={handleClearChat}>
              <Ionicons name="trash-bin-outline" size={20} color="#ff4444" />
              <Text style={[styles.menuText, { color: '#ff4444' }]}>Clear Chat</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleBlockUser}>
              <Ionicons name="ban-outline" size={20} color="#ff4444" />
              <Text style={[styles.menuText, { color: '#ff4444' }]}>Block User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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

      {isTyping && <View style={styles.typingContainer}><Text style={styles.typingText}>{contactName} is typing...</Text></View>}

      <View style={styles.inputContainer}>
        {isRecording ? (
          <View style={styles.recordingActiveContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.redDot} />
              <Text style={styles.recordingTimeText}>
                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelRecording}><Text style={styles.slideCancelText}>{'< Cancel'}</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.timerButton} onPress={toggleTimer}>
              <Ionicons name={destructTimer > 0 ? 'timer' : 'timer-outline'} size={26} color={destructTimer > 0 ? '#ff4444' : 'rgba(255,255,255,0.4)'} />
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
          onPress={inputText.trim() ? () => sendMessage() : isRecording ? stopRecordingAndSend : startRecording}
        >
          <Ionicons name={inputText.trim() ? 'send' : isRecording ? 'arrow-up' : 'mic'} size={20} color={isRecording ? '#FFFFFF' : '#121212'} />
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
  bubbleOther: { backgroundColor: '#1E1E1E', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#2A2A2A' },
  messageText: { fontSize: 16, lineHeight: 22 },
  msgImage: { width: 220, height: 220, borderRadius: 10, marginBottom: 5 },
  uploadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 5 },
  timeText: { fontSize: 11 },
  typingContainer: { paddingHorizontal: 20, paddingBottom: 10 },
  typingText: { color: '#00FFCC', fontSize: 12, fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E1E1E', padding: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 10 },
  input: { flex: 1, backgroundColor: '#2A2A2A', color: '#FFFFFF', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, maxHeight: 120 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#00FFCC', justifyContent: 'center', alignItems: 'center' },
  attachButton: { marginRight: 10 },
  timerButton: { marginRight: 10 },
  audioButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  audioText: { marginLeft: 10, fontWeight: 'bold' },
  recordingActiveContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  redDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff4444', marginRight: 5 },
  recordingTimeText: { color: '#FFF', fontSize: 16 },
  slideCancelText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontStyle: 'italic' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 50, paddingRight: 10 },
  menuContainer: { width: 180, backgroundColor: '#1E1E1E', borderRadius: 10, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden', elevation: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  menuText: { color: '#FFF', fontSize: 16, marginLeft: 10 },
});