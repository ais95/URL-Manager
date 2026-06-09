// State
let folders = [];
let currentTab = null;
let activeFolderIndex = 0;
let editingFolder = null;
let editingLink = null;
let bulkSelectMode = false;
let selectedBookmarks = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🚀 ========== INITIALIZING BUSKET ==========');
    
    console.log('⏳ Step 1: Loading current tab...');
    await loadCurrentTab();
    
    console.log('⏳ Step 2: Loading data from storage...');
    await loadData();
    
    console.log('⏳ Step 3: Ensuring Websites folder exists...');
    await ensureWebsitesFolder();
    
    console.log('⏳ Step 4: Initial UI render...');
    renderSidebar();
    renderContent();
    
    console.log('⏳ Step 5: Loading user session...');
    await loadUserSession();
    
    console.log('⏳ Step 6: Loading locked folders...');
    await loadLockedFolders();
    
    console.log('⏳ Step 7: Setting up event listeners...');
    setupEventListeners();
    
    console.log('⏳ Step 8: Setting up keyboard shortcuts...');
    setupKeyboardShortcuts();
    
    console.log('✅ ========== INITIALIZATION COMPLETE ==========');
    console.log('📊 Final state:', {
      folders: folders.length,
      active: activeFolderIndex,
      folderNames: folders.map(f => f.name),
      userLoggedIn: currentUser !== null,
      lockedFoldersCount: Object.keys(lockedFolders).length
    });
  } catch (error) {
    console.error('❌ Initialization error:', error);
  }
});

// Load current tab info
async function loadCurrentTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      throw new Error('No active tab found');
    }
    
    currentTab = tabs[0];
    
    const favicon = currentTab.favIconUrl || getDefaultFavicon();
    const title = currentTab.title || 'Untitled Page';
    const url = currentTab.url || '';
    
    document.getElementById('currentFavicon').src = favicon;
    document.getElementById('currentTitle').textContent = title;
    document.getElementById('currentUrl').textContent = url;
  } catch (error) {
    console.error('Error loading current tab:', error);
    document.getElementById('currentFavicon').src = getDefaultFavicon();
    document.getElementById('currentTitle').textContent = 'Error loading page';
    document.getElementById('currentUrl').textContent = '';
    currentTab = null;
  }
}

// Load data from storage
async function loadData() {
  try {
    console.log('📥 Loading data from storage...');
    const result = await chrome.storage.local.get(['folders', 'activeFolderIndex']);
    
    folders = result.folders || [];
    activeFolderIndex = result.activeFolderIndex || 0;
    
    console.log('✅ Data loaded:', {
      folders: folders.length,
      active: activeFolderIndex,
      folderNames: folders.map(f => f.name)
    });
    
    if (activeFolderIndex >= folders.length) {
      activeFolderIndex = folders.length > 0 ? 0 : -1;
      console.log('⚠️ Active index adjusted to:', activeFolderIndex);
    }
  } catch (error) {
    console.error('❌ Error loading data:', error);
  }
}

// Save data to storage
async function saveData() {
  try {
    console.log('💾 ========== SAVING DATA ==========');
    console.log('📊 Data to save:', {
      folders: folders.length,
      active: activeFolderIndex,
      folderNames: folders.map(f => f.name)
    });
    
    await chrome.storage.local.set({ 
      folders, 
      activeFolderIndex
    });
    
    console.log('✅ Data saved successfully to chrome.storage.local');
    
    // Verify the save
    const verification = await chrome.storage.local.get(['folders']);
    console.log('✅ Verification - Storage now has', verification.folders?.length || 0, 'folders');
    
    console.log('✅ ========== SAVE COMPLETE ==========');
  } catch (error) {
    console.error('❌ Error saving data:', error);
  }
}

// Ensure "Websites" folder exists and is protected
async function ensureWebsitesFolder() {
  let websitesFolder = folders.find(f => f.name === 'Websites');
  
  if (!websitesFolder) {
    folders.unshift({
      name: 'Websites',
      links: [],
      createdAt: new Date().toISOString(),
      isDefault: true
    });
    activeFolderIndex = 0;
    await saveData();
  } else {
    websitesFolder.isDefault = true;
    if (activeFolderIndex < 0 || activeFolderIndex >= folders.length) {
      activeFolderIndex = folders.indexOf(websitesFolder);
    }
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname;
    hostname = hostname.replace(/^www\./, '');
    return hostname;
  } catch {
    return 'unknown';
  }
}

// Group links by domain
function groupLinksByDomain(links) {
  const groups = {};
  
  links.forEach(link => {
    const domain = extractDomain(link.url);
    if (!groups[domain]) {
      groups[domain] = {
        domain,
        links: [],
        favicon: link.favicon
      };
    }
    groups[domain].links.push(link);
  });
  
  return Object.values(groups).sort((a, b) => b.links.length - a.links.length);
}

// Calculate data usage
function calculateDataUsage(folder) {
  const jsonString = JSON.stringify(folder);
  return new Blob([jsonString]).size;
}

// Format bytes
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Render sidebar
function renderSidebar() {
  console.log('📋 renderSidebar called');
  
  const container = document.getElementById('foldersList');
  const emptyState = document.getElementById('emptyState');
  
  if (!container) {
    console.error('❌ foldersList container not found!');
    return;
  }
  
  if (!emptyState) {
    console.error('❌ emptyState element not found!');
    return;
  }
  
  console.log('📊 Current state - Folders:', folders.length, 'Active:', activeFolderIndex);
  
  if (folders.length === 0) {
    console.log('📭 No folders - showing empty state');
    emptyState.classList.remove('hidden');
    emptyState.style.display = 'flex';
    container.innerHTML = '';
    container.style.display = 'none';
    const folderInfoBar = document.getElementById('folderInfoBar');
    if (folderInfoBar) folderInfoBar.style.display = 'none';
    const recentSection = document.getElementById('recentBookmarks');
    if (recentSection) recentSection.style.display = 'none';
    console.log('✅ Empty state displayed');
    return;
  }
  
  console.log('📁 Rendering', folders.length, 'folders...');
  
  emptyState.classList.add('hidden');
  emptyState.style.display = 'none';
  container.style.display = 'flex';
  
  renderRecentBookmarks();
  
  // Force clear the container completely
  container.innerHTML = '';
  
  console.log('🧹 Container cleared');
  
  // Rebuild folder list with logging
  folders.forEach((folder, index) => {
    console.log(`  📂 Adding folder ${index + 1}/${folders.length}:`, folder.name);
    const item = createFolderSidebarItem(folder, index);
    if (item) {
      container.appendChild(item);
    } else {
      console.error(`  ❌ Failed to create item for folder:`, folder.name);
    }
  });
  
  // Force reflow
  container.offsetHeight;
  document.body.offsetHeight;
  
  console.log('✅ Sidebar rendered -', container.children.length, 'folder items in DOM');
  console.log('✅ Container visible:', container.style.display);
  
  // Verify each folder is in the DOM
  const renderedCount = container.querySelectorAll('.folder-item').length;
  console.log('✅ Verified:', renderedCount, 'folder items with .folder-item class');
  
  if (renderedCount !== folders.length) {
    console.error('⚠️ MISMATCH! Expected', folders.length, 'but rendered', renderedCount);
  }
}

// Render recent bookmarks
function renderRecentBookmarks() {
  const recentContainer = document.getElementById('recentList');
  const recentSection = document.getElementById('recentBookmarks');
  
  const allBookmarks = [];
  folders.forEach((folder, folderIndex) => {
    if (folder.links) {
      folder.links.forEach(link => {
        allBookmarks.push({ ...link, folderIndex, folderName: folder.name });
      });
    }
  });
  
  const recentLinks = allBookmarks
    .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    .slice(0, 5);
  
  if (recentLinks.length === 0) {
    recentSection.style.display = 'none';
    return;
  }
  
  recentSection.style.display = 'block';
  recentContainer.innerHTML = '';
  
  recentLinks.forEach(link => {
    const item = document.createElement('div');
    item.className = 'recent-item';
    item.title = `${link.title}\n${link.url}\nIn: ${link.folderName}`;
    
    const favicon = link.favicon || getDefaultFavicon();
    const timeAgo = getTimeAgo(link.savedAt);
    
    item.innerHTML = `
      <img src="${escapeHtml(favicon)}" class="recent-item-favicon" alt="">
      <span class="recent-item-title">${escapeHtml(link.title)}</span>
      <span class="recent-item-time">${timeAgo}</span>
    `;
    
    item.addEventListener('click', () => {
      chrome.tabs.create({ url: link.url });
    });
    
    recentContainer.appendChild(item);
  });
}

// Create folder sidebar item
function createFolderSidebarItem(folder, index) {
  try {
    const div = document.createElement('div');
    div.className = 'folder-item';
    if (index === activeFolderIndex) {
      div.classList.add('active');
    }
    
    const isLocked = isFolderLocked(index);
    if (isLocked) {
      div.classList.add('locked');
    }
    
    const linkCount = folder.links ? folder.links.length : 0;
    const dataUsage = calculateDataUsage(folder);
    
    const lockIcon = isLocked ? `
      <svg class="folder-lock-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ` : '';
    
    div.innerHTML = `
      <div class="folder-item-header">
        <div class="folder-icon">
          <svg viewBox="0 0 24 24">
            <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/>
          </svg>
        </div>
        <div class="folder-details">
          <div class="folder-name">${escapeHtml(folder.name)}${lockIcon}</div>
          <div class="folder-meta">
            <span>${linkCount} links</span>
            <span>${formatBytes(dataUsage)}</span>
          </div>
        </div>
      </div>
    `;
    
    div.addEventListener('click', async () => {
      console.log('📁 Folder clicked:', folder.name, 'Index:', index);
      
      // Check if folder is locked
      if (isFolderLocked(index)) {
        const hasAccess = await checkFolderAccess(index);
        if (!hasAccess) {
          console.log('🔒 Access denied to locked folder');
          return;
        }
      }
      
      // Clear bulk selection when switching folders
      if (bulkSelectMode) {
        selectedBookmarks.clear();
      }
      
      activeFolderIndex = index;
      await saveData();
      updateUI();
      updateLockButton(index);
      
      console.log('✅ Switched to folder:', folder.name);
    });
    
    console.log('  ✅ Created folder item element for:', folder.name);
    return div;
  } catch (error) {
    console.error('  ❌ Error creating folder item:', error, 'Folder:', folder);
    return null;
  }
}

// Render main content
function renderContent() {
  const container = document.getElementById('bookmarksContent');
  
  if (!container) {
    console.error('Bookmarks content container not found');
    return;
  }
  
  console.log('Rendering content - Active folder:', activeFolderIndex);
  
  if (activeFolderIndex < 0 || activeFolderIndex >= folders.length) {
    const folderInfoBar = document.getElementById('folderInfoBar');
    const sortBar = document.getElementById('sortBar');
    if (folderInfoBar) folderInfoBar.style.display = 'none';
    if (sortBar) sortBar.style.display = 'none';
    
    // Force clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    console.log('No active folder - content cleared');
    return;
  }
  
  const folder = folders[activeFolderIndex];
  let links = folder.links || [];
  
  console.log('Rendering folder:', folder.name, 'with', links.length, 'links');
  
  const sortBar = document.getElementById('sortBar');
  if (sortBar) {
    sortBar.style.display = links.length > 0 ? 'flex' : 'none';
  }
  
  // Apply search filter
  const searchInput = document.getElementById('searchInput');
  const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
  
  if (searchQuery) {
    links = links.filter(link => 
      link.title.toLowerCase().includes(searchQuery) || 
      link.url.toLowerCase().includes(searchQuery)
    );
  }
  
  // Apply sorting
  const sortSelect = document.getElementById('sortSelect');
  const sortBy = sortSelect ? sortSelect.value : 'recent';
  links = [...links];
  
  switch (sortBy) {
    case 'recent':
      links.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
      break;
    case 'oldest':
      links.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
      break;
    case 'a-z':
      links.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'z-a':
      links.sort((a, b) => b.title.localeCompare(a.title));
      break;
  }
  
  // Update folder info bar
  document.getElementById('folderInfoBar').style.display = 'flex';
  document.getElementById('folderTitle').textContent = folder.name;
  
  const totalLinks = folder.links?.length || 0;
  document.getElementById('totalLinks').textContent = `${totalLinks} ${totalLinks === 1 ? 'link' : 'links'}`;
  
  const dataUsage = calculateDataUsage(folder);
  document.getElementById('dataUsage').textContent = formatBytes(dataUsage);
  
  const allDomains = new Set((folder.links || []).map(l => extractDomain(l.url))).size;
  document.getElementById('domainCount').textContent = `${allDomains} ${allDomains === 1 ? 'domain' : 'domains'}`;
  
  // Force clear and rebuild content
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  if (links.length === 0) {
    const message = searchQuery ? 'No results found' : 'No bookmarks in this folder yet';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'no-bookmarks';
    emptyDiv.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      </svg>
      <p>${message}</p>
    `;
    container.appendChild(emptyDiv);
    return;
  }
  
  const domainGroups = groupLinksByDomain(links);
  
  domainGroups.forEach(group => {
    const groupEl = createDomainGroup(group);
    container.appendChild(groupEl);
  });
  
  // Force reflow
  container.offsetHeight;
  
  console.log('Content rendered -', links.length, 'bookmarks in', domainGroups.length, 'groups');
}

// Create domain group element
function createDomainGroup(group) {
  const div = document.createElement('div');
  div.className = 'domain-group';
  
  const favicon = group.favicon || getDefaultFavicon();
  
  div.innerHTML = `
    <div class="domain-header">
      <img src="${escapeHtml(favicon)}" class="domain-favicon" alt="">
      <span class="domain-name">${escapeHtml(group.domain)}</span>
      <span class="domain-count">${group.links.length}</span>
    </div>
    <div class="domain-links"></div>
  `;
  
  const linksContainer = div.querySelector('.domain-links');
  group.links.forEach(link => {
    const linkCard = createLinkCard(link);
    linksContainer.appendChild(linkCard);
  });
  
  return div;
}

// Create link card
function createLinkCard(link) {
  const div = document.createElement('div');
  div.className = 'link-card';
  div.style.position = 'relative';
  
  if (bulkSelectMode && selectedBookmarks.has(link.url)) {
    div.classList.add('selected');
  }
  
  const favicon = link.favicon || getDefaultFavicon();
  const savedAt = link.savedAt || link.createdAt || new Date().toISOString();
  const savedAgo = getTimeAgo(savedAt);
  const savedDate = formatSavedDateTime(savedAt);
  const tooltipText = `Saved ${savedAgo} • ${savedDate}`;
  
  // Add checkbox for bulk select mode
  const checkboxHtml = `
    <div class="bulk-checkbox ${selectedBookmarks.has(link.url) ? 'checked' : ''}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
  `;
  
  div.innerHTML = checkboxHtml + `
    <img src="${escapeHtml(favicon)}" class="link-favicon" alt="">
    <div class="link-info">
      <div class="link-title">${escapeHtml(link.title)}</div>
      <div class="link-url">${escapeHtml(link.url)}</div>
    </div>
    <div class="link-time-tooltip">${escapeHtml(tooltipText)}</div>
    <div class="link-actions" style="${bulkSelectMode ? 'display: none;' : ''}">
      <button class="link-action-btn copy-link" title="Copy URL">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
      <button class="link-action-btn share-link" title="Share">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      </button>
      <button class="link-action-btn qr-link" title="Show QR">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      </button>
      <div class="link-menu-wrapper">
        <button class="link-action-btn link-menu-btn" title="More actions">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="5" cy="12" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
            <circle cx="19" cy="12" r="1.5"/>
          </svg>
        </button>
        <div class="link-menu">
          <button class="link-menu-item edit-link-menu" type="button">Edit</button>
          <button class="link-menu-item delete-link-menu" type="button">Delete</button>
        </div>
      </div>
    </div>
  `;
  
  // Handle clicks differently based on mode
  div.addEventListener('click', (e) => {
    if (bulkSelectMode) {
      // In bulk select mode, toggle selection
      e.stopPropagation();
      toggleBookmarkSelection(link.url);
      
      const checkbox = div.querySelector('.bulk-checkbox');
      if (selectedBookmarks.has(link.url)) {
        div.classList.add('selected');
        checkbox.classList.add('checked');
      } else {
        div.classList.remove('selected');
        checkbox.classList.remove('checked');
      }
    } else if (!e.target.closest('.link-actions')) {
      // In normal mode, open the link
      chrome.tabs.create({ url: link.url });
    }
  });
  
  if (!bulkSelectMode) {
    let tooltipTimer;
    div.addEventListener('mouseenter', () => {
      clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(() => {
        div.classList.add('show-tooltip');
      }, 1000 + Math.random() * 2000);
    });

    div.addEventListener('mouseleave', () => {
      clearTimeout(tooltipTimer);
      div.classList.remove('show-tooltip');
    });

    // Only add action button handlers in normal mode
    const copyBtn = div.querySelector('.copy-link');
    if (copyBtn) {
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(link.url);
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = `
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          `;
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = `
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            `;
          }, 1500);
          showSuccess('URL copied!');
        } catch (error) {
          showSuccess('Copy failed');
        }
      });
    }
    
    const linkMenuBtn = div.querySelector('.link-menu-btn');
    const linkMenu = div.querySelector('.link-menu');
    if (linkMenuBtn && linkMenu) {
      linkMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllLinkMenus();
        linkMenu.classList.toggle('open');
      });
      linkMenu.addEventListener('click', (e) => e.stopPropagation());
    }

    const editMenu = div.querySelector('.edit-link-menu');
    if (editMenu) {
      editMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAllLinkMenus();
        const linkIndex = folders[activeFolderIndex].links.indexOf(link);
        openLinkModal(activeFolderIndex, linkIndex);
      });
    }

    const deleteMenu = div.querySelector('.delete-link-menu');
    if (deleteMenu) {
      deleteMenu.addEventListener('click', async (e) => {
        e.stopPropagation();
        closeAllLinkMenus();
        if (confirm(`Delete bookmark "${link.title}"?`)) {
          const linkIndex = folders[activeFolderIndex].links.indexOf(link);
          folders[activeFolderIndex].links.splice(linkIndex, 1);
          await saveData();
          updateUI();
          showSuccess('Bookmark deleted!');
        }
      });
    }
    
    const shareBtn = div.querySelector('.share-link');
    if (shareBtn) {
      shareBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const shareData = {
          title: link.title || 'Link',
          text: link.title || 'Check out this link',
          url: link.url
        };

        if (navigator.share) {
          try {
            await navigator.share(shareData);
            showSuccess('Shared successfully!');
          } catch (error) {
            if (error.name !== 'AbortError') {
              console.error('Share failed:', error);
              showSuccess('Share failed');
            }
          }
        } else {
          try {
            await navigator.clipboard.writeText(link.url);
            showSuccess('Link copied for sharing!');
          } catch (error) {
            console.error('Clipboard fallback failed:', error);
            showSuccess('Sharing not supported');
          }
        }
      });
    }
    
    const qrBtn = div.querySelector('.qr-link');
    if (qrBtn) {
      qrBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const qrModal = document.getElementById('qrModal');
        const qrImage = document.getElementById('qrImage');
        if (qrImage) {
          qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link.url)}`;
        }
        if (qrModal) qrModal.style.display = 'flex';
      });
    }
  }
  
  return div;
}

function closeAllLinkMenus() {
  document.querySelectorAll('.link-menu.open').forEach(menu => {
    menu.classList.remove('open');
  });
}

// Setup event listeners
function setupEventListeners() {
  // Sync button
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    syncBtn.addEventListener('click', async () => {
      // Add syncing animation
      syncBtn.classList.add('syncing');
      
      // Simulate sync (reload data from storage)
      try {
        await loadData();
        updateUI();
        showSuccess('Bookmarks synced!');
      } catch (error) {
        console.error('Sync failed:', error);
        showSuccess('Sync failed. Please try again.');
      } finally {
        // Remove syncing animation after 1 second
        setTimeout(() => {
          syncBtn.classList.remove('syncing');
        }, 1000);
      }
    });
  }
  
  // Quick save
  const quickSaveBtn = document.getElementById('quickSaveBtn');
  if (quickSaveBtn) {
    quickSaveBtn.addEventListener('click', quickSave);
  }
  
  // Add folder buttons
  const addFolderSidebar = document.getElementById('addFolderSidebar');
  const emptyAddFolder = document.getElementById('emptyAddFolder');
  
  if (addFolderSidebar) {
    addFolderSidebar.addEventListener('click', () => openFolderModal());
  }
  if (emptyAddFolder) {
    emptyAddFolder.addEventListener('click', () => openFolderModal());
  }
  
  // Edit folder
  const editFolderBtn = document.getElementById('editFolderBtn');
  if (editFolderBtn) {
    editFolderBtn.addEventListener('click', () => {
      if (activeFolderIndex >= 0) {
        openFolderModal(activeFolderIndex);
        // Close dropdown
        const dropdown = document.getElementById('folderDropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
    });
  }
  
  // Delete folder
  const deleteFolderBtn = document.getElementById('deleteFolderBtn');
  if (deleteFolderBtn) {
    deleteFolderBtn.addEventListener('click', async () => {
      // Close dropdown first
      const dropdown = document.getElementById('folderDropdown');
      if (dropdown) dropdown.style.display = 'none';
      
      if (activeFolderIndex >= 0 && activeFolderIndex < folders.length) {
        const folder = folders[activeFolderIndex];
        
        if (folder.isDefault || folder.name === 'Websites') {
          showSuccess('Cannot delete the default Websites folder');
          return;
        }
        
        if (confirm(`Delete folder "${folder.name}" and all its ${folder.links?.length || 0} bookmarks?`)) {
          folders.splice(activeFolderIndex, 1);
          
          if (folders.length === 0) {
            activeFolderIndex = -1;
          } else if (activeFolderIndex >= folders.length) {
            activeFolderIndex = folders.length - 1;
          }
          
          await saveData();
          updateUI();
          
          showSuccess('Folder deleted!');
        }
      }
    });
  }
  
  // Export/Import
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const fileInput = document.getElementById('fileInput');
  
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportBookmarks();
      // Close dropdown after action
      const dropdown = document.getElementById('folderDropdown');
      if (dropdown) dropdown.style.display = 'none';
    });
  }
  if (importBtn && fileInput) {
    importBtn.addEventListener('click', () => {
      fileInput.click();
      // Close dropdown after action
      const dropdown = document.getElementById('folderDropdown');
      if (dropdown) dropdown.style.display = 'none';
    });
    fileInput.addEventListener('change', importBookmarks);
  }
  
  // Folder dropdown menu
  const folderMenuBtn = document.getElementById('folderMenuBtn');
  const folderDropdown = document.getElementById('folderDropdown');
  
  if (folderMenuBtn && folderDropdown) {
    folderMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = folderDropdown.style.display === 'block';
      folderDropdown.style.display = isVisible ? 'none' : 'block';
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!folderMenuBtn.contains(e.target) && !folderDropdown.contains(e.target)) {
        folderDropdown.style.display = 'none';
      }
    });
  }
  
  // Close open link menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.link-menu-wrapper')) {
      closeAllLinkMenus();
    }
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const clearSearch = document.getElementById('clearSearch');
  
  if (searchInput && clearSearch) {
    searchInput.addEventListener('input', (e) => {
      clearSearch.style.display = e.target.value ? 'flex' : 'none';
      renderContent();
    });
    
    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      clearSearch.style.display = 'none';
      renderContent();
    });
  }
  
  // Sort
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', () => renderContent());
  }
  
  // Bulk selection
  const bulkSelectBtn = document.getElementById('bulkSelectBtn');
  const bulkCancelBtn = document.getElementById('bulkCancelBtn');
  const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
  const bulkExportBtn = document.getElementById('bulkExportBtn');
  
  if (bulkSelectBtn) {
    bulkSelectBtn.addEventListener('click', toggleBulkSelectMode);
  }
  if (bulkCancelBtn) {
    bulkCancelBtn.addEventListener('click', exitBulkSelectMode);
  }
  if (bulkDeleteBtn) {
    bulkDeleteBtn.addEventListener('click', bulkDeleteBookmarks);
  }
  if (bulkExportBtn) {
    bulkExportBtn.addEventListener('click', bulkExportBookmarks);
  }
  
  // Help button
  const helpBtn = document.getElementById('helpBtn');
  const closeHelpModal = document.getElementById('closeHelpModal');
  
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      const helpModal = document.getElementById('helpModal');
      if (helpModal) helpModal.classList.add('active');
    });
  }
  if (closeHelpModal) {
    closeHelpModal.addEventListener('click', () => {
      const helpModal = document.getElementById('helpModal');
      if (helpModal) helpModal.classList.remove('active');
    });
  }
  
  // Folder modal
  const closeFolderModalBtn = document.getElementById('closeFolderModal');
  const cancelFolderBtn = document.getElementById('cancelFolderBtn');
  const saveFolderBtn = document.getElementById('saveFolderBtn');
  const folderNameInput = document.getElementById('folderNameInput');
  
  if (closeFolderModalBtn) {
    closeFolderModalBtn.addEventListener('click', closeFolderModal);
  }
  if (cancelFolderBtn) {
    cancelFolderBtn.addEventListener('click', closeFolderModal);
  }
  if (saveFolderBtn) {
    saveFolderBtn.addEventListener('click', saveFolder);
  }
  if (folderNameInput) {
    folderNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveFolder();
    });
  }
  
  // Link modal
  const closeLinkModalBtn = document.getElementById('closeLinkModal');
  const cancelLinkBtn = document.getElementById('cancelLinkBtn');
  const saveLinkBtn = document.getElementById('saveLinkBtn');
  
  if (closeLinkModalBtn) {
    closeLinkModalBtn.addEventListener('click', closeLinkModal);
  }
  if (cancelLinkBtn) {
    cancelLinkBtn.addEventListener('click', closeLinkModal);
  }
  if (saveLinkBtn) {
    saveLinkBtn.addEventListener('click', saveLink);
  }
  
  // Account & Backup Modal
  const accountBtn = document.getElementById('accountBtn');
  const accountModal = document.getElementById('accountModal');
  const closeAccountModal = document.getElementById('closeAccountModal');
  
  if (accountBtn) {
    accountBtn.addEventListener('click', () => {
      accountModal.style.display = 'flex';
    });
  }

  const backupSyncBtn = document.getElementById('backupSyncBtn');
  if (backupSyncBtn) {
    backupSyncBtn.addEventListener('click', () => {
      accountModal.style.display = 'flex';
    });
  }
  
  if (closeAccountModal) {
    closeAccountModal.addEventListener('click', () => {
      accountModal.style.display = 'none';
    });
  }
  
  // Backup Controls
  const downloadBackupBtn = document.getElementById('downloadBackupBtn');
  const uploadBackupBtn = document.getElementById('uploadBackupBtn');
  
  if (downloadBackupBtn) {
    downloadBackupBtn.addEventListener('click', downloadBackupFile);
  }
  
  if (uploadBackupBtn) {
    uploadBackupBtn.addEventListener('click', () => {
      fileInput.click();
    });
  }
  
  // Handle file import for backup uploads
  fileInput.addEventListener('change', uploadBackupFile);
  
  // Lock Folder
  const lockFolderBtn = document.getElementById('lockFolderBtn');
  if (lockFolderBtn) {
    lockFolderBtn.addEventListener('click', () => {
      const dropdown = document.getElementById('folderDropdown');
      if (dropdown) dropdown.style.display = 'none';
      
      if (activeFolderIndex >= 0 && activeFolderIndex < folders.length) {
        const isLocked = isFolderLocked(activeFolderIndex);
        openLockModal(activeFolderIndex, isLocked);
      }
    });
  }
  
  // Password Modal
  const passwordModal = document.getElementById('passwordModal');
  const closePasswordModal = document.getElementById('closePasswordModal');
  const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
  const savePasswordBtn = document.getElementById('savePasswordBtn');
  
  if (closePasswordModal) {
    closePasswordModal.addEventListener('click', closeLockModal);
  }
  
  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', closeLockModal);
  }
  
  if (savePasswordBtn) {
    savePasswordBtn.addEventListener('click', saveFolderPassword);
  }
  
  // Click outside modals to close
  if (accountModal) {
    accountModal.addEventListener('click', (e) => {
      if (e.target === accountModal) {
        accountModal.style.display = 'none';
      }
    });
  }
  // QR Modal close handlers
  const qrModal = document.getElementById('qrModal');
  const closeQrModal = document.getElementById('closeQrModal');
  if (closeQrModal) {
    closeQrModal.addEventListener('click', () => {
      if (qrModal) qrModal.style.display = 'none';
      const qrImage = document.getElementById('qrImage');
      if (qrImage) qrImage.src = '';
    });
  }
  const qrDoneBtn = document.getElementById('qrDoneBtn');
  if (qrDoneBtn) {
    qrDoneBtn.addEventListener('click', () => {
      if (qrModal) qrModal.style.display = 'none';
      const qrImage = document.getElementById('qrImage');
      if (qrImage) qrImage.src = '';
    });
  }
  if (qrModal) {
    qrModal.addEventListener('click', (e) => {
      if (e.target === qrModal) {
        qrModal.style.display = 'none';
        const qrImage = document.getElementById('qrImage');
        if (qrImage) qrImage.src = '';
      }
    });
  }
  
  if (passwordModal) {
    passwordModal.addEventListener('click', (e) => {
      if (e.target === passwordModal) {
        closeLockModal();
      }
    });
  }
}

// Force UI update function
function updateUI() {
  console.log('🔄 ========== UPDATE UI CALLED ==========');
  console.log('📊 State:', {
    folders: folders.length,
    active: activeFolderIndex,
    folderNames: folders.map(f => f.name)
  });
  
  try {
    // Force multiple reflows BEFORE rendering
    document.body.offsetHeight;
    document.documentElement.offsetHeight;
    
    console.log('🎨 Rendering sidebar...');
    renderSidebar();
    
    // Force reflow between renders
    document.body.offsetHeight;
    
    console.log('🎨 Rendering content...');
    renderContent();
    
    // Force multiple reflows AFTER rendering
    document.body.offsetHeight;
    document.documentElement.offsetHeight;
    
    // Verify the DOM was actually updated
    const foldersList = document.getElementById('foldersList');
    if (foldersList) {
      console.log('✅ DOM Check: foldersList has', foldersList.children.length, 'children');
      console.log('✅ DOM Check: Expected', folders.length, 'folders');
      
      if (foldersList.children.length !== folders.length) {
        console.error('⚠️ DOM MISMATCH! Retrying render...');
        // Try one more time
        renderSidebar();
        console.log('✅ Retry complete. Now has', foldersList.children.length, 'children');
      }
    } else {
      console.error('❌ foldersList not found in DOM!');
    }
    
    console.log('✅ ========== UPDATE UI COMPLETE ==========');
  } catch (error) {
    console.error('❌ Error in updateUI:', error);
  }
}

// Quick save
async function quickSave() {
  if (folders.length === 0) {
    showSuccess('Please create a folder first');
    return;
  }
  
  if (activeFolderIndex < 0 || activeFolderIndex >= folders.length) {
    showSuccess('Please select a folder');
    return;
  }
  
  if (!currentTab || !currentTab.url) {
    showSuccess('No valid page to save');
    return;
  }
  
  if (currentTab.url.startsWith('chrome://') || currentTab.url.startsWith('chrome-extension://')) {
    showSuccess('Cannot save browser pages');
    return;
  }
  
  const link = {
    title: currentTab.title || 'Untitled',
    url: currentTab.url,
    favicon: currentTab.favIconUrl || getDefaultFavicon(),
    savedAt: new Date().toISOString()
  };
  
  const folder = folders[activeFolderIndex];
  if (!folder.links) folder.links = [];
  
  const exists = folder.links.some(l => l.url === link.url);
  if (exists) {
    showSuccess('Already saved in this folder!');
    return;
  }
  
  folder.links.unshift(link);
  console.log('Saved bookmark:', link.title, 'to folder:', folder.name);
  
  // Save to storage
  await saveData();
  
  // Small delay for smoother experience
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // Force immediate UI update
  updateUI();
  
  showSuccess('Bookmark saved! ✓');
}

// Folder modal functions
function openFolderModal(folderIndex = null) {
  try {
    const modal = document.getElementById('folderModal');
    const title = document.getElementById('folderModalTitle');
    const input = document.getElementById('folderNameInput');
    
    if (!modal || !title || !input) {
      console.error('Modal elements not found');
      showSuccess('Error: Modal not available');
      return;
    }
    
    editingFolder = folderIndex;
    
    if (folderIndex !== null && folderIndex >= 0 && folderIndex < folders.length) {
      title.textContent = 'Edit Folder';
      input.value = folders[folderIndex].name;
    } else {
      title.textContent = 'Add Folder';
      input.value = '';
    }
    
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);
  } catch (error) {
    console.error('Error opening folder modal:', error);
    showSuccess('Error opening folder dialog');
  }
}

function closeFolderModal() {
  try {
    const modal = document.getElementById('folderModal');
    const input = document.getElementById('folderNameInput');
    
    if (modal) modal.classList.remove('active');
    if (input) input.value = '';
    editingFolder = null;
  } catch (error) {
    console.error('Error closing folder modal:', error);
  }
}

async function saveFolder() {
  try {
    const input = document.getElementById('folderNameInput');
    
    if (!input) {
      console.error('Input element not found');
      showSuccess('Error: Input not available');
      return;
    }
    
    const name = input.value.trim();
    
    if (!name) {
      showSuccess('Please enter a folder name');
      input.focus();
      return;
    }
    
    const duplicate = folders.some((f, i) => 
      f.name.toLowerCase() === name.toLowerCase() && i !== editingFolder
    );
    
    if (duplicate) {
      showSuccess('A folder with this name already exists');
      input.focus();
      return;
    }
    
    console.log('💾 ========== SAVE FOLDER START ==========');
    console.log('📝 Folder name:', name);
    console.log('📊 Before - Folders count:', folders.length);
    
    if (editingFolder !== null && editingFolder >= 0 && editingFolder < folders.length) {
      // Edit existing folder
      folders[editingFolder].name = name;
      console.log('✏️ Updated folder:', folders[editingFolder]);
    } else {
      // Create new folder
      const newFolder = {
        name,
        links: [],
        createdAt: new Date().toISOString()
      };
      folders.push(newFolder);
      activeFolderIndex = folders.length - 1;
      console.log('✅ NEW FOLDER CREATED!');
      console.log('📂 Folder details:', newFolder);
      console.log('📊 After - Folders count:', folders.length);
      console.log('🎯 Active index set to:', activeFolderIndex);
    }
    
    // Close modal
    console.log('🚪 Closing modal...');
    closeFolderModal();
    
    // Wait for modal close animation to complete
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('✅ Modal fully closed');
    
    // Update UI immediately
    console.log('🎨 Updating UI...');
    updateUI();
    console.log('✅ UI updated');
    
    // Save to storage
    console.log('💾 Saving to storage...');
    await saveData();
    console.log('✅ Saved to storage');
    
    // Show success message
    showSuccess(editingFolder !== null ? 'Folder updated! ✓' : 'Folder created! ✓');
    
    console.log('🎉 ========== SAVE FOLDER COMPLETE ==========');
  } catch (error) {
    console.error('❌ ERROR IN SAVE FOLDER:', error);
    console.error('Stack:', error.stack);
    showSuccess('Error saving folder');
  }
}

// Link modal functions
function openLinkModal(folderIndex, linkIndex) {
  const modal = document.getElementById('linkModal');
  const titleInput = document.getElementById('linkTitleInput');
  const urlInput = document.getElementById('linkUrlInput');
  
  editingLink = { folderIndex, linkIndex };
  
  const link = folders[folderIndex].links[linkIndex];
  titleInput.value = link.title;
  urlInput.value = link.url;
  
  modal.classList.add('active');
  setTimeout(() => titleInput.focus(), 100);
}

function closeLinkModal() {
  document.getElementById('linkModal').classList.remove('active');
  document.getElementById('linkTitleInput').value = '';
  document.getElementById('linkUrlInput').value = '';
  editingLink = null;
}

async function saveLink() {
  const titleInput = document.getElementById('linkTitleInput');
  const urlInput = document.getElementById('linkUrlInput');
  
  const title = titleInput.value.trim();
  const url = urlInput.value.trim();
  
  if (!title) {
    showSuccess('Please enter a title');
    titleInput.focus();
    return;
  }
  
  if (!url) {
    showSuccess('Please enter a URL');
    urlInput.focus();
    return;
  }
  
  if (!url.match(/^https?:\/\/.+/)) {
    showSuccess('URL must start with http:// or https://');
    urlInput.focus();
    return;
  }
  
  try {
    new URL(url);
  } catch (e) {
    showSuccess('Please enter a valid URL');
    urlInput.focus();
    return;
  }
  
  const { folderIndex, linkIndex } = editingLink;
  folders[folderIndex].links[linkIndex].title = title;
  folders[folderIndex].links[linkIndex].url = url;
  
  await saveData();
  closeLinkModal();
  updateUI();
  
  showSuccess('Bookmark updated! ✓');
}

// Bulk selection functions
function toggleBulkSelectMode() {
  bulkSelectMode = !bulkSelectMode;
  selectedBookmarks.clear();
  
  const container = document.getElementById('bookmarksContent');
  const bulkActionsBar = document.getElementById('bulkActionsBar');
  const sortBar = document.getElementById('sortBar');
  
  if (bulkSelectMode) {
    container.classList.add('bulk-select-mode');
    if (bulkActionsBar) bulkActionsBar.style.display = 'flex';
    if (sortBar) sortBar.style.display = 'none';
  } else {
    container.classList.remove('bulk-select-mode');
    if (bulkActionsBar) bulkActionsBar.style.display = 'none';
    if (sortBar) sortBar.style.display = 'flex';
  }
  
  updateBulkCount();
  renderContent();
}

function exitBulkSelectMode() {
  bulkSelectMode = false;
  selectedBookmarks.clear();
  
  const container = document.getElementById('bookmarksContent');
  const bulkActionsBar = document.getElementById('bulkActionsBar');
  const sortBar = document.getElementById('sortBar');
  
  if (container) container.classList.remove('bulk-select-mode');
  if (bulkActionsBar) bulkActionsBar.style.display = 'none';
  if (sortBar) sortBar.style.display = 'flex';
  
  renderContent();
}

function updateBulkCount() {
  const bulkCount = document.getElementById('bulkCount');
  if (bulkCount) {
    const count = selectedBookmarks.size;
    bulkCount.textContent = `${count} ${count === 1 ? 'item' : 'items'} selected`;
  }
}

function toggleBookmarkSelection(url) {
  if (selectedBookmarks.has(url)) {
    selectedBookmarks.delete(url);
  } else {
    selectedBookmarks.add(url);
  }
  updateBulkCount();
}

async function bulkDeleteBookmarks() {
  if (selectedBookmarks.size === 0) {
    showSuccess('No bookmarks selected');
    return;
  }
  
  if (!confirm(`Delete ${selectedBookmarks.size} selected bookmark${selectedBookmarks.size > 1 ? 's' : ''}?`)) {
    return;
  }
  
  const folder = folders[activeFolderIndex];
  if (!folder || !folder.links) return;
  
  folder.links = folder.links.filter(link => !selectedBookmarks.has(link.url));
  
  await saveData();
  selectedBookmarks.clear();
  exitBulkSelectMode();
  updateUI();
  
  showSuccess('Bookmarks deleted!');
}

function bulkExportBookmarks() {
  if (selectedBookmarks.size === 0) {
    showSuccess('No bookmarks selected');
    return;
  }
  
  const folder = folders[activeFolderIndex];
  if (!folder || !folder.links) return;
  
  const selectedLinks = folder.links.filter(link => selectedBookmarks.has(link.url));
  
  const exportData = {
    folderName: folder.name + ' (Selected)',
    bookmarks: selectedLinks,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folder.name.replace(/[^a-z0-9]/gi, '_')}_selected_bookmarks.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showSuccess(`Exported ${selectedLinks.length} bookmarks! ✓`);
}

// Export/Import functions
function exportBookmarks() {
  if (activeFolderIndex < 0 || activeFolderIndex >= folders.length) {
    showSuccess('No folder selected');
    return;
  }
  
  const folder = folders[activeFolderIndex];
  const exportData = {
    folderName: folder.name,
    bookmarks: folder.links || [],
    exportedAt: new Date().toISOString(),
    version: '1.0'
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folder.name.replace(/[^a-z0-9]/gi, '_')}_bookmarks.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showSuccess(`Exported ${folder.links?.length || 0} bookmarks! ✓`);
}

async function importBookmarks(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.bookmarks || !Array.isArray(data.bookmarks)) {
      throw new Error('Invalid bookmark file format');
    }
    
    if (activeFolderIndex < 0 || activeFolderIndex >= folders.length) {
      showSuccess('Please select a folder first');
      return;
    }
    
    const folder = folders[activeFolderIndex];
    if (!folder.links) folder.links = [];
    
    let imported = 0;
    let skipped = 0;
    
    data.bookmarks.forEach(bookmark => {
      const exists = folder.links.some(l => l.url === bookmark.url);
      if (!exists && bookmark.url && bookmark.title) {
        folder.links.push({
          title: bookmark.title,
          url: bookmark.url,
          favicon: bookmark.favicon || '',
          savedAt: bookmark.savedAt || new Date().toISOString()
        });
        imported++;
      } else {
        skipped++;
      }
    });
    
    await saveData();
    updateUI();
    
    showSuccess(`Imported ${imported} bookmarks! ${skipped > 0 ? `(${skipped} skipped)` : ''}`);
  } catch (error) {
    showSuccess('Failed to import bookmarks');
  }
  
  event.target.value = '';
}

// Keyboard shortcuts
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.active');
      if (activeModal) {
        activeModal.classList.remove('active');
        return;
      }
      
      const searchInput = document.getElementById('searchInput');
      if (searchInput && searchInput.value) {
        searchInput.value = '';
        document.getElementById('clearSearch').style.display = 'none';
        renderContent();
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput && searchInput.offsetParent !== null) {
        searchInput.focus();
        searchInput.select();
      }
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      quickSave();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault();
      openFolderModal();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
      e.preventDefault();
      if (activeFolderIndex >= 0) {
        exportBookmarks();
      }
    }
  });
}

// Utility functions
function getDefaultFavicon() {
  return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="18" font-size="18">🔖</text></svg>';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showSuccess(message) {
  const existing = document.querySelector('.success-message');
  if (existing) existing.remove();
  
  const div = document.createElement('div');
  div.className = 'success-message';
  div.textContent = message;
  document.body.appendChild(div);
  
  setTimeout(() => div.remove(), 2500);
}

function getTimeAgo(timestamp) {
  const now = new Date();
  const saved = new Date(timestamp);
  const diffMs = now - saved;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return saved.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatSavedDateTime(timestamp) {
  const saved = new Date(timestamp);
  return saved.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
