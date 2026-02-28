import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import AdminNavbar from '../../components/AdminNavbar';

export default function AdminOffices() {
  const { adminUser, loading } = useAdminAuth();
  const router = useRouter();
  const [offices, setOffices] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCity, setFilterCity] = useState('');

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    } else if (adminUser) {
      fetchOffices();
    }
  }, [adminUser, loading]);

  const fetchOffices = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/offices/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOffices(Array.isArray(data) ? data : (data.results || []));
    } catch (error) {
      console.error('Error fetching offices:', error);
      setOffices([]);
    } finally {
      setLoadingData(false);
    }
  };

  const filteredOffices = offices.filter(office => {
    const matchesDept = !filterDepartment || office.department_name?.toLowerCase().includes(filterDepartment.toLowerCase());
    const matchesCity = !filterCity || office.city?.toLowerCase().includes(filterCity.toLowerCase());
    return matchesDept && matchesCity;
  });

  if (loading || loadingData) {
    return <div style={styles.loadingContainer}><div className="spinner"></div></div>;
  }

  return (
    <>
      <Head><title>Offices - Admin</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <div style={styles.header}>
              <div>
                <h1 style={styles.title}>Office Management</h1>
                <p style={styles.subtitle}>{filteredOffices.length} office{filteredOffices.length !== 1 ? 's' : ''} found</p>
              </div>
              <Link href="/admin/offices/add" style={styles.addButton}>
                + Add Office
              </Link>
            </div>

            <div style={styles.filterBar}>
              <input
                type="text"
                placeholder="Filter by department..."
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                style={styles.filterInput}
              />
              <input
                type="text"
                placeholder="Filter by city..."
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                style={styles.filterInput}
              />
            </div>

            {filteredOffices.length === 0 ? (
              <div style={styles.emptyState}>
                <div style={styles.emptyIcon}>🏢</div>
                <h3 style={styles.emptyTitle}>No offices found</h3>
                <p style={styles.emptyText}>
                  {offices.length === 0 ? 'Start by adding your first office location' : 'Try adjusting your filters'}
                </p>
                {offices.length === 0 && (
                  <Link href="/admin/offices/add" style={styles.emptyButton}>
                    + Add Office
                  </Link>
                )}
              </div>
            ) : (
              <div style={styles.grid}>
                {filteredOffices.map(office => (
                  <div key={office.id} style={styles.card}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{office.name}</h3>
                      <span style={styles.badge}>{office.department_name}</span>
                    </div>
                    <div style={styles.cardBody}>
                      <div style={styles.infoRow}>
                        <span style={styles.icon}>📍</span>
                        <span style={styles.infoText}>{office.city}, {office.state}</span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.icon}>📧</span>
                        <span style={styles.infoText}>{office.email || 'N/A'}</span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.icon}>📞</span>
                        <span style={styles.infoText}>{office.phone || 'N/A'}</span>
                      </div>
                      <div style={styles.infoRow}>
                        <span style={styles.icon}>🕐</span>
                        <span style={styles.infoText}>{office.office_hours}</span>
                      </div>
                      {office.address && (
                        <div style={styles.addressRow}>
                          <span style={styles.icon}>🏠</span>
                          <span style={styles.addressText}>{office.address}</span>
                        </div>
                      )}
                    </div>
                    <div style={styles.cardFooter}>
                      <span style={styles.footerStat}>
                        👷 {office.worker_count || 0} worker{office.worker_count !== 1 ? 's' : ''}
                      </span>
                      <span style={styles.statusBadge}>
                        {office.is_active ? '🟢 Active' : '🔴 Inactive'}
                      </span>
                    </div>
                    <div style={styles.cardActions}>
                      <button 
                        onClick={() => router.push(`/admin/offices/${office.id}`)} 
                        style={styles.viewButton}
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' },
  title: { fontSize: '28px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: '#94a3b8', margin: 0 },
  addButton: { padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s' },
  filterBar: { display: 'flex', gap: '12px', marginBottom: '24px' },
  filterInput: { flex: 1, padding: '10px 14px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#1e293b', color: '#f1f5f9' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', alignItems: 'stretch' },
  card: { background: '#1e293b', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', overflow: 'hidden', transition: 'box-shadow 0.2s', border: '1px solid #334155', display: 'flex', flexDirection: 'column' },
  cardHeader: { padding: '20px 20px 12px 20px', borderBottom: '1px solid #334155' },
  cardTitle: { fontSize: '17px', fontWeight: '600', color: '#f1f5f9', margin: '0 0 8px 0', lineHeight: '1.4' },
  badge: { display: 'inline-block', padding: '4px 10px', background: '#1e3a8a', color: '#60a5fa', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
  cardBody: { padding: '16px 20px', flex: 1 },
  infoRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  icon: { fontSize: '16px', width: '20px' },
  infoText: { fontSize: '14px', color: '#cbd5e1', flex: 1 },
  addressRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155' },
  addressText: { fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', flex: 1 },
  cardFooter: { padding: '10px 20px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerStat: { fontSize: '13px', color: '#94a3b8', fontWeight: '500' },
  statusBadge: { fontSize: '12px', fontWeight: '600', color: '#10b981' },
  cardActions: { padding: '14px 20px', borderTop: '1px solid #334155' },
  viewButton: { width: '100%', padding: '10px 0', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', letterSpacing: '0.3px', transition: 'background 0.2s' },
  emptyState: { textAlign: 'center', padding: '80px 20px', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155' },
  emptyIcon: { fontSize: '64px', marginBottom: '16px' },
  emptyTitle: { fontSize: '20px', fontWeight: '600', color: '#f1f5f9', margin: '0 0 8px 0' },
  emptyText: { fontSize: '14px', color: '#94a3b8', marginBottom: '24px' },
  emptyButton: { display: 'inline-block', padding: '12px 24px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }
};

