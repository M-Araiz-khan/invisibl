// eslint-disable-next-line import/no-named-as-default
import ZegoUIKitPrebuiltCall, {
  ONE_ON_ONE_VIDEO_CALL_CONFIG,
  ONE_ON_ONE_VOICE_CALL_CONFIG,
  ZegoLayoutMode,
  ZegoMenuBarButtonName,
  ZegoViewPosition,
} from '@zegocloud/zego-uikit-prebuilt-call-rn';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// 🌟 Import Path (Make sure this matches your file structure)
import { ZEGO_APP_ID, ZEGO_APP_SIGN } from './videocall';

export default function VideoCallScreen({ route, navigation }) {
  if (!route?.params?.contact || !route?.params?.myProfile) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>Call data missing. Going back...</Text>
      </View>
    );
  }

  const { contact, myProfile, callType } = route.params;
  const isVideo = callType === 'video';

  const myId = String(myProfile?.id || Math.floor(Math.random() * 10000));
  const myName = String(myProfile?.name || 'Invisible Agent');
  const contactIdStr = String(contact?.id || 'Unknown');

  const callID = contactIdStr > myId
      ? `${contactIdStr}_${myId}`
      : `${myId}_${contactIdStr}`;

  if (!ZEGO_APP_ID || ZEGO_APP_SIGN === 'your_real_sign') {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>
          ZegoCloud credentials missing. Please check videocall.js
        </Text>
      </View>
    );
  }

  // --- BASE CONFIG ---
  const baseConfig = isVideo ? ONE_ON_ONE_VIDEO_CALL_CONFIG : ONE_ON_ONE_VOICE_CALL_CONFIG;

  return (
    <View style={styles.container}>
      <ZegoUIKitPrebuiltCall
        appID={Number(ZEGO_APP_ID)}
        appSign={String(ZEGO_APP_SIGN)}
        userID={myId}
        userName={myName}
        callID={callID}
        config={{
          ...baseConfig,
          
          // 1. ⚙️ Audio/Video Initial States
          turnOnCameraWhenJoining: isVideo, // Audio call me camera off hoga
          turnOnMicrophoneWhenJoining: true,
          useSpeakerWhenJoining: isVideo, // Audio call me earpiece, Video me speaker

          // 2. 🎨 Layout Configuration
          layout: {
            mode: ZegoLayoutMode.pictureInPicture,
            config: {
              switchLargeOrSmallViewByClick: true,
              smallViewBorderRadius: 15,
              smallViewPosition: ZegoViewPosition.topRight,
              smallViewBackgroundColor: "#1E1E1E",
              largeViewBackgroundColor: "#121212",
            }
          },

          // 3. 🖼️ Custom Foreground & Hidden Elements
          audioVideoViewConfig: {
            showMicrophoneStateOnView: true,
            showCameraStateOnView: true,
            showUserNameOnView: false, // Label hide kar diya
            showSoundWavesInAudioMode: false, // Sound waves hide kar di
            
            // Custom Component over the video/audio
            foregroundBuilder: ({ userInfo }) => (
              <View style={styles.customForeground}>
                <Text style={styles.foregroundText}>
                  {userInfo.userName === myName ? 'You' : userInfo.userName}
                </Text>
              </View>
            )
          },

          // 4. 🔘 Menu Bar Configuration
          bottomMenuBarConfig: {
            maxCount: 5,
            buttons: [
              ZegoMenuBarButtonName.toggleCameraButton,
              ZegoMenuBarButtonName.toggleMicrophoneButton,
              ZegoMenuBarButtonName.hangUpButton,
              ZegoMenuBarButtonName.switchAudioOutputButton,
              ZegoMenuBarButtonName.switchCameraButton,
            ],
            // Agar extra custom buttons chahiye hon to yahan dalte hain:
            // extendButtons: [ <MyCustomButton /> ]
          },

          // 5. 🛑 Hangup Confirmation Dialog
          hangUpConfirmInfo: {
            title: "End Secure Call",
            message: "Are you sure you want to hang up?",
            cancelButtonName: "Cancel",
            confirmButtonName: "End Call"
          },

          // 6. 📞 End Call Handlers
          onCallEnd: (callID, reason, duration) => {
            console.log('Call Ended:', reason);
            navigation.goBack();
          },
          onHangUp: () => navigation.goBack(),
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#ff4444', fontSize: 16, textAlign: 'center' },
  
  // Custom Foreground Style
  customForeground: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(0, 255, 204, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#00FFCC',
  },
  foregroundText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  }
});