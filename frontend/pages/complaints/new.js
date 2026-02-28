import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Navbar from '../../components/Navbar';
import { complaintAPI } from '../../utils/api';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Reverse geocode coordinates → location text, city, state using Nominatim
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
  const resp = await axios.get(url, { headers: { 'Accept-Language': 'en' } });
  const addr = resp.data.address || {};
  const location = resp.data.display_name || '';
  const city =
    addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
  const state = addr.state || '';
  return { location, city, state };
}

// Steps: 'upload' → 'analyzing' → 'review' → 'success' | 'duplicate'
export default function NewComplaint() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [geoData, setGeoData] = useState({ location: '', city: '', state: '' });
  const [geoLoading, setGeoLoading] = useState(false);

  // Duplicate detection state
  const [duplicateInfo, setDuplicateInfo] = useState(null);

  const [complaint, setComplaint] = useState({
    title: '',
    department_id: '',
    department_name: '',
    description: '',
    location: '',
    city: '',
    state: '',
    latitude: '',
    longitude: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      fetchLocation();
    }
  }, [user, loading]);

  const fetchLocation = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setCoords({ lat, lng });
        try {
          const geo = await reverseGeocode(lat, lng);
          setGeoData(geo);
        } catch (e) {
          console.error('Reverse geocode failed:', e);
          setGeoData({ location: '', city: user?.city || '', state: user?.state || '' });
        }
        setGeoLoading(false);
      },
      (err) => {
        console.error('Geolocation denied:', err);
        setGeoData({ location: '', city: user?.city || '', state: user?.state || '' });
        setGeoLoading(false);
      }
    );
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setError('');
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError('Please upload a photo first.');
      return;
    }
    setError('');
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
      const response = await axios.post(`${API_BASE}/complaints/analyze-image/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Token ${token}`,
        },
      });

      const data = response.data;
      setComplaint({
        title: data.title || '',
        department_id: data.department_id || '',
        department_name: data.department_name || '',
        description: data.description || '',
        // Prefer precise GPS+Nominatim address; fall back to AI scene description
        location: geoData.location || data.location || '',
        city: geoData.city || user?.city || '',
        state: geoData.state || user?.state || '',
        latitude: coords.lat,
        longitude: coords.lng,
      });
      setStep('review');
    } catch (err) {
      setError(err.response?.data?.error || 'Image analysis failed. Please try again.');
      setStep('upload');
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      const response = await complaintAPI.create({
        title: complaint.title,
        description: complaint.description,
        department: complaint.department_id,
        location: complaint.location,
        city: complaint.city,
        state: complaint.state,
        latitude: complaint.latitude,
        longitude: complaint.longitude,
        image: imageFile,
      });

      const data = response.data;

      // Handle duplicate detection responses (HTTP 200 with auto-upvote)
      if (data.duplicate) {
        setDuplicateInfo(data);
        setStep('duplicate');
        return;
      }

      setStep('success');
      setTimeout(() => router.push('/dashboard'), 2500);
    } catch (err) {
      // HTTP 409 = same user already reported this exact issue
      if (err.response?.status === 409 && err.response?.data?.duplicate) {
        setDuplicateInfo(err.response.data);
        setStep('duplicate');
        return;
      }
      setError(err.response?.data?.error || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) return null;

  const STEPS = ['upload', 'analyzing', 'review'];
  const stepIdx = STEPS.indexOf(step);

  return (
    <div style={styles.container}>
      <Navbar />

      <main style={styles.main}>
        <div style={styles.content}>
          <div style={styles.header}>
            <button onClick={() => router.back()} className="btn btn-secondary">
              ← Back
            </button>
            <h1 style={styles.title}>Submit New Complaint</h1>
            <p style={styles.subtitle}>Upload a photo — AI does the rest</p>
          </div>

          {/* Step indicator */}
          {step !== 'success' && step !== 'duplicate' && (
            <div style={styles.stepIndicator}>
              {[
                { key: 'upload', label: 'Upload' },
                { key: 'analyzing', label: 'Analyze' },
                { key: 'review', label: 'Review' },
              ].map((s, i) => (
                <div key={s.key} style={styles.stepRow}>
                  <div
                    style={{
                      ...styles.stepCircle,
                      ...(step === s.key ? styles.stepActive : {}),
                      ...(stepIdx > i ? styles.stepDone : {}),
                    }}
                  >
                    {stepIdx > i ? '✓' : i + 1}
                  </div>
                  <span
                    style={{
                      ...styles.stepLabel,
                      ...(step === s.key ? styles.stepLabelActive : {}),
                    }}
                  >
                    {s.label}
                  </span>
                  {i < 2 && <div style={styles.stepLine} />}
                </div>
              ))}
            </div>
          )}

          <div className="card" style={styles.formCard}>

            {/* ── STEP 1: UPLOAD ── */}
            {step === 'upload' && (
              <div style={styles.stepContent}>
                <h2 style={styles.stepTitle}>Upload a Photo of the Issue</h2>
                <p style={styles.stepDesc}>
                  Take or upload a clear photo of the civic problem. Our AI will automatically generate
                  all complaint details — no form filling needed.
                </p>

                {error && <div style={styles.error}>{error}</div>}

                {/* Image upload zone */}
                <div style={styles.imageUploadZone}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    id="imageUpload"
                  />
                  <label htmlFor="imageUpload" style={styles.uploadLabel}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" style={styles.imagePreviewLarge} />
                    ) : (
                      <div style={styles.uploadPlaceholder}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <p style={{ fontWeight: '600', marginTop: '1rem', marginBottom: '0.25rem' }}>
                          Click to upload photo
                        </p>
                        <p style={styles.uploadHint}>PNG, JPG, WEBP — up to 10MB</p>
                      </div>
                    )}
                  </label>
                  {imagePreview && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ marginTop: '0.75rem', width: '100%' }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </button>
                  )}
                </div>

                {/* Location status chip */}
                <div style={styles.locationChip}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {geoLoading ? (
                    <span>Fetching your location...</span>
                  ) : coords.lat ? (
                    <span style={{ color: 'var(--accent-success)' }}>
                      Location detected{geoData.city ? ` — ${geoData.city}, ${geoData.state}` : ''}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Location unavailable (GPS access denied)</span>
                  )}
                </div>

                <div style={styles.actions}>
                  <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAnalyze}
                    disabled={!imageFile}
                    style={!imageFile ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                  >
                    🔍&nbsp;Analyze Image
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: ANALYZING ── */}
            {step === 'analyzing' && (
              <div style={styles.analyzingContainer}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div className="spinner" style={{ width: '64px', height: '64px', borderWidth: '5px', margin: '0 auto' }}></div>
                </div>
                <h2 style={styles.stepTitle}>Analyzing Your Photo…</h2>
                <p style={styles.stepDesc}>
                  Our AI is identifying the civic issue, selecting the right department, and generating a
                  detailed complaint. This takes just a few seconds.
                </p>
                <div style={styles.thinkingBadge}>✨ AI Processing</div>
              </div>
            )}

            {/* ── STEP 3: REVIEW ── */}
            {step === 'review' && (
              <div style={styles.stepContent}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={styles.aiBadge}>✨ AI Generated</div>
                </div>
                <h2 style={styles.stepTitle}>Review Your Complaint</h2>
                <p style={styles.stepDesc}>
                  All fields were auto-generated from your photo. Review and confirm to submit.
                </p>

                {error && <div style={styles.error}>{error}</div>}

                {/* Thumbnail of uploaded photo */}
                {imagePreview && (
                  <div style={styles.reviewImageWrap}>
                    <img src={imagePreview} alt="Submitted photo" style={styles.reviewImage} />
                  </div>
                )}

                {/* Read-only review fields */}
                <div style={styles.reviewGrid}>
                  <div style={styles.reviewField}>
                    <span style={styles.reviewLabel}>Complaint Title</span>
                    <div style={styles.reviewValue}>{complaint.title}</div>
                  </div>

                  <div style={styles.reviewField}>
                    <span style={styles.reviewLabel}>Department</span>
                    <div style={styles.reviewValue}>{complaint.department_name}</div>
                  </div>

                  <div style={{ ...styles.reviewField, gridColumn: '1 / -1' }}>
                    <span style={styles.reviewLabel}>Description</span>
                    <div style={{ ...styles.reviewValue, ...styles.reviewTextArea }}>
                      {complaint.description}
                    </div>
                  </div>

                  <div style={{ ...styles.reviewField, gridColumn: '1 / -1' }}>
                    <span style={styles.reviewLabel}>Location</span>
                    <div style={styles.reviewValue}>{complaint.location || 'Not available'}</div>
                  </div>

                  <div style={styles.reviewField}>
                    <span style={styles.reviewLabel}>City</span>
                    <div style={styles.reviewValue}>{complaint.city || 'Not available'}</div>
                  </div>

                  <div style={styles.reviewField}>
                    <span style={styles.reviewLabel}>State</span>
                    <div style={styles.reviewValue}>{complaint.state || 'Not available'}</div>
                  </div>

                  <div style={styles.reviewField}>
                    <span style={styles.reviewLabel}>Latitude</span>
                    <div style={styles.reviewValue}>{complaint.latitude || 'Not detected'}</div>
                  </div>

                  <div style={styles.reviewField}>
                    <span style={styles.reviewLabel}>Longitude</span>
                    <div style={styles.reviewValue}>{complaint.longitude || 'Not detected'}</div>
                  </div>
                </div>

                <div style={styles.readOnlyNote}>
                  🔒 Fields are AI-generated and locked to ensure complaint quality and consistency.
                </div>

                <div style={styles.actions}>
                  <button type="button" className="btn btn-secondary" onClick={() => setStep('upload')}>
                    ← Change Photo
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div>
                        &nbsp;Submitting…
                      </>
                    ) : (
                      'Submit Complaint'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: SUCCESS ── */}
            {step === 'success' && (
              <div style={styles.successMessage}>
                <div style={styles.successIcon}>✓</div>
                <h2>Complaint Submitted Successfully!</h2>
                <p>Your complaint is being processed through our validation system.</p>
                <p>Redirecting to dashboard…</p>
              </div>
            )}

            {/* ── STEP: DUPLICATE DETECTED ── */}
            {step === 'duplicate' && duplicateInfo && (
              <div style={styles.duplicateContainer}>
                {duplicateInfo.auto_upvoted ? (
                  <>
                    <div style={styles.duplicateIconUpvote}>▲</div>
                    <h2 style={styles.duplicateTitle}>Duplicate Issue Detected</h2>
                    <p style={styles.duplicateMessage}>
                      This issue already exists in our system. Your support has been
                      automatically added as an upvote!
                    </p>
                    <div style={styles.duplicateCard}>
                      <div style={styles.duplicateCardRow}>
                        <span style={styles.duplicateLabel}>Existing Complaint</span>
                        <span style={styles.duplicateValue}>#{duplicateInfo.existing_complaint_id}</span>
                      </div>
                      <div style={styles.duplicateCardRow}>
                        <span style={styles.duplicateLabel}>Total Upvotes</span>
                        <span style={{...styles.duplicateValue, color: 'var(--accent-primary)', fontWeight: '700'}}>
                          {duplicateInfo.upvote_count}
                        </span>
                      </div>
                    </div>
                    <p style={styles.duplicateHint}>
                      Higher upvote counts increase complaint priority and speed up resolution.
                    </p>
                    <div style={styles.duplicateActions}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => router.push(`/complaints/${duplicateInfo.existing_complaint_id}`)}
                      >
                        View Existing Complaint
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => router.push('/dashboard')}
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.duplicateIconSelf}>!</div>
                    <h2 style={styles.duplicateTitle}>Already Reported</h2>
                    <p style={styles.duplicateMessage}>
                      You have already reported this exact issue. There is no need to submit it again.
                    </p>
                    <div style={styles.duplicateCard}>
                      <div style={styles.duplicateCardRow}>
                        <span style={styles.duplicateLabel}>Your Complaint</span>
                        <span style={styles.duplicateValue}>#{duplicateInfo.existing_complaint_id}</span>
                      </div>
                    </div>
                    <div style={styles.duplicateActions}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => router.push(`/complaints/${duplicateInfo.existing_complaint_id}`)}
                      >
                        View Your Complaint
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => router.push('/dashboard')}
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--bg-primary)',
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    padding: '2rem 0',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 1.5rem',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: '700',
    marginTop: '1rem',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  /* ── Step indicator ── */
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '1.5rem',
    gap: 0,
  },
  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
  },
  stepCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    backgroundColor: 'var(--bg-secondary)',
    flexShrink: 0,
  },
  stepActive: {
    border: '2px solid var(--accent-primary)',
    color: 'var(--accent-primary)',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  stepDone: {
    border: '2px solid var(--accent-success)',
    color: '#fff',
    backgroundColor: 'var(--accent-success)',
  },
  stepLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginLeft: '0.4rem',
    marginRight: '0.25rem',
    whiteSpace: 'nowrap',
  },
  stepLabelActive: {
    color: 'var(--accent-primary)',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: '2px',
    backgroundColor: 'var(--border-primary)',
    minWidth: '30px',
    marginLeft: '0.25rem',
    marginRight: '0.25rem',
  },
  /* ── Card ── */
  formCard: {
    padding: '2rem',
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  stepTitle: {
    fontSize: '1.4rem',
    fontWeight: '700',
    margin: 0,
  },
  stepDesc: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    margin: 0,
    lineHeight: '1.6',
  },
  error: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid var(--accent-danger)',
    color: 'var(--accent-danger)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.875rem',
  },
  /* ── Upload zone ── */
  imageUploadZone: {
    display: 'flex',
    flexDirection: 'column',
  },
  uploadLabel: {
    display: 'block',
    cursor: 'pointer',
    border: '2px dashed var(--border-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem 2rem',
    textAlign: 'center',
    transition: 'border-color 0.2s',
    backgroundColor: 'var(--bg-tertiary)',
  },
  uploadPlaceholder: {
    color: 'var(--text-secondary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  uploadHint: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  imagePreviewLarge: {
    maxWidth: '100%',
    maxHeight: '320px',
    borderRadius: 'var(--radius-md)',
    objectFit: 'contain',
  },
  locationChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    fontSize: '0.82rem',
    color: 'var(--text-secondary)',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '0.5rem',
  },
  /* ── Analyzing step ── */
  analyzingContainer: {
    textAlign: 'center',
    padding: '3rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  thinkingBadge: {
    display: 'inline-block',
    padding: '0.3rem 0.9rem',
    borderRadius: '999px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: 'var(--accent-primary)',
    fontWeight: '600',
    fontSize: '0.85rem',
    marginTop: '0.5rem',
  },
  /* ── Review step ── */
  aiBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '999px',
    backgroundColor: 'rgba(99,102,241,0.12)',
    color: 'var(--accent-primary)',
    fontWeight: '600',
    fontSize: '0.8rem',
  },
  reviewImageWrap: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid var(--border-primary)',
    maxHeight: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-tertiary)',
  },
  reviewImage: {
    maxWidth: '100%',
    maxHeight: '220px',
    objectFit: 'contain',
  },
  reviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem',
  },
  reviewField: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  reviewLabel: {
    fontSize: '0.78rem',
    fontWeight: '600',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  reviewValue: {
    padding: '0.6rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
  },
  reviewTextArea: {
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    minHeight: '80px',
  },
  readOnlyNote: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-primary)',
  },
  /* ── Success step ── */
  successMessage: {
    textAlign: 'center',
    padding: '3rem',
  },
  successIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 1.5rem',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: 'var(--accent-success)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '3rem',
    fontWeight: '700',
  },
  /* ── Duplicate detection step ── */
  duplicateContainer: {
    textAlign: 'center',
    padding: '2.5rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  duplicateIconUpvote: {
    width: '80px',
    height: '80px',
    margin: '0 auto 0.5rem',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: 'var(--accent-primary)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: '700',
  },
  duplicateIconSelf: {
    width: '80px',
    height: '80px',
    margin: '0 auto 0.5rem',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
    fontWeight: '700',
  },
  duplicateTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: 0,
  },
  duplicateMessage: {
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    margin: 0,
    lineHeight: '1.6',
    maxWidth: '480px',
  },
  duplicateCard: {
    width: '100%',
    maxWidth: '360px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-primary)',
    backgroundColor: 'var(--bg-tertiary)',
    padding: '1rem 1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  duplicateCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duplicateLabel: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    fontWeight: '500',
  },
  duplicateValue: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  duplicateHint: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    margin: 0,
    maxWidth: '420px',
  },
  duplicateActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
  },
};
