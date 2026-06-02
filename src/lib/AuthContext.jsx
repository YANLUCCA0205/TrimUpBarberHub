import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        loadProfile(initialSession.user.id);
      } else {
        setLoading(false);
        setAuthChecked(true);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        if (currentSession) {
          await loadProfile(currentSession.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
          setAuthChecked(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*, profile_roles(role)')
        .eq('id', userId)
        .single();
      
      if (prof) {
        setProfile(prof);
        setRoles(prof.profile_roles?.map(r => r.role) || ['user']);
      } else {
        // Fallback for profiles not yet created or error
        setProfile({ id: userId, full_name: 'Usuário', email: session?.user?.email });
        setRoles(['user']);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setProfile({ id: userId, full_name: 'Usuário', email: session?.user?.email });
      setRoles(['user']);
    } finally {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const checkUserAuth = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession) {
      await loadProfile(currentSession.user.id);
    } else {
      setLoading(false);
      setAuthChecked(true);
    }
  };

  const getPrimaryRole = (rolesList) => {
    if (!rolesList || rolesList.length === 0) return 'user';
    if (rolesList.includes('siteowner')) return 'siteowner';
    if (rolesList.includes('admin')) return 'admin';
    if (rolesList.includes('barber')) return 'barber';
    return 'user';
  };

  const user = session?.user
    ? {
        ...session.user,
        ...profile,
        role: getPrimaryRole(roles),
        roles // export full roles array too
      }
    : null;

  const value = {
    session,
    user,
    profile,
    roles,
    isAuthenticated: !!session,
    isLoadingAuth: loading,
    isLoadingPublicSettings: false, // satisfies App.jsx
    authError: null,
    authChecked,
    logout,
    navigateToLogin,
    checkUserAuth,
    checkAppState: () => {}
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
