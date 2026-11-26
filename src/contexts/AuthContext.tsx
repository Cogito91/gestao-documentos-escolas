import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';
import { Profile, UserRole } from '../types/database.types';
import { authService } from '../services/authService';
import {
  SIMULATED_PEDAGOGA_PROFILE,
  SIMULATED_ENGLISH_MORNING_PROFILE,
} from '../data/simulatedSchoolData';

export type SimulationMode = 'pedagoga' | 'ingles_manha' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  simulationMode: SimulationMode;
  enterSimulation: (mode: 'pedagoga' | 'ingles_manha') => void;
  exitSimulation: () => void;
  signIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string, role: UserRole, disc?: string, phone?: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [simulationMode, setSimulationMode] = useState<SimulationMode>(() => {
    const saved = sessionStorage.getItem('app_simulation_mode');
    return saved === 'pedagoga' || saved === 'ingles_manha' ? saved : null;
  });

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      } else {
        // Fallback caso o trigger do banco demore 1 instante para gravar
        const fallbackProfile: Profile = {
          id: userId,
          full_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário',
          email: user?.email || '',
          role: (user?.user_metadata?.role as UserRole) || 'professor',
          discipline: user?.user_metadata?.discipline || null,
          phone: user?.user_metadata?.phone || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
      }
    } catch (err) {
      console.error('Erro ao recuperar perfil:', err);
    }
  };

  const applySimulationProfile = (mode: 'pedagoga' | 'ingles_manha') => {
    const simProfile =
      mode === 'pedagoga' ? SIMULATED_PEDAGOGA_PROFILE : SIMULATED_ENGLISH_MORNING_PROFILE;
    setProfile(simProfile);
    setUser({ id: simProfile.id, email: simProfile.email } as User);
    setSession(null);
    setLoading(false);
  };

  useEffect(() => {
    if (simulationMode) {
      applySimulationProfile(simulationMode);
      return;
    }

    // 1. Obter sessão inicial
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        fetchProfile(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Ouvir mudanças no estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (sessionStorage.getItem('app_simulation_mode')) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [simulationMode]);

  const enterSimulation = (mode: 'pedagoga' | 'ingles_manha') => {
    sessionStorage.setItem('app_simulation_mode', mode);
    setSimulationMode(mode);
    applySimulationProfile(mode);
  };

  const exitSimulation = () => {
    sessionStorage.removeItem('app_simulation_mode');
    setSimulationMode(null);
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (simulationMode) {
      applySimulationProfile(simulationMode);
      return;
    }
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signIn = async (email: string, pass: string) => {
    sessionStorage.removeItem('app_simulation_mode');
    setSimulationMode(null);
    return await authService.signIn(email, pass);
  };

  const signUp = async (email: string, pass: string, name: string, role: UserRole, disc?: string, phone?: string) => {
    return await authService.signUp(email, pass, name, role, disc, phone);
  };

  const signOut = async () => {
    if (simulationMode) {
      exitSimulation();
      return;
    }
    await authService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: profile?.role ?? null,
        loading,
        simulationMode,
        enterSimulation,
        exitSimulation,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
