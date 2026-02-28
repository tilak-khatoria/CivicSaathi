import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../components/AdminNavbar';

export default function AdminWorkers() {
  const { adminUser, loading } = useAdminAuth();
  const router = useRouter();
  const [workers, setWorkers] = useState([]);
  const [workerStats, setWorkerStats] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [filters, setFilters] = useState({ department: 'all', city: 'all', search: '' });

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser) {
      fetchWorkers();
    }
  }, [adminUser, loading]);

  const fetchWorkers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/workers/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const workersList = Array.isArray(data) ? data : (data.results || []);
      setWorkers(workersList);
      
      // Fetch statistics for each worker
      const stats = {};
      await Promise.all(
        workersList.map(async (worker) => {
          try {
            const statResponse = await fetch(`http://localhost:8000/api/workers/${worker.id}/statistics/`);
            if (statResponse.ok) {
              const statData = await statResponse.json();
              stats[worker.id] = statData;
            }
          } catch (err) {
            console.error(`Error fetching stats for worker ${worker.id}:`, err);
            stats[worker.id] = {
              active_assignments: 0,
              completed_assignments: 0,
              total_assignments: 0
            };
          }
        })
      );
      setWorkerStats(stats);
    } catch (error) {
      console.error('Error fetching workers:', error);
      setWorkers([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteAllWorkers = async () => {
    if (!confirm('Are you sure you want to delete ALL workers? This action cannot be undone!')) {
      return;
    }
    
    if (!confirm('This will permanently delete all worker accounts. Are you absolutely sure?')) {
      return;
    }

    try {
      setLoadingData(true);
      const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/workers/delete-all/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`
        }
      });
      
      if (response.ok) {
        alert('All workers have been deleted successfully');
        fetchWorkers();
      } else {
        throw new Error('Failed to delete workers');
      }
    } catch (error) {
      console.error('Error deleting workers:', error);
      alert('Failed to delete workers: ' + error.message);
    } finally {
      setLoadingData(false);
    }
  };

  if (loading || loadingData) {
    return <div style={styles.loadingContainer}><div className="spinner"></div></div>;
  }

  const filteredWorkers = workers.filter(w => {
    const fullName = `${w.first_name || ''} ${w.last_name || ''} ${w.username || ''}`.toLowerCase();
    if (filters.search && !fullName.includes(filters.search.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <Head><title>Workers - Admin</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>Worker Management</h1>
                <p style={styles.subtitle}>{filteredWorkers.length} of {workers.length} workers</p>
              </div>
              <div style={styles.headerActions}>
                {workers.length > 0 && (
                  <button 
                    onClick={handleDeleteAllWorkers}
                    style={styles.deleteAllButton}
                  >
                    🗑️ Delete All Workers
                  </button>
                )}
                <Link href="/admin/workers/add">
                  <button style={styles.addButton}>
                    + Add Worker
                  </button>
                </Link>
              </div>
            </div>

            {/* Filters */}
            <div style={styles.filtersCard}>
              <input
                type="text"
                placeholder="Search by name or username..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
                style={styles.searchInput}
              />
            </div>

            {/* Workers Grid */}
            {filteredWorkers.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>👷</div>
                <h3 style={styles.emptyTitle}>No workers found</h3>
                <p style={styles.emptyText}>
                  {workers.length === 0 ? 'Add workers to manage your workforce' : 'Try adjusting your search'}
                </p>
                {workers.length === 0 && (
                  <Link href="/admin/workers/add" style={styles.emptyButton}>
                    + Add Worker
                  </Link>
                )}
              </div>
            ) : (
              <div style={styles.grid}>
                {filteredWorkers.map(worker => {
                  const fullName = `${worker.first_name || ''} ${worker.last_name || ''}`.trim() || worker.username;
                  const stats = workerStats[worker.id] || { active_assignments: 0, completed_assignments: 0, total_assignments: 0 };
                  return (
                    <div key={worker.id} style={styles.card}>
                      <div style={styles.workerHeader}>
                        <div style={styles.avatar}>{fullName.charAt(0).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <h3 style={styles.cardTitle}>{fullName}</h3>
                          <p style={styles.workerId}>ID: #{worker.id}</p>
                        </div>
                      </div>
                      <div style={styles.workerMeta}>
                        <div style={styles.metaRow}>
                          <span style={styles.metaIcon}>🏢</span>
                          <span style={styles.metaText}>{worker.department_name}</span>
                        </div>
                        <div style={styles.metaRow}>
                          <span style={styles.metaIcon}>📍</span>
                          <span style={styles.metaText}>{worker.city}, {worker.state}</span>
                        </div>
                        <div style={styles.metaRow}>
                          <span style={styles.metaIcon}>📱</span>
                          <span style={styles.metaText}>{worker.phone || 'N/A'}</span>
                        </div>
                        <div style={styles.metaRow}>
                          <span style={styles.metaIcon}>📋</span>
                          <span style={styles.metaText}>Active Tasks: {stats.active_assignments}</span>
                        </div>
                      </div>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => router.push(`/admin/workers/${worker.id}`)} style={styles.viewButton}>
                        View Details
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0f172a' },
  main: { paddingTop: '70px' },
  content: { maxWidth: '1400px', margin: '0 auto', padding: '30px 20px' },
  loadingContainer: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '1rem' },
  headerActions: { display: 'flex', gap: '0.75rem', alignItems: 'center' },
  title: { fontSize: '28px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: '#94a3b8' },
  addButton: { padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  deleteAllButton: { padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  filtersCard: { background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid #334155' },
  searchInput: { width: '100%', padding: '10px 16px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', backgroundColor: '#0f172a', color: '#f1f5f9' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' },
  card: { background: '#1e293b', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid #334155', display: 'flex', flexDirection: 'column', minHeight: '280px' },
  workerHeader: { display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '600', flexShrink: 0 },
  cardTitle: { fontSize: '18px', fontWeight: '600', color: '#f1f5f9', margin: '0 0 4px 0' },
  workerId: { fontSize: '12px', color: '#64748b', margin: 0 },
  workerMeta: { marginBottom: '16px' },
  metaRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  metaIcon: { fontSize: '16px', width: '20px', flexShrink: 0 },
  metaText: { fontSize: '14px', color: '#cbd5e1' },
  viewButton: { width: '100%', padding: '10px', background: '#334155', color: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'background 0.2s' },
  emptyState: { textAlign: 'center', padding: '80px 20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' },
  emptyIcon: { fontSize: '64px', marginBottom: '16px' },
  emptyTitle: { fontSize: '20px', fontWeight: '600', color: '#f1f5f9', margin: '0 0 8px 0' },
  emptyText: { fontSize: '14px', color: '#94a3b8', marginBottom: '24px' },
  emptyButton: { display: 'inline-block', padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }
};
