import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import {
  getMyProfile,
  getSecurityAnswer,
  saveMyProfile,
  saveSecurityAnswer,
} from '../../utils/storage';

export default function SettingsScreen({ navigation }) {
  const [profileId, setProfileId] = useState('');
  const [name, setName] = useState('Loading...');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // Modals
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isQRModalVisible, setIsQRModalVisible] = useState(false);

  // Load profile and security answer
  useEffect(() => {
    const loadProfile = async () => {
      const myData = await getMyProfile();
      if (myData) {
        setProfileId(myData.id);
        setName(myData.name || 'Agent 47');
        setPhone(myData.phone || 'No phone added');
        setBio(myData.bio || "I'm feeling secure...");
      }
      const answer = await getSecurityAnswer();
      setSecurityAnswer(answer);
    };
    loadProfile();
  }, []);

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Display Name is required!');
      return;
    }
    const updatedProfile = { id: profileId, name, phone, bio };
    await saveMyProfile(updatedProfile);
    await saveSecurityAnswer(securityAnswer);
    setIsEditModalVisible(false);
    Alert.alert('Success', 'Profile updated securely!');
  };

  // Share invite
  const handleInviteFriend = async () => {
    try {
      await Share.share({
        message:
          "Hey! Join me on Invisible Ink, the most secure and secret chat app. Let's connect securely!",
      });
    } catch (_error) {
      Alert.alert('Error', 'Could not share the invite.');
    }
  };

  // Reusable settings row
  const SettingsOption = ({ icon, title, subtitle, onPress, color = 'rgba(255,255,255,0.6)' }) => (
    <TouchableOpacity style={styles.optionContainer} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.optionIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.optionTextContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* ── Profile Header ── */}
        <TouchableOpacity
          style={styles.profileHeader}
          onPress={() => setIsEditModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.profileGradient}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name ? name.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name}</Text>
              <Text style={styles.profilePhone}>{phone}</Text>
              <View style={styles.bioContainer}>
                <Ionicons name="happy-outline" size={14} color="#00FFCC" />
                <Text style={styles.profileBio} numberOfLines={1}>
                  {bio}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.qrIcon}
              onPress={() => setIsQRModalVisible(true)}
            >
              <Ionicons name="qr-code" size={26} color="#00FFCC" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* ── Settings Options ── */}
        <View style={styles.settingsList}>
          <SettingsOption
            icon="key-outline"
            title="Account"
            subtitle="Security notifications, change number"
            onPress={() => Alert.alert('Account', 'Coming soon.')}
          />
          <SettingsOption
            icon="lock-closed-outline"
            title="Privacy"
            subtitle="Blocked accounts, disappearing messages"
            onPress={() => Alert.alert('Privacy', 'Coming soon.')}
          />
          <SettingsOption
            icon="notifications-outline"
            title="Notifications"
            subtitle="Message and call alerts"
            onPress={() => Alert.alert('Notifications', 'Coming soon.')}
            color="#FFA500"
          />
          <SettingsOption
            icon="people-outline"
            title="Invite a friend"
            onPress={handleInviteFriend}
            color="#00FFCC"
          />

          {/* ── Logout (placeholder) ── */}
          <TouchableOpacity
            style={[styles.optionContainer, { marginTop: 20 }]}
            onPress={() =>
              Alert.alert('Logout', 'You will be securely logged out.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: () => {} },
              ])
            }
            activeOpacity={0.7}
          >
            <View style={[styles.optionIconContainer, { backgroundColor: '#ff444420' }]}>
              <Ionicons name="log-out-outline" size={22} color="#ff4444" />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={[styles.optionTitle, { color: '#ff4444' }]}>Logout</Text>
              <Text style={styles.optionSubtitle}>Securely end this session</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Footer ── */}
        <Text style={styles.versionText}>Invisible Ink v1.0.0</Text>
      </ScrollView>

      {/* ── QR CODE MODAL ── */}
      <Modal visible={isQRModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrTitle}>My Identity QR</Text>
            <View style={styles.qrContainer}>
              <QRCode
                value={JSON.stringify({ id: profileId, name, phone })}
                size={240}
                color="#00FFCC"
                backgroundColor="#1E1E1E"
              />
            </View>
            <Text style={styles.qrSubtitle}>
              Ask your friend to scan this code to start a secret chat.
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsQRModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── EDIT PROFILE MODAL ── */}
      <Modal visible={isEditModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editModalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile & Security</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Ionicons name="close" size={28} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Display Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="#00FFCC" style={styles.inputIcon} />
                  <TextInput style={styles.input} value={name} onChangeText={setName} />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#00FFCC" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Bio (optional)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="happy-outline" size={20} color="#00FFCC" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Write something about yourself..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    multiline
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>PIN Recovery Answer</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color="#ff4444"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. My favorite city"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={securityAnswer}
                    onChangeText={setSecurityAnswer}
                  />
                </View>
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save & Update</Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  // Profile Header
  profileHeader: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 15,
  },
  profileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,255,204,0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,255,204,0.15)',
  },
  avatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(0,255,204,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 28,
    color: '#00FFCC',
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profilePhone: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 2,
  },
  bioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  profileBio: {
    color: '#00FFCC',
    fontSize: 13,
    marginLeft: 5,
  },
  qrIcon: {
    padding: 8,
    backgroundColor: 'rgba(0,255,204,0.1)',
    borderRadius: 12,
  },
  // Settings list
  settingsList: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  optionSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 2,
  },
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    backgroundColor: '#1E1E1E',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    width: '85%',
  },
  qrTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  qrContainer: {
    padding: 15,
    backgroundColor: '#1E1E1E',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#00FFCC',
  },
  qrSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 13,
    paddingHorizontal: 10,
  },
  closeButton: {
    marginTop: 25,
    backgroundColor: '#00FFCC',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 10,
  },
  closeButtonText: {
    color: '#121212',
    fontWeight: 'bold',
  },
  // Edit modal
  editModalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  formContainer: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFF',
    paddingVertical: 15,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#00FFCC',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  versionText: {
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    marginTop: 30,
    fontSize: 12,
  },
});