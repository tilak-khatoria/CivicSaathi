import { createContext, useContext, useState, useEffect } from 'react';
import { workerAuthAPI } from '../utils/workerApi';
import { useRouter } from 'next/router';

const WorkerAuthContext = createContext({});

export const useWorkerAuth = () => useContext(WorkerAuthContext);

export const WorkerAuthProvider = ({ children }) => {
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('worker_token');
    if (token) {
      try {
        const response = await workerAuthAPI.getCurrentWorker();
        setWorker(response.data);
      } catch (error) {
        console.error('Worker auth check failed:', error);
        localStorage.removeItem('worker_token');
        localStorage.removeItem('worker');
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await workerAuthAPI.login({ username, password });
      const { user, worker, token } = response.data;

      // Merge user identity fields into the worker object so name is always available
      const workerWithUser = {
        ...worker,
        first_name: user.first_name,
        last_name: user.last_name,
        username: user.username,
        email: user.email,
      };

      localStorage.setItem('worker_token', token);
      localStorage.setItem('worker', JSON.stringify(workerWithUser));
      setWorker(workerWithUser);
      router.push('/worker/dashboard');
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await workerAuthAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    localStorage.removeItem('worker_token');
    localStorage.removeItem('worker');
    setWorker(null);
    router.push('/worker/login');
  };

  return (
    <WorkerAuthContext.Provider value={{ worker, loading, login, logout }}>
      {children}
    </WorkerAuthContext.Provider>
  );
};
