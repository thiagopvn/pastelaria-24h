import React, { createContext, useContext, useEffect, useState } from 'react';
import firebase from 'firebase/compat/app';
import { auth, db } from '../lib/firebase';

type UserRole = 'admin' | 'employee' | null;

interface AuthContextType {
  user: firebase.User | null;
  role: UserRole;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<firebase.User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await db.collection('users').doc(currentUser.uid).get();
          if (userDoc.exists) {
            setRole(userDoc.data()?.role as UserRole);
          } else {
            // Default fallback if user doc missing
            setRole('employee'); 
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};