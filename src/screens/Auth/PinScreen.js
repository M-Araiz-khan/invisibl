import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAppPin,
  getSecurityAnswer,
  setAppPin,
} from '../../utils/storage';

export default function PinScreen({ navigation }) {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState(null);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [answer, setAnswer] = useState('');
  const [dbAnswer, setDbAnswer] = useState('');
  const [loading, setLoading] = useState(true);

  // Load stored PIN and security answer
  useEffect(() => {
    const checkPin = async () => {
      try {
        const storedPin = await getAppPin();
        const securityAns = await getSecurityAnswer();
        setSavedPin(storedPin);
        setDbAnswer(securityAns || '');
      } catch (error) {
        console.log('Failed to load pin/security answer', error);
        Alert.alert('Error', 'Could not load security data');
      } finally {
        setLoading(false);
      }
    };
    checkPin();
  }, []);

  const handleUnlock = async () => {
    if (loading) return;

    if (!savedPin) {
      // ---- Set new PIN ----
      if (pin.length !== 4) {
        Alert.alert('Error', '4-digits ka PIN enter karein');
        return;
      }
      try {
        await setAppPin(pin);
        console.log('PIN Saved Successfully!');
        navigation.reset({
          index: 0,
          routes: [{ name: 'ChatList' }],
        });
      } catch (error) {
        console.log('Save Error:', error);
        Alert.alert('Error', 'PIN save nahi ho saka.');
      }
    } else {
      // ---- Login ----
      if (pin === savedPin) {
        console.log('PIN Matched! Navigating...');
        navigation.reset({
          index: 0,
          routes: [{ name: 'ChatList' }],
        });
      } else {
        Alert.alert('Error', 'Ghalat PIN! Dubara koshish karein.');
        setPin(''); // Clear the pin dots on wrong attempt
      }
    }
  };

  const handleResetPin = async () => {
    if (!dbAnswer) {
      Alert.alert('Error', 'Security answer not set. Contact support.');
      return;
    }
    if (answer.trim().toLowerCase() === dbAnswer.toLowerCase()) {
      try {
        // Remove the PIN – clear the stored value
        await setAppPin(null);
        setSavedPin(null);
        setIsForgotModalVisible(false);
        setPin('');
        Alert.alert('Verified', 'Purana PIN mita diya gaya hai. Naya PIN enter karein.');
      } catch (_error) {
        Alert.alert('Error', 'Could not reset PIN');
      }
    } else {
      Alert.alert('Error', 'Security Answer ghalat hai!');
    }
  };

  // --- Custom Keypad Handlers ---
  const handleNumberPress = (num) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleDeletePress = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // Keypad Layout
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'delete'],
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={{ color: '#00FFCC' }}>Secure Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons
        name={savedPin ? "lock-closed-outline" : "keypad-outline"}
        size={60}
        color="#00FFCC"
        style={styles.icon}
      />

      <Text style={styles.title}>
        {savedPin ? 'Enter Secret PIN' : 'Set New PIN'}
      </Text>
      <Text style={styles.subtitle}>
        {savedPin ? 'To access your secure chats' : 'Create a 4-digit passcode'}
      </Text>

      {/* PIN Dots Indicator */}
      <View style={styles.pinDisplayContainer}>
        {[0, 1, 2, 3].map((index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              pin.length > index && styles.pinDotFilled,
            ]}
          />
        ))}
      </View>

      {/* Custom Numeric Keypad */}
      <View style={styles.keypadContainer}>
        {keypadRows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((item, colIndex) => {
              if (item === '') {
                return <View key={`blank-${colIndex}`} style={styles.keypadButtonEmpty} />;
              }
              if (item === 'delete') {
                return (
                  <TouchableOpacity
                    key="delete"
                    style={styles.keypadButtonEmpty}
                    onPress={handleDeletePress}
                  >
                    <Ionicons name="backspace-outline" size={32} color="#FFF" />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={item}
                  style={styles.keypadButton}
                  onPress={() => handleNumberPress(item)}
                >
                  <Text style={styles.keypadButtonText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Action Button (Unlock or Save) */}
      <TouchableOpacity 
        style={[styles.button, pin.length !== 4 && styles.buttonDisabled]} 
        onPress={handleUnlock}
        disabled={pin.length !== 4}
      >
        <Text style={styles.buttonText}>
          {savedPin ? 'Unlock' : 'Save PIN'}
        </Text>
      </TouchableOpacity>

      {/* Forgot PIN Link */}
      {savedPin && (
        <TouchableOpacity onPress={() => setIsForgotModalVisible(true)}>
          <Text style={styles.forgotText}>Forgot PIN?</Text>
        </TouchableOpacity>
      )}

      {/* Forgot PIN Modal (Kept standard inputs for typing text) */}
      <Modal visible={isForgotModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>PIN Reset Karein</Text>
            <Text style={styles.label}>Identity Check: Aapka favourite city?</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Jawab likhein..."
              placeholderTextColor="#888"
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setIsForgotModalVisible(false)}
              >
                <Text style={{ color: '#FFF' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.verifyBtn} onPress={handleResetPin}>
                <Text style={{ color: '#121212', fontWeight: 'bold' }}>Verify</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#00FFCC',
    width: '80%',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(0, 255, 204, 0.3)',
  },
  buttonText: {
    color: '#121212',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forgotText: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 25,
    textDecorationLine: 'underline',
  },
  
  // --- Custom Keypad Styles ---
  pinDisplayContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#00FFCC',
    marginHorizontal: 12,
  },
  pinDotFilled: {
    backgroundColor: '#00FFCC',
  },
  keypadContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
    marginBottom: 20,
  },
  keypadButton: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  keypadButtonEmpty: {
    width: 75,
    height: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  keypadButtonText: {
    fontSize: 30,
    color: '#FFF',
    fontWeight: '400',
  },

  // --- Modal Styles ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '80%',
    padding: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  label: {
    color: '#00FFCC',
    marginBottom: 15,
    fontSize: 14,
  },
  modalInput: {
    backgroundColor: '#121212',
    color: '#FFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelBtn: {
    padding: 10,
    marginRight: 15,
  },
  verifyBtn: {
    backgroundColor: '#00FFCC',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
});