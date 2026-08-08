import { 
  db, 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp 
} from '../../config/firebase';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n-1',
    title: 'Moderate rain expected tomorrow',
    message: '75% probability of precipitation in Thanjavur district. Consider pausing irrigation.',
    type: 'Weather Alert',
    category: 'weather',
    time: '2h ago',
    unread: true,
    severity: 'warning'
  },
  {
    id: 'n-2',
    title: 'Leaf blast detected in nearby farms',
    message: 'AI Early warning system detected leaf blast within 10 km. Inspect your paddy leaves.',
    type: 'Disease Alert',
    category: 'disease',
    time: '5h ago',
    unread: true,
    severity: 'danger'
  },
  {
    id: 'n-3',
    title: 'Irrigation scheduled tomorrow 6:00 AM',
    message: 'Zone 1 Drip system set to run automatically for 45 minutes.',
    type: 'Irrigation Reminder',
    category: 'irrigation',
    time: '1d ago',
    unread: false,
    severity: 'info'
  },
  {
    id: 'n-4',
    title: 'PM Kisan Subsidy Installment Released',
    message: 'Check your linked PACS bank account for ₹2,000 credit.',
    type: 'Government Scheme',
    category: 'scheme',
    time: '2d ago',
    unread: false,
    severity: 'success'
  }
];

export const notificationApi = {
  // Listen to live notifications from Firestore
  subscribeNotifications(uid, callback) {
    try {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          callback(list);
        } else {
          callback(INITIAL_NOTIFICATIONS);
        }
      }, () => callback(INITIAL_NOTIFICATIONS));
    } catch (e) {
      callback(INITIAL_NOTIFICATIONS);
      return () => {};
    }
  },

  async addNotification(data, uid = null) {
    const item = {
      id: `n-${Date.now()}`,
      title: data.title,
      message: data.message || '',
      type: data.type || 'Alert',
      category: data.category || 'general',
      time: 'Just now',
      unread: true,
      severity: data.severity || 'info',
      createdAt: new Date().toISOString()
    };

    if (uid) {
      try {
        await addDoc(collection(db, 'notifications'), {
          ...item,
          userId: uid,
          createdAt: serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore add notification warning:', e);
      }
    }

    return { success: true, item };
  }
};
