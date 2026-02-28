import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import adminCredentials from '../../adminCredentials.json';

const AdminAuthContext = createContext({});

export const useAdminAuth = () => useContext(AdminAuthContext);

export const AdminAuthProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = () => {
    const storedAdmin = localStorage.getItem('adminUser');
    const adminToken = localStorage.getItem('adminToken');
    
    if (storedAdmin && adminToken) {
      try {
        const admin = JSON.parse(storedAdmin);
        setAdminUser(admin);
      } catch (error) {
        console.error('Invalid admin session:', error);
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminToken');
      }
    }
    setLoading(false);
  };

  const loginAdmin = (userId, password, cityContext = null) => {
    // Check Root Admin
    if (adminCredentials.root_admin.userId === userId && 
        adminCredentials.root_admin.password === password) {
      const admin = {
        ...adminCredentials.root_admin,
        displayName: 'ULB Root Administrator',
        cityContext: null // Root admin has global access
      };
      localStorage.setItem('adminUser', JSON.stringify(admin));
      localStorage.setItem('adminToken', generateToken());
      setAdminUser(admin);
      router.push('/admin/dashboard');
      return { success: true, admin };
    }

    // Check Sub-Admins
    const subAdmin = adminCredentials.sub_admins.find(
      sa => sa.userId === userId && sa.password === password
    );
    if (subAdmin) {
      const admin = {
        ...subAdmin,
        displayName: subAdmin.clusterName,
        cityContext: null // Sub-admins have cluster-wide access
      };
      localStorage.setItem('adminUser', JSON.stringify(admin));
      localStorage.setItem('adminToken', generateToken());
      setAdminUser(admin);
      router.push('/admin/dashboard');
      return { success: true, admin };
    }

    // Check Department Admins (with optional city context)
    const deptAdmin = adminCredentials.department_admins.find(
      da => da.userId === userId && da.password === password
    );
    if (deptAdmin) {
      const admin = {
        ...deptAdmin,
        displayName: deptAdmin.departmentName,
        cityContext: cityContext || null // Store city context for multi-city login
      };
      localStorage.setItem('adminUser', JSON.stringify(admin));
      localStorage.setItem('adminToken', generateToken());
      setAdminUser(admin);
      router.push('/admin/dashboard');
      return { success: true, admin };
    }

    return { success: false, error: 'Invalid credentials' };
  };

  const logoutAdmin = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    setAdminUser(null);
    router.push('/admin/login');
  };

  const hasPermission = (permission) => {
    if (!adminUser) return false;
    
    // Root admin has all permissions
    if (adminUser.role === 'ROOT_ADMIN') return true;
    
    // Check specific permissions
    return adminUser.permissions?.includes(permission) || false;
  };

  const canAccessDepartment = (departmentId) => {
    if (!adminUser) return false;
    
    // Root admin can access all departments
    if (adminUser.role === 'ROOT_ADMIN') return true;
    
    // Sub-admin can access departments in their cluster
    if (adminUser.role === 'SUB_ADMIN') {
      return adminUser.departments?.includes(departmentId) || false;
    }
    
    // Department admin can only access their own department
    if (adminUser.role === 'DEPARTMENT_ADMIN') {
      return adminUser.departmentId === departmentId;
    }
    
    return false;
  };

  const getAccessibleDepartments = () => {
    if (!adminUser) return [];
    
    // Root admin sees all departments
    if (adminUser.role === 'ROOT_ADMIN') {
      return adminCredentials.department_admins.map(da => da.departmentId);
    }
    
    // Sub-admin sees departments in their cluster
    if (adminUser.role === 'SUB_ADMIN') {
      return adminUser.departments || [];
    }
    
    // Department admin sees only their department
    if (adminUser.role === 'DEPARTMENT_ADMIN') {
      return [adminUser.departmentId];
    }
    
    return [];
  };

  const getDepartmentInfo = (departmentId) => {
    return adminCredentials.department_admins.find(
      da => da.departmentId === departmentId
    );
  };

  const getClusterInfo = (clusterId) => {
    return adminCredentials.sub_admins.find(
      sa => sa.clusterId === clusterId
    );
  };

  return (
    <AdminAuthContext.Provider value={{
      adminUser,
      loading,
      loginAdmin,
      logoutAdmin,
      hasPermission,
      canAccessDepartment,
      getAccessibleDepartments,
      getDepartmentInfo,
      getClusterInfo,
      isRootAdmin: adminUser?.role === 'ROOT_ADMIN',
      isSubAdmin: adminUser?.role === 'SUB_ADMIN',
      isDepartmentAdmin: adminUser?.role === 'DEPARTMENT_ADMIN'
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

// Helper function to generate a simple token
function generateToken() {
  return 'admin_' + Math.random().toString(36).substr(2) + Date.now().toString(36);
}
