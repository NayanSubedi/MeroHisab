import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric';
import { Preferences } from '@capacitor/preferences';

const SERVER_ID = 'dainikhisab.app';

export const biometricService = {
  /**
   * Check if biometric hardware is available on this device
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (e) {
      console.warn('[Bio] isAvailable error:', e);
      return false;
    }
  },

  /**
   * Enable biometric app lock:
   * 1. First verify the user's identity with a real fingerprint scan
   * 2. Then save the session securely in the device keystore
   * 3. Set a flag in Preferences so the app knows to prompt on launch
   */
  enableBiometrics: async (token: string, userProfile: any): Promise<boolean> => {
    try {
      // Step 1: Force a real fingerprint/face scan right now to confirm identity
      await NativeBiometric.verifyIdentity({
        reason: 'Verify your identity to enable App Lock',
        title: 'Enable App Lock',
        subtitle: 'Scan your fingerprint',
        description: 'This will require your fingerprint every time you open the app.',
      });

      // Step 2: If scan succeeded, store credentials securely in the hardware keystore
      const payload = JSON.stringify({ token, userProfile });
      await NativeBiometric.setCredentials({
        username: 'session',
        password: payload,
        server: SERVER_ID,
      });

      // Step 3: Set the flag so App.tsx knows to prompt on next launch
      await Preferences.set({ key: 'biometricsEnabled', value: 'true' });

      return true;
    } catch (e) {
      console.error('[Bio] enableBiometrics failed:', e);
      return false;
    }
  },

  /**
   * Disable biometric app lock:
   * Remove the secure credentials and the flag
   */
  disableBiometrics: async (): Promise<void> => {
    try {
      await NativeBiometric.deleteCredentials({ server: SERVER_ID });
    } catch (e) {
      // Credentials may not exist, that's fine
    }
    await Preferences.remove({ key: 'biometricsEnabled' });
  },

  /**
   * The core "App Lock" flow used on app launch:
   * 1. Show the native fingerprint/face prompt
   * 2. If the user passes, retrieve the encrypted session from the keystore
   * 3. Return the session data (token + profile)
   */
  verifyAndRetrieveSession: async (): Promise<{ token: string; userProfile: any } | null> => {
    try {
      // Step 1: Show the REAL native fingerprint/face prompt
      await NativeBiometric.verifyIdentity({
        reason: 'Unlock Dainik Hisab',
        title: 'App Locked',
        subtitle: 'Scan your fingerprint to continue',
        description: 'Your session is protected by biometric authentication.',
      });

      // Step 2: User passed! Now retrieve the stored credentials
      const credentials = await NativeBiometric.getCredentials({ server: SERVER_ID });

      if (credentials?.password) {
        const session = JSON.parse(credentials.password);
        return session;
      }

      return null;
    } catch (e) {
      // User canceled, failed too many times, or hardware error
      console.warn('[Bio] verifyAndRetrieveSession failed:', e);
      return null;
    }
  },

  /**
   * Check if the user has previously enabled biometric app lock
   * (Does NOT perform any authentication)
   */
  isBiometricsEnabled: async (): Promise<boolean> => {
    const { value } = await Preferences.get({ key: 'biometricsEnabled' });
    return value === 'true';
  },
};
