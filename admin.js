let supabaseClient = null;
let students = [];
let attendanceRecords = [];

// ==========================================
// AUDIO CONTEXT - Pre-initialize for faster sound playback on mobile
// ==========================================
let audioContext = null;

function initAudioContext() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Resume audio context for mobile (required after user interaction)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    }
    return audioContext;
  } catch (e) {
    return null;
  }
}

// ==========================================
// TIMETABLE (same as app.js) - for weighted pts
// lab slot = 2 pts, theory/elective = 1 pt
// ==========================================
const TIMETABLE_ADMIN = {
  1: [ // Monday
    { slots: '1-2', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'DAA', '5D2': 'SE',  '5D3': 'MP' } },
    { slots: '3',   type: 'elective', batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false },
    { slots: '5-6', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'AJP', '5D2': 'CN',  '5D3': 'SE' } }
  ],
  2: [ // Tuesday
    { slots: '1-2', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'SE',  '5D2': 'DAA', '5D3': 'CN' } },
    { slots: '3',   type: 'elective', batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false },
    { slots: '5',   type: 'theory',   batchSpecific: false },
    { slots: '6',   type: 'theory',   batchSpecific: false }
  ],
  3: [ // Wednesday
    { slots: '1-2', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'CN',  '5D2': 'MP',  '5D3': 'DAA' } },
    { slots: '3',   type: 'elective', batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false },
    { slots: '5',   type: 'theory',   batchSpecific: false },
    { slots: '6',   type: 'theory',   batchSpecific: false }
  ],
  4: [ // Thursday
    { slots: '1',   type: 'theory',   batchSpecific: false },
    { slots: '2',   type: 'theory',   batchSpecific: false },
    { slots: '3',   type: 'theory',   batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false },
    { slots: '5-6', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'MP',  '5D2': 'ELECTIVE', '5D3': 'OT' } }
  ],
  5: [ // Friday
    { slots: '1',   type: 'theory',   batchSpecific: false },
    { slots: '2',   type: 'theory',   batchSpecific: false },
    { slots: '3',   type: 'theory',   batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false },
    { slots: '5',   type: 'theory',   batchSpecific: false },
    { slots: '6',   type: 'theory',   batchSpecific: false }
  ],
  6: []
};

/**
 * Returns the point weight for a specific slot index on a given date for a student.
 * lab = 2 pts (2 hours), theory/elective = 1 pt (1 hour)
 */
function getSlotPoints(dateStr, slotIndex, batch) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dow = dateObj.getDay(); // 0=Sun ... 6=Sat
  const daySchedule = TIMETABLE_ADMIN[dow];
  if (!daySchedule || !daySchedule[slotIndex]) return 1;
  const entry = daySchedule[slotIndex];
  return entry.type === 'lab' ? 2 : 1;
}

// ==========================================
// NOTIFICATION SOUNDS
// ==========================================

function playNotificationSound(type = 'info') {
  try {
    // Initialize audio context if needed
    const ctx = initAudioContext();
    if (!ctx) return;

    // Always try to resume context (important for mobile/edit mode)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    } else if (ctx.state === 'running') {
      // Context is ready, play sound immediately
      playSound(ctx, type);
      return;
    }

    // If resuming, wait a tiny bit then play
    const checkContext = setInterval(() => {
      if (ctx.state === 'running') {
        clearInterval(checkContext);
        playSound(ctx, type);
      }
    }, 5);

    setTimeout(() => clearInterval(checkContext), 100);
  } catch (e) {
    // Silently fail if Web Audio API not available
  }
}

function playSound(ctx, type) {
  try {
    const now = ctx.currentTime;
    let notes = [];
    
    if (type === 'success') {
      notes = [
        { freq: 523.25, duration: 0.08 },
        { freq: 659.25, duration: 0.08 },
        { freq: 783.99, duration: 0.12 }
      ];
    } else if (type === 'error') {
      notes = [
        { freq: 349.23, duration: 0.1 },
        { freq: 261.63, duration: 0.1 },
        { freq: 196.00, duration: 0.2 }
      ];
    } else if (type === 'info') {
      notes = [{ freq: 440, duration: 0.15 }];
    }

    let startTime = now;
    notes.forEach(note => {
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(note.freq, startTime);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + note.duration);
        startTime += note.duration;
      } catch (e) {}
    });
  } catch (e) {}
}

function speakMessage(text) {
  // Use async/non-blocking approach to not delay sound
  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }, 50);
}


// ==========================================
// INITIALIZATION
// ==========================================

function init() {
  // Initialize audio context for faster sound playback on mobile
  initAudioContext();
  
  const url = 'https://adgiosrjigtlpvugdlzd.supabase.co';
  const key = 'sb_publishable_hblB-GFtLPB4vIubo2bPng_bzZX1W3O';

  // Also initialize audio on first user interaction
  document.addEventListener('click', () => { initAudioContext(); }, { once: true });
  document.addEventListener('touchstart', () => { initAudioContext(); }, { once: true });

  refreshAdminIcons();

  if (url && key && window.supabase) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      document.getElementById('config-overlay').classList.add('hidden');
      loadDashboardData();
      setupRealtime();
      speakMessage('Successfully connected to database!');
      playNotificationSound('success');
    } catch (e) {
      const msg = 'Failed to connect to Supabase. Check your credentials.';
      speakMessage(msg);
      playNotificationSound('error');
      alert(msg);
      document.getElementById('config-overlay').classList.remove('hidden');
    }
  } else {
    document.getElementById('config-overlay').classList.remove('hidden');
  }
}

function refreshAdminIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        'stroke-width': 2,
        'aria-hidden': 'true'
      }
    });
  }
}

function saveConfig() {
  const url = document.getElementById('config-url').value.trim();
  const key = document.getElementById('config-key').value.trim();
  
  if (!url || !key) {
    const msg = 'Please enter both URL and Anon Key';
    speakMessage(msg);
    playNotificationSound('error');
    alert(msg);
    return;
  }
  
  localStorage.setItem('supabase_url', url);
  localStorage.setItem('supabase_anon_key', key);
  speakMessage('Configuration saved successfully!');
  playNotificationSound('success');
  window.location.reload();
}

function clearConfig() {
  localStorage.removeItem('supabase_url');
  localStorage.removeItem('supabase_anon_key');
  window.location.reload();
}

// ==========================================
// DATA FETCHING
// ==========================================

async function loadDashboardData() {
  try {
    // Fetch students
    const { data: studentsData, error: studentError } = await supabaseClient
      .from('students')
      .select('*');
      
    if (studentError) throw studentError;
    students = studentsData || [];

    // Fetch attendance
    const { data: attData, error: attError } = await supabaseClient
      .from('attendance_records')
      .select('*');
      
    if (attError) throw attError;
    attendanceRecords = attData || [];

    renderDashboard();
  } catch (error) {
    console.error('Error fetching data:', error);
    const msg = 'Error fetching live data. See console for details.';
    speakMessage(msg);
    playNotificationSound('error');
    alert(msg);
  }
}

// ==========================================
// REALTIME
// ==========================================

function setupRealtime() {
  // Listen to inserts/updates on attendance_records
  supabaseClient
    .channel('public:attendance_records')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, payload => {
      console.log('Realtime update received!', payload);
      // Re-fetch data to be safe and accurate, or update local cache
      // For simplicity in a small dashboard, we just reload data
      loadDashboardData();
    })
    .subscribe();

  // Listen to new students
  supabaseClient
    .channel('public:students')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, payload => {
      console.log('New student registered!', payload);
      loadDashboardData();
    })
    .subscribe();
}

// ==========================================
// RENDERING
// ==========================================

function renderDashboard() {
  const tbody = document.getElementById('students-table-body');
  
  if (students.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No students registered yet.</td></tr>';
    document.getElementById('stat-total-students').textContent = '0';
    document.getElementById('stat-avg-attendance').textContent = '0%';
    document.getElementById('stat-low-attendance').textContent = '0';
    return;
  }

  let html = '';
  let globalTotalPresent = 0;
  let globalTotalLectures = 0;
  let lowAttendanceCount = 0;

  // Compute stats for each student - using weighted points (lab=2, lecture=1)
  const studentStats = students.map(student => {
    const records = attendanceRecords.filter(r => r.enrollment === student.enrollment);

    let totalPresent = 0;
    let totalAbsent  = 0;
    let daysTracked  = records.length;

    records.forEach(record => {
      // slots_data: {"0": "present", "1": "absent", ...}
      Object.entries(record.slots_data).forEach(([slotIdx, status]) => {
        // Get weighted pts: lab slot = 2, theory/elective = 1
        const pts = getSlotPoints(record.date, Number(slotIdx), student.batch);
        if (status === 'present') totalPresent += pts;
        if (status === 'absent')  totalAbsent  += pts;
      });
    });

    const totalLectures = totalPresent + totalAbsent;
    const percentage = totalLectures > 0 ? Math.round((totalPresent / totalLectures) * 100) : 0;

    globalTotalPresent  += totalPresent;
    globalTotalLectures += totalLectures;

    if (percentage < 75 && totalLectures > 0) lowAttendanceCount++;

    return { ...student, daysTracked, totalPresent, totalAbsent, totalLectures, percentage };
  });


  // Sort by lowest attendance first to highlight students at risk
  studentStats.sort((a, b) => a.percentage - b.percentage);

  studentStats.forEach(st => {
    let pctBadgeClass = 'badge-success';
    if (st.percentage < 75 && st.totalLectures > 0) pctBadgeClass = 'badge-danger';
    if (st.totalLectures === 0) pctBadgeClass = '';

    html += `
      <tr>
        <td style="font-weight: 600;">${st.enrollment}</td>
        <td>${st.name}</td>
        <td>${st.batch}</td>
        <td>${st.elective}</td>
        <td>${st.daysTracked}</td>
        <td style="color: var(--success); font-weight: 600;">${st.totalPresent}</td>
        <td style="color: var(--danger); font-weight: 600;">${st.totalAbsent}</td>
        <td>
          <span class="badge ${pctBadgeClass}">
            ${st.totalLectures === 0 ? 'N/A' : st.percentage + '%'}
          </span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  refreshAdminIcons();

  // Update Top Stats Cards
  const globalPct = globalTotalLectures > 0 ? Math.round((globalTotalPresent / globalTotalLectures) * 100) : 0;
  
  document.getElementById('stat-total-students').textContent = students.length;
  document.getElementById('stat-avg-attendance').textContent = globalPct + '%';
  document.getElementById('stat-low-attendance').textContent = lowAttendanceCount;
}

// ==========================================
// DELETE ALL USERS
// ==========================================

async function deleteAllUsers() {
  // Step 1: First confirmation
  const confirm1 = confirm(
    'WARNING!\n\nYe sab students aur unka attendance data permanently delete ho jayega.\n\nKya aap sure hain?'
  );
  if (!confirm1) return;

  // Step 2: Second confirmation with typed verification
  const typed = prompt(
    'FINAL CONFIRMATION\n\nSab users delete karne ke liye neeche "DELETE ALL" type karo:'
  );
  if (typed === null) return;
  if (typed.trim().toUpperCase() !== 'DELETE ALL') {
    const msg = 'Invalid input. Operation cancelled!';\n    speakMessage(msg);
    playNotificationSound('error');
    alert('Galat input. Operation cancel ho gaya.');
    return;
  }

  try {
    // Show loading state
    const btn = document.querySelector('.btn-danger-action');
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Deleting...';
    btn.disabled = true;

    // Step 1: Delete all attendance_records first (foreign key constraint)
    const { error: attError } = await supabaseClient
      .from('attendance_records')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

    if (attError) throw new Error('attendance_records delete failed: ' + attError.message);

    // Step 2: Delete all students
    const { error: stuError } = await supabaseClient
      .from('students')
      .delete()
      .neq('enrollment', 'XXXXXXXXXX'); // Delete all rows

    if (stuError) throw new Error('students delete failed: ' + stuError.message);

    // Step 3: Clear all related localStorage keys on THIS device
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key.startsWith('att_user_') ||
        key.startsWith('attendance_') ||
        key.startsWith('saved_days_') ||
        key === 'att_loggedIn' ||
        key === 'attendance_tracker_user'
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Restore button
    btn.innerHTML = originalText;
    btn.disabled = false;

    // Reload dashboard
    students = [];
    attendanceRecords = [];
    renderDashboard();

    playNotificationSound('success');    const deleteMsg = 'Successfully deleted! All users and attendance data have been removed from the database.';\n    speakMessage(deleteMsg);    alert('Successfully deleted!\n\nSab users aur attendance data database se remove ho gaye.\nKoi bhi user ab "already logged in" nahi dikhega.');

  } catch (err) {
    console.error('Delete failed:', err);
    const btn = document.querySelector('.btn-danger-action');
    btn.innerHTML = 'Delete All Users';
    btn.disabled = false;
    refreshAdminIcons();    const errMsg = 'Error! ' + err.message;
    speakMessage(errMsg);    playNotificationSound('error');
    alert('Error!\n\n' + err.message + '\n\nPlease console check karo.');
  }
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', init);
