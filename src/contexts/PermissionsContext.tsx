import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// Define the structure of our permissions
type PermissionsMap = Record<string, Record<string, boolean>>;

interface PermissionsContextType {
  permissions: PermissionsMap;
  loading: boolean;
  hasPermission: (actionKey: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { userRole, userStatus } = useAuth();
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [loading, setLoading] = useState(true);

  const fetchPermissions = async () => {
    setLoading(true);
    
    const fallbackPermissions: PermissionsMap = {
      'super_admin': {
        'nav:dashboard': true, 'nav:projects': true, 'nav:users': true, 'nav:settings': true, 'nav:profile': true, 'nav:favorites': true, 'nav:admin': true,
        'project:view': true, 'project:create': true, 'project:edit': true, 'project:delete': true, 'project:sync': true, 'project_detail:view': true,
        'unit_search:view': true, 'unit_list:view': true, 'unit:view_price': true, 'unit:view_policy': true, 'unit:lock': true,
        'pricing:view': true, 'pricing:export': true,
        'user:view': true, 'user:edit': true, 'user:delete': true,
        'setting:view': true, 'setting:edit': true,
        'profile:edit': true, 'favorite:add_remove': true,
        'admin:system_data:view': true, 'admin:system_data:sync': true, 'admin:allowed_phones:view': true, 'admin:allowed_phones:edit': true
      },
      'project_director': {
        'nav:dashboard': true, 'nav:projects': true, 'nav:users': false, 'nav:settings': true, 'nav:profile': true, 'nav:favorites': true, 'nav:admin': false,
        'project:view': true, 'project:create': false, 'project:edit': false, 'project:delete': false, 'project:sync': false, 'project_detail:view': true,
        'unit_search:view': true, 'unit_list:view': true, 'unit:view_price': true, 'unit:view_policy': true, 'unit:lock': true,
        'pricing:view': true, 'pricing:export': true,
        'user:view': true, 'user:edit': true, 'user:delete': true,
        'setting:view': false, 'setting:edit': false,
        'profile:edit': true, 'favorite:add_remove': true,
        'admin:system_data:view': false, 'admin:system_data:sync': false, 'admin:allowed_phones:view': false, 'admin:allowed_phones:edit': false
      },
      'admin': {
        'nav:dashboard': true, 'nav:projects': true, 'nav:users': true, 'nav:settings': true, 'nav:profile': true, 'nav:favorites': true, 'nav:admin': false,
        'project:view': true, 'project:create': false, 'project:edit': false, 'project:delete': false, 'project:sync': false, 'project_detail:view': true,
        'unit_search:view': true, 'unit_list:view': true, 'unit:view_price': true, 'unit:view_policy': true, 'unit:lock': true,
        'pricing:view': false, 'pricing:export': false,
        'user:view': true, 'user:edit': false, 'user:delete': false,
        'setting:view': false, 'setting:edit': false,
        'profile:edit': true, 'favorite:add_remove': true,
        'admin:system_data:view': false, 'admin:system_data:sync': false, 'admin:allowed_phones:view': false, 'admin:allowed_phones:edit': false
      },
      'user': {
        'nav:dashboard': true, 'nav:projects': true, 'nav:users': true, 'nav:settings': false, 'nav:profile': true, 'nav:favorites': true, 'nav:admin': false,
        'project:view': true, 'project:create': false, 'project:edit': false, 'project:delete': false, 'project:sync': false, 'project_detail:view': true,
        'unit_search:view': true, 'unit_list:view': true, 'unit:view_price': true, 'unit:view_policy': true, 'unit:lock': true,
        'pricing:view': false, 'pricing:export': false,
        'user:view': true, 'user:edit': false, 'user:delete': false,
        'setting:view': false, 'setting:edit': false,
        'profile:edit': false, 'favorite:add_remove': true,
        'admin:system_data:view': false, 'admin:system_data:sync': false, 'admin:allowed_phones:view': false, 'admin:allowed_phones:edit': false
      },
      'guest': {
        'nav:dashboard': true, 'nav:projects': true, 'nav:users': false, 'nav:settings': false, 'nav:profile': false, 'nav:favorites': false, 'nav:admin': false,
        'project:view': true, 'project:create': false, 'project:edit': false, 'project:delete': false, 'project:sync': false, 'project_detail:view': true,
        'unit_search:view': true, 'unit_list:view': true, 'unit:view_price': false, 'unit:view_policy': false, 'unit:lock': false,
        'pricing:view': false, 'pricing:export': false,
        'user:view': false, 'user:edit': false, 'user:delete': false,
        'setting:view': false, 'setting:edit': false,
        'profile:edit': false, 'favorite:add_remove': false,
        'admin:system_data:view': false, 'admin:system_data:sync': false, 'admin:allowed_phones:view': false, 'admin:allowed_phones:edit': false
      },
      'banner': { // Banned user
        'nav:dashboard': false, 'nav:projects': false, 'nav:users': false, 'nav:settings': false, 'nav:profile': false, 'nav:favorites': false, 'nav:admin': false,
        'project:view': false, 'project:create': false, 'project:edit': false, 'project:delete': false, 'project:sync': false, 'project_detail:view': false,
        'unit_search:view': false, 'unit_list:view': false, 'unit:view_price': false, 'unit:view_policy': false, 'unit:lock': false,
        'pricing:view': false, 'pricing:export': false,
        'user:view': false, 'user:edit': false, 'user:delete': false,
        'setting:view': false, 'setting:edit': false,
        'profile:edit': false, 'favorite:add_remove': false,
        'admin:system_data:view': false, 'admin:system_data:sync': false, 'admin:allowed_phones:view': false, 'admin:allowed_phones:edit': false
      }
    };

    try {
      // Use the provided GAS URL as default, with environment variable override
      const gasUrl = import.meta.env.VITE_PERMISSIONS_GAS_URL || 'https://script.google.com/macros/s/AKfycbycTcTfNRqzwOSRJs8-Ml1JOm2SSav2EKiJ5XhjyWUThP1vAOl2OsgzpRSn_rH7-3K0Vw/exec';
      
      if (gasUrl) {
        const response = await fetch(gasUrl);
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          // Merge fallback with fetched data to ensure all roles have at least base permissions
          const merged: PermissionsMap = { ...fallbackPermissions };
          Object.keys(data).forEach(role => {
            merged[role] = { ...(merged[role] || {}), ...data[role] };
          });
          setPermissions(merged);
        } else {
          setPermissions(fallbackPermissions);
        }
      } else {
        setPermissions(fallbackPermissions);
      }
    } catch (error) {
      console.error('Failed to fetch permissions, using fallback:', error);
      setPermissions(fallbackPermissions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

  const hasPermission = (actionKey: string): boolean => {
    // If user is banned, deny everything
    if (userStatus === 'banned' || userRole === 'banner') return false;

    // Super Admin always has full access
    if (userRole === 'super_admin') return true;
    
    // If no role or permissions not loaded, deny by default
    if (!userRole || !permissions[userRole]) return false;

    // Check specific permission
    return !!permissions[userRole][actionKey];
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, hasPermission, refreshPermissions: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};

// Utility component to conditionally render based on permissions
export const RequirePermission: React.FC<{ actionKey: string; children: ReactNode; fallback?: ReactNode }> = ({ 
  actionKey, 
  children, 
  fallback = null 
}) => {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null; // Or a spinner

  return hasPermission(actionKey) ? <>{children}</> : <>{fallback}</>;
};
