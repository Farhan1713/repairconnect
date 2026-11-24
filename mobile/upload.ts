import * as ImagePicker from 'expo-image-picker';
import { CLOUD_NAME, UPLOAD_PRESET } from './config';

// Opens the photo library, uploads the chosen photo to Cloudinary, returns its https link
export async function pickAndUpload(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.6,
  });
  if (res.canceled) return null;
  const a = res.assets[0];

  const form = new FormData();
  form.append('file', {
    uri: a.uri,
    type: a.mimeType || 'image/jpeg',
    name: a.fileName || 'photo.jpg',
  } as any);
  form.append('upload_preset', UPLOAD_PRESET);

  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error?.message || 'Upload failed');
  return d.secure_url;
}
