import { atom } from 'jotai';

export interface AuthState {
  isAuthenticated: boolean;
  user: UserInfo | null;
  isLoading: boolean;
}

export interface UserInfo {
  username: string;
  email: string;
  avatar_url: string;
  organization: string;
}

export const authStateAtom = atom<AuthState>({
  isAuthenticated: false,
  user: null,
  isLoading: true,
});

export const setUserAtom = atom(null, (get, set, user: UserInfo | null) => {
  set(authStateAtom, {
    isAuthenticated: !!user,
    user,
    isLoading: false,
  });
});

export const setAuthLoadingAtom = atom(null, (get, set, isLoading: boolean) => {
  const currentState = get(authStateAtom);
  set(authStateAtom, {
    ...currentState,
    isLoading,
  });
});
