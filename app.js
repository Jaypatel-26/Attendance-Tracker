/* ==========================================
   LDRP Attendance Tracker - Application Logic
   SEM 5D B.E. Computer Engineering, Division D
   ========================================== */

// ==========================================
// CONSTANTS & CONFIGURATION
// ==========================================

const SUBJECTS = {
  SE:   { name: 'Software Engineering',                    code: 'SE',   color: '#667eea', teacher: 'Dr. Avani Dadhania / Dr. Jayana C. Kaneriya' },
  MP:   { name: 'Microprocessor Architecture & Programming', code: 'MP',   color: '#f093fb', teacher: 'Dr. Pushpak B. Patel, Dr. Maulik V. Patel' },
  TOC:  { name: 'Theory of Computation',                   code: 'TOC',  color: '#4facfe', teacher: 'Prof. Shreya Choksi' },
  DAA:  { name: 'Design & Analysis of Algorithms',         code: 'DAA',  color: '#43e97b', teacher: 'Prof. Avani M. Patel' },
  CN:   { name: 'Computer Networks',                       code: 'CN',   color: '#fa709a', teacher: 'Prof. Pratik Modi' },
  AJP:  { name: 'Advanced Java Programming',               code: 'AJP',  color: '#a78bfa', teacher: 'Prof. Amrishkumar Darji' },
  OT:   { name: 'Optimization Techniques',                 code: 'OT',   color: '#fbbf24', teacher: 'Prof. Vijaykumar K. Patel, Dr. Manoj Patel' },
  DNET: { name: 'Dot Net Technology',                      code: 'DNET', color: '#e0c3fc', teacher: 'Prof. Shwetal Sathwara / Prof. Rakesh Makwana' }
};

const SLOT_TIMES = {
  '1':   { start: '09:00 AM', end: '10:00 AM' },
  '2':   { start: '10:00 AM', end: '10:50 AM' },
  '3':   { start: '11:00 AM', end: '12:00 PM' },
  '4':   { start: '12:00 PM', end: '12:50 PM' },
  '5':   { start: '01:20 PM', end: '02:10 PM' },
  '6':   { start: '02:10 PM', end: '03:00 PM' },
  '1-2': { start: '09:00 AM', end: '10:50 AM' },
  '5-6': { start: '01:20 PM', end: '03:00 PM' }
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Semester dates
const SEMESTER_START = new Date(2026, 5, 4);  // June 4, 2026
const SEMESTER_END   = new Date(2026, 10, 28); // November 28, 2026

// Timetable: keyed by day of week (1=Monday ... 6=Saturday)
// Each entry describes one lecture/lab block
// type: 'theory' | 'lab' | 'elective'
// For lab: batch_specific=true, batches maps batch->subject
// For elective: resolved from user's chosen elective
// For theory: subject is same for everyone
const TIMETABLE = {
  1: [ // Monday
    { slots: '1-2', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'DAA', '5D2': 'SE',  '5D3': 'MP' } },
    { slots: '3',   type: 'elective', batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false, subject: 'TOC' },
    { slots: '5-6', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'AJP', '5D2': 'CN',  '5D3': 'SE' } }
  ],
  2: [ // Tuesday
    { slots: '1-2', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'SE',  '5D2': 'DAA', '5D3': 'CN' } },
    { slots: '3',   type: 'elective', batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false, subject: 'SE' },
    { slots: '5',   type: 'theory',   batchSpecific: false, subject: 'DAA' },
    { slots: '6',   type: 'theory',   batchSpecific: false, subject: 'MP' }
  ],
  3: [ // Wednesday
    { slots: '1-2', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'CN',  '5D2': 'MP',  '5D3': 'DAA' } },
    { slots: '3',   type: 'elective', batchSpecific: false },
    { slots: '4',   type: 'theory',   batchSpecific: false, subject: 'CN' },
    { slots: '5',   type: 'theory',   batchSpecific: false, subject: 'MP' },
    { slots: '6',   type: 'theory',   batchSpecific: false, subject: 'SE' }
  ],
  4: [ // Thursday
    { slots: '1',   type: 'theory',   batchSpecific: false, subject: 'CN' },
    { slots: '2',   type: 'theory',   batchSpecific: false, subject: 'TOC' },
    { slots: '3',   type: 'theory',   batchSpecific: false, subject: 'DAA' },
    { slots: '4',   type: 'theory',   batchSpecific: false, subject: 'CN' },
    { slots: '5-6', type: 'lab',      batchSpecific: true,  batches: { '5D1': 'MP',  '5D2': 'ELECTIVE', '5D3': 'OT' } }
  ],
  5: [ // Friday
    { slots: '1',   type: 'theory',   batchSpecific: false, subject: 'DAA' },
    { slots: '2',   type: 'theory',   batchSpecific: false, subject: 'MP' },
    { slots: '3',   type: 'theory',   batchSpecific: false, subject: 'SE' },
    { slots: '4',   type: 'theory',   batchSpecific: false, subject: 'TOC' },
    { slots: '5',   type: 'theory',   batchSpecific: false, subject: 'CN' },
    { slots: '6',   type: 'theory',   batchSpecific: false, subject: 'SE' }
  ],
  6: [] // Saturday - Library/No regular lectures
};


// ==========================================
// STATE & SUPABASE
// ==========================================

let currentUser = null;     // { name, enrollment, batch, elective }
let attendanceData = {};    // { "2026-06-29": { "0": "present", "1": "absent", ... }, ... }
let savedDays = {};         // { "2026-06-29": true, ... } - tracks which days are locked/saved
let tempAttendance = {};    // temporary edits before saving
let editingDay = false;     // whether we are in edit mode for a saved day
let currentView = 'dashboard';
let selectedDate = new Date();
let calendarMonth = new Date();
let statsMonthFilter = 'all'; // 'all' or month index (e.g. '5' for June)

let supabaseClient = null;
const supUrl = 'https://adgiosrjigtlpvugdlzd.supabase.co';
const supKey = 'sb_publishable_hblB-GFtLPB4vIubo2bPng_bzZX1W3O';

if (supUrl && supKey && window.supabase) {
  try {
    supabaseClient = window.supabase.createClient(supUrl, supKey);
    console.log("Supabase Client Initialized");
  } catch (e) {
    console.error("Supabase init failed", e);
  }
} else if (!window.supabase) {
  console.warn("Supabase script unavailable; running with local cache only.");
}

async function fetchSupabaseData(enrollment) {
  try {
    const { data, error } = await supabaseClient
      .from('attendance_records')
      .select('date, slots_data, is_locked')
      .eq('enrollment', enrollment);
      
    if (error) throw error;
    
    if (data) {
      attendanceData = {};
      savedDays = {};
      data.forEach(row => {
        attendanceData[row.date] = row.slots_data;
        if (row.is_locked) {
          savedDays[row.date] = true;
        }
      });
      // Update local cache
      localStorage.setItem(`attendance_${enrollment}`, JSON.stringify(attendanceData));
      localStorage.setItem(`saved_days_${enrollment}`, JSON.stringify(savedDays));
    }
  } catch(e) {
    console.error("Error fetching from supabase:", e);
  }
}


// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isInCustomMonth(dateObj, targetMonthStr) {
  if (targetMonthStr === 'all') return true;
  
  const targetMonth = Number(targetMonthStr); 
  const year = dateObj.getFullYear();
  
  // Custom month: from 4th of target month to 3rd of the next month
  const startDate = new Date(year, targetMonth, 4);
  const endDate = new Date(year, targetMonth + 1, 3, 23, 59, 59);
  
  return dateObj >= startDate && dateObj <= endDate;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

function isWithinSemester(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const start = new Date(SEMESTER_START.getFullYear(), SEMESTER_START.getMonth(), SEMESTER_START.getDate());
  const end = new Date(SEMESTER_END.getFullYear(), SEMESTER_END.getMonth(), SEMESTER_END.getDate());
  return d >= start && d <= end;
}

function isWorkingDay(date) {
  const dow = date.getDay();
  return dow >= 1 && dow <= 5; // Mon-Fri
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function getSubjectPillClass(code) {
  return 'pill-' + code.toLowerCase();
}

function getSubjectColor(code) {
  return SUBJECTS[code] ? SUBJECTS[code].color : '#818cf8';
}

function inlineIcon(name, className = 'inline-icon') {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: {
        'stroke-width': 2,
        'aria-hidden': 'true'
      }
    });
  }
}


// ==========================================
// STORAGE & AUTHENTICATION
// ==========================================

async function loadUser() {
  const saved = localStorage.getItem('attendance_tracker_user');
  if (saved) {
    currentUser = JSON.parse(saved);

    // Verify user still exists in Supabase (in case admin deleted them)
    if (supabaseClient) {
      const { data: stillExists } = await supabaseClient
        .from('students')
        .select('enrollment')
        .eq('enrollment', currentUser.enrollment)
        .maybeSingle();

      if (!stillExists) {
        // User was deleted from DB - clear all local data and force re-register
        console.log('[loadUser] User not found in DB, clearing stale session.');
        clearLocalStorageForEnrollment(currentUser.enrollment);
        currentUser = null;
        return false;
      }

      await fetchSupabaseData(currentUser.enrollment);
    } else {
      const dataStr = localStorage.getItem(`attendance_${currentUser.enrollment}`);
      if (dataStr) attendanceData = JSON.parse(dataStr);

      const savedDaysStr = localStorage.getItem(`saved_days_${currentUser.enrollment}`);
      if (savedDaysStr) savedDays = JSON.parse(savedDaysStr);
    }
    return true;
  }
  return false;
}


async function saveData() {
  if (!currentUser) return;
  
  if (supabaseClient) {
    try {
      const recordsToUpsert = [];
      for (const dateStr of Object.keys(attendanceData)) {
        if (savedDays[dateStr]) { // Only save locked days to DB
           recordsToUpsert.push({
             enrollment: currentUser.enrollment,
             date: dateStr,
             slots_data: attendanceData[dateStr],
             is_locked: true,
             updated_at: new Date().toISOString()
           });
        }
      }
      
      if (recordsToUpsert.length > 0) {
        const { error } = await supabaseClient
          .from('attendance_records')
          .upsert(recordsToUpsert, { onConflict: 'enrollment, date' });
        if (error) console.error("Supabase Save Error:", error);
      }
    } catch(e) {
      console.error(e);
    }
  }

  // Save locally as cache/offline backup
  localStorage.setItem('attendance_tracker_user', JSON.stringify(currentUser));
  localStorage.setItem(`attendance_${currentUser.enrollment}`, JSON.stringify(attendanceData));
  localStorage.setItem(`saved_days_${currentUser.enrollment}`, JSON.stringify(savedDays));
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}

function showRegisterForm() {
  document.getElementById('login-form').classList.add('hidden');
  document.getElementById('register-form').classList.remove('hidden');
  document.getElementById('auth-error').classList.remove('show');
}

function showLoginForm() {
  document.getElementById('register-form').classList.add('hidden');
  document.getElementById('login-form').classList.remove('hidden');
  document.getElementById('auth-error').classList.remove('show');
}

async function handleRegister() {
  const name = document.getElementById('reg-name').value.trim().toUpperCase();
  const enrollment = document.getElementById('reg-enrollment').value.trim().toUpperCase();
  const batch = document.getElementById('reg-batch').value;
  const elective = document.getElementById('reg-elective').value;

  if (!name || !enrollment || !batch || !elective) {
    showAuthError('Please fill all fields!');
    return;
  }

  if (supabaseClient) {
    // Supabase connected: DB is the ONLY source of truth
    // Step 1: Clear ANY stale localStorage for this enrollment first
    clearLocalStorageForEnrollment(enrollment);

    // Step 2: Check DB
    const { data: existing } = await supabaseClient
      .from('students')
      .select('enrollment')
      .eq('enrollment', enrollment)
      .maybeSingle();

    if (existing) {
      showAuthError('This enrollment number is already registered. Please login.');
      return;
    }
    // End Supabase-only registration check.
  } else {
    // Offline fallback: check localStorage only
    if (localStorage.getItem('att_user_' + enrollment)) {
      showAuthError('This enrollment number is already registered. Please login.');
      return;
    }
  }

  currentUser = { name, enrollment, batch, elective };
  attendanceData = {};
  savedDays = {};

  if (supabaseClient) {
    const { error } = await supabaseClient
      .from('students')
      .upsert({ enrollment, name, batch, elective }, { onConflict: 'enrollment' });
    if (error) console.error("Supabase Register Error:", error);
  }

  saveData();
  localStorage.setItem('att_user_' + enrollment, JSON.stringify({ profile: currentUser, attendance: {}, savedDays: {} }));
  localStorage.setItem('att_loggedIn', enrollment);
  localStorage.setItem('attendance_tracker_user', JSON.stringify(currentUser));
  showApp();
  const welcomeMsg = `Registration successful. Welcome, ${name}!`;
  showToast(welcomeMsg, 'success');
  speakMessage(welcomeMsg);
}


// Helper: clear all localStorage keys for a specific enrollment
function clearLocalStorageForEnrollment(enrollment) {
  localStorage.removeItem('att_user_' + enrollment);
  localStorage.removeItem('attendance_' + enrollment);
  localStorage.removeItem('saved_days_' + enrollment);
  localStorage.removeItem('att_loggedIn');
  localStorage.removeItem('attendance_tracker_user');
}

async function handleLogin() {
  const enrollment = document.getElementById('login-enrollment').value.trim().toUpperCase();

  if (!enrollment) {
    showAuthError('Please enter your enrollment number!');
    return;
  }

  let foundProfile = null;

  if (supabaseClient) {
    // Try to fetch profile from Supabase first
    const { data: studentData, error } = await supabaseClient
      .from('students')
      .select('*')
      .eq('enrollment', enrollment)
      .single();
      
    if (studentData) {
      foundProfile = {
        name: studentData.name,
        enrollment: studentData.enrollment,
        batch: studentData.batch,
        elective: studentData.elective
      };
      await fetchSupabaseData(enrollment);
      localStorage.setItem('att_user_' + enrollment, JSON.stringify({ profile: foundProfile, attendance: attendanceData, savedDays: savedDays }));
    }
  }

  // If not found in Supabase (or offline), try local cache
  if (!foundProfile) {
    let data = localStorage.getItem('att_user_' + enrollment);
    
    // Emergency fallback for old registrations before the bug fix
    if (!data) {
      const oldSession = localStorage.getItem('attendance_tracker_user');
      if (oldSession) {
        const parsedOld = JSON.parse(oldSession);
        if (parsedOld && parsedOld.enrollment === enrollment) {
          data = JSON.stringify({ profile: parsedOld, attendance: {}, savedDays: {} });
          // Save it correctly now
          localStorage.setItem('att_user_' + enrollment, data);
        }
      }
    }

    if (!data) {
      showAuthError('Enrollment number not found. Please register first.');
      return;
    }
    const parsed = JSON.parse(data);
    foundProfile = parsed.profile;
    if (!supabaseClient) {
      attendanceData = parsed.attendance || {};
      savedDays = parsed.savedDays || {};
    }
  }
  
  currentUser = foundProfile;
  
  localStorage.setItem('att_loggedIn', enrollment);
  localStorage.setItem('attendance_tracker_user', JSON.stringify(currentUser));
  showApp();
  const userName = currentUser.name;
  const hour = new Date().getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';
  
  const welcomeMsg = `Welcome back, ${userName}! ${greeting}!`;
  showToast(welcomeMsg, 'success');
  speakMessage(welcomeMsg);
}

function goToAdmin() {
  const pwd = prompt("Enter Admin Password:");
  if (pwd === "24BECE30231") {
    window.location.href = "admin.html";
  } else if (pwd !== null) {
    alert("Incorrect Password!");
  }
}

function handleLogout() {
  const logoutMsg = 'You have been logged out!';
  showToast(logoutMsg, 'info');
  speakMessage(logoutMsg);
  localStorage.removeItem('att_loggedIn');
  currentUser = null;
  attendanceData = {};
  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('auth-view').style.display = 'flex';
  document.getElementById('login-enrollment').value = '';
  showLoginForm();
}


// ==========================================
// TIMETABLE ENGINE
// ==========================================

function getLecturesForDate(date) {
  if (!currentUser) return [];
  
  const dow = date.getDay(); // 0=Sun, 1=Mon...6=Sat
  if (dow === 0 || dow === 6) return []; // No lectures on Sun/Sat
  if (!isWithinSemester(date)) return [];

  const daySchedule = TIMETABLE[dow];
  if (!daySchedule) return [];

  const lectures = [];

  daySchedule.forEach(entry => {
    let subject = null;
    let type = entry.type;
    let displayType = type;

    if (entry.type === 'elective') {
      subject = currentUser.elective;
      displayType = 'elective';
    } else if (entry.batchSpecific) {
      const batchSubject = entry.batches[currentUser.batch];
      if (batchSubject === 'ELECTIVE') {
        subject = currentUser.elective;
        displayType = 'lab';
      } else {
        subject = batchSubject;
      }
    } else {
      subject = entry.subject;
    }

    if (subject && SUBJECTS[subject]) {
      const resolvedType = displayType;
      lectures.push({
        slots: entry.slots,
        subject: subject,
        subjectName: SUBJECTS[subject].name,
        subjectCode: SUBJECTS[subject].code,
        teacher: SUBJECTS[subject].teacher,
        color: SUBJECTS[subject].color,
        type: resolvedType,
        time: SLOT_TIMES[entry.slots],
        points: resolvedType === 'lab' ? 2 : 1  // Lab = 2 pts (2hr), Lecture/Elective = 1 pt (1hr)
      });
    }
  });

  return lectures;
}

// Returns the attendance point weight for a lecture (lab=2, others=1)
function getPoints(lecture) {
  return lecture.points || (lecture.type === 'lab' ? 2 : 1);
}


// ==========================================
// ATTENDANCE MANAGEMENT
// ==========================================

function markAttendance(dateStr, lectureIndex, status) {
  if (!attendanceData[dateStr]) {
    attendanceData[dateStr] = {};
  }
  
  if (attendanceData[dateStr][lectureIndex] === status) {
    // Toggle off
    delete attendanceData[dateStr][lectureIndex];
    if (Object.keys(attendanceData[dateStr]).length === 0) {
      delete attendanceData[dateStr];
    }
  } else {
    attendanceData[dateStr][lectureIndex] = status;
  }
  
  saveData();
}

function getAttendanceForDate(dateStr) {
  return attendanceData[dateStr] || {};
}

function markAllForDate(dateStr, status) {
  const date = parseDate(dateStr);
  const lectures = getLecturesForDate(date);
  
  if (lectures.length === 0) return;
  
  if (!attendanceData[dateStr]) {
    attendanceData[dateStr] = {};
  }
  
  lectures.forEach((_, idx) => {
    attendanceData[dateStr][idx] = status;
  });
  
  saveData();
}


// ==========================================
// STATISTICS
// ==========================================

function calculateOverallStats() {
  let totalPresent = 0;
  let totalAbsent = 0;
  let totalLectures = 0;  // weighted points: lab=2, lecture/elective=1
  let daysMarked = 0;

  Object.keys(attendanceData).forEach(dateStr => {
    const dateObj = parseDate(dateStr);
    if (!isInCustomMonth(dateObj, statsMonthFilter)) return;

    const dayData = attendanceData[dateStr];
    const lectures = getLecturesForDate(dateObj);
    const keys = Object.keys(dayData);
    if (keys.length > 0) daysMarked++;

    keys.forEach(idx => {
      const lecture = lectures[Number(idx)];
      // lab = 2 points (2 hours), theory/elective = 1 point (1 hour)
      const pts = (lecture && lecture.type === 'lab') ? 2 : 1;
      const status = dayData[idx];
      totalLectures += pts;
      if (status === 'present') totalPresent += pts;
      else if (status === 'absent')  totalAbsent  += pts;
    });
  });

  const percentage = totalLectures > 0 ? Math.round((totalPresent / totalLectures) * 100) : 0;
  console.log(`[STATS] present=${totalPresent}pts absent=${totalAbsent}pts total=${totalLectures}pts → ${percentage}%`);
  return { totalPresent, totalAbsent, totalLectures, daysMarked, percentage };
}

function calculateSubjectStats() {
  const subjectMap = {};

  // Initialize all subjects the user has
  const allSubjects = new Set();
  
  // Iterate through all working days to find all subjects
  const tempDate = new Date(SEMESTER_START);
  while (tempDate <= SEMESTER_END) {
    if (isWorkingDay(tempDate)) {
      const lectures = getLecturesForDate(tempDate);
      lectures.forEach(l => allSubjects.add(l.subjectCode));
    }
    tempDate.setDate(tempDate.getDate() + 1);
  }

  allSubjects.forEach(code => {
    subjectMap[code] = { present: 0, absent: 0, total: 0 };
  });

  // Count attendance per subject
  Object.keys(attendanceData).forEach(dateStr => {
    const date = parseDate(dateStr);
    
    // Custom month filter check
    if (!isInCustomMonth(date, statsMonthFilter)) {
      return; 
    }

    const lectures = getLecturesForDate(date);
    const dayData = attendanceData[dateStr];

    lectures.forEach((lecture, idx) => {
      if (dayData[idx]) {
        const code = lecture.subjectCode;
        // lab = 2 points (2 hours), theory/elective = 1 point (1 hour)
        const pts = (lecture.type === 'lab') ? 2 : 1;
        if (!subjectMap[code]) {
          subjectMap[code] = { present: 0, absent: 0, total: 0 };
        }
        subjectMap[code].total += pts;
        if (dayData[idx] === 'present') {
          subjectMap[code].present += pts;
        } else {
          subjectMap[code].absent += pts;
        }
      }
    });
  });

  // Calculate percentages
  const result = [];
  Object.keys(subjectMap).forEach(code => {
    const stats = subjectMap[code];
    const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
    result.push({
      code,
      name: SUBJECTS[code].name,
      color: SUBJECTS[code].color,
      present: stats.present,
      absent: stats.absent,
      total: stats.total,
      percentage: pct
    });
  });

  // Sort by code
  result.sort((a, b) => a.code.localeCompare(b.code));
  return result;
}

function getAttendanceStatusMessage(pct) {
  if (pct >= 90) return { text: 'Excellent. Keep it up.', cls: 'excellent', icon: 'star' };
  if (pct >= 75) return { text: 'Good going. Stay consistent.', cls: 'good', icon: 'thumbs-up' };
  if (pct >= 60) return { text: 'Needs attention. Avoid missing classes.', cls: 'warning', icon: 'alert-triangle' };
  return { text: 'Critical. Attendance shortage risk.', cls: 'critical', icon: 'alert-octagon' };
}


// ==========================================
// NOTIFICATION SOUNDS & VOICE
// ==========================================

function playNotificationSound(type = 'info') {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioContext.currentTime;
    
    let notes = [];
    if (type === 'success') {
      // Success: ascending notes
      notes = [
        { freq: 523.25, duration: 0.1 }, // C5
        { freq: 659.25, duration: 0.1 }, // E5
        { freq: 783.99, duration: 0.2 }  // G5
      ];
    } else if (type === 'error') {
      // Error: low descending notes
      notes = [
        { freq: 349.23, duration: 0.15 }, // F4
        { freq: 261.63, duration: 0.15 }, // C4
        { freq: 196.00, duration: 0.3 }   // G3
      ];
    } else if (type === 'info') {
      // Info: single cheerful note
      notes = [
        { freq: 440, duration: 0.25 } // A4
      ];
    }
    
    let startTime = now;
    notes.forEach(note => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      
      osc.frequency.value = note.freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + note.duration);
      
      osc.connect(gain);
      gain.connect(audioContext.destination);
      
      osc.start(startTime);
      osc.stop(startTime + note.duration);
      
      startTime += note.duration;
    });
  } catch (e) {
    // Silently fail if Web Audio API not available
  }
}

function speakMessage(text) {
  try {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    utterance.lang = 'en-US';
    
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Silently fail if Speech Synthesis not available
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message, type = 'info') {
  // Play notification sound
  playNotificationSound(type);
  
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


// ==========================================
// NAVIGATION
// ==========================================

function showView(view) {
  currentView = view;

  // Update views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');

  // Update sidebar nav
  document.querySelectorAll('#sidebar-nav li').forEach(li => {
    li.classList.toggle('active', li.dataset.view === view);
  });

  // Update bottom nav
  document.querySelectorAll('#bottom-nav-items li').forEach(li => {
    li.classList.toggle('active', li.dataset.view === view);
  });

  // Render view content
  switch (view) {
    case 'dashboard': renderDashboard(); break;
    case 'mark': renderMarkAttendance(); break;
    case 'stats': renderStatistics(); break;
    case 'timetable': renderTimetable(); break;
  }
}

function showApp() {
  document.getElementById('auth-view').style.display = 'none';
  document.getElementById('app-view').classList.remove('hidden');

  // Set sidebar user info
  if (currentUser) {
    document.getElementById('sidebar-avatar').textContent = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('sidebar-name').textContent = currentUser.name;
    document.getElementById('sidebar-meta').textContent = `${currentUser.batch} - ${currentUser.elective}`;
  }

  // Reset to today
  selectedDate = new Date();
  calendarMonth = new Date();

  showView('dashboard');
}


// ==========================================
// RENDER: DASHBOARD
// ==========================================

function renderDashboard() {
  const today = new Date();
  const greeting = getGreeting();
  document.getElementById('dashboard-greeting').textContent = `${greeting}, ${currentUser.name}`;
  document.getElementById('dashboard-date').textContent = `${DAY_NAMES[today.getDay()]}, ${today.getDate()} ${MONTH_NAMES[today.getMonth()]} ${today.getFullYear()}`;

  const stats = calculateOverallStats();
  const lectures = getLecturesForDate(today);
  const todayStr = formatDate(today);
  const todayAttendance = getAttendanceForDate(todayStr);

  let html = '';

  // Stats Cards
  html += '<div class="stats-grid">';
  html += `
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Overall</span>
        <div class="stat-icon" style="background: var(--accent-bg); color: var(--accent);">${inlineIcon('bar-chart-3')}</div>
      </div>
      <div class="stat-value" style="color: ${stats.percentage >= 75 ? 'var(--success)' : 'var(--danger)'};">${stats.percentage}%</div>
      <div class="stat-subtitle">Attendance</div>
    </div>
  `;
  html += `
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Present</span>
        <div class="stat-icon" style="background: var(--success-bg); color: var(--success);">${inlineIcon('check-circle-2')}</div>
      </div>
      <div class="stat-value" style="color: var(--success);">${stats.totalPresent}</div>
      <div class="stat-subtitle">pts attended <small>(lab=2)</small></div>
    </div>
  `;
  html += `
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Absent</span>
        <div class="stat-icon" style="background: var(--danger-bg); color: var(--danger);">${inlineIcon('x-circle')}</div>
      </div>
      <div class="stat-value" style="color: var(--danger);">${stats.totalAbsent}</div>
      <div class="stat-subtitle">pts missed <small>(lab=2)</small></div>
    </div>
  `;
  html += `
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-label">Days Tracked</span>
        <div class="stat-icon" style="background: var(--warning-bg); color: var(--warning);">${inlineIcon('calendar-check')}</div>
      </div>
      <div class="stat-value">${stats.daysMarked}</div>
      <div class="stat-subtitle">Days marked</div>
    </div>
  `;
  html += '</div>';

  // Today's Schedule Card
  html += '<div class="card">';
  html += '<div class="card-header">';
  html += `<h2>${inlineIcon('clipboard-list')} Today's Schedule</h2>`;
  
  if (lectures.length > 0) {
    const markedCount = Object.keys(todayAttendance).length;
    html += `<span class="card-badge" style="background: ${markedCount === lectures.length ? 'var(--success-bg); color: var(--success)' : 'var(--warning-bg); color: var(--warning)'};">${markedCount}/${lectures.length} Marked</span>`;
  }
  html += '</div>';

  if (lectures.length === 0) {
    const dow = today.getDay();
    if (dow === 0) {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('sun')}</div><h3>It's Sunday</h3><p>Enjoy your day off.</p></div>`;
    } else if (dow === 6) {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('book-open')}</div><h3>Library Day</h3><p>Saturday - self study / library time.</p></div>`;
    } else if (!isWithinSemester(today)) {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('calendar-off')}</div><h3>Outside Semester</h3><p>No timetable available for this date.</p></div>`;
    } else {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('circle-check')}</div><h3>No Lectures Today</h3><p>Enjoy your free day.</p></div>`;
    }
  } else {
    html += '<div class="schedule-list">';
    lectures.forEach((lec, idx) => {
      const status = todayAttendance[idx];
      const statusIcon = status === 'present'
        ? inlineIcon('check-circle-2')
        : status === 'absent'
          ? inlineIcon('x-circle')
          : inlineIcon('clock-3');
      html += `
        <div class="schedule-item" style="border-left: 3px solid ${lec.color};">
          <div class="slot-time">${lec.time.start} - ${lec.time.end}</div>
          <span class="subject-pill ${getSubjectPillClass(lec.subjectCode)}">${lec.subjectCode}</span>
          <div class="subject-detail">
            <div class="subject-name">${lec.subjectName}</div>
            <div class="teacher-name">${lec.teacher}</div>
          </div>
          <span class="type-badge ${lec.type}">${lec.type}</span>
          <span class="schedule-status-icon">${statusIcon}</span>
        </div>
      `;
    });
    html += '</div>';

    // Quick mark button
    const allMarked = Object.keys(todayAttendance).length === lectures.length;
    if (!allMarked) {
      html += `<div style="margin-top: 16px; text-align: center;">
        <button class="btn btn-secondary btn-sm" onclick="showView('mark')" style="gap: 6px;">
          ${inlineIcon('pencil')} Mark Today's Attendance
        </button>
      </div>`;
    }
  }
  html += '</div>';

  // Subject-wise quick overview
  const subjectStats = calculateSubjectStats();
  if (subjectStats.length > 0 && stats.totalLectures > 0) {
    html += '<div class="card">';
    html += `<div class="card-header"><h2>${inlineIcon('book-open-check')} Subject Overview</h2></div>`;
    html += '<div class="subject-stat-list">';
    subjectStats.forEach(ss => {
      if (ss.total === 0) return;
      const barColor = ss.percentage >= 75 ? ss.color : 'var(--danger)';
      html += `
        <div class="subject-stat-card ${ss.percentage < 75 && ss.total > 0 ? 'below-threshold' : ''}" style="animation-delay: 0s; opacity: 1;">
          <div class="subject-stat-top">
            <div class="subject-info">
              <div class="subject-color-dot" style="background: ${ss.color};"></div>
              <div>
                <span class="subject-code">${ss.code}</span>
                ${ss.percentage < 75 && ss.total > 0 ? '<span class="warning-badge">Low</span>' : ''}
              </div>
            </div>
            <span class="subject-percentage" style="color: ${ss.percentage >= 75 ? ss.color : 'var(--danger)'};">${ss.percentage}%</span>
          </div>
          <div class="subject-stat-bottom">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${ss.percentage}%; background: ${barColor};"></div>
            </div>
            <span class="subject-counts">${ss.present}/${ss.total}</span>
          </div>
        </div>
      `;
    });
    html += '</div></div>';
  }

  document.getElementById('dashboard-content').innerHTML = html;
  refreshIcons();
}


// ==========================================
// RENDER: MARK ATTENDANCE
// ==========================================

function renderMarkAttendance() {
  const dateStr = formatDate(selectedDate);
  const lectures = getLecturesForDate(selectedDate);
  const dow = selectedDate.getDay();
  const isDaySaved = savedDays[dateStr] === true;
  const isEditing = editingDay && editingDay === dateStr;

  // Determine which data to show: temp edits (if editing/unsaved) or saved data
  let dayAttendance;
  if (tempAttendance[dateStr]) {
    dayAttendance = tempAttendance[dateStr];
  } else {
    dayAttendance = getAttendanceForDate(dateStr);
  }

  // If opening a saved day (not editing), use saved data directly
  const isLocked = isDaySaved && !isEditing;

  let html = '';

  // Date Navigator
  html += `
    <div class="date-navigator">
      <button class="btn-icon" onclick="navigateDate(-1)" title="Previous Day">${inlineIcon('chevron-left')}</button>
      <div class="date-display">
        <div class="date-day">${DAY_NAMES[dow]}</div>
        <div class="date-full">${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}</div>
      </div>
      <button class="btn-icon" onclick="navigateDate(1)" title="Next Day">${inlineIcon('chevron-right')}</button>
    </div>
    <div class="date-nav-actions">
      <button class="btn-today" onclick="goToToday()">${inlineIcon('map-pin')} Today</button>
    </div>
  `;

  // Calendar
  html += renderCalendar();

  if (lectures.length === 0) {
    // No lectures
    if (dow === 0) {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('sun')}</div><h3>Sunday - No Classes</h3><p>Enjoy your rest day.</p></div>`;
    } else if (dow === 6) {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('book-open')}</div><h3>Library Day</h3><p>Saturday is library / self-study. No lectures to mark.</p></div>`;
    } else if (!isWithinSemester(selectedDate)) {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('calendar-off')}</div><h3>Outside Semester</h3><p>This date is outside the semester period (04 Jun - 28 Nov 2026).</p></div>`;
    } else {
      html += `<div class="no-lectures"><div class="no-lectures-icon">${inlineIcon('circle-check')}</div><h3>No Lectures</h3><p>No scheduled lectures for this day.</p></div>`;
    }
  } else {

    // Saved day banner (Edit mode)
    if (isLocked) {
      html += `
        <div class="saved-day-banner">
          <div class="saved-banner-left">
            <div class="saved-banner-icon">${inlineIcon('check-circle-2')}</div>
            <div class="saved-banner-text">
              <strong>Attendance Saved</strong>
              <span>This day is locked. Tap Edit to make changes.</span>
            </div>
          </div>
          <button class="btn-edit-day" onclick="editDayAttendance('${dateStr}')">
            ${inlineIcon('pencil')} Edit
          </button>
        </div>
      `;
    }

    // Mark All buttons (only when not locked)
    if (!isLocked) {
      html += `
        <div class="mark-all-actions">
          <button class="btn btn-success btn-sm" onclick="markAllPresent()">${inlineIcon('check-circle-2')} Mark All Present</button>
          <button class="btn btn-danger btn-sm" onclick="markAllAbsent()">${inlineIcon('x-circle')} Mark All Absent</button>
        </div>
      `;
    }

    // Lecture Cards
    html += '<div class="lecture-list">';
    lectures.forEach((lec, idx) => {
      const status = dayAttendance[idx];
      const cardClass = status === 'present' ? 'marked-present' : status === 'absent' ? 'marked-absent' : '';
      
      // Status icon
      let statusIconHtml = '';
      if (status === 'present') {
        statusIconHtml = `<div class="lecture-status-icon status-present">${inlineIcon('check')}</div>`;
      } else if (status === 'absent') {
        statusIconHtml = `<div class="lecture-status-icon status-absent">${inlineIcon('x')}</div>`;
      } else {
        statusIconHtml = `<div class="lecture-status-icon status-unmarked">${inlineIcon('minus')}</div>`;
      }

      const pts = getPoints(lec);
      html += `
        <div class="lecture-card ${cardClass} ${isLocked ? 'locked' : ''}">
          <div class="lecture-card-inner">
            <div class="lecture-color-bar" style="background: ${lec.color};"></div>
            <div class="lecture-body">
              <div class="lecture-top-row">
                <div class="lecture-slot-badge">
                  <div class="slot-label">Slot ${lec.slots}</div>
                  <div class="slot-time">${lec.time.start} - ${lec.time.end}</div>
                </div>
                <div class="lecture-subject-info">
                  <h3>
                    ${lec.subjectName}
                    <span class="subject-code-badge ${getSubjectPillClass(lec.subjectCode)}">${lec.subjectCode}</span>
                  </h3>
                  <div class="lecture-meta-row">
                    <span class="type-badge ${lec.type}">${lec.type}</span>
                    ${pts === 2 ? '<span class="pts-badge">2 pts</span>' : '<span class="pts-badge pts-one">1 pt</span>'}
                    <span>${lec.teacher}</span>
                  </div>
                </div>
                ${statusIconHtml}
              </div>
              ${isLocked ? '' : `
              <div class="attendance-toggle">
                <button class="toggle-btn present-btn ${status === 'present' ? 'active' : ''}" 
                        onclick="toggleAttendance('${dateStr}', ${idx}, 'present')">
                  <span class="tick-icon">${status === 'present' ? inlineIcon('check') : ''}</span>
                  Present
                </button>
                <button class="toggle-btn absent-btn ${status === 'absent' ? 'active' : ''}" 
                        onclick="toggleAttendance('${dateStr}', ${idx}, 'absent')">
                  <span class="tick-icon">${status === 'absent' ? inlineIcon('x') : ''}</span>
                  Absent
                </button>
              </div>
              `}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    // Summary Bar - using weighted points (lab=2, lecture=1)
    let presentPts = 0, absentPts = 0, totalPts = 0;
    lectures.forEach((lec, idx) => {
      const p = getPoints(lec);
      totalPts += p;
      if (dayAttendance[idx] === 'present') presentPts += p;
      else if (dayAttendance[idx] === 'absent') absentPts += p;
    });
    const markedCount = Object.keys(dayAttendance).length;

    html += `
      <div class="day-summary-bar">
        <div class="summary-item" style="color: var(--success);">
          ${inlineIcon('check')} ${presentPts} pts Present
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item" style="color: var(--danger);">
          ${inlineIcon('x')} ${absentPts} pts Absent
        </div>
        <div class="summary-divider"></div>
        <div class="summary-item" style="color: var(--text-secondary);">
          ${markedCount}/${lectures.length} Marked
        </div>
      </div>
    `;

    // Save Button at bottom
    if (!isLocked) {
      const isDisabled = markedCount === 0;
      html += `
        <div class="save-action-bar">
          <div class="save-action-inner">
            <div class="save-progress-info">
              <span class="save-progress-text">
                ${markedCount === 0
                  ? 'Mark at least one lecture to save'
                  : markedCount === lectures.length
                    ? 'All lectures marked - ready to save'
                    : `${markedCount} of ${lectures.length} marked`
                }
              </span>
            </div>
            <button 
              class="btn-save-day ${isDisabled ? 'disabled' : ''}" 
              onclick="${isDisabled ? '' : `saveDayAttendance('${dateStr}')`}"
              ${isDisabled ? 'disabled' : ''}
            >
              <span class="save-btn-icon">${inlineIcon('save')}</span>
              <span>Save Day Attendance</span>
            </button>
          </div>
        </div>
      `;
    }
  }

  document.getElementById('mark-content').innerHTML = html;
  refreshIcons();
}

function toggleAttendance(dateStr, index, status) {
  // Store in temp until Save is clicked
  if (!tempAttendance[dateStr]) {
    // Copy existing saved data as starting point
    tempAttendance[dateStr] = { ...getAttendanceForDate(dateStr) };
  }

  if (tempAttendance[dateStr][index] === status) {
    // Toggle off
    delete tempAttendance[dateStr][index];
  } else {
    tempAttendance[dateStr][index] = status;
  }

  renderMarkAttendance();
}

function markAllPresent() {
  const dateStr = formatDate(selectedDate);
  const lectures = getLecturesForDate(selectedDate);
  if (!tempAttendance[dateStr]) {
    tempAttendance[dateStr] = { ...getAttendanceForDate(dateStr) };
  }
  lectures.forEach((_, idx) => {
    tempAttendance[dateStr][idx] = 'present';
  });
  renderMarkAttendance();
  const msg = 'All lectures marked present.';
  showToast(msg, 'success');
  speakMessage(msg);
}

function markAllAbsent() {
  const dateStr = formatDate(selectedDate);
  const lectures = getLecturesForDate(selectedDate);
  if (!tempAttendance[dateStr]) {
    tempAttendance[dateStr] = { ...getAttendanceForDate(dateStr) };
  }
  lectures.forEach((_, idx) => {
    tempAttendance[dateStr][idx] = 'absent';
  });
  renderMarkAttendance();
  const msg = 'All lectures marked absent.';
  showToast(msg, 'error');
  speakMessage(msg);
}

function saveDayAttendance(dateStr) {
  const temp = tempAttendance[dateStr];
  if (!temp || Object.keys(temp).length === 0) {
    const msg = 'Please mark attendance for at least one lecture!';
    showToast(msg, 'error');
    speakMessage(msg);
    return;
  }

  // Copy temp data to permanent attendance
  attendanceData[dateStr] = { ...temp };
  savedDays[dateStr] = true;
  delete tempAttendance[dateStr];
  editingDay = false;
  saveData();
  renderMarkAttendance();
  const savedMsg = 'Attendance saved for ' + dateStr + '.';
  showToast(savedMsg, 'success');
  speakMessage(savedMsg);
}

function editDayAttendance(dateStr) {
  editingDay = dateStr;
  // Load saved data into temp for editing
  tempAttendance[dateStr] = { ...getAttendanceForDate(dateStr) };
  renderMarkAttendance();
  const editMsg = 'Edit mode enabled. Make changes and save again.';
  showToast(editMsg, 'info');
  speakMessage(editMsg);
}

function navigateDate(offset) {
  selectedDate = new Date(selectedDate);
  selectedDate.setDate(selectedDate.getDate() + offset);
  calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  renderMarkAttendance();
}

function goToToday() {
  selectedDate = new Date();
  calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  renderMarkAttendance();
}

function selectDate(dateStr) {
  selectedDate = parseDate(dateStr);
  renderMarkAttendance();
}


// ==========================================
// RENDER: CALENDAR
// ==========================================

function renderCalendar() {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const today = new Date();

  let html = '<div class="calendar-container"><div class="card">';
  
  // Calendar Header
  html += `
    <div class="calendar-header">
      <button class="btn-icon" onclick="navigateCalendar(-1)" title="Previous Month">${inlineIcon('chevron-left')}</button>
      <h3>${MONTH_NAMES[month]} ${year}</h3>
      <button class="btn-icon" onclick="navigateCalendar(1)" title="Next Month">${inlineIcon('chevron-right')}</button>
    </div>
  `;

  // Calendar Grid
  html += '<div class="calendar-grid">';
  
  // Day headers (Mon-Sun)
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(d => {
    html += `<div class="day-header">${d}</div>`;
  });

  // Find first day of month
  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay(); // 0=Sun
  // Adjust to Monday-start: Mon=0, Tue=1, ... Sun=6
  startDay = startDay === 0 ? 6 : startDay - 1;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Previous month days
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="day-cell other-month">${daysInPrevMonth - i}</div>`;
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(year, month, d);
    const cellDateStr = formatDate(cellDate);
    const dow = cellDate.getDay();
    const isToday = isSameDay(cellDate, today);
    const isSelected = isSameDay(cellDate, selectedDate);
    const isSunday = dow === 0;
    const isSaturday = dow === 6;
    const beforeSem = cellDate < SEMESTER_START;
    const afterSem = cellDate > SEMESTER_END;
    
    let classes = ['day-cell'];
    if (isToday) classes.push('today');
    if (isSelected) classes.push('selected');
    if (isSunday) classes.push('sunday');
    if (isSaturday) classes.push('saturday');
    if (beforeSem) classes.push('before-semester');
    if (afterSem) classes.push('after-semester');

    // Attendance indicator
    let indicator = '';
    if (isWorkingDay(cellDate) && isWithinSemester(cellDate)) {
      const dayData = attendanceData[cellDateStr];
      if (dayData && Object.keys(dayData).length > 0) {
        const lectures = getLecturesForDate(cellDate);
        const values = Object.values(dayData);
        const allPresent = values.length === lectures.length && values.every(v => v === 'present');
        const allAbsent = values.every(v => v === 'absent');
        
        if (allPresent) {
          indicator = '<div class="day-indicator all-present"></div>';
        } else if (allAbsent) {
          indicator = '<div class="day-indicator all-absent"></div>';
        } else {
          indicator = '<div class="day-indicator some-absent"></div>';
        }
      } else if (cellDate <= today) {
        indicator = '<div class="day-indicator not-marked"></div>';
      }
    }

    const clickable = !isSunday && !beforeSem && !afterSem;
    const onclick = clickable ? `onclick="selectDate('${cellDateStr}')"` : '';

    html += `<div class="${classes.join(' ')}" ${onclick}>${d}${indicator}</div>`;
  }

  // Next month days to fill grid
  const totalCells = startDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="day-cell other-month">${i}</div>`;
  }

  html += '</div>'; // calendar-grid
  html += '</div></div>'; // card, calendar-container

  return html;
}

function navigateCalendar(offset) {
  calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
  renderMarkAttendance();
}


// ==========================================
// RENDER: STATISTICS
// ==========================================

function renderStatistics() {
  const overall = calculateOverallStats();
  const subjectStats = calculateSubjectStats();
  const statusMsg = getAttendanceStatusMessage(overall.percentage);

  let html = '';

  // Month Filter UI
  html += `
    <div class="stats-filter-bar">
      <h3>Filter by Month Cycle</h3>
      <select id="stats-month-select" class="form-select" onchange="setStatsMonthFilter(this.value)">
        <option value="all" ${statsMonthFilter === 'all' ? 'selected' : ''}>All Time</option>
        <option value="5" ${statsMonthFilter === '5' ? 'selected' : ''}>June (4 Jun - 3 Jul)</option>
        <option value="6" ${statsMonthFilter === '6' ? 'selected' : ''}>July (4 Jul - 3 Aug)</option>
        <option value="7" ${statsMonthFilter === '7' ? 'selected' : ''}>August (4 Aug - 3 Sep)</option>
        <option value="8" ${statsMonthFilter === '8' ? 'selected' : ''}>September (4 Sep - 3 Oct)</option>
        <option value="9" ${statsMonthFilter === '9' ? 'selected' : ''}>October (4 Oct - 3 Nov)</option>
        <option value="10" ${statsMonthFilter === '10' ? 'selected' : ''}>November (4 Nov - 28 Nov)</option>
      </select>
    </div>
  `;

  html += '<div class="stats-overview">';

  // Overall Progress Ring
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (overall.percentage / 100) * circumference;
  const strokeColor = overall.percentage >= 75 ? 'url(#gradSuccess)' : 'url(#gradDanger)';

  html += `
    <div class="overall-progress-card">
      <div class="progress-ring-container">
        <svg class="progress-ring" width="180" height="180" viewBox="0 0 180 180">
          <defs>
            <linearGradient id="gradSuccess" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color: #34d399;" />
              <stop offset="100%" style="stop-color: #06b6d4;" />
            </linearGradient>
            <linearGradient id="gradDanger" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color: #f87171;" />
              <stop offset="100%" style="stop-color: #fb923c;" />
            </linearGradient>
          </defs>
          <circle class="progress-ring-bg" cx="90" cy="90" r="${radius}" />
          <circle class="progress-ring-fill" cx="90" cy="90" r="${radius}" 
                  stroke="${strokeColor}"
                  stroke-dasharray="${circumference}" 
                  stroke-dashoffset="${offset}" />
        </svg>
        <div class="progress-ring-text">
          <div class="percentage" style="color: ${overall.percentage >= 75 ? 'var(--success)' : 'var(--danger)'};">${overall.percentage}%</div>
          <div class="percentage-label">Overall</div>
        </div>
      </div>
      <h3>Overall Attendance</h3>
      <p class="progress-subtitle">${overall.totalPresent} out of ${overall.totalLectures} pts <small style="opacity:0.6;">(lab=2pts, lecture=1pt)</small></p>
      <div class="attendance-status ${statusMsg.cls}">${inlineIcon(statusMsg.icon)} ${statusMsg.text}</div>
    </div>
  `;

  // Summary Card
  html += `
    <div class="summary-card">
      <h3>${inlineIcon('clipboard-list')} Summary</h3>
      <div class="summary-stats">
        <div class="summary-stat-item">
          <span class="stat-label">${inlineIcon('check-circle-2')} Total Present</span>
          <span class="stat-num" style="color: var(--success);">${overall.totalPresent}</span>
        </div>
        <div class="summary-stat-item">
          <span class="stat-label">${inlineIcon('x-circle')} Total Absent</span>
          <span class="stat-num" style="color: var(--danger);">${overall.totalAbsent}</span>
        </div>
        <div class="summary-stat-item">
          <span class="stat-label">${inlineIcon('list-checks')} Total Lectures</span>
          <span class="stat-num">${overall.totalLectures}</span>
        </div>
        <div class="summary-stat-item">
          <span class="stat-label">${inlineIcon('calendar-check')} Days Tracked</span>
          <span class="stat-num">${overall.daysMarked}</span>
        </div>
        <div class="summary-stat-item">
          <span class="stat-label">${inlineIcon('target')} Min Required (75%)</span>
          <span class="stat-num" style="color: ${overall.percentage >= 75 ? 'var(--success)' : 'var(--danger)'};">${overall.percentage >= 75 ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  `;

  html += '</div>'; // stats-overview

  // Subject-wise Stats
  html += '<div class="subject-stats-container">';
  html += `<h2>${inlineIcon('book-open-check')} Subject-wise Attendance</h2>`;

  if (subjectStats.length === 0 || overall.totalLectures === 0) {
    html += `<div class="empty-state"><div class="empty-icon">${inlineIcon('list-plus')}</div><p>No attendance data yet. Start marking your attendance.</p></div>`;
  } else {
    html += '<div class="subject-stat-list">';
    subjectStats.forEach(ss => {
      if (ss.total === 0) return;
      const barColor = ss.percentage >= 75 ? ss.color : 'var(--danger)';
      html += `
        <div class="subject-stat-card ${ss.percentage < 75 ? 'below-threshold' : ''}">
          <div class="subject-stat-top">
            <div class="subject-info">
              <div class="subject-color-dot" style="background: ${ss.color};"></div>
              <div>
                <span class="subject-code">${ss.code}</span>
                <span class="subject-full-name"> - ${ss.name}</span>
                ${ss.percentage < 75 ? '<span class="warning-badge">Below 75%</span>' : ''}
              </div>
            </div>
            <span class="subject-percentage" style="color: ${ss.percentage >= 75 ? ss.color : 'var(--danger)'};">${ss.percentage}%</span>
          </div>
          <div class="subject-stat-bottom">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${ss.percentage}%; background: ${barColor};"></div>
            </div>
            <span class="subject-counts">${ss.present}P / ${ss.absent}A / ${ss.total}T</span>
          </div>
        </div>
      `;
    });
    html += '</div>';
  }

  html += '</div>';

  document.getElementById('stats-content').innerHTML = html;
  refreshIcons();
}

function setStatsMonthFilter(value) {
  statsMonthFilter = value;
  renderStatistics();
}


// ==========================================
// RENDER: TIMETABLE
// ==========================================

function renderTimetable() {
  document.getElementById('timetable-subtitle').textContent = 
    `Batch: ${currentUser.batch} | Elective: ${SUBJECTS[currentUser.elective].name} | w.e.f. 04/06/2026`;

  const today = new Date();
  const todayDow = today.getDay(); // 0=Sun...6=Sat

  let html = '<div class="timetable-grid-container"><table class="timetable-grid">';

  // Header row
  html += '<thead><tr>';
  html += '<th>Slot</th>';
  ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].forEach((day, idx) => {
    const dayNum = idx + 1;
    const isToday = dayNum === todayDow;
    html += `<th class="${isToday ? 'today-col' : ''}">${day}</th>`;
  });
  html += '</tr></thead>';

  // Body rows - one row per slot
  html += '<tbody>';
  
  for (let slot = 1; slot <= 6; slot++) {
    const slotTime = SLOT_TIMES[String(slot)];
    html += '<tr>';
    html += `<td class="slot-header">Slot ${slot}<br><small>${slotTime.start}-${slotTime.end}</small></td>`;

    for (let dayNum = 1; dayNum <= 6; dayNum++) {
      const isToday = dayNum === todayDow;
      const cellClass = isToday ? 'today-col' : '';

      if (dayNum === 6) {
        // Saturday
        if (slot <= 4) {
          html += `<td class="${cellClass}"><div class="timetable-cell"><span class="tt-subject" style="background: rgba(103,232,249,0.12); color: var(--color-library);">LIBRARY</span></div></td>`;
        } else {
          html += `<td class="${cellClass}">-</td>`;
        }
        continue;
      }

      // Find which lecture entry covers this slot
      const daySchedule = TIMETABLE[dayNum];
      let found = false;

      for (const entry of daySchedule) {
        const entrySlots = entry.slots.split('-').map(Number);
        const slotStart = entrySlots[0];
        const slotEnd = entrySlots.length > 1 ? entrySlots[1] : entrySlots[0];

        if (slot >= slotStart && slot <= slotEnd) {
          // This entry covers this slot
          let subject = null;
          let type = entry.type;

          if (entry.type === 'elective') {
            subject = currentUser.elective;
          } else if (entry.batchSpecific) {
            const batchSub = entry.batches[currentUser.batch];
            if (batchSub === 'ELECTIVE') {
              subject = currentUser.elective;
            } else {
              subject = batchSub;
            }
          } else {
            subject = entry.subject;
          }

          if (subject && SUBJECTS[subject]) {
            const sub = SUBJECTS[subject];
            const pillClass = getSubjectPillClass(subject);

            // For combined slots, show "combined" marker on second slot
            if (entrySlots.length > 1 && slot === slotEnd) {
              html += `<td class="${cellClass}"><span class="slot-combined">combined</span></td>`;
            } else {
              let typeLabel = type === 'lab' ? 'Lab' : type === 'elective' ? 'Elective' : '';
              if (entrySlots.length > 1) typeLabel = 'Lab';
              
              html += `<td class="${cellClass}">
                <div class="timetable-cell">
                  <span class="tt-subject ${pillClass}">${sub.code}</span>
                  ${typeLabel ? `<span class="tt-type">${typeLabel}</span>` : ''}
                </div>
              </td>`;
            }
            found = true;
            break;
          }
        }
      }

      if (!found) {
        html += `<td class="${cellClass}">-</td>`;
      }
    }

    html += '</tr>';
  }

  html += '</tbody></table></div>';

  // Subject Legend
  html += '<div class="card" style="margin-top: 20px;">';
  html += `<div class="card-header"><h2>${inlineIcon('users-round')} Subjects & Teachers</h2></div>`;
  html += '<div class="schedule-list">';

  // Show relevant subjects
  const relevantSubjects = new Set();
  for (let day = 1; day <= 5; day++) {
    const fakeDateForDay = new Date(2026, 5, 28 + day); // Mon=29 Jun, Tue=30 Jun, etc.
    const lectures = getLecturesForDate(fakeDateForDay);
    lectures.forEach(l => relevantSubjects.add(l.subjectCode));
  }

  relevantSubjects.forEach(code => {
    const sub = SUBJECTS[code];
    html += `
      <div class="schedule-item" style="border-left: 3px solid ${sub.color};">
        <span class="subject-pill ${getSubjectPillClass(code)}">${code}</span>
        <div class="subject-detail">
          <div class="subject-name">${sub.name}</div>
          <div class="teacher-name">${sub.teacher}</div>
        </div>
      </div>
    `;
  });

  html += '</div></div>';

  document.getElementById('timetable-content').innerHTML = html;
  refreshIcons();
}


// ==========================================
// INITIALIZATION
// ==========================================

async function init() {
  if (await loadUser()) {
    showApp();
  } else {
    document.getElementById('auth-view').style.display = 'flex';
    document.getElementById('app-view').classList.add('hidden');
  }
  refreshIcons();

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (!currentUser) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    
    switch(e.key) {
      case '1': showView('dashboard'); break;
      case '2': showView('mark'); break;
      case '3': showView('stats'); break;
      case '4': showView('timetable'); break;
    }
  });

  // Enter key on login
  document.getElementById('login-enrollment').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
