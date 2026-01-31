"""
Google Sheets integration for Islamic Crossword Puzzle Tool.

Syncs puzzle data to Google Sheets for:
- Tracking used clues (to avoid duplicates)
- Recording puzzle history
- Collaborative editing with Azmat

Requires:
- pip install google-auth google-auth-oauthlib google-api-python-client
- Service account credentials JSON file

Usage:
1. Create a new Google Sheet (don't overwrite Azmat's existing one)
2. Share the sheet with the service account email
3. Set GOOGLE_SHEETS_CREDENTIALS_FILE env var to path of credentials JSON
4. Set GOOGLE_SHEETS_ID env var to the spreadsheet ID
"""

import os
import json
from datetime import datetime
from typing import Optional, Any
from dataclasses import dataclass, asdict


@dataclass
class UsedClue:
    """Record of a clue used in a puzzle."""
    word: str
    clue: str
    puzzle_title: str
    puzzle_number: int
    date_used: str


@dataclass
class PuzzleRecord:
    """Record of a completed puzzle."""
    puzzle_number: int
    title: str
    theme: str
    date_created: str
    words_used: str  # Comma-separated list
    clue_count: int
    ipuz_exported: bool
    notes: str


class GoogleSheetsSync:
    """
    Sync puzzle data to Google Sheets.

    Sheet Structure:
    - Sheet 1 "Clue Tracker": word, clue, puzzle_title, puzzle_number, date_used
    - Sheet 2 "Puzzles": puzzle_number, title, theme, date_created, words_used, clue_count, ipuz_exported, notes
    """

    SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

    def __init__(
        self,
        credentials_file: Optional[str] = None,
        spreadsheet_id: Optional[str] = None
    ):
        self.credentials_file = credentials_file or os.environ.get('GOOGLE_SHEETS_CREDENTIALS_FILE')
        self.spreadsheet_id = spreadsheet_id or os.environ.get('GOOGLE_SHEETS_ID')
        self.service = None

    def _get_service(self):
        """Initialize the Google Sheets API service."""
        if self.service:
            return self.service

        if not self.credentials_file:
            raise ValueError("No credentials file specified. Set GOOGLE_SHEETS_CREDENTIALS_FILE")

        if not os.path.exists(self.credentials_file):
            raise FileNotFoundError(f"Credentials file not found: {self.credentials_file}")

        try:
            from google.oauth2.service_account import Credentials
            from googleapiclient.discovery import build

            creds = Credentials.from_service_account_file(
                self.credentials_file,
                scopes=self.SCOPES
            )
            self.service = build('sheets', 'v4', credentials=creds)
            return self.service
        except ImportError:
            raise ImportError(
                "Google API libraries not installed. Run:\n"
                "pip install google-auth google-auth-oauthlib google-api-python-client"
            )

    def _ensure_sheets_exist(self):
        """Create the required sheets if they don't exist."""
        service = self._get_service()

        # Get existing sheets
        spreadsheet = service.spreadsheets().get(
            spreadsheetId=self.spreadsheet_id
        ).execute()

        existing_sheets = {s['properties']['title'] for s in spreadsheet.get('sheets', [])}

        requests = []

        # Create Clue Tracker sheet
        if 'Clue Tracker' not in existing_sheets:
            requests.append({
                'addSheet': {
                    'properties': {'title': 'Clue Tracker'}
                }
            })

        # Create Puzzles sheet
        if 'Puzzles' not in existing_sheets:
            requests.append({
                'addSheet': {
                    'properties': {'title': 'Puzzles'}
                }
            })

        if requests:
            service.spreadsheets().batchUpdate(
                spreadsheetId=self.spreadsheet_id,
                body={'requests': requests}
            ).execute()

            # Add headers
            self._add_headers()

    def _add_headers(self):
        """Add headers to the sheets."""
        service = self._get_service()

        # Clue Tracker headers
        clue_headers = [['Word', 'Clue', 'Puzzle Title', 'Puzzle Number', 'Date Used']]
        service.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range='Clue Tracker!A1:E1',
            valueInputOption='RAW',
            body={'values': clue_headers}
        ).execute()

        # Puzzles headers
        puzzle_headers = [['Puzzle Number', 'Title', 'Theme', 'Date Created', 'Words Used', 'Clue Count', 'IPUZ Exported', 'Notes']]
        service.spreadsheets().values().update(
            spreadsheetId=self.spreadsheet_id,
            range='Puzzles!A1:H1',
            valueInputOption='RAW',
            body={'values': puzzle_headers}
        ).execute()

    def check_clue_duplicate(self, clue_text: str) -> Optional[UsedClue]:
        """
        Check if a clue has been used before.

        Returns the UsedClue record if found, None otherwise.
        """
        service = self._get_service()

        # Get all clues
        result = service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheet_id,
            range='Clue Tracker!A:E'
        ).execute()

        rows = result.get('values', [])
        if len(rows) <= 1:  # Only headers or empty
            return None

        clue_lower = clue_text.lower().strip()

        for row in rows[1:]:  # Skip header
            if len(row) >= 2:
                existing_clue = row[1].lower().strip()
                if existing_clue == clue_lower:
                    return UsedClue(
                        word=row[0] if len(row) > 0 else '',
                        clue=row[1] if len(row) > 1 else '',
                        puzzle_title=row[2] if len(row) > 2 else '',
                        puzzle_number=int(row[3]) if len(row) > 3 and row[3].isdigit() else 0,
                        date_used=row[4] if len(row) > 4 else ''
                    )

        return None

    def add_used_clue(self, used_clue: UsedClue):
        """Record a clue as used in a puzzle."""
        service = self._get_service()

        values = [[
            used_clue.word,
            used_clue.clue,
            used_clue.puzzle_title,
            used_clue.puzzle_number,
            used_clue.date_used
        ]]

        service.spreadsheets().values().append(
            spreadsheetId=self.spreadsheet_id,
            range='Clue Tracker!A:E',
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body={'values': values}
        ).execute()

    def add_puzzle_record(self, puzzle: PuzzleRecord):
        """Record a completed puzzle."""
        service = self._get_service()

        values = [[
            puzzle.puzzle_number,
            puzzle.title,
            puzzle.theme,
            puzzle.date_created,
            puzzle.words_used,
            puzzle.clue_count,
            'Yes' if puzzle.ipuz_exported else 'No',
            puzzle.notes
        ]]

        service.spreadsheets().values().append(
            spreadsheetId=self.spreadsheet_id,
            range='Puzzles!A:H',
            valueInputOption='RAW',
            insertDataOption='INSERT_ROWS',
            body={'values': values}
        ).execute()

    def get_next_puzzle_number(self) -> int:
        """Get the next available puzzle number."""
        service = self._get_service()

        result = service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheet_id,
            range='Puzzles!A:A'
        ).execute()

        rows = result.get('values', [])
        if len(rows) <= 1:
            return 1

        max_num = 0
        for row in rows[1:]:
            if row and row[0].isdigit():
                max_num = max(max_num, int(row[0]))

        return max_num + 1

    def get_all_used_clues(self) -> list[UsedClue]:
        """Get all used clues for duplicate checking."""
        service = self._get_service()

        result = service.spreadsheets().values().get(
            spreadsheetId=self.spreadsheet_id,
            range='Clue Tracker!A:E'
        ).execute()

        rows = result.get('values', [])
        clues = []

        for row in rows[1:]:  # Skip header
            if len(row) >= 2:
                clues.append(UsedClue(
                    word=row[0] if len(row) > 0 else '',
                    clue=row[1] if len(row) > 1 else '',
                    puzzle_title=row[2] if len(row) > 2 else '',
                    puzzle_number=int(row[3]) if len(row) > 3 and row[3].isdigit() else 0,
                    date_used=row[4] if len(row) > 4 else ''
                ))

        return clues

    def sync_puzzle(
        self,
        title: str,
        theme: str,
        words_and_clues: list[tuple[str, str]],
        ipuz_exported: bool = False,
        notes: str = ""
    ):
        """
        Sync a completed puzzle to Google Sheets.

        Args:
            title: Puzzle title
            theme: Puzzle theme
            words_and_clues: List of (word, clue) tuples
            ipuz_exported: Whether IPUZ file was exported
            notes: Any additional notes
        """
        self._ensure_sheets_exist()

        # Get next puzzle number
        puzzle_number = self.get_next_puzzle_number()
        today = datetime.now().strftime('%Y-%m-%d')

        # Check for duplicate clues and add new ones
        for word, clue in words_and_clues:
            existing = self.check_clue_duplicate(clue)
            if existing:
                print(f"Warning: Clue already used in puzzle {existing.puzzle_number}: {clue[:50]}...")
            else:
                self.add_used_clue(UsedClue(
                    word=word,
                    clue=clue,
                    puzzle_title=title,
                    puzzle_number=puzzle_number,
                    date_used=today
                ))

        # Add puzzle record
        self.add_puzzle_record(PuzzleRecord(
            puzzle_number=puzzle_number,
            title=title,
            theme=theme,
            date_created=today,
            words_used=', '.join(word for word, _ in words_and_clues),
            clue_count=len(words_and_clues),
            ipuz_exported=ipuz_exported,
            notes=notes
        ))

        print(f"Synced puzzle #{puzzle_number}: {title}")
        return puzzle_number


def create_new_tracking_sheet(sheet_name: str = "Islamic Crossword Tracker") -> str:
    """
    Create a new Google Sheet for tracking puzzles.

    Returns the spreadsheet ID.

    Requires GOOGLE_SHEETS_CREDENTIALS_FILE environment variable.
    """
    credentials_file = os.environ.get('GOOGLE_SHEETS_CREDENTIALS_FILE')
    if not credentials_file:
        raise ValueError("Set GOOGLE_SHEETS_CREDENTIALS_FILE environment variable")

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        creds = Credentials.from_service_account_file(
            credentials_file,
            scopes=['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
        )

        service = build('sheets', 'v4', credentials=creds)

        spreadsheet = {
            'properties': {'title': sheet_name},
            'sheets': [
                {'properties': {'title': 'Clue Tracker'}},
                {'properties': {'title': 'Puzzles'}}
            ]
        }

        result = service.spreadsheets().create(body=spreadsheet).execute()
        spreadsheet_id = result['spreadsheetId']

        print(f"Created new spreadsheet: {sheet_name}")
        print(f"Spreadsheet ID: {spreadsheet_id}")
        print(f"URL: https://docs.google.com/spreadsheets/d/{spreadsheet_id}")

        return spreadsheet_id

    except ImportError:
        raise ImportError(
            "Google API libraries not installed. Run:\n"
            "pip install google-auth google-auth-oauthlib google-api-python-client"
        )


if __name__ == "__main__":
    # Test the sheets sync
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == 'create':
        # Create a new sheet
        sheet_id = create_new_tracking_sheet()
        print(f"\nSet this environment variable:")
        print(f"export GOOGLE_SHEETS_ID={sheet_id}")
    else:
        # Test sync
        sync = GoogleSheetsSync()

        try:
            sync._ensure_sheets_exist()
            print("Sheets ready!")

            # Get stats
            clues = sync.get_all_used_clues()
            print(f"Total clues tracked: {len(clues)}")

            next_num = sync.get_next_puzzle_number()
            print(f"Next puzzle number: {next_num}")

        except Exception as e:
            print(f"Error: {e}")
            print("\nTo create a new tracking sheet:")
            print(f"  python {sys.argv[0]} create")
