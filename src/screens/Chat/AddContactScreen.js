import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { addContact, getMyProfile } from '../../utils/storage';

export default function AddContactScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [mode, setMode] = useState('scan');
  const [myProfile, setMyProfile] = useState(null);
  const [profileError, setProfileError] = useState(false);

  // Load the logged-in user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getMyProfile();
        if (data) {
          setMyProfile(data);
        } else {
          Alert.alert('Error', 'Your profile was not found. Please create one first.', [
            { text: 'Go Back', onPress: () => navigation.goBack() },
          ]);
          setProfileError(true);
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load your profile.');
        setProfileError(true);
      }
    };
    fetchProfile();
  }, [navigation]);

  // --- QR scan handler ---
  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    try {
      const scannedUser = JSON.parse(data);
      
      // ✅ PRO FIX: Check if it's strictly an 'InvisibleInk' app QR code
      if (scannedUser.app === 'InvisibleInk' && scannedUser.id) {
        
        // Prevent scanning your own code
        if (myProfile && scannedUser.id === myProfile.id) {
          Alert.alert('Notice', "You can't add yourself!", [
            { text: 'OK', onPress: () => setScanned(false) },
          ]);
          return;
        }

        const contactName = scannedUser.name || 'Unknown Agent';

        Alert.alert(
          'Contact Found!',
          `Do you want to connect securely with ${contactName}?`,
          [
            { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
            {
              text: 'Add Contact',
              onPress: async () => {
                try {
                  const newContact = {
                    id: scannedUser.id,
                    name: contactName,
                    lastMessage: 'Tap to start secure chat...',
                    time: new Date().toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    }),
                  };
                  await addContact(newContact);
                  Alert.alert('Success', `${contactName} has been added to your chat list.`);
                  navigation.goBack();
                } catch (err) {
                  console.error(err);
                  Alert.alert('Error', 'Could not save the contact. Please try again.');
                  setScanned(false);
                }
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Invalid QR Code. This is not an Invisible Ink user.');
        setScanned(false);
      }
    } catch (error) {
      console.error('QR Parsing Error:', error);
      Alert.alert('Error', 'Unrecognised QR format.');
      setScanned(false);
    }
  };

  // --- Permission not loaded yet ---
  if (!permission) return <View />;

  // --- Camera permission denied ---
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Profile loading states ---
  if (!myProfile) {
    if (profileError) {
      return (
        <View style={styles.container}>
          <Text style={styles.text}>Cannot load profile. Please go back.</Text>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Loading Identity...</Text>
      </View>
    );
  }

  // ✅ PRO FIX: Appended 'app' identifier to prevent conflicts with other QR codes
  // Also using displayName as a fallback just in case
  const profileName = myProfile.name || myProfile.displayName || 'Secret Agent';
  const qrPayload = JSON.stringify({ 
    app: 'InvisibleInk', 
    id: myProfile.id, 
    name: profileName 
  });

  return (
    <View style={styles.container}>
      {/* Toggle between Scan and My QR Code */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'scan' && styles.activeBtn]}
          onPress={() => {
            setMode('scan');
            setScanned(false);   // re-enable scanning
          }}
        >
          <Text style={[styles.toggleText, mode === 'scan' && styles.activeText]}>Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'mycode' && styles.activeBtn]}
          onPress={() => setMode('mycode')}
        >
          <Text style={[styles.toggleText, mode === 'mycode' && styles.activeText]}>My QR Code</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {mode === 'scan' ? (
          <View style={styles.cameraWrapper}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View style={styles.scanOverlay}>
              <View style={styles.scanSquare} />
              <Text style={styles.scanText}>
                Point camera at a user&apos;s QR code
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.qrWrapper}>
            <Text style={styles.qrTitle}>{profileName}</Text>
            <Text style={{ color: '#00FFCC', marginBottom: 20 }}>
              ID: {myProfile.id.substring(0, 10)}...
            </Text>
            <View style={styles.qrFrame}>
              <QRCode
                value={qrPayload}
                size={200}
                color="#00FFCC"
                backgroundColor="#121212"
              />
            </View>
            <Text style={styles.qrNote}>
              Have a friend scan this to connect securely.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

// --- Styles (unchanged) ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  text: { color: '#FFF', textAlign: 'center', marginTop: 50 },
  button: {
    backgroundColor: '#00FFCC',
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: { color: '#121212', fontWeight: 'bold' },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#2A2A2A',
  },
  activeBtn: { borderBottomColor: '#00FFCC' },
  toggleText: { color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: 'bold' },
  activeText: { color: '#00FFCC' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cameraWrapper: { width: '100%', height: '100%', position: 'relative' },
  camera: { flex: 1 },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanSquare: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FFCC',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  scanText: {
    color: '#FFF',
    marginTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 10,
  },
  qrWrapper: { alignItems: 'center' },
  qrTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  qrFrame: {
    padding: 20,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  qrNote: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});