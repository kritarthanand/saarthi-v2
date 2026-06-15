import { useEffect, useState } from 'react';

import { getUserProfile } from '@/lib/profile';
import { DEFAULT_PROFILE_VALUES } from '@/lib/profile';
import type { UserProfile } from '@/types/profile';

const DEFAULT: UserProfile = {
  ...DEFAULT_PROFILE_VALUES,
  id: '',
  updated_at: '',
};

export function useProfile(): { profile: UserProfile; loading: boolean } {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getUserProfile()
      .then((p) => {
        if (!cancelled && p) setProfile(p);
      })
      .catch(() => { /* keep default */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { profile, loading };
}
