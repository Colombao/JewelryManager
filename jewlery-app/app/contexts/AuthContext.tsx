"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AppAuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

function getStoredAuthState(): { user: User | null; token: string | null } {
  const storedToken = localStorage.getItem("authToken");
  const storedUser = localStorage.getItem("authUser");

  let user: User | null = null;
  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
    } catch {
      console.error("Erro ao parsear usuário armazenado");
    }
  }

  return { user, token: storedToken };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Importante: estado inicial SEM localStorage para evitar mismatch SSR x Client
  const [state, setState] = useState<AppAuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  useEffect(() => {
    const { user, token } = getStoredAuthState();
    setState({
      user,
      token,
      isLoading: false,
    });
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
    setState({
      user,
      token,
      isLoading: false,
    });
  };

  const logout = () => {
    setState({
      user: null,
      token: null,
      isLoading: false,
    });
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isLoading: state.isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return context;
}
