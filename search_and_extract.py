#!/usr/bin/env python3
"""
MyMovies Smart Search & Extract
Cerca film con TMDB API e estrae recensioni automaticamente
"""

import requests
import json
import subprocess
import os
import sys
from datetime import datetime

class TMDBMovieSearch:
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('TMDB_API_KEY')
        self.base_url = "https://api.themoviedb.org/3"
        
        if not self.api_key:
            print("❌ TMDB API Key richiesta!")
            print("Imposta TMDB_API_KEY come variabile d'ambiente o passa come parametro")
            print("Get API key from: https://www.themoviedb.org/settings/api")
            sys.exit(1)
    
    def search_movies(self, query, max_results=10):
        """Cerca film su TMDB"""
        url = f"{self.base_url}/search/movie"
        params = {
            'api_key': self.api_key,
            'query': query,
            'language': 'it-IT',
            'include_adult': False,
            'page': 1
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            movies = []
            for movie in data.get('results', [])[:max_results]:
                # Ottieni dettagli film per avere il regista
                movie_details = self.get_movie_details(movie['id'])
                
                movies.append({
                    'id': movie['id'],
                    'title': movie.get('title', 'N/A'),
                    'original_title': movie.get('original_title', ''),
                    'year': movie.get('release_date', '')[:4] if movie.get('release_date') else 'N/A',
                    'director': movie_details.get('director', 'N/A'),
                    'overview': movie.get('overview', '')[:150] + '...' if movie.get('overview') else 'Nessuna trama disponibile',
                    'vote_average': movie.get('vote_average', 0),
                    'poster_path': movie.get('poster_path', '')
                })
            
            return movies
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Errore nella ricerca TMDB: {e}")
            return []
    
    def get_movie_details(self, movie_id):
        """Ottiene dettagli film incluso regista"""
        url = f"{self.base_url}/movie/{movie_id}"
        params = {
            'api_key': self.api_key,
            'language': 'en-EN',  # English per nomi registi romanizzati
            'append_to_response': 'credits'
        }
        
        try:
            response = requests.get(url, params=params, timeout=5)
            response.raise_for_status()
            data = response.json()
            
            # Trova il regista
            director = 'N/A'
            if 'credits' in data and 'crew' in data['credits']:
                for person in data['credits']['crew']:
                    if person.get('job') == 'Director':
                        director = person.get('name', 'N/A')
                        break
            
            return {
                'director': director,
                'runtime': data.get('runtime', 0),
                'genres': [g['name'] for g in data.get('genres', [])]
            }
            
        except requests.exceptions.RequestException:
            return {'director': 'N/A', 'runtime': 0, 'genres': []}

class MyMoviesExtractor:
    def __init__(self, script_dir):
        self.script_dir = script_dir
        self.ai_wrapper = os.path.join(script_dir, 'ai_wrapper.sh')
        
        if not os.path.exists(self.ai_wrapper):
            print(f"❌ Script ai_wrapper.sh non trovato in {self.ai_wrapper}")
            sys.exit(1)
    
    def check_film_exists(self, title, year):
        """Controlla se il film esiste su MyMovies"""
        cmd = [self.ai_wrapper, 'check', title, str(year)]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if result.stdout.strip():
                data = json.loads(result.stdout)
                return data.get('status') == 'found'
        except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception):
            pass
        
        return False
    
    def extract_review(self, title, year):
        """Estrae recensione"""
        cmd = [self.ai_wrapper, 'extract', title, str(year)]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
            if result.stdout.strip():
                data = json.loads(result.stdout)
                return data
        except (subprocess.TimeoutExpired, json.JSONDecodeError, Exception) as e:
            return {'status': 'error', 'message': str(e)}
        
        return {'status': 'error', 'message': 'Unknown error'}

def print_movie_list(movies):
    """Stampa lista film formattata"""
    print("\n" + "="*80)
    print("🎬 RISULTATI RICERCA FILM")
    print("="*80)
    
    for i, movie in enumerate(movies, 1):
        print(f"\n{i}. 📽️  {movie['title']} ({movie['year']})")
        if movie['original_title'] != movie['title']:
            print(f"   📝 Titolo originale: {movie['original_title']}")
        print(f"   🎭 Regia: {movie['director']}")
        print(f"   ⭐ Voto TMDB: {movie['vote_average']}/10")
        print(f"   📖 {movie['overview']}")
    
    print("\n" + "="*80)

def get_user_choice(max_num):
    """Ottiene scelta utente con opzioni aggiuntive"""
    while True:
        try:
            choice = input(f"\n🎯 Scegli film (1-{max_num}), 'r' per ripetere ricerca, o 'q' per uscire: ").strip().lower()

            if choice == 'q' or choice == 'quit':
                return 'quit'

            if choice == 'r' or choice == 'repeat':
                return 'repeat'

            choice_num = int(choice)
            if 1 <= choice_num <= max_num:
                return choice_num - 1  # Return 0-based index
            else:
                print(f"❌ Inserisci un numero tra 1 e {max_num}")

        except ValueError:
            print("❌ Inserisci un numero valido, 'r' per ripetere ricerca, o 'q' per uscire")
        except KeyboardInterrupt:
            print("\n👋 Uscita...")
            return 'quit'

def show_review_file(title, year):
    """Mostra il contenuto della recensione salvata"""
    import os

    # Normalizza titolo come fa JavaScript
    def normalize_title_py(title):
        import re
        title = title.lower()
        # Caratteri speciali
        replacements = {
            'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
            'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
            'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
            'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o', 'ø': 'o',
            'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
            'ý': 'y', 'ÿ': 'y', 'ñ': 'n', 'ç': 'c'
        }
        for old, new in replacements.items():
            title = title.replace(old, new)
        title = re.sub(r'[^a-z0-9\s]', '', title)
        title = re.sub(r'\s+', '-', title)
        return title.strip('-')

    normalized_title = normalize_title_py(title)
    filename = f"{normalized_title}_{year}_review.txt"
    filepath = os.path.join('reviews', filename)

    if os.path.exists(filepath):
        print(f"\n📄 RECENSIONE: {title} ({year})")
        print("="*80)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                print(content)
        except Exception as e:
            print(f"❌ Errore lettura file: {e}")
    else:
        print(f"❌ File recensione non trovato: {filename}")

def get_post_extraction_choice():
    """Menu dopo estrazione completata"""
    print(f"\n🎉 Cosa vuoi fare ora?")
    print(f"  v) 📖 Visualizza recensione estratta")
    print(f"  u) 🔄 Scegli altro film dall'elenco precedente")
    print(f"  r) 🔍 Nuova ricerca")
    print(f"  q) 👋 Esci")

    while True:
        try:
            choice = input(f"\nScelta (v/u/r/q): ").strip().lower()

            if choice in ['v', 'view']:
                return 'view'
            elif choice in ['u', 'up']:
                return 'choose_another'
            elif choice in ['r', 'repeat']:
                return 'new_search'
            elif choice in ['q', 'quit']:
                return 'quit'
            else:
                print("❌ Opzioni valide: v (visualizza), u (altro film), r (nuova ricerca), q (esci)")

        except KeyboardInterrupt:
            print("\n👋 Uscita...")
            return 'quit'

def main():
    print("🎬 MyMovies Smart Search & Extract")
    print("="*50)
    
    # Setup
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Controlla API key
    api_key = os.getenv('TMDB_API_KEY')
    if not api_key:
        print("\n🔑 TMDB API Key Setup:")
        print("1. Vai su https://www.themoviedb.org/settings/api")
        print("2. Crea account e ottieni API key")
        print("3. Esporta la key:")
        print("   export TMDB_API_KEY='your_api_key_here'")
        print("\n💡 Oppure passa la key come argomento:")
        print("   python3 search_and_extract.py --api-key YOUR_KEY")
        
        # Check se passata come argomento
        if len(sys.argv) == 3 and sys.argv[1] == '--api-key':
            api_key = sys.argv[2]
        else:
            sys.exit(1)
    
    # Inizializza servizi
    tmdb = TMDBMovieSearch(api_key)
    extractor = MyMoviesExtractor(script_dir)
    
    try:
        current_movies = []  # Mantieni l'ultimo elenco film

        while True:
            # Input ricerca (può essere saltato se si torna alla selezione film)
            if not current_movies:  # Solo se non abbiamo film da mostrare
                query = input("\n🔍 Cerca film (o 'quit' per uscire): ").strip()

                if query.lower() in ['quit', 'q', 'exit']:
                    print("👋 Arrivederci!")
                    break

                if not query:
                    print("❌ Inserisci un titolo da cercare")
                    continue

                print(f"\n🔍 Ricerca '{query}' su TMDB...")

                # Cerca film
                current_movies = tmdb.search_movies(query)

                if not current_movies:
                    print("❌ Nessun film trovato. Prova con un altro titolo.")
                    continue

            # Mostra risultati (sempre se abbiamo film)
            if current_movies:
                print_movie_list(current_movies)

                # Scelta utente
                choice_result = get_user_choice(len(current_movies))

                if choice_result == 'quit':
                    print("👋 Arrivederci!")
                    break
                elif choice_result == 'repeat':
                    current_movies = []  # Reset per nuova ricerca
                    continue
                elif isinstance(choice_result, int):
                    choice_idx = choice_result
                else:
                    continue
            
            selected_movie = current_movies[choice_idx]
            title = selected_movie['title']
            year = selected_movie['year']
            
            print(f"\n🎯 Hai scelto: {title} ({year})")
            print(f"   🎭 Regia: {selected_movie['director']}")
            
            # Controlla esistenza su MyMovies
            print(f"\n🔍 Controllo disponibilità su MyMovies.it...")
            
            if not extractor.check_film_exists(title, year):
                print(f"❌ '{title} ({year})' non trovato su MyMovies.it")
                
                # Prova con titolo originale se diverso
                if selected_movie['original_title'] != title:
                    print(f"🔄 Tentativo con titolo originale: {selected_movie['original_title']}")
                    if extractor.check_film_exists(selected_movie['original_title'], year):
                        title = selected_movie['original_title']
                        print(f"✅ Trovato con titolo originale!")
                    else:
                        print(f"❌ Non trovato neanche con titolo originale")
                        continue
                else:
                    continue
            else:
                print(f"✅ Film trovato su MyMovies.it!")
            
            # Conferma estrazione
            confirm = input(f"\n🚀 Vuoi estrarre la recensione? (s/n): ").strip().lower()
            
            if confirm in ['s', 'si', 'y', 'yes']:
                print(f"\n⏳ Estrazione recensione di '{title} ({year})'...")
                print("📝 Questo potrebbe richiedere 30-60 secondi...")
                
                # Estrai recensione
                result = extractor.extract_review(title, year)
                
                if result.get('status') == 'success':
                    print(f"\n🎉 ESTRAZIONE COMPLETATA!")
                    print(f"📽️  Film: {result.get('title', title)} ({year})")
                    print(f"👤 Autore: {result.get('author', 'N/A')}")
                    print(f"📅 Data: {result.get('date', 'N/A')}")
                    print(f"📏 Lunghezza: {result.get('content_length', 0)} caratteri")
                    
                    if result.get('file_path'):
                        print(f"💾 Salvato in: {os.path.basename(result['file_path'])}")
                    
                    print(f"\n✨ Recensione estratta con successo!")

                    # Menu post-estrazione
                    while True:
                        post_choice = get_post_extraction_choice()

                        if post_choice == 'view':
                            show_review_file(title, year)
                            continue  # Mostra di nuovo il menu

                        elif post_choice == 'choose_another':
                            # Torna alla selezione film (mantiene current_movies)
                            break

                        elif post_choice == 'new_search':
                            # Reset per nuova ricerca
                            current_movies = []
                            break

                        elif post_choice == 'quit':
                            print("👋 Arrivederci!")
                            return

                else:
                    print(f"\n❌ Errore estrazione: {result.get('message', 'Unknown error')}")

            print(f"\n" + "="*50)
    
    except KeyboardInterrupt:
        print(f"\n👋 Uscita forzata. Arrivederci!")
    except Exception as e:
        print(f"💥 Errore imprevisto: {e}")

if __name__ == "__main__":
    main()