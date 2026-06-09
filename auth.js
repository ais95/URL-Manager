// Authentication - Email/Password Based

// User state
let currentUser = null;

// Hash password (simple hash for local storage)
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

// Load user session
async function loadUserSession() {
  const result = await chrome.storage.local.get(['user']);
  if (result.user) {
    currentUser = result.user;
    updateAuthUI(true);
  }
}

// Sign Up with Email and Password
async function signUp() {
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const confirmPassword = document.getElementById('signupConfirmPassword').value;

  if (!email || !password || !confirmPassword) {
    showError('Please fill in all fields');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Please enter a valid email address');
    return;
  }

  if (password.length < 6) {
    showError('Password must be at least 6 characters');
    return;
  }

  if (password !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }

  try {
    // Get all users from storage
    const result = await chrome.storage.local.get(['users']);
    const users = result.users || {};

    // Check if user already exists
    if (users[email]) {
      showError('Email already registered. Please login instead.');
      return;
    }

    // Create new user
    const hashedPassword = hashPassword(password);
    users[email] = {
      email: email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ users: users });

    // Auto login after signup
    currentUser = {
      email: email,
      createdAt: users[email].createdAt
    };

    await chrome.storage.local.set({ user: currentUser });
    updateAuthUI(true);
    showSuccess('Account created and signed in successfully!');
    switchAuthTab('login');
  } catch (error) {
    console.error('Sign up failed:', error);
    showError('Sign up failed. Please try again.');
  }
}

// Login with Email and Password
async function login() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('Please enter email and password');
    return;
  }

  try {
    const result = await chrome.storage.local.get(['users']);
    const users = result.users || {};

    if (!users[email]) {
      showError('Email not found. Please sign up first.');
      return;
    }

    const hashedPassword = hashPassword(password);
    if (users[email].password !== hashedPassword) {
      showError('Incorrect password');
      return;
    }

    currentUser = {
      email: email,
      createdAt: users[email].createdAt
    };

    await chrome.storage.local.set({ user: currentUser });
    updateAuthUI(true);
    showSuccess('Signed in successfully!');
  } catch (error) {
    console.error('Login failed:', error);
    showError('Login failed. Please try again.');
  }
}

// Sign Out
async function signOut() {
  try {
    currentUser = null;
    await chrome.storage.local.remove(['user']);
    updateAuthUI(false);
    showSuccess('Signed out successfully!');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
  } catch (error) {
    console.error('Sign out failed:', error);
    showError('Sign out failed. Please try again.');
  }
}

// Update Auth UI
function updateAuthUI(isLoggedIn) {
  const notLoggedIn = document.getElementById('notLoggedIn');
  const loggedIn = document.getElementById('loggedIn');
  const accountBtn = document.getElementById('accountBtn');

  if (isLoggedIn && currentUser) {
    notLoggedIn.style.display = 'none';
    loggedIn.style.display = 'block';
    
    document.getElementById('userEmail').textContent = currentUser.email;

    accountBtn.classList.add('logged-in');
  } else {
    notLoggedIn.style.display = 'block';
    loggedIn.style.display = 'none';
    accountBtn.classList.remove('logged-in');
  }
}

// Switch between login and signup tabs
function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginTab = document.getElementById('loginTab');
  const signupTab = document.getElementById('signupTab');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    loginTab.classList.remove('active');
    signupTab.classList.add('active');
  }
}

// Show error message
function showError(message) {
  const notLoggedIn = document.getElementById('notLoggedIn');
  let errorDiv = notLoggedIn.querySelector('.auth-error');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'auth-error';
    notLoggedIn.insertBefore(errorDiv, notLoggedIn.firstChild);
  }
  
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 4000);
}

// Download backup file
async function downloadBackupFile() {
  try {
    const downloadBtn = document.getElementById('downloadBackupBtn');
    if (downloadBtn) {
      downloadBtn.disabled = true;
      downloadBtn.textContent = 'Preparing...';
    }

    const data = await chrome.storage.local.get(['folders', 'activeFolderIndex']);
    const backupData = {
      folders: data.folders || [],
      activeFolderIndex: data.activeFolderIndex || 0,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };

    const content = JSON.stringify(backupData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `bookmark-organizer-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export Bookmarks
      `;
    }

    showSuccess('Bookmarks exported successfully!');
  } catch (error) {
    console.error('Export failed:', error);
    showError('Export failed. Please try again.');
    const downloadBtn = document.getElementById('downloadBackupBtn');
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Export Bookmarks
      `;
    }
  }
}

// Upload backup file
async function uploadBackupFile(event) {
  try {
    const file = event.target.files[0];
    if (!file) return;

    const content = await file.text();
    const backupData = JSON.parse(content);

    if (!backupData.folders || !Array.isArray(backupData.folders)) {
      showError('Invalid backup file format');
      return;
    }

    if (!confirm('This will replace your current bookmarks. Continue?')) {
      return;
    }

    // Restore data
    await chrome.storage.local.set({
      folders: backupData.folders,
      activeFolderIndex: backupData.activeFolderIndex || 0
    });

    // Reset file input
    event.target.value = '';

    showSuccess('Bookmarks imported successfully!');
    
    // Reload the page to show updated data
    location.reload();
  } catch (error) {
    console.error('Import failed:', error);
    showError('Import failed. Please check the file format.');
    event.target.value = '';
  }
}

