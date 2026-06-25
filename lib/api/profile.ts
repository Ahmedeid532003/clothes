import { apiFetch, apiFetchFormData } from './client';
import type { AuthUser } from './auth';

export type ProfileUpdatePayload = {
  full_name?: string;
  email?: string;
  phone?: string;
  avatar?: File | null;
  remove_avatar?: boolean;
};

export async function fetchProfile(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/auth/profile/');
}

export async function updateProfile(payload: ProfileUpdatePayload): Promise<AuthUser> {
  const formData = new FormData();
  if (payload.full_name !== undefined) {
    formData.append('full_name', payload.full_name);
  }
  if (payload.email !== undefined) {
    formData.append('email', payload.email);
  }
  if (payload.phone !== undefined) {
    formData.append('phone', payload.phone);
  }
  if (payload.avatar) {
    formData.append('avatar', payload.avatar);
  }
  if (payload.remove_avatar) {
    formData.append('remove_avatar', 'true');
  }
  return apiFetchFormData<AuthUser>('/auth/profile/', formData, 'PATCH');
}
