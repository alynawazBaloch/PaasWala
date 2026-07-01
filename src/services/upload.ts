import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import { storage } from './firebase';

/**
 * Upload a local image file to Firebase Storage.
 *
 * Uses expo-file-system to read the file as base64, then converts to a
 * Uint8Array for upload via the Firebase JS SDK (avoids Hermes Blob
 * limitations, works with content:// URIs on Android).
 *
 * Returns the permanent download URL.
 */
export async function uploadImage(
  localUri: string,
  storagePath: string
): Promise<string> {
  // 1) Read the local file as base64 via expo-file-system
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 2) Decode base64 → Uint8Array (Hermes-safe, uploadBytes accepts it)
  const bytes = atob(base64);
  const uint8 = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    uint8[i] = bytes.charCodeAt(i);
  }

  // 3) Upload to Firebase Storage (Uint8Array, no Blob needed)
  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, uint8);
    return await getDownloadURL(snapshot.ref);
  } catch (uploadErr: any) {
    console.error('[upload] Firebase Storage failed:', uploadErr?.code, uploadErr?.message);
    if (uploadErr?.customData?.serverResponse) {
      console.error('[upload] Server response:', uploadErr.customData.serverResponse);
    }
    throw uploadErr;
  }
}
