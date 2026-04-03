import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface AuthContextType {
  user: User | null;
  userRole: string;
  userStatus: string;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('guest');
  const [userStatus, setUserStatus] = useState<string>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Ensure loading is true when auth state changes
      setUser(currentUser);
      
      if (currentUser) {
        // Super Admin check - case insensitive and trimmed
        const userEmail = currentUser.email?.toLowerCase().trim();
        if (userEmail === 'tranthetrong91@gmail.com') {
          setUserRole('super_admin');
          setUserStatus('active');
          setLoading(false);
          return;
        }

        // Listen to user document for real-time role/status updates
        const userDocRef = doc(db, 'users', currentUser.uid);
        const unsubscribeDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserRole(data.role || 'user');
            setUserStatus(data.status || 'active');
          } else {
            // If doc doesn't exist yet (newly registered), default to 'user' 
            // to avoid being treated as a guest and redirected back to login
            setUserRole('user');
            setUserStatus('active');
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user role:", error);
          // On error, default to 'user' if authenticated
          setUserRole('user');
          setLoading(false);
        });

        return () => unsubscribeDoc();
      } else {
        setUserRole('guest');
        setUserStatus('active');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, userStatus, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
