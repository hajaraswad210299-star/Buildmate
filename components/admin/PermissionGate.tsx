"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Permission, hasPermission } from "@/lib/auth/permissions";

interface PermissionContextValue {
  permissions: string[];
  isAdmin: boolean;
  isStaff: boolean;
  roleName: string;
  loading: boolean;
  can: (perm: Permission | Permission[]) => boolean;
  canManage: (perm: Permission) => boolean;
}

const PermissionContext = createContext<PermissionContextValue>({
  permissions: [],
  isAdmin: false,
  isStaff: false,
  roleName: "",
  loading: true,
  can: () => false,
  canManage: () => false,
});

export function PermissionProvider({
  children,
  initialPermissions,
  initialIsAdmin,
}: {
  children: React.ReactNode;
  initialPermissions?: string[];
  initialIsAdmin?: boolean;
}) {
  const [permissions, setPermissions] = useState<string[]>(initialPermissions || []);
  const [isAdmin, setIsAdmin] = useState<boolean>(initialIsAdmin || false);
  const [isStaff, setIsStaff] = useState<boolean>(false);
  const [roleName, setRoleName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(!initialPermissions);

  useEffect(() => {
    let active = true;

    fetch("/api/me/permissions")
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.success) {
          setPermissions(data.permissions || []);
          setIsAdmin(Boolean(data.isAdmin));
          setIsStaff(Boolean(data.isStaff));
          setRoleName(data.roleName || "");
        }
      })
      .catch(() => {
        // keep defaults
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const can = (perm: Permission | Permission[]) => {
    if (isAdmin) return true;
    return hasPermission(permissions, perm, isAdmin);
  };

  const canManage = (perm: Permission) => {
    if (isAdmin) return true;
    return permissions.includes(perm);
  };

  return (
    <PermissionContext.Provider
      value={{
        permissions,
        isAdmin,
        isStaff,
        roleName,
        loading,
        can,
        canManage,
      }}
    >
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}

export interface PermissionGateProps {
  permission?: Permission | Permission[];
  adminOnly?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  adminOnly = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can, isAdmin, loading } = usePermissions();

  if (loading) {
    return null;
  }

  if (adminOnly) {
    return isAdmin ? <>{children}</> : <>{fallback}</>;
  }

  if (!permission) {
    return <>{children}</>;
  }

  const allowed = can(permission);
  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function RequirePermission({
  permission,
  adminOnly = false,
  children,
}: {
  permission?: Permission | Permission[];
  adminOnly?: boolean;
  children: React.ReactNode;
}) {
  const { can, isAdmin, loading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (adminOnly && !isAdmin) {
        router.replace("/admin/no-access");
      } else if (permission && !can(permission)) {
        router.replace("/admin/no-access");
      }
    }
  }, [loading, isAdmin, permission, can, adminOnly, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-xs text-neutral-400">
        Memeriksa hak akses akun...
      </div>
    );
  }

  if (adminOnly && !isAdmin) return null;
  if (permission && !can(permission)) return null;

  return <>{children}</>;
}
