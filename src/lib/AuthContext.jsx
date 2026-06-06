import React, { createContext, useState, useContext, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

const getPrimaryRole = (rolesList) => {
  if (!rolesList || rolesList.length === 0) return 'user';
  if (rolesList.includes('siteowner')) return 'siteowner';
  if (rolesList.includes('admin')) return 'admin';
  if (rolesList.includes('barber')) return 'barber';
  return 'user';
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const loadingRef = useRef(false); // prevent double loadProfile calls

  const loadProfile = useCallback(async (userId, sessionUser) => {
    // Prevent concurrent loadProfile calls (race condition fix)
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('*, profile_roles(role)')
        .eq('id', userId)
        .single();
      
      if (prof && !error) {
        const userRoles = prof.profile_roles?.map(r => r.role) || ['user'];
        // Batch state updates to avoid multiple re-renders
        setProfile(prof);
        setRoles(userRoles);
      } else {
        // Fallback for profiles not yet created or error
        // Use sessionUser directly instead of stale closure
        setProfile({ id: userId, full_name: 'Usuário', email: sessionUser?.email });
        setRoles(['user']);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setProfile({ id: userId, full_name: 'Usuário', email: sessionUser?.email });
      setRoles(['user']);
    } finally {
      setLoading(false);
      setAuthChecked(true);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Use ONLY onAuthStateChange — handles INITIAL_SESSION on startup
    // This eliminates the race condition with getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);

        if (event === 'PASSWORD_RECOVERY') {
          // User arrived via password recovery link — they're authenticated
          setIsRecovery(true);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setRoles([]);
          setLoading(false);
          setAuthChecked(true);
          setIsRecovery(false);
          return;
        }

        if (currentSession?.user) {
          // Pass session user directly to avoid stale closure
          await loadProfile(currentSession.user.id, currentSession.user);
        } else if (event === 'INITIAL_SESSION') {
          // No session on initial load — user is not authenticated
          setLoading(false);
          setAuthChecked(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.href = '/login';
  }, []);

  const checkUserAuth = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession) {
      await loadProfile(currentSession.user.id, currentSession.user);
    } else {
      setLoading(false);
      setAuthChecked(true);
    }
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      loadingRef.current = false; // Allow refresh
      await loadProfile(session.user.id, session.user);
    }
  }, [session, loadProfile]);

  const getSimulation = () => {
    try {
      const s = localStorage.getItem("trimup_sim");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  };

  const sim = getSimulation();
  const effectiveRoles = sim?.active ? [sim.role] : roles;

  // Memoize user object to prevent unnecessary re-renders in children
  const user = useMemo(() => {
    if (!session?.user) return null;
    return {
      ...session.user,
      ...profile,
      role: getPrimaryRole(effectiveRoles),
      roles: effectiveRoles
    };
  }, [session, profile, effectiveRoles]);

  const value = useMemo(() => ({
    session,
    user,
    profile,
    roles: effectiveRoles,
    isAuthenticated: !!session,
    isLoadingAuth: loading,
    isLoadingPublicSettings: false,
    authError: null,
    authChecked,
    isRecovery,
    logout,
    navigateToLogin,
    checkUserAuth,
    refreshProfile,
    checkAppState: () => {}
  }), [session, user, profile, effectiveRoles, loading, authChecked, isRecovery, logout, navigateToLogin, checkUserAuth, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
