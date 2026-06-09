// Authentication and Google Drive Integration

// User state
let currentUser = null;
let authToken = null;

// Load user session
async function loadUserSession() {
  const result = await chrome.storage.local.get(['user', 'authToken']);
  if (result.user && result.authToken) {
    currentUser = result.user;
    authToken = result.authToken;
    updateAuthUI(true);
    document.getElementById('driveSection').style.display = 'block';
  }
}

// Google Sign In
async function googleSignIn() {
  try {
    // Get OAuth token from Chrome Identity API
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(token);
        }
      });
    });

    authToken = token;

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const userInfo = await userInfoResponse.json();
    
    currentUser = {
      id: userInfo.id,
      name: userInfo.name,
      email: userInfo.email,
      picture: userInfo.picture
    };

    // Save to storage
    await chrome.storage.local.set({ user: currentUser, authToken: token });

    updateAuthUI(true);
    document.getElementById('driveSection').style.display = 'block';
    showSuccess('Signed in successfully!');
  } catch (error) {
    console.error('Sign in failed:', error);
    showSuccess('Sign in failed. Please try again.');
  }
}

// Google Sign Out
async function googleSignOut() {
  try {
    if (authToken) {
      // Revoke token
      await chrome.identity.removeCachedAuthToken({ token: authToken });
    }

    currentUser = null;
    authToken = null;

    await chrome.storage.local.remove(['user', 'authToken']);

    updateAuthUI(false);
    document.getElementById('driveSection').style.display = 'none';
    showSuccess('Signed out successfully!');
  } catch (error) {
    console.error('Sign out failed:', error);
    showSuccess('Sign out failed. Please try again.');
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
    
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    if (currentUser.picture) {
      const avatar = document.getElementById('userAvatar');
      avatar.innerHTML = `<img src="${currentUser.picture}" alt="${currentUser.name}">`;
    }

    accountBtn.classList.add('logged-in');
  } else {
    notLoggedIn.style.display = 'block';
    loggedIn.style.display = 'none';
    accountBtn.classList.remove('logged-in');
  }
}

// Backup to Google Drive
async function backupToGoogleDrive() {
  if (!authToken) {
    showSuccess('Please sign in first');
    return;
  }

  try {
    const backupBtn = document.getElementById('backupNowBtn');
    backupBtn.disabled = true;
    backupBtn.textContent = 'Backing up...';

    // Get all data
    const data = await chrome.storage.local.get(['folders', 'activeFolderIndex']);
    
    const backupData = {
      folders: data.folders || [],
      activeFolderIndex: data.activeFolderIndex || 0,
      timestamp: new Date().toISOString(),
      version: '2.0.0'
    };

    const content = JSON.stringify(backupData, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    // Check if backup file exists
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='bookmark-organizer-backup.json' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const searchData = await searchResponse.json();
    let fileId = searchData.files && searchData.files.length > 0 ? searchData.files[0].id : null;

    if (fileId) {
      // Update existing file
      await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: content
        }
      );
    } else {
      // Create new file
      const metadata = {
        name: 'bookmark-organizer-backup.json',
        mimeType: 'application/json'
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          body: form
        }
      );
    }

    // Update last backup time
    const now = new Date().toLocaleString();
    await chrome.storage.local.set({ lastBackupTime: now });
    document.getElementById('lastBackupTime').textContent = now;

    backupBtn.disabled = false;
    backupBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Backup Now
    `;

    showSuccess('Backup successful!');
  } catch (error) {
    console.error('Backup failed:', error);
    showSuccess('Backup failed. Please try again.');
    
    const backupBtn = document.getElementById('backupNowBtn');
    backupBtn.disabled = false;
    backupBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Backup Now
    `;
  }
}

// Restore from Google Drive
async function restoreFromGoogleDrive() {
  if (!authToken) {
    showSuccess('Please sign in first');
    return;
  }

  if (!confirm('This will replace your current bookmarks. Continue?')) {
    return;
  }

  try {
    const restoreBtn = document.getElementById('restoreBtn');
    restoreBtn.disabled = true;
    restoreBtn.textContent = 'Restoring...';

    // Search for backup file
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='bookmark-organizer-backup.json' and trashed=false`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const searchData = await searchResponse.json();
    
    if (!searchData.files || searchData.files.length === 0) {
      throw new Error('No backup found');
    }

    const fileId = searchData.files[0].id;

    // Download file
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const backupData = await fileResponse.json();

    // Restore data
    await chrome.storage.local.set({
      folders: backupData.folders,
      activeFolderIndex: backupData.activeFolderIndex
    });

    // Reload UI
    await loadData();
    updateUI();

    restoreBtn.disabled = false;
    restoreBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Restore from Drive
    `;

    showSuccess('Restore successful!');
  } catch (error) {
    console.error('Restore failed:', error);
    showSuccess('Restore failed. ' + error.message);
    
    const restoreBtn = document.getElementById('restoreBtn');
    restoreBtn.disabled = false;
    restoreBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Restore from Drive
    `;
  }
}

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
          <path d="M12 3v12"/>
          <path d="M8 13l4 4 4-4"/>
          <rect x="4" y="17" width="16" height="4" rx="2"/>
        </svg>
        Download Backup
      `;
    }

    showSuccess('Backup downloaded successfully!');
  } catch (error) {
    console.error('Download failed:', error);
    showSuccess('Backup download failed. Please try again.');
    const downloadBtn = document.getElementById('downloadBackupBtn');
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v12"/>
          <path d="M8 13l4 4 4-4"/>
          <rect x="4" y="17" width="16" height="4" rx="2"/>
        </svg>
        Download Backup
      `;
    }
  }
}

// Auto-backup toggle
async function toggleAutoBackup(enabled) {
  await chrome.storage.local.set({ autoBackup: enabled });
  
  if (enabled) {
    showSuccess('Auto-backup enabled');
  } else {
    showSuccess('Auto-backup disabled');
  }
}

// Load backup settings
async function loadBackupSettings() {
  const result = await chrome.storage.local.get(['lastBackupTime', 'autoBackup']);
  
  if (result.lastBackupTime) {
    document.getElementById('lastBackupTime').textContent = result.lastBackupTime;
  }
  
  if (result.autoBackup) {
    document.getElementById('autoBackupToggle').checked = true;
  }
}
