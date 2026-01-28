#!/usr/bin/env python3
"""
Quick preview server for generated crossword puzzles.
Opens a local web server to view HTML puzzles.
"""

import http.server
import os
import socketserver
import webbrowser
from pathlib import Path


def main():
    port = 8080
    output_dir = Path(__file__).parent / "output"

    if not output_dir.exists():
        print("No output directory found. Generate some puzzles first:")
        print("  python generate.py --output html")
        return

    os.chdir(output_dir)

    handler = http.server.SimpleHTTPRequestHandler

    with socketserver.TCPServer(("", port), handler) as httpd:
        url = f"http://localhost:{port}"
        print(f"\nServing puzzles at: {url}")
        print("Press Ctrl+C to stop\n")

        # List available puzzles
        html_files = sorted(output_dir.glob("**/*.html"))
        if html_files:
            print("Available puzzles:")
            for f in html_files[:10]:
                rel_path = f.relative_to(output_dir)
                print(f"  {url}/{rel_path}")
            if len(html_files) > 10:
                print(f"  ... and {len(html_files) - 10} more")
        print()

        # Open browser
        webbrowser.open(url)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
