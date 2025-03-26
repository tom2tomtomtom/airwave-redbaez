import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Organisation {
  id: string;
  name: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  organisation_id: string;
  role: 'admin' | 'user';
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [organisation, setOrganisation] = useState<Organisation | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserDetails(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserDetails(session.user.id);
      } else {
        setUser(null);
        setOrganisation(null);
        setLoading(false);
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchUserDetails = async (userId: string) => {
    try {
      // Fetch user details including organisation_id and role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      // Fetch organisation details
      const { data: orgData, error: orgError } = await supabase
        .from('organisations')
        .select('*')
        .eq('id', userData.organisation_id)
        .single();

      if (orgError) throw orgError;

      setUser(userData);
      setOrganisation(orgData);
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Handle error appropriately
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    organisation,
    loading,
    signOut,
  };
}
