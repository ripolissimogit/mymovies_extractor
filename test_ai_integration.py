#!/usr/bin/env python3
"""
Test AI Integration - MyMovies Extractor
Dimostra come un AI assistant userebbe il wrapper
"""

import subprocess
import json
import os
import time

class MyMoviesAI:
    def __init__(self, wrapper_path="./ai_wrapper.sh"):
        self.wrapper = wrapper_path
        
    def _execute_command(self, cmd):
        """Esegue comando e restituisce risultato JSON"""
        try:
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
            if result.stdout.strip():
                return json.loads(result.stdout)
            return {"status": "error", "message": "No output"}
        except subprocess.TimeoutExpired:
            return {"status": "timeout", "message": "Command timeout"}
        except json.JSONDecodeError as e:
            return {"status": "parse_error", "message": f"JSON parse error: {e}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def check_film(self, title, year):
        """Controlla se un film esiste (veloce)"""
        cmd = f'{self.wrapper} check "{title}" {year}'
        return self._execute_command(cmd)
    
    def extract_review(self, title, year):
        """Estrae recensione completa"""
        cmd = f'{self.wrapper} extract "{title}" {year}'
        return self._execute_command(cmd)
    
    def get_stats(self):
        """Ottieni statistiche correnti"""
        cmd = f'{self.wrapper} stats --json'
        return self._execute_command(cmd)
    
    def analyze_available_reviews(self):
        """Analizza le recensioni già estratte"""
        stats = self.get_stats()
        if stats.get('status') == 'error':
            return stats
            
        analysis = {
            "total_reviews": stats.get('successful_extractions', 0),
            "total_size_mb": round(stats.get('total_size_bytes', 0) / 1024 / 1024, 2),
            "films_by_year": {},
            "average_length": 0
        }
        
        # Analizza file per anno
        for file_info in stats.get('recent_files', []):
            filename = file_info.get('filename', '')
            if '_review.txt' in filename:
                # Estrai anno dal filename
                parts = filename.split('_')
                year = None
                for part in parts:
                    if part.isdigit() and len(part) == 4:
                        year = part
                        break
                
                if year:
                    if year not in analysis['films_by_year']:
                        analysis['films_by_year'][year] = []
                    
                    title = filename.replace(f'_{year}_review.txt', '').replace('_', ' ').title()
                    analysis['films_by_year'][year].append({
                        "title": title,
                        "size_bytes": file_info.get('size_bytes', 0)
                    })
        
        # Calcola lunghezza media
        total_bytes = sum(f.get('size_bytes', 0) for files in analysis['films_by_year'].values() for f in files)
        total_count = sum(len(files) for files in analysis['films_by_year'].values())
        analysis['average_length'] = round(total_bytes / total_count) if total_count > 0 else 0
        
        return analysis

def demo_ai_usage():
    """Dimostra come un AI userebbe il wrapper"""
    print("🤖 AI MyMovies Integration Demo")
    print("=" * 50)
    
    ai = MyMoviesAI()
    
    # 1. Ottieni statistiche correnti
    print("\n📊 1. Getting Current Statistics...")
    stats = ai.get_stats()
    if 'successful_extractions' in stats:
        print(f"   ✅ Found {stats['successful_extractions']} successful reviews")
        print(f"   📁 Total files: {stats['total_files']}")
    else:
        print(f"   ❌ Error: {stats.get('message', 'Unknown error')}")
        return
    
    # 2. Analizza recensioni disponibili
    print("\n🔍 2. Analyzing Available Reviews...")
    analysis = ai.analyze_available_reviews()
    if isinstance(analysis, dict) and 'total_reviews' in analysis:
        print(f"   📚 Total reviews: {analysis['total_reviews']}")
        print(f"   💾 Total size: {analysis['total_size_mb']} MB")
        print(f"   📏 Average length: {analysis['average_length']} chars")
        print("   🎬 Films by year:")
        for year, films in sorted(analysis['films_by_year'].items()):
            print(f"     {year}: {len(films)} films")
            for film in films[:3]:  # Show first 3
                print(f"       - {film['title']} ({film['size_bytes']} bytes)")
            if len(films) > 3:
                print(f"       ... and {len(films) - 3} more")
    
    # 3. Test controllo esistenza (veloce)
    test_films = [
        ("Oppenheimer", 2023),
        ("Nosferatu", 2024),
        ("Nonexistent Film", 2025)
    ]
    
    print(f"\n✅ 3. Testing Film Existence Checks...")
    for title, year in test_films:
        print(f"   🎬 Checking: {title} ({year})")
        result = ai.check_film(title, year)
        status = result.get('status', 'unknown')
        if status == 'found':
            print(f"     ✅ Available on MyMovies.it")
        elif status == 'not_found':
            print(f"     ❌ Not found")
        elif status == 'timeout':
            print(f"     ⏱️  Timeout (might exist but slow to check)")
        else:
            print(f"     ❓ Error: {result.get('message', 'Unknown')}")
        time.sleep(1)  # Rate limiting
    
    # 4. Simula estrazione guidata da AI
    print(f"\n🎯 4. AI-Guided Extraction Example...")
    
    # L'AI sceglie intelligentemente cosa estrarre
    # (In realtà non eseguiamo per evitare timeout nel demo)
    extraction_candidates = [
        ("The Substance", 2024),
        ("Anora", 2024), 
        ("A Complete Unknown", 2024)
    ]
    
    print("   🤖 AI would analyze these candidates:")
    for title, year in extraction_candidates:
        print(f"     - {title} ({year})")
    
    print(f"   💭 AI decision: Skip actual extraction in demo (to avoid timeouts)")
    print(f"   💡 In real scenario, AI would:")
    print(f"     1. Check existence with rapid calls")
    print(f"     2. Prioritize by user preferences") 
    print(f"     3. Extract with proper rate limiting")
    print(f"     4. Parse and analyze results")
    
    # 5. Mostra come l'AI processerebbe risultati
    print(f"\n📋 5. Sample Result Processing...")
    sample_result = {
        "status": "success",
        "title": "Sample Film",
        "year": 2024,
        "content_length": 3450,
        "author": "Critic Name",
        "date": "2024-01-15",
        "file_path": "/path/to/review.txt"
    }
    
    print(f"   🎬 Film: {sample_result['title']} ({sample_result['year']})")
    print(f"   👤 Reviewer: {sample_result['author']}")  
    print(f"   📅 Date: {sample_result['date']}")
    print(f"   📏 Length: {sample_result['content_length']} characters")
    print(f"   💾 Saved: {os.path.basename(sample_result['file_path'])}")
    
    print(f"\n✨ Demo Complete! AI can now intelligently interact with MyMovies extractor.")

if __name__ == "__main__":
    demo_ai_usage()