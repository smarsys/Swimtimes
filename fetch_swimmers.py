#!/usr/bin/env python3
"""
SwimRankings Scraper - Récupère les données d'athlètes depuis SwimRankings.net
Utilisé par GitHub Actions pour générer swimmers-data.json
"""

import json
import re
import sys
from datetime import datetime
from urllib.request import urlopen, Request
from html.parser import HTMLParser

# Liste des athlètes à suivre (ajoute les IDs ici)
ATHLETES = [
    # {"id": "5332548", "name": "Exemple"},
]

class SwimRankingsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.data = {
            "fullName": "",
            "club": "",
            "nation": "",
            "yearOfBirth": None,
            "gender": "Male",
            "personalBests": []
        }
        self.in_title = False
        self.in_table = False
        self.current_pool = 50
        self.current_stroke = None
        self.in_row = False
        self.row_cells = []
        self.current_cell = ""
        self.capture_text = False
        self.raw_html = ""
    
    def feed(self, data):
        self.raw_html = data.lower()
        # Detect gender
        if "women" in self.raw_html or "female" in self.raw_html or "damen" in self.raw_html:
            self.data["gender"] = "Female"
        super().feed(data)
    
    def handle_starttag(self, tag, attrs):
        if tag == "title":
            self.in_title = True
            self.capture_text = True
        elif tag == "table":
            self.in_table = True
        elif tag == "tr" and self.in_table:
            self.in_row = True
            self.row_cells = []
        elif tag == "td" and self.in_row:
            self.current_cell = ""
            self.capture_text = True
        elif tag == "th" and self.in_row:
            self.current_cell = ""
            self.capture_text = True
    
    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
            self.capture_text = False
        elif tag == "table":
            self.in_table = False
        elif tag == "tr" and self.in_row:
            self.in_row = False
            self.process_row()
        elif tag in ("td", "th") and self.capture_text:
            self.row_cells.append(self.current_cell.strip())
            self.capture_text = False
    
    def handle_data(self, data):
        text = data.strip()
        if self.in_title and text:
            # Extract name from title
            name = text.replace("SwimRankings.net -", "").strip()
            if name:
                self.data["fullName"] = name
        
        if self.capture_text:
            self.current_cell += " " + text
        
        # Detect pool length
        text_lower = text.lower()
        if "long course" in text_lower or "50 m" in text_lower:
            self.current_pool = 50
        elif "short course" in text_lower or "25 m" in text_lower:
            self.current_pool = 25
        
        # Detect stroke headers
        if "freestyle" in text_lower or "freistil" in text_lower:
            self.current_stroke = "Freestyle"
        elif "backstroke" in text_lower or "rücken" in text_lower:
            self.current_stroke = "Backstroke"
        elif "breaststroke" in text_lower or "brust" in text_lower:
            self.current_stroke = "Breaststroke"
        elif "butterfly" in text_lower or "schmetterling" in text_lower:
            self.current_stroke = "Butterfly"
        elif "medley" in text_lower or "lagen" in text_lower:
            self.current_stroke = "Medley"
    
    def process_row(self):
        if len(self.row_cells) < 2:
            return
        
        first_cell = self.row_cells[0].lower()
        
        # Extract club/nation/birth
        if "club" in first_cell and len(self.row_cells) > 1:
            self.data["club"] = self.row_cells[1]
        elif "nation" in first_cell and len(self.row_cells) > 1:
            self.data["nation"] = self.row_cells[1]
        elif "born" in first_cell or "jahrgang" in first_cell:
            match = re.search(r"(\d{4})", self.row_cells[1] if len(self.row_cells) > 1 else first_cell)
            if match:
                self.data["yearOfBirth"] = int(match.group(1))
        
        # Extract times
        first_raw = self.row_cells[0]
        distance_match = re.match(r"(\d+)", first_raw)
        
        if distance_match:
            distance = int(distance_match.group(1))
            stroke = self.current_stroke
            
            # Detect stroke in cell
            cell_lower = first_raw.lower()
            if "free" in cell_lower or "libre" in cell_lower:
                stroke = "Freestyle"
            elif "back" in cell_lower or "dos" in cell_lower:
                stroke = "Backstroke"
            elif "breast" in cell_lower or "brasse" in cell_lower:
                stroke = "Breaststroke"
            elif "fly" in cell_lower or "pap" in cell_lower:
                stroke = "Butterfly"
            elif "medley" in cell_lower or "4 n" in cell_lower:
                stroke = "Medley"
            
            if not stroke:
                return
            
            # Find time in cells
            for cell in self.row_cells[1:]:
                time_match = re.search(r"(\d{1,2}:\d{2}\.\d{2}|\d{2}\.\d{2})", cell)
                if time_match:
                    time_str = time_match.group(1)
                    time_ms = self.parse_time(time_str)
                    
                    if time_ms > 0:
                        # Check if already exists
                        exists = any(
                            pb["stroke"] == stroke and 
                            pb["distance"] == distance and 
                            pb["poolLength"] == self.current_pool
                            for pb in self.data["personalBests"]
                        )
                        
                        if not exists:
                            self.data["personalBests"].append({
                                "stroke": stroke,
                                "distance": distance,
                                "poolLength": self.current_pool,
                                "timeMs": time_ms,
                                "timeDisplay": time_str
                            })
                    break
    
    def parse_time(self, time_str):
        if not time_str:
            return 0
        
        clean = time_str.replace(",", ".").strip()
        
        if ":" in clean:
            parts = clean.split(":")
            min_part = int(parts[0])
            sec_parts = parts[1].split(".")
            sec = int(sec_parts[0])
            centi = int(sec_parts[1]) if len(sec_parts) > 1 else 0
            return (min_part * 60 + sec) * 1000 + centi * 10
        else:
            parts = clean.split(".")
            sec = int(parts[0])
            centi = int(parts[1]) if len(parts) > 1 else 0
            return sec * 1000 + centi * 10


def fetch_athlete(athlete_id):
    """Récupère les données d'un athlète depuis SwimRankings"""
    url = f"https://www.swimrankings.net/index.php?page=athleteDetail&athleteId={athlete_id}"
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    req = Request(url, headers=headers)
    
    try:
        with urlopen(req, timeout=30) as response:
            html = response.read().decode("utf-8", errors="ignore")
    except Exception as e:
        print(f"Erreur fetch {athlete_id}: {e}", file=sys.stderr)
        return None
    
    parser = SwimRankingsParser()
    parser.feed(html)
    
    data = parser.data
    data["id"] = athlete_id
    data["lastUpdated"] = datetime.utcnow().isoformat() + "Z"
    
    # Split name
    parts = data["fullName"].split()
    data["firstName"] = parts[0] if parts else ""
    data["lastName"] = " ".join(parts[1:]) if len(parts) > 1 else ""
    
    return data


def main():
    """Point d'entrée principal"""
    
    # Si argument passé, utiliser comme ID
    if len(sys.argv) > 1:
        athlete_ids = sys.argv[1:]
    elif ATHLETES:
        athlete_ids = [a["id"] for a in ATHLETES]
    else:
        print("Usage: python fetch_swimmers.py <athleteId1> [athleteId2] ...")
        print("Ou configurez la liste ATHLETES dans le script.")
        sys.exit(1)
    
    swimmers = {}
    
    for athlete_id in athlete_ids:
        print(f"Fetching athlete {athlete_id}...", file=sys.stderr)
        data = fetch_athlete(athlete_id)
        
        if data:
            swimmers[athlete_id] = data
            print(f"  ✓ {data['fullName']} - {len(data['personalBests'])} PBs", file=sys.stderr)
        else:
            print(f"  ✗ Erreur pour {athlete_id}", file=sys.stderr)
    
    # Output JSON
    output = {
        "_metadata": {
            "generated": datetime.utcnow().isoformat() + "Z",
            "source": "swimrankings.net",
            "count": len(swimmers)
        },
        "swimmers": swimmers
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
