// Folder Lock/Unlock Functionality

let lockedFolders = {};
let currentLockAction = null;
let currentLockFolderIndex = null;

// Load locked folders
async function loadLockedFolders() {
  const result = await chrome.storage.local.get(['lockedFolders']);
  lockedFolders = result.lockedFolders || {};
}

// Save locked folders
async function saveLockedFolders() {
  await chrome.storage.local.set({ lockedFolders });
}

// Hash password
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Check if folder is locked
function isFolderLocked(folderIndex) {
  return lockedFolders[folderIndex] !== undefined;
}

// Open lock/unlock modal
async function openLockModal(folderIndex, isLocked) {
  currentLockFolderIndex = folderIndex;
  currentLockAction = isLocked ? 'unlock' : 'lock';
  
  const modal = document.getElementById('passwordModal');
  const title = document.getElementById('passwordModalTitle');
  const desc = document.getElementById('passwordModalDesc');
  const confirmInput = document.getElementById('folderPasswordConfirm');
  
  if (isLocked) {
    title.textContent = 'Unlock Folder';
    desc.textContent = 'Enter PIN to unlock this folder';
    confirmInput.style.display = 'none';
  } else {
    title.textContent = 'Lock Folder';
    desc.textContent = 'Set a PIN to lock this folder';
    confirmInput.style.display = 'block';
  }
  
  document.getElementById('folderPasswordInput').value = '';
  document.getElementById('folderPasswordConfirm').value = '';
  
  modal.style.display = 'flex';
  setTimeout(() => {
    document.getElementById('folderPasswordInput').focus();
  }, 100);
}

// Save folder password
async function saveFolderPassword() {
  const passwordInput = document.getElementById('folderPasswordInput');
  const confirmInput = document.getElementById('folderPasswordConfirm');
  const pin = passwordInput.value.trim();
  
  if (!pin) {
    showSuccess('Please enter a PIN');
    return;
  }
  
  if (!/^[0-9]+$/.test(pin)) {
    showSuccess('PIN must contain only digits');
    return;
  }
  
  if (currentLockAction === 'lock') {
    const confirm = confirmInput.value.trim();
    
    if (pin !== confirm) {
      showSuccess('PINs do not match');
      return;
    }
    
    if (pin.length < 4) {
      showSuccess('PIN must be at least 4 digits');
      return;
    }
    
    // Lock folder
    const hashedPassword = await hashPassword(pin);
    lockedFolders[currentLockFolderIndex] = hashedPassword;
    await saveLockedFolders();
    
    closeLockModal();
    updateUI();
    showSuccess('Folder locked successfully!');
  } else {
    // Unlock folder
    const hashedPassword = await hashPassword(pin);
    
    if (lockedFolders[currentLockFolderIndex] === hashedPassword) {
      delete lockedFolders[currentLockFolderIndex];
      await saveLockedFolders();
      
      closeLockModal();
      updateUI();
      showSuccess('Folder unlocked successfully!');
    } else {
      showSuccess('Incorrect PIN');
      passwordInput.value = '';
      passwordInput.focus();
    }
  }
}

// Close lock modal
function closeLockModal() {
  document.getElementById('passwordModal').style.display = 'none';
  currentLockFolderIndex = null;
  currentLockAction = null;
}

// Check folder access
async function checkFolderAccess(folderIndex) {
  if (!isFolderLocked(folderIndex)) {
    return true;
  }
  
  return new Promise((resolve) => {
    currentLockFolderIndex = folderIndex;
    currentLockAction = 'access';
    
    const modal = document.getElementById('passwordModal');
    const title = document.getElementById('passwordModalTitle');
    const desc = document.getElementById('passwordModalDesc');
    const confirmInput = document.getElementById('folderPasswordConfirm');
    
    title.textContent = 'Folder Locked';
    desc.textContent = 'Enter PIN to access this folder';
    confirmInput.style.display = 'none';
    
    document.getElementById('folderPasswordInput').value = '';
    
    modal.style.display = 'flex';
    setTimeout(() => {
      document.getElementById('folderPasswordInput').focus();
    }, 100);
    
    // Override save button for access check
    const saveBtn = document.getElementById('savePasswordBtn');
    const originalHandler = saveBtn.onclick;
    
    saveBtn.onclick = async () => {
      const pin = document.getElementById('folderPasswordInput').value.trim();
      const hashedPassword = await hashPassword(pin);
      
      if (lockedFolders[folderIndex] === hashedPassword) {
        closeLockModal();
        saveBtn.onclick = originalHandler;
        resolve(true);
      } else {
        showSuccess('Incorrect PIN');
        document.getElementById('folderPasswordInput').value = '';
        document.getElementById('folderPasswordInput').focus();
      }
    };
    
    // Handle cancel
    const cancelBtn = document.getElementById('cancelPasswordBtn');
    const closeBtn = document.getElementById('closePasswordModal');
    
    const cancelHandler = () => {
      closeLockModal();
      saveBtn.onclick = originalHandler;
      resolve(false);
    };
    
    cancelBtn.onclick = cancelHandler;
    closeBtn.onclick = cancelHandler;
  });
}

// Update lock button text
function updateLockButton(folderIndex) {
  const lockBtn = document.getElementById('lockFolderBtn');
  const lockBtnText = document.getElementById('lockBtnText');
  
  if (!lockBtn) return;
  
  if (isFolderLocked(folderIndex)) {
    lockBtnText.textContent = 'Unlock';
  } else {
    lockBtnText.textContent = 'Lock';
  }
}
