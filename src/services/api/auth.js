import { 
  auth,
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  resetPassword as sendFirebaseResetPassword, 
  logoutFirebase,
  onAuthStateChanged
} from '../../config/firebase';

export const authApi = {
  async login({ email, password }) {
    const result = await loginWithEmail(email, password);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, user: result.user };
  },

  async signUp({ email, password, farmerName }) {
    const result = await registerWithEmail(email, password);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, user: result.user };
  },

  async loginWithGoogle() {
    const result = await loginWithGoogle();
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, user: result.user };
  },

  async forgotPassword(email) {
    const result = await sendFirebaseResetPassword(email);
    return result;
  },

  async logout() {
    const result = await logoutFirebase();
    return result;
  },

  onSessionChange(callback) {
    return onAuthStateChanged(auth, (user) => {
      callback(user);
    });
  }
};
