import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface AuthUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: string;
  createdAt: number;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { username: string; email: string; displayName: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("GET", "/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (!data.error) setUser(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setUser(data);
  };

  const register = async (formData: { username: string; email: string; displayName: string; password: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", formData);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    setUser(data);
  };

  const logout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
