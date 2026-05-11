"use client";

import { createContext, ReactNode, useContext, useState } from "react";

interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AppAuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

function initializeAuthState(): AppAuthState {
  if (typeof window === "undefined") {
    return {
      user: null,
      token: null,
      isLoading: true,
    };
  }

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

  return {
    user,
    token: storedToken,
    isLoading: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppAuthState>(initializeAuthState);

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
