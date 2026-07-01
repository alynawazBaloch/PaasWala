import { File, UploadType } from 'expo-file-system';
import { auth } from './firebase';

/** Known image MIME types by file extension. */
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/** Firebase Storage bucket for this project. */
const BUCKET = 'paaswala-6463f.firebasestorage.app';

/**
 * Upload a local image file to Firebase Storage.
 *
 * Uses expo-file-system's native File class to upload directly to the
 * Firebase Storage REST API — avoids Hermes Blob limitations entirely,
 * and gives us direct server response feedback.
 *
 * Returns the permanent public download URL.
 */
export async function uploadImage(
  localUri: string,
  storagePath: string
): Promise<string> {
  // --- Auth check ---
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to upload images.');
  }
  const token = await user.getIdToken();

  // --- MIME type ---
  const ext = localUri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = MIME_TYPES[ext] || 'image/jpeg';

  // --- Firebase Storage REST API (simple upload) ---
  const uploadUrl =
    `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?name=${encodeURIComponent(storagePath)}`;

  // expo-file-system's File class does the native upload
  const file = new File(localUri);
  const result = await file.upload(uploadUrl, {
    httpMethod: 'POST',
    uploadType: UploadType.BINARY_CONTENT,
    mimeType,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // --- Handle response ---
  if (result.status >= 200 && result.status < 300) {
    // Construct the public download URL
    return (
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/` +
      `${encodeURIComponent(storagePath)}?alt=media`
    );
  }

  // Parse the server error payload for a helpful message
  try {
    const body = JSON.parse(result.body);
    throw new Error(
      `Upload failed (${result.status}): ${body.error?.message || result.body}`
    );
  } catch (parseErr: any) {
    if (parseErr.message?.startsWith('Upload failed')) throw parseErr;
    throw new Error(`Upload failed (${result.status}): ${result.body}`);
  }
}
