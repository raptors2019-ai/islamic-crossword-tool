# Google Sheets Setup Guide

This guide helps you set up Google Sheets integration for tracking clues and puzzles.

## Your Spreadsheet

**Spreadsheet ID:** `1ZQ0I2lvAsf8hNcdoNiFukdOw5NmJZYsGm2MG7UKN518`
**URL:** https://docs.google.com/spreadsheets/d/1ZQ0I2lvAsf8hNcdoNiFukdOw5NmJZYsGm2MG7UKN518

## Option 1: Service Account (Recommended)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name it "Islamic Crossword Tool" and create

### Step 2: Enable Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on it and press **Enable**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - Name: `crossword-sheets-sync`
   - Description: "Syncs crossword puzzle data to Google Sheets"
4. Click **Create and Continue**
5. Skip the optional steps and click **Done**

### Step 4: Download Credentials

1. Click on your new service account
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** and click **Create**
5. Save the downloaded file to: `/Users/josh/code/crosswords/credentials.json`

### Step 5: Share Your Spreadsheet

1. Open your Google Sheet
2. Click **Share** (top right)
3. Add the service account email (looks like: `crossword-sheets-sync@your-project.iam.gserviceaccount.com`)
4. Give it **Editor** access

### Step 6: Set Environment Variable

Add to your shell profile (~/.zshrc or ~/.bashrc):

```bash
export GOOGLE_SHEETS_CREDENTIALS_FILE="/Users/josh/code/crosswords/credentials.json"
export GOOGLE_SHEETS_ID="1ZQ0I2lvAsf8hNcdoNiFukdOw5NmJZYsGm2MG7UKN518"
```

Then run: `source ~/.zshrc`

### Step 7: Install Python Dependencies

```bash
pip install google-auth google-auth-oauthlib google-api-python-client
```

### Step 8: Test the Connection

```bash
cd /Users/josh/code/crosswords
python -c "from src.sheets_sync import GoogleSheetsSync; s = GoogleSheetsSync(); s._ensure_sheets_exist(); print('Connected!')"
```

---

## Option 2: Manual Tracking (No API Setup)

If you prefer not to set up the API, you can manually track clues in your existing spreadsheet.

The tool will still generate puzzles and export to IPUZ/JSON formats. You can copy the clue data to your sheet manually.

---

## Spreadsheet Structure

The tool expects (or will create) these sheets:

### Sheet 1: "Clue Tracker"
| Word | Clue | Puzzle Title | Puzzle Number | Date Used |
|------|------|--------------|---------------|-----------|
| ADAM | First vicegerent placed on earth | Prophet Adam 01 | 1 | 2024-01-30 |

### Sheet 2: "Puzzles"
| Puzzle Number | Title | Theme | Date Created | Words Used | Clue Count | IPUZ Exported | Notes |
|---------------|-------|-------|--------------|------------|------------|---------------|-------|
| 1 | Prophet Adam 01 | Prophet Stories | 2024-01-30 | ADAM, NUH, MUSA | 6 | Yes | |

---

## Usage

Once set up, sync a puzzle like this:

```python
from src.sheets_sync import GoogleSheetsSync

sync = GoogleSheetsSync()

# Check for duplicate clues before using
existing = sync.check_clue_duplicate("First vicegerent placed on earth")
if existing:
    print(f"Warning: This clue was used in puzzle #{existing.puzzle_number}")

# Sync a completed puzzle
puzzle_num = sync.sync_puzzle(
    title="Prophet Adam 01",
    theme="Prophet Stories",
    words_and_clues=[
        ("ADAM", "First vicegerent placed on earth"),
        ("NUH", "Prophet who built the Ark"),
        # ... more words
    ],
    ipuz_exported=True
)
print(f"Synced as puzzle #{puzzle_num}")
```
