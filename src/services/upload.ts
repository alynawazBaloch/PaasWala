import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Upload a local file URI to Firebase Storage under the given path.
 * Returns the permanent download URL.
 */
export async function uploadImage(
  localUri: string,
  storagePath: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}
