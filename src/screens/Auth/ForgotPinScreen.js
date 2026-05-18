import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ForgotPinScreen({ navigation }) {
  const [answer, setAnswer] = useState('');
  const [newPin, setNewPin] = useState('');
  const [step, setStep] = useState(1); // 1: question, 2: new PIN

  // Demo data (will come from backend later)
  const SECURITY_QUESTION = "What city were you born in?";
  const CORRECT_ANSWER = "lahore";

  const handleVerifyAnswer = () => {
    const trimmed = answer.trim();
    if (!trimmed) {
      Alert.alert("Error", "Please type your answer.");
      return;
    }
    if (trimmed.toLowerCase() === CORRECT_ANSWER) {
      setStep(2);
    } else {
      Alert.alert("Error", "Incorrect answer. Try 'lahore' for demo.");
    }
  };

  const handleResetPin = () => {
    // Ensure exactly 4 digits
    if (newPin.length !== 4) {
      Alert.alert("Error", "PIN must be exactly 4 digits.");
      return;
    }

    // TODO: Save new PIN to secure storage (AsyncStorage, Keychain, etc.)
    Alert.alert("Success", "Your PIN has been reset successfully!", [
      {
        text: "OK",
        onPress: () => navigation.replace('PinAuth'),
      },
    ]);
  };

  // Custom Keypad Handlers
  const handleNumberPress = (num) => {
    if (newPin.length < 4) {
      setNewPin((prev) => prev + num);
    }
  };

  const handleDeletePress = () => {
    setNewPin((prev) => prev.slice(0, -1));
  };

  // Keypad Layout Generation
  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'delete'],
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#00FFCC" />
      </TouchableOpacity>

      <View style={styles.content}>
        <Ionicons
          name="shield-checkmark-outline"
          size={60}
          color="#00FFCC"
          style={styles.icon}
        />

        {step === 1 ? (
          // STEP 1: Security Question (Standard Text Input)
          <>
            <Text style={styles.title}>Security Question</Text>
            <Text style={styles.subtitle}>
              Answer the question to reset your PIN
            </Text>

            <View style={styles.questionBox}>
              <Text style={styles.questionText}>{SECURITY_QUESTION}</Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Type your answer..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={answer}
              onChangeText={setAnswer}
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.button} onPress={handleVerifyAnswer}>
              <Text style={styles.buttonText}>Verify Answer</Text>
            </TouchableOpacity>
          </>
        ) : (
          // STEP 2: Set New PIN (iPhone Style Custom Pad)
          <>
            <Text style={styles.title}>Set New PIN</Text>
            <Text style={styles.subtitle}>
              Enter a new 4-digit passcode
            </Text>

            {/* PIN Dots Indicator */}
            <View style={styles.pinDisplayContainer}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinDot,
                    newPin.length > index && styles.pinDotFilled,
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

            {/* Reset PIN Button (Enabled only when 4 digits are entered) */}
            <TouchableOpacity 
              style={[styles.button, newPin.length !== 4 && styles.buttonDisabled]} 
              onPress={handleResetPin}
              disabled={newPin.length !== 4}
            >
              <Text style={styles.buttonText}>Reset PIN</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  backButton: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  icon: { marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFF', marginBottom: 10 },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 30,
    textAlign: 'center',
  },
  questionBox: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  questionText: {
    color: '#00FFCC',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    width: '100%',
    backgroundColor: '#1E1E1E',
    color: '#FFF',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  button: {
    backgroundColor: '#00FFCC',
    width: '100%',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(0, 255, 204, 0.3)', // Dim color when less than 4 digits
  },
  buttonText: { color: '#121212', fontSize: 16, fontWeight: 'bold' },
  
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
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '85%',
    marginBottom: 20,
  },
  keypadButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  keypadButtonEmpty: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  keypadButtonText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '400',
  },
});