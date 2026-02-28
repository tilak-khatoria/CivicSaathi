import { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AdminNavbar from '../../components/AdminNavbar';
import { adminAttendanceAPI } from '../../utils/adminApi';

export default function AdminAttendance() {
  const { adminUser, loading } = useAdminAuth();
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [registerData, setRegisterData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState(new Set());
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    if (!loading && !adminUser) {
      router.push('/admin/login');
    }
  }, [adminUser, loading]);

  useEffect(() => {
    fetchDepartments();
    fetchAttendanceRegister();
  }, [selectedDate, selectedCity, selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/departments/');
      const data = await response.json();
      setDepartments(data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchAttendanceRegister = async () => {
    setLoadingData(true);
    try {
      const response = await adminAttendanceAPI.getRegister(
        selectedDate,
        selectedCity,
        selectedDepartment
      );
      setRegisterData(response.data);
      setSelectedWorkers(new Set());
    } catch (error) {
      console.error('Error fetching attendance register:', error);
      setRegisterData(null);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedWorkers.size === registerData?.register.length) {
      setSelectedWorkers(new Set());
    } else {
      const allWorkerIds = new Set(registerData.register.map(w => w.worker_id));
      setSelectedWorkers(allWorkerIds);
    }
  };

  const handleWorkerToggle = (workerId) => {
    const newSelected = new Set(selectedWorkers);
    if (newSelected.has(workerId)) {
      newSelected.delete(workerId);
    } else {
      newSelected.add(workerId);
    }
    setSelectedWorkers(newSelected);
  };

  const handleMarkPresent = async () => {
    if (selectedWorkers.size === 0) {
      alert('Please select at least one worker to mark present');
      return;
    }

    try {
      await adminAttendanceAPI.bulkMarkPresent(
        Array.from(selectedWorkers),
        selectedDate
      );
      alert(`Successfully marked ${selectedWorkers.size} worker(s) as present`);
      fetchAttendanceRegister();
    } catch (error) {
      console.error('Error marking attendance:', error);
      alert('Failed to mark attendance. Please try again.');
    }
  };

  if (loading) {
    return <div style={styles.loadingContainer}><div className="spinner"></div></div>;
  }

  return (
    <>
      <Head><title>Attendance Register - Admin</title></Head>
      <div style={styles.container}>
        <AdminNavbar />
        <main style={styles.main}>
          <div style={styles.content}>
            <h1 style={styles.title}>📋 Worker Attendance Register</h1>
            <p style={styles.subtitle}>Mark attendance for all workers in register format</p>

            {/* Filters */}
            <div style={styles.filterCard}>
              <div style={styles.filterGrid}>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>City</label>
                  <select 
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">All Cities</option>
                    <option value="Jaipur">Jaipur</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Mumbai">Mumbai</option>
                  </select>
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.label}>Department</label>
                  <select 
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    style={styles.select}
                  >
                    <option value="">All Departments</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Summary */}
            {registerData && (
              <div style={styles.summaryCard}>
                <div style={styles.summaryGrid}>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryValue}>{registerData.total_workers}</span>
                    <span style={styles.summaryLabel}>Total Workers</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={{...styles.summaryValue, color: '#10b981'}}>{registerData.present_count}</span>
                    <span style={styles.summaryLabel}>Present</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={{...styles.summaryValue, color: '#ef4444'}}>{registerData.absent_count}</span>
                    <span style={styles.summaryLabel}>Absent</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.actionBar}>
              <button onClick={handleSelectAll} style={styles.selectAllButton}>
                {selectedWorkers.size === registerData?.register.length ? '❌ Deselect All' : '✅ Select All'}
              </button>
              <button 
                onClick={handleMarkPresent} 
                style={styles.markPresentButton}
                disabled={selectedWorkers.size === 0}
              >
                ✓ Mark Selected as Present ({selectedWorkers.size})
              </button>
            </div>

            {/* Attendance Register Table */}
            {loadingData ? (
              <div style={styles.loadingCard}>Loading attendance register...</div>
            ) : registerData?.register.length === 0 ? (
              <div style={styles.emptyState}>
                <h3>No workers found</h3>
                <p>Try adjusting your filters</p>
              </div>
            ) : (
              <div style={styles.registerTable}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableHeader}>Select</th>
                      <th style={styles.tableHeader}>S.No</th>
                      <th style={styles.tableHeader}>Worker Name</th>
                      <th style={styles.tableHeader}>Role</th>
                      <th style={styles.tableHeader}>Department</th>
                      <th style={styles.tableHeader}>Office</th>
                      <th style={styles.tableHeader}>City</th>
                      <th style={styles.tableHeader}>Status</th>
                      <th style={styles.tableHeader}>Check In</th>
                      <th style={styles.tableHeader}>Marked By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registerData?.register.map((worker, index) => (
                      <tr 
                        key={worker.worker_id} 
                        style={{
                          ...styles.tableRow,
                          backgroundColor: worker.status === 'PRESENT' ? '#064e3b20' : '#7f1d1d20'
                        }}
                      >
                        <td style={styles.tableCell}>
                          <input
                            type="checkbox"
                            checked={selectedWorkers.has(worker.worker_id)}
                            onChange={() => handleWorkerToggle(worker.worker_id)}
                            style={styles.checkbox}
                          />
                        </td>
                        <td style={styles.tableCell}>{index + 1}</td>
                        <td style={styles.tableCell}>
                          <strong>{worker.worker_name}</strong>
                          <div style={styles.username}>@{worker.username}</div>
                        </td>
                        <td style={styles.tableCell}>{worker.role}</td>
                        <td style={styles.tableCell}>{worker.department}</td>
                        <td style={styles.tableCell}>{worker.office}</td>
                        <td style={styles.tableCell}>{worker.city}</td>
                        <td style={styles.tableCell}>
                          <span style={{
                            ...styles.statusBadge,
                            backgroundColor: worker.status === 'PRESENT' ? '#064e3b' : '#7f1d1d',
                            color: worker.status === 'PRESENT' ? '#6ee7b7' : '#fca5a5'
                          }}>
                            {worker.status}
                          </span>
                        </td>
                        <td style={styles.tableCell}>
                          {worker.check_in_time || '-'}
                        </td>
                        <td style={styles.tableCell}>
                          {worker.marked_by || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
  title: { fontSize: '28px', fontWeight: '700', color: '#f1f5f9', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: '#94a3b8', marginBottom: '30px' },
  filterCard: { background: '#1e293b', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', marginBottom: '20px', border: '1px solid #334155' },
  filterGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#f1f5f9' },
  select: { padding: '12px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', backgroundColor: '#0f172a', color: '#f1f5f9', cursor: 'pointer' },
  input: { padding: '12px', border: '1px solid #334155', borderRadius: '8px', fontSize: '14px', backgroundColor: '#0f172a', color: '#f1f5f9' },
  summaryCard: { background: '#1e293b', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', marginBottom: '20px', border: '1px solid #334155' },
  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' },
  summaryItem: { textAlign: 'center' },
  summaryValue: { display: 'block', fontSize: '36px', fontWeight: '700', color: '#3b82f6', marginBottom: '4px' },
  summaryLabel: { display: 'block', fontSize: '14px', color: '#94a3b8', fontWeight: '500' },
  actionBar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' },
  selectAllButton: { padding: '12px 24px', background: '#334155', color: '#f1f5f9', border: '1px solid #475569', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  markPresentButton: { padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s' },
  loadingCard: { background: '#1e293b', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid #334155' },
  emptyState: { background: '#1e293b', borderRadius: '12px', padding: '60px 20px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', border: '1px solid #334155', color: '#94a3b8' },
  registerTable: { background: '#1e293b', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', overflow: 'auto', border: '1px solid #334155' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
  tableHeaderRow: { background: '#0f172a', borderBottom: '2px solid #334155' },
  tableHeader: { padding: '16px 12px', textAlign: 'left', fontWeight: '600', color: '#f1f5f9', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em' },
  tableRow: { borderBottom: '1px solid #334155', transition: 'background-color 0.2s' },
  tableCell: { padding: '16px 12px', color: '#f1f5f9' },
  checkbox: { width: '18px', height: '18px', cursor: 'pointer' },
  username: { fontSize: '12px', color: '#94a3b8', marginTop: '2px' },
  statusBadge: { display: 'inline-block', padding: '4px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }
};
