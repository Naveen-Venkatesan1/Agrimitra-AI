import { 
  auth,
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  resetPassword as sendFirebaseResetPassword, 
  logoutFirebase,
  onAuthStateChanged
} from '../../config/firebase';

const DIRECT_USERS_KEY = 'agrimitra_direct_users';

export const authApi = {
  async login({ email, password }) {
    // 1. Check local direct accounts registry
    try {
      const directUsers = JSON.parse(localStorage.getItem(DIRECT_USERS_KEY) || '[]');
      const userMatch = directUsers.find(
        (u) => u.email?.toLowerCase() === email?.toLowerCase() && (!password || u.password === password)
      );

      if (userMatch) {
        const { password: _, ...userProfile } = userMatch;
        return { success: true, user: userProfile };
      }
    } catch (e) {
      console.warn('Direct user lookup warning:', e);
    }

    // 2. Fallback to Firebase email login if applicable
    const result = await loginWithEmail(email, password);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return {
      success: true,
      user: {
        id: result.user.uid,
        name: result.user.displayName || email.split('@')[0],
        email: result.user.email,
        role: 'farmer',
        authMode: 'direct'
      }
    };
  },

  async signUp({ email, password, farmerName }) {
    try {
      const directUsers = JSON.parse(localStorage.getItem(DIRECT_USERS_KEY) || '[]');
      const targetEmail = email || `${(farmerName || 'farmer').toLowerCase().replace(/\s+/g, '')}@agrimitra.ai`;

      const existingUser = directUsers.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
      if (existingUser) {
        const { password: _, ...userProfile } = existingUser;
        return { success: true, user: userProfile };
      }

      const newUser = {
        id: `usr_direct_${Date.now()}`,
        name: farmerName || targetEmail.split('@')[0] || 'Farmer User',
        email: targetEmail,
        password: password || 'defaultpass',
        role: 'farmer',
        state: 'Tamil Nadu',
        district: 'Thanjavur',
        authMode: 'direct',
        onboardingCompleted: false,
        createdAt: new Date().toISOString()
      };

      directUsers.push(newUser);
      localStorage.setItem(DIRECT_USERS_KEY, JSON.stringify(directUsers));

      const { password: _, ...userProfile } = newUser;
      return { success: true, user: userProfile };
    } catch (err) {
      console.warn('Direct signup fallback warning:', err);
      // Attempt Firebase register as fallback
      const result = await registerWithEmail(email, password);
      if (result.error) {
        return { success: false, error: result.error };
      }
      return {
        success: true,
        user: {
          id: result.user.uid,
          name: farmerName || email.split('@')[0],
          email: result.user.email,
          role: 'farmer',
          authMode: 'direct',
          onboardingCompleted: false
        }
      };
    }
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

