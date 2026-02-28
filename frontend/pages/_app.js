import '../styles/globals.css';
import { AuthProvider } from '../context/AuthContext';
import { AdminAuthProvider } from '../context/AdminAuthContext';
import { WorkerAuthProvider } from '../context/WorkerAuthContext';

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AdminAuthProvider>
        <WorkerAuthProvider>
          <Component {...pageProps} />
        </WorkerAuthProvider>
      </AdminAuthProvider>
    </AuthProvider>
  );
}
