export interface WebRTCCallConfig {
  iceServers: Array<{
    urls: string;
    username?: string;
    credential?: string;
  }>;
}

export const getDefaultConfig = (): WebRTCCallConfig => ({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
});

export const createPeerConnection = (
  config: WebRTCCallConfig = getDefaultConfig()
): RTCPeerConnection | null => {
  try {
    return new RTCPeerConnection(config);
  } catch (error) {
    console.error('Failed to create peer connection:', error);
    return null;
  }
};

export const getDisplayMedia = async (): Promise<MediaStream | null> => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    return stream;
  } catch (error) {
    console.error('Screen share failed:', error);
    return null;
  }
};

export default { getDefaultConfig, createPeerConnection, getDisplayMedia };
