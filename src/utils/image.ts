import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Compress an image to fit within a maximum file size (default 1 MB).
 * Iteratively reduces JPEG quality until the file is under the limit.
 * Falls back to the original URI if compression fails or the file is already small enough.
 */
export async function compressImage(
  uri: string,
  maxSizeMB = 1
): Promise<string> {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    const maxBytes = maxSizeMB * 1024 * 1024;

    if (!fileInfo.exists) {
      console.warn('[Image] File does not exist:', uri);
      return uri;
    }

    if ((fileInfo.size ?? 0) <= maxBytes) {
      return uri; // Already small enough
    }

    let quality = 0.8;
    let compressedUri = uri;

    while (quality > 0.1) {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1080 } }],
        { compress: quality, format: ImageManipulator.SaveFormat.JPEG }
      );

      const info = await FileSystem.getInfoAsync(result.uri);
      if (info.exists && (info.size ?? 0) <= maxBytes) {
        return result.uri;
      }

      quality -= 0.1;
      compressedUri = result.uri;
    }

    return compressedUri;
  } catch (err) {
    console.warn('[Image] Compression failed:', err);
    return uri;
  }
}

export default { compressImage };
