import { db, doc, getDoc, setDoc, serverTimestamp, uploadFileToStorage, onSnapshot } from '../../config/firebase';

const LOCAL_KEY = 'agrimitra_user_profile';

export const profileApi = {
  async getProfile(uid) {
    try {
      if (uid) {
        const docRef = doc(db, 'users', uid);
        const getDocPromise = getDoc(docRef);
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ exists: () => false }), 2500)
        );

        const docSnap = await Promise.race([getDocPromise, timeoutPromise]);
        if (docSnap && typeof docSnap.exists === 'function' && docSnap.exists()) {
          const profile = docSnap.data();
          localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
          return { success: true, profile };
        }
      }

      // Check localStorage fallback
      const cached = localStorage.getItem(LOCAL_KEY);
      if (cached) {
        return { success: true, profile: JSON.parse(cached) };
      }

      return { success: true, profile: null };
    } catch (err) {
      console.warn('Firestore profile fetch warning:', err);
      const cached = localStorage.getItem(LOCAL_KEY);
      return { 
        success: true, 
        profile: cached ? JSON.parse(cached) : null 
      };
    }
  },

  subscribeToProfile(uid, callback) {
    if (!uid) return () => {};
    const docRef = doc(db, 'users', uid);
    
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const profile = docSnap.data();
        localStorage.setItem(LOCAL_KEY, JSON.stringify(profile));
        callback(profile);
      } else {
        callback(null);
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Firestore permissions not fully configured for profiles. Falling back to local state.");
      } else {
        console.warn("Profile listener warning:", error.message);
      }
    });
  },

  async updateProfile(uid, profileData) {
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      const updated = {
        ...existing,
        ...profileData,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));

      if (uid) {
        const docRef = doc(db, 'users', uid);
        const setDocPromise = setDoc(docRef, {
          ...updated,
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Firestore write timeout")), 5000)
        );

        try {
          await Promise.race([setDocPromise, timeoutPromise]);
        } catch (dbErr) {
          console.warn("Firestore save skipped/failed (using local state):", dbErr);
        }
      }

      return { success: true, profile: updated };
    } catch (err) {
      console.error('Failed to update profile:', err);
      return { success: false, error: err.message };
    }
  },

  async uploadAvatar(file, uid) {
    try {
      // 1. Generate local Data URL as guaranteed instant fallback
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });

      let finalAvatarUrl = dataUrl;

      // 2. Attempt Cloud Storage upload with a 3.5-second timeout
      try {
        const storagePromise = uploadFileToStorage(file, 'profile-images');
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ success: false }), 3500));
        const result = await Promise.race([storagePromise, timeoutPromise]);

        if (result && result.success && result.url) {
          finalAvatarUrl = result.url;
        }
      } catch (storageErr) {
        console.warn("Firebase Storage upload warning, using local resilient data URL:", storageErr);
      }

      if (!finalAvatarUrl) {
        throw new Error("Unable to read cropped image file");
      }

      // 3. Save avatar URL to profile (local storage & Firestore document)
      const updateRes = await this.updateProfile(uid, { avatar: finalAvatarUrl });
      return { success: true, avatarUrl: finalAvatarUrl, profile: updateRes.profile };
    } catch (err) {
      console.error('Failed to upload avatar:', err);
      return { success: false, error: err.message };
    }
  }
};
