# URL Manger

A powerful Chrome extension for organizing and managing your bookmarks with advanced features including Google Drive backup and folder locking.

## Features

### Core Features
- 📁 **Folder Organization** - Create unlimited folders to organize bookmarks
- 🌐 **Domain Grouping** - Automatically groups bookmarks by domain
- 🔍 **Smart Search** - Search across all bookmarks instantly
- 📊 **Detailed Stats** - Track links, storage usage, and domains per folder
- 🎨 **Clean UI** - Modern, intuitive interface with rounded corners

### Advanced Features
- 🔐 **Folder Locking** - Password-protect sensitive folders
- ☁️ **Google Drive Backup** - Automatic cloud backup and restore
- 🔄 **Sync** - Keep your bookmarks up to date
- 📥 **Import/Export** - JSON-based backup and sharing
- ⚡ **Quick Save** - Save current page with one click
- 🎯 **Bulk Operations** - Select and manage multiple bookmarks

## Installation

### From Source

1. Download and extract `bookmark-organizer.zip`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked"
5. Select the extracted `bookmark-organizer` folder
6. Pin the extension to your toolbar

### Google OAuth Setup (For Drive Backup)

To use Google Drive backup features, you need to set up OAuth credentials:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable "Google Drive API"
4. Create OAuth 2.0 credentials:
   - Application type: Chrome Extension
   - Add your extension ID to authorized domains
5. Copy the Client ID
6. Edit `manifest.json` and replace `YOUR_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID
7. Reload the extension

## Usage

### Creating Folders

1. Click the **+** button next to "FOLDERS"
2. Enter a folder name
3. Press Enter or click Save

### Saving Bookmarks

**Quick Save (Current Page):**
- Click the "Save" button at the top
- Or use keyboard shortcut: `Ctrl/Cmd + S`

**Manual Add:**
- Click on any folder
- Use the folder menu to add bookmarks

### Folder Locking

1. Select a folder
2. Click the **⋮** menu button
3. Select "Lock"
4. Set a password (minimum 4 characters)
5. Confirm password

**Unlocking:**
1. Click the **⋮** menu
2. Select "Unlock"
3. Enter the password

**Accessing Locked Folders:**
- Click on a locked folder
- Enter the password when prompted
- Access is granted for the session

### Google Drive Backup

**Sign In:**
1. Click the user icon in the top-right
2. Click "Sign in with Google"
3. Authorize the extension

**Manual Backup:**
1. Open Account & Backup panel
2. Click "Backup Now"
3. Data is saved to your Google Drive

**Auto Backup:**
- Toggle "Auto-backup" switch
- Extension will backup automatically when changes are made

**Restore:**
1. Click "Restore from Drive"
2. Confirm the action
3. Your bookmarks will be restored from the latest backup

### Search & Filter

**Sidebar Search:**
- Type in the search box at top of sidebar
- Results filter in real-time
- Click ✕ to clear

**Sort Options:**
- Recent (newest first)
- Oldest (oldest first)
- A-Z (alphabetical)
- Z-A (reverse alphabetical)

### Import/Export

**Export Folder:**
1. Select a folder
2. Click **⋮** menu
3. Select "Export"
4. JSON file downloads automatically

**Import to Folder:**
1. Select a folder
2. Click **⋮** menu
3. Select "Import"
4. Choose a JSON file
5. Duplicates are automatically skipped

### Bulk Operations

1. Click the checkbox icon in folder header
2. Select multiple bookmarks
3. Options appear:
   - **Export Selected** - Export chosen bookmarks
   - **Delete Selected** - Remove chosen bookmarks

## Keyboard Shortcuts

- `Ctrl/Cmd + S` - Quick save current page
- `Ctrl/Cmd + F` - Focus search box
- `Ctrl/Cmd + N` - Create new folder
- `Ctrl/Cmd + E` - Export current folder
- `Esc` - Close modals or clear search

## Data Storage

### Local Storage
- Bookmarks stored in Chrome's local storage
- No data sent to external servers (except Google Drive when enabled)
- Data persists across browser sessions

### Google Drive Storage
- Backup file: `bookmark-organizer-backup.json`
- Stored in your Google Drive root
- Only accessible by you
- Can be manually downloaded from Drive

## Security & Privacy

### Folder Passwords
- Passwords are hashed using SHA-256
- Hash stored locally in Chrome storage
- Passwords are never transmitted
- Cannot be recovered if forgotten

### Google Drive
- Uses official Google APIs
- OAuth 2.0 authentication
- Minimal permissions (drive.file scope only)
- Can access only files it creates
- You can revoke access anytime in Google Account settings

### Data Privacy
- No analytics or tracking
- No third-party services (except Google Drive when opted in)
- All data remains on your device unless you enable backup
- Open source - you can audit the code

## Troubleshooting

### Folder Not Appearing
- Check browser console (F12) for errors
- Try clicking the sync button
- Reload the extension

### Google Sign-In Failed
- Ensure you've set up OAuth credentials correctly
- Check that extension ID matches in Google Console
- Try signing out and in again
- Clear Chrome cache and cookies for Google

### Cannot Access Locked Folder
- Ensure you're entering the correct password
- Passwords are case-sensitive
- If forgotten, the only option is to unlock via code or delete the folder

### Backup/Restore Failed
- Check internet connection
- Ensure you're signed in to Google
- Check Google Drive storage quota
- Try revoking and re-granting permissions

### Performance Issues
- Large number of bookmarks (1000+) may slow down
- Try organizing into more folders
- Export and archive old bookmarks

## Technical Details

### Permissions Required
- `storage` - Save bookmarks locally
- `tabs` - Access current tab info for quick save
- `favicon` - Display website icons
- `identity` - Google sign-in (OAuth)

### Browser Compatibility
- Chrome 88+
- Edge 88+ (Chromium-based)
- Brave
- Any Chromium-based browser with extension support

### File Format

**Export Format (JSON):**
```json
{
  "folderName": "My Folder",
  "bookmarks": [
    {
      "title": "Page Title",
      "url": "https://example.com",
      "favicon": "data:image/png;base64,...",
      "savedAt": "2026-04-26T10:00:00.000Z"
    }
  ],
  "exportedAt": "2026-04-26T10:00:00.000Z",
  "version": "2.0.0"
}
```

**Backup Format:**
```json
{
  "folders": [...],
  "activeFolderIndex": 0,
  "timestamp": "2026-04-26T10:00:00.000Z",
  "version": "2.0.0"
}
```

## Version History

### Version 2.0.0
- ✨ Added Google Drive backup and restore
- 🔐 Added folder locking with password protection
- 👤 Added user authentication
- 🔄 Added sync button
- ℹ️ Added stats tooltip
- 🎨 Improved UI with badges and hover effects
- 📱 Better mobile layout support

### Version 1.0.0
- Initial release
- Folder organization
- Domain grouping
- Search and filter
- Import/export
- Bulk operations

## Support

For issues, questions, or feature requests:
1. Check this README first
2. Review browser console for errors (F12)
3. Try disabling and re-enabling the extension
4. Clear extension data and start fresh

## License

MIT License - Feel free to modify and distribute

## Credits

Built with ❤️ for better bookmark management
Icons from Lucide Icons
