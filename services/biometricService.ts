import { NativeBiometric } from 'capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const SERVER_KEY = 'mero-hisab';

export const BiometricService = {
  /**
   * Check if biometrics are available on device
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      if (!Capacitor.isNativePlatform()) return false;

      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  },

  /**
   * Show biometric prompt
   */
  verifyIdentity: async (): Promise<boolean> => {
    try {
      if (!Capacitor.isNativePlatform()) return false;

      await NativeBiometric.verifyIdentity({
        reason: 'Authenticate to access Dainikhisab',
        title: 'Biometric Login',
        subtitle: 'Confirm your identity',
        description: 'Use your fingerprint or face to log in',
      });

      return true;
    } catch (error) {
      console.error('Biometric verification failed:', error);
      return false;
    }
  },

  /**
   * Store credentials securely
   */
  setCredentials: async (
    identifier: string,
    token: string
  ): Promise<boolean> => {
    try {
      if (!Capacitor.isNativePlatform()) return false;

      await NativeBiometric.setCredentials({
        username: identifier,
        password: token,
        server: SERVER_KEY,
      });

      return true;
    } catch (error) {
      console.error('Failed to store credentials:', error);
      return false;
    }
  },

  /**
   * Retrieve credentials
   */
  getCredentials: async (): Promise<{
    identifier: string;
    token: string;
  } | null> => {
    try {
      if (!Capacitor.isNativePlatform()) return null;

      const credentials = await NativeBiometric.getCredentials({
        server: SERVER_KEY,
      });

      return {
        identifier: credentials.username,
        token: credentials.password,
      };
    } catch {
      return null;
    }
  },

  /**
   * Delete stored credentials
   */
  clearCredentials: async (): Promise<boolean> => {
    try {
      if (!Capacitor.isNativePlatform()) return false;

      await NativeBiometric.deleteCredentials({
        server: SERVER_KEY,
      });

      return true;
    } catch (error) {
      console.error('Failed to clear credentials:', error);
      return false;
    }
  },
};