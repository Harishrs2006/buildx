import axios from 'axios';
import auth from '@react-native-firebase/auth';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth().currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalize API errors
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.error?.message ??
      error.response?.data?.message ??
      error.message ??
      'Something went wrong';
    // Keep the HTTP status so screens can tell a refusal (e.g. 409) from a network problem
    const err = new Error(message) as Error & { status?: number };
    err.status = error.response?.status;
    return Promise.reject(err);
  }
);
