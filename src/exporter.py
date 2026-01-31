"""
Export crossword puzzles to various formats.
Supports JSON, HTML, IPUZ, Flutter JSON, and print-friendly formats.

IPUZ format reference: http://www.ipuz.org/
Flutter JSON: Custom format for My Islam Flutter app
"""

import json
import os
from datetime import datetime
from typing import Optional

from .grid import Grid, Direction


class CrosswordExporter:
    """Export crossword puzzles to different formats."""

    def __init__(
        self,
        grid: Grid,
        title: str = "Islamic Crossword",
        author: str = "",
        copyright: str = "My Islam"
    ):
        self.grid = grid.compact() if grid else grid
        self.title = title
        self.author = author
        self.copyright = copyright
        self.date = datetime.now().isoformat()

    def to_json(self, pretty: bool = True) -> str:
        """
        Export to JSON format.
        This format is suitable for web widgets and APIs.
        """
        min_row, min_col, max_row, max_col = self.grid.get_bounds()
        rows = max_row - min_row + 1
        cols = max_col - min_col + 1

        # Build grid array
        grid_array = []
        for r in range(rows):
            row_data = []
            for c in range(cols):
                cell = self.grid.get_cell(r, c)
                if cell is None or (cell.letter is None and not cell.is_black):
                    row_data.append({"type": "empty"})
                elif cell.is_black:
                    row_data.append({"type": "black"})
                else:
                    cell_data = {
                        "type": "letter",
                        "solution": cell.letter
                    }
                    if cell.number:
                        cell_data["number"] = cell.number
                    row_data.append(cell_data)
            grid_array.append(row_data)

        # Build clues
        across_clues = []
        for word in self.grid.get_across_words():
            across_clues.append({
                "number": word.number,
                "clue": word.clue,
                "answer": word.word,
                "row": word.row,
                "col": word.col,
                "length": len(word.word)
            })

        down_clues = []
        for word in self.grid.get_down_words():
            down_clues.append({
                "number": word.number,
                "clue": word.clue,
                "answer": word.word,
                "row": word.row,
                "col": word.col,
                "length": len(word.word)
            })

        data = {
            "metadata": {
                "title": self.title,
                "author": self.author,
                "date": self.date,
                "rows": rows,
                "cols": cols,
                "wordCount": len(self.grid.placed_words)
            },
            "grid": grid_array,
            "clues": {
                "across": across_clues,
                "down": down_clues
            }
        }

        if pretty:
            return json.dumps(data, indent=2, ensure_ascii=False)
        return json.dumps(data, ensure_ascii=False)

    def to_puz_json(self) -> str:
        """
        Export to a format compatible with common puzzle widgets.
        Similar to the .puz format but in JSON.
        """
        min_row, min_col, max_row, max_col = self.grid.get_bounds()
        rows = max_row - min_row + 1
        cols = max_col - min_col + 1

        # Build solution string (row by row, . for black/empty)
        solution = ""
        for r in range(rows):
            for c in range(cols):
                cell = self.grid.get_cell(r, c)
                if cell and cell.letter:
                    solution += cell.letter
                else:
                    solution += "."

        data = {
            "title": self.title,
            "author": self.author,
            "width": cols,
            "height": rows,
            "solution": solution,
            "clues": {
                "across": {
                    str(w.number): w.clue for w in self.grid.get_across_words()
                },
                "down": {
                    str(w.number): w.clue for w in self.grid.get_down_words()
                }
            },
            "answers": {
                "across": {
                    str(w.number): w.word for w in self.grid.get_across_words()
                },
                "down": {
                    str(w.number): w.word for w in self.grid.get_down_words()
                }
            }
        }

        return json.dumps(data, indent=2, ensure_ascii=False)

    def to_ipuz(self, pretty: bool = True) -> str:
        """
        Export to IPUZ format.

        IPUZ is an open format for crossword puzzles.
        Reference: http://www.ipuz.org/

        This matches the format used by Azmat's Prophet Stories puzzles.
        """
        min_row, min_col, max_row, max_col = self.grid.get_bounds()
        rows = max_row - min_row + 1
        cols = max_col - min_col + 1

        # Build puzzle grid (cell numbers or "#" for black)
        # Format: "1", "2", "0" for numbered/unnumbered cells, "#" for black
        puzzle_grid = []
        for r in range(rows):
            row_data = []
            for c in range(cols):
                cell = self.grid.get_cell(r, c)
                if cell is None or cell.is_black:
                    row_data.append("#")
                elif cell.letter is None:
                    row_data.append("#")  # Empty cells treated as black
                elif cell.number:
                    row_data.append(str(cell.number))
                else:
                    row_data.append("0")
            puzzle_grid.append(row_data)

        # Build solution grid (letters or null for black)
        solution_grid = []
        for r in range(rows):
            row_data = []
            for c in range(cols):
                cell = self.grid.get_cell(r, c)
                if cell is None or cell.is_black or cell.letter is None:
                    row_data.append(None)
                else:
                    row_data.append(cell.letter)
            solution_grid.append(row_data)

        # Build clues in IPUZ format: [[number, "clue text"], ...]
        across_clues = [
            [w.number, w.clue] for w in self.grid.get_across_words()
        ]
        down_clues = [
            [w.number, w.clue] for w in self.grid.get_down_words()
        ]

        ipuz = {
            "version": "http://ipuz.org/v2",
            "kind": ["http://ipuz.org/crossword#1"],
            "title": self.title,
            "author": self.author,
            "copyright": self.copyright,
            "notes": "",
            "dimensions": {"width": cols, "height": rows},
            "puzzle": puzzle_grid,
            "solution": solution_grid,
            "clues": {
                "Across": across_clues,
                "Down": down_clues
            }
        }

        if pretty:
            return json.dumps(ipuz, indent=2, ensure_ascii=False)
        return json.dumps(ipuz, ensure_ascii=False)

    def to_flutter_json(self, theme: str = "prophets", puzzle_code: Optional[str] = None) -> str:
        """
        Export to Flutter JSON format for My Islam app.

        This format includes:
        - Grid with cells array
        - Clues with answer, position, and length
        - Cell numbers array
        - Game metadata (points, hints, estimated time)
        """
        min_row, min_col, max_row, max_col = self.grid.get_bounds()
        rows = max_row - min_row + 1
        cols = max_col - min_col + 1

        # Build cells array (letters or "#" for black)
        cells = []
        for r in range(rows):
            row_data = []
            for c in range(cols):
                cell = self.grid.get_cell(r, c)
                if cell is None or cell.is_black or cell.letter is None:
                    row_data.append("#")
                else:
                    row_data.append(cell.letter)
            cells.append(row_data)

        # Build across clues
        across_clues = []
        for w in self.grid.get_across_words():
            across_clues.append({
                "number": w.number,
                "clue": w.clue,
                "answer": w.word,
                "startPosition": {"row": w.row, "col": w.col},
                "length": len(w.word)
            })

        # Build down clues
        down_clues = []
        for w in self.grid.get_down_words():
            down_clues.append({
                "number": w.number,
                "clue": w.clue,
                "answer": w.word,
                "startPosition": {"row": w.row, "col": w.col},
                "length": len(w.word)
            })

        # Build cell numbers
        cell_numbers = []
        numbered_cells = set()
        for w in self.grid.placed_words:
            if (w.row, w.col) not in numbered_cells:
                cell_numbers.append({
                    "row": w.row,
                    "col": w.col,
                    "number": w.number
                })
                numbered_cells.add((w.row, w.col))

        # Generate puzzle code
        if puzzle_code is None:
            theme_code = theme.upper().replace(" ", "_").replace("-", "_")
            puzzle_code = f"PUZ_CROSSWORD_{theme_code}_{len(self.grid.placed_words):03d}"

        flutter_json = {
            "code": puzzle_code,
            "type": "CROSSWORD",
            "title": self.title,
            "description": f"Complete the crossword about {theme}.",
            "theme": theme.lower().replace(" ", "-"),
            "difficulty": "MEDIUM",
            "data": {
                "grid": {
                    "rows": rows,
                    "cols": cols,
                    "cells": cells
                },
                "clues": {
                    "across": across_clues,
                    "down": down_clues
                },
                "cellNumbers": cell_numbers
            },
            "metadata": {
                "estimatedTime": 300,
                "pointsPerWord": 15,
                "bonusForCompletion": 50,
                "hintsAllowed": 3
            }
        }

        return json.dumps(flutter_json, indent=2, ensure_ascii=False)

    def to_html(self, include_solution: bool = False) -> str:
        """
        Export to an HTML file with interactive grid.
        """
        min_row, min_col, max_row, max_col = self.grid.get_bounds()
        rows = max_row - min_row + 1
        cols = max_col - min_col + 1

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{self.title}</title>
    <style>
        * {{
            box-sizing: border-box;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }}
        h1 {{
            text-align: center;
            color: #2c5530;
        }}
        .puzzle-container {{
            display: flex;
            flex-wrap: wrap;
            gap: 30px;
            justify-content: center;
        }}
        .grid-container {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat({cols}, 40px);
            grid-template-rows: repeat({rows}, 40px);
            gap: 1px;
            background: #333;
            border: 2px solid #333;
        }}
        .cell {{
            background: white;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
        }}
        .cell.black {{
            background: #333;
        }}
        .cell.empty {{
            background: #f0f0f0;
        }}
        .cell-number {{
            position: absolute;
            top: 2px;
            left: 3px;
            font-size: 10px;
            font-weight: bold;
            color: #666;
        }}
        .cell-input {{
            width: 100%;
            height: 100%;
            border: none;
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            text-transform: uppercase;
            background: transparent;
        }}
        .cell-input:focus {{
            outline: none;
            background: #fffde7;
        }}
        .cell-solution {{
            font-size: 24px;
            font-weight: bold;
            color: #2c5530;
        }}
        .clues-container {{
            display: flex;
            gap: 30px;
            flex-wrap: wrap;
        }}
        .clue-section {{
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            min-width: 250px;
            flex: 1;
        }}
        .clue-section h2 {{
            margin-top: 0;
            color: #2c5530;
            border-bottom: 2px solid #2c5530;
            padding-bottom: 10px;
        }}
        .clue {{
            margin: 10px 0;
            line-height: 1.4;
        }}
        .clue-number {{
            font-weight: bold;
            color: #2c5530;
        }}
        .buttons {{
            text-align: center;
            margin: 20px 0;
        }}
        .btn {{
            padding: 10px 20px;
            margin: 5px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }}
        .btn-clear {{
            background: #f44336;
            color: white;
        }}
        .btn-clear:hover {{
            background: #d32f2f;
        }}
        .btn-check {{
            background: #2196F3;
            color: white;
        }}
        .btn-check:hover {{
            background: #1976D2;
        }}
        .btn-reveal {{
            background: #4CAF50;
            color: white;
        }}
        .btn-reveal:hover {{
            background: #388E3C;
        }}
        @media (max-width: 600px) {{
            .grid {{
                grid-template-columns: repeat({cols}, 35px);
                grid-template-rows: repeat({rows}, 35px);
            }}
        }}
    </style>
</head>
<body>
    <h1>{self.title}</h1>

    <div class="puzzle-container">
        <div class="grid-container">
            <div class="grid">
"""
        # Generate grid cells
        for r in range(rows):
            for c in range(cols):
                cell = self.grid.get_cell(r, c)
                if cell is None or (cell.letter is None and not cell.is_black):
                    html += '                <div class="cell empty"></div>\n'
                elif cell.is_black:
                    html += '                <div class="cell black"></div>\n'
                else:
                    number_html = ""
                    if cell.number:
                        number_html = f'<span class="cell-number">{cell.number}</span>'

                    if include_solution:
                        html += f'                <div class="cell">{number_html}<span class="cell-solution">{cell.letter}</span></div>\n'
                    else:
                        html += f'                <div class="cell">{number_html}<input type="text" class="cell-input" maxlength="1" data-row="{r}" data-col="{c}" data-solution="{cell.letter}"></div>\n'

        html += """            </div>

            <div class="buttons">
                <button class="btn btn-clear" onclick="clearGrid()">Clear</button>
                <button class="btn btn-check" onclick="checkGrid()">Check</button>
                <button class="btn btn-reveal" onclick="revealGrid()">Reveal</button>
            </div>
        </div>

        <div class="clues-container">
            <div class="clue-section">
                <h2>Across</h2>
"""
        for word in self.grid.get_across_words():
            html += f'                <div class="clue"><span class="clue-number">{word.number}.</span> {word.clue}</div>\n'

        html += """            </div>

            <div class="clue-section">
                <h2>Down</h2>
"""
        for word in self.grid.get_down_words():
            html += f'                <div class="clue"><span class="clue-number">{word.number}.</span> {word.clue}</div>\n'

        html += """            </div>
        </div>
    </div>

    <script>
        // Navigation and input handling
        document.querySelectorAll('.cell-input').forEach(input => {
            input.addEventListener('input', function(e) {
                if (this.value) {
                    // Move to next input
                    const inputs = Array.from(document.querySelectorAll('.cell-input'));
                    const currentIndex = inputs.indexOf(this);
                    if (currentIndex < inputs.length - 1) {
                        inputs[currentIndex + 1].focus();
                    }
                }
            });

            input.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && !this.value) {
                    // Move to previous input
                    const inputs = Array.from(document.querySelectorAll('.cell-input'));
                    const currentIndex = inputs.indexOf(this);
                    if (currentIndex > 0) {
                        inputs[currentIndex - 1].focus();
                    }
                }
            });
        });

        function clearGrid() {
            document.querySelectorAll('.cell-input').forEach(input => {
                input.value = '';
                input.style.background = '';
            });
        }

        function checkGrid() {
            document.querySelectorAll('.cell-input').forEach(input => {
                const solution = input.dataset.solution;
                if (input.value.toUpperCase() === solution) {
                    input.style.background = '#c8e6c9';
                } else if (input.value) {
                    input.style.background = '#ffcdd2';
                }
            });
        }

        function revealGrid() {
            document.querySelectorAll('.cell-input').forEach(input => {
                input.value = input.dataset.solution;
                input.style.background = '#e3f2fd';
            });
        }
    </script>
</body>
</html>
"""
        return html

    def to_text(self) -> str:
        """Export to plain text format (printable)."""
        lines = []
        lines.append(f"{'=' * 50}")
        lines.append(f"{self.title}")
        if self.author:
            lines.append(f"By {self.author}")
        lines.append(f"{'=' * 50}")
        lines.append("")
        lines.append(self.grid.to_string())
        lines.append("")
        lines.append("ACROSS")
        lines.append("-" * 30)
        for word in self.grid.get_across_words():
            lines.append(f"{word.number}. {word.clue}")
        lines.append("")
        lines.append("DOWN")
        lines.append("-" * 30)
        for word in self.grid.get_down_words():
            lines.append(f"{word.number}. {word.clue}")
        lines.append("")
        lines.append(f"{'=' * 50}")
        return "\n".join(lines)

    def save(self, filepath: str, format: str = "json", **kwargs):
        """
        Save puzzle to file.

        Args:
            filepath: Path to save file
            format: One of: json, puz_json, ipuz, flutter, html, html_solution, text
            **kwargs: Additional arguments for specific formats (e.g., theme for flutter)
        """
        os.makedirs(os.path.dirname(filepath) or ".", exist_ok=True)

        if format == "json":
            content = self.to_json()
        elif format == "puz_json":
            content = self.to_puz_json()
        elif format == "ipuz":
            content = self.to_ipuz()
        elif format == "flutter":
            content = self.to_flutter_json(**kwargs)
        elif format == "html":
            content = self.to_html()
        elif format == "html_solution":
            content = self.to_html(include_solution=True)
        elif format == "text":
            content = self.to_text()
        else:
            raise ValueError(f"Unknown format: {format}")

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

        return filepath
