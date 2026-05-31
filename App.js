import ZegoUIKitPrebuiltCallService, {
  ONE_ON_ONE_VIDEO_CALL_CONFIG,
  ONE_ON_ONE_VOICE_CALL_CONFIG,
  ZegoLayoutMode,
  ZegoMenuBarButtonName,
  ZegoViewPosition
} from '@zegocloud/zego-uikit-prebuilt-call-rn';
import { useEffect } from 'react';
import { Platform, Text, View } from 'react-native';
import * as ZIM from 'zego-zim-react-native';
import * as ZPNs from 'zego-zpns-react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { ZEGO_APP_ID, ZEGO_APP_SIGN } from './src/screens/Chat/videocall';
import { getMyProfile } from './src/utils/storage';

// ✅ کریش روکنے والی لائن
global.Platform = Platform;

// 🌟 Global promise – resolves when Zego is ready
let resolveZegoReady;
export const zegoReadyPromise = new Promise((resolve) => {
  resolveZegoReady = resolve;
});

export default function App() {
  useEffect(() => {
    const initializeZegoBackground = async () => {
      try {
        const myProfile = await getMyProfile();
        if (myProfile && myProfile.id) {
          ZegoUIKitPrebuiltCallService.init(
            Number(ZEGO_APP_ID),
            String(ZEGO_APP_SIGN),
            String(myProfile.id),
            String(myProfile.name || 'Invisible Agent'),
            [ZIM, ZPNs],
            {
              ringtoneConfig: {
                incomingCallFileName: 'zego_incoming.mp3',
                outgoingCallFileName: 'zego_outgoing.mp3',
              },
              notifyWhenAppRunningInBackgroundOrQuit: true,
              androidNotificationConfig: {
                channelID: "ZegoUIKit",
                channelName: "ZegoUIKit Calls",
              },
              requireConfig: (data) => {
                const isVideo = data.type === 1;
                return {
                  ...(isVideo ? ONE_ON_ONE_VIDEO_CALL_CONFIG : ONE_ON_ONE_VOICE_CALL_CONFIG),
                  turnOnCameraWhenJoining: isVideo,
                  useSpeakerWhenJoining: isVideo,
                  turnOnMicrophoneWhenJoining: true,

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

                  audioVideoViewConfig: {
                    showMicrophoneStateOnView: true,
                    showCameraStateOnView: true,
                    showUserNameOnView: false,
                    showSoundWavesInAudioMode: false,
                    foregroundBuilder: ({ userInfo }) => (
                      <View style={{
                        position: 'absolute', bottom: 10, left: 10,
                        backgroundColor: 'rgba(0, 255, 204, 0.2)',
                        paddingHorizontal: 12, paddingVertical: 5,
                        borderRadius: 15, borderWidth: 1, borderColor: '#00FFCC'
                      }}>
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>
                          {userInfo.userName}
                        </Text>
                      </View>
                    )
                  },

                  bottomMenuBarConfig: {
                    maxCount: 5,
                    buttons: [
                      ZegoMenuBarButtonName.toggleCameraButton,
                      ZegoMenuBarButtonName.toggleMicrophoneButton,
                      ZegoMenuBarButtonName.hangUpButton,
                      ZegoMenuBarButtonName.switchAudioOutputButton,
                      ZegoMenuBarButtonName.switchCameraButton,
                    ],
                  },

                  hangUpConfirmInfo: {
                    title: "End Secure Call",
                    message: "Are you sure you want to hang up?",
                    cancelButtonName: "Cancel",
                    confirmButtonName: "End Call"
                  }
                };
              }
            }
          );
          console.log("✅ Zego Background Service Started!");
          resolveZegoReady(true);
        } else {
          console.warn("Profile not found, Zego not initialised");
        }
      } catch (error) {
        console.error("❌ Zego Init Error:", error);
      }
    };

    initializeZegoBackground();

    return () => {
      ZegoUIKitPrebuiltCallService.uninit();
    };
  }, []);

  return (
    // ✅ یہاں سے ڈائیلاگ ہٹا دیا گیا ہے
    <AppNavigator />
  );
}