"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, MeResponse } from "@/lib/api/auth";

interface AuthContextValue {
  user: MeResponse | null;
  loading: boolean;
  isAuthenticated: boolean;
  hasPermission: (action: string, resource: string) => boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authApi.me();
          console.log("me response:", JSON.stringify(data, null, 2)); // ← add this

      setUser(data);
    } catch (e){
    console.error("me() failed:", e); // ← and this

      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only attempt if we have a token
    if (localStorage.getItem("accessToken")) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  const hasPermission = useCallback(
    (action: string, resource: string): boolean => {
      if (!user) return false;
      return user.roles.some((role) =>
        role.permissions.some(
          (p) => p.action === action && p.resource === resource
        )
      );
    },
    [user]
  );

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    window.location.href = "/login";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, hasPermission, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}