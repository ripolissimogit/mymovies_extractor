# AI Terminal Examples - MyMovies Extractor

Esempi pratici di come diversi AI assistants possono usare il wrapper.

## 🤖 Scenario 1: Aider (AI Code Assistant)

```bash
# Aider vuole analizzare recensioni di film del 2024
user: "Estrai le recensioni di tutti i film del 2024 che abbiamo"

# Aider esegue:
cd /Users/claudioripoli/mymovies_extractor

# Prima controlla le statistiche
./ai_wrapper.sh stats --json

# Output parsato:
{
  "total_files": 8,
  "successful_extractions": 5,
  "recent_files": [
    {"filename": "nosferatu_2024_review.txt", "size_bytes": 5411},
    {"filename": "the_brutalist_2024_review.txt", "size_bytes": 4856}
  ]
}

# Aider identifica film del 2024 ed estrae summari
```

## 🔍 Scenario 2: Cursor (AI Code Editor)

```bash
# Cursor wants to check if specific films exist before extraction
user: "Check if these films exist: Dune 2021, Avatar 2022"

# Cursor executes checks:
./ai_wrapper.sh check "Dune" 2021
./ai_wrapper.sh check "Avatar" 2022

# Parses JSON responses to determine availability
# Only extracts existing films
```

## 📊 Scenario 3: GitHub Copilot Chat

```python
# Copilot generates Python script using the wrapper
import subprocess
import json

def get_film_review(title, year):
    """Get film review using MyMovies extractor"""
    cmd = ['./ai_wrapper.sh', 'extract', title, str(year)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        return json.loads(result.stdout)
    return None

# Usage
review_data = get_film_review("Oppenheimer", 2023)
if review_data and review_data['status'] == 'success':
    print(f"Review by {review_data['author']}")
    print(f"Length: {review_data['content_length']} chars")
```

## 🔄 Scenario 4: Batch Processing with AI

```json
# AI creates batch file for multiple extractions
{
  "films": [
    {"title": "The Brutalist", "year": 2024},
    {"title": "Nosferatu", "year": 2024},  
    {"title": "Bugonia", "year": 2025}
  ],
  "options": {
    "format": "json",
    "rate_limit": 3000
  }
}
```

```bash
# AI executes batch
./ai_wrapper.sh batch_json films_to_extract.json

# Parses batch results for analysis
```

## 🎯 Scenario 5: codeium Integration

```javascript
// Codeium generates Node.js integration
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class MyMoviesAI {
    constructor(wrapperPath) {
        this.wrapper = wrapperPath;
    }
    
    async checkFilm(title, year) {
        const cmd = `${this.wrapper} check "${title}" ${year}`;
        const { stdout } = await execPromise(cmd);
        return JSON.parse(stdout);
    }
    
    async extractReview(title, year) {
        const cmd = `${this.wrapper} extract "${title}" ${year}`;
        const { stdout } = await execPromise(cmd);
        return JSON.parse(stdout);
    }
    
    async getStats() {
        const cmd = `${this.wrapper} stats --json`;
        const { stdout } = await execPromise(cmd);
        return JSON.parse(stdout);
    }
}

// Usage
const extractor = new MyMoviesAI('./ai_wrapper.sh');
const stats = await extractor.getStats();
console.log(`We have ${stats.successful_extractions} reviews`);
```

## 🧠 Scenario 6: AI Analysis Pipeline

```bash
#!/bin/bash
# AI creates analysis pipeline

echo "🤖 AI Film Analysis Pipeline"

# Get current stats
STATS=$(./ai_wrapper.sh stats --json)
TOTAL=$(echo $STATS | jq '.successful_extractions')

echo "📊 Found $TOTAL successful reviews"

# Extract top films of 2024
FILMS_2024=("Nosferatu" "The Brutalist" "Dune Part Two")

for film in "${FILMS_2024[@]}"; do
    echo "🎬 Checking: $film"
    RESULT=$(./ai_wrapper.sh check "$film" 2024)
    STATUS=$(echo $RESULT | jq -r '.status')
    
    if [ "$STATUS" = "found" ]; then
        echo "   ✅ Available - extracting..."
        ./ai_wrapper.sh extract "$film" 2024 > /tmp/${film}_2024.json
    else
        echo "   ❌ Not available"
    fi
done
```

## 📈 Scenario 7: AI Content Analysis

```python
# AI analyzes review content patterns
import subprocess
import json
import os

def analyze_reviews():
    """AI analyzes all extracted reviews"""
    
    # Get stats first
    result = subprocess.run(['./ai_wrapper.sh', 'stats', '--json'], 
                          capture_output=True, text=True)
    stats = json.loads(result.stdout)
    
    reviews_analyzed = 0
    total_words = 0
    authors = set()
    
    # Process each review file
    for file_info in stats['recent_files']:
        filename = file_info['filename']
        file_path = f"reviews/{filename}"
        
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Extract metadata from filename
            title = filename.replace('_review.txt', '').replace('_', ' ')
            
            # Simple analysis
            word_count = len(content.split())
            total_words += word_count
            reviews_analyzed += 1
            
            print(f"📄 {title}: {word_count} words")
    
    print(f"\n📊 Analysis Complete:")
    print(f"   Reviews: {reviews_analyzed}")
    print(f"   Total words: {total_words}")
    print(f"   Average: {total_words//reviews_analyzed if reviews_analyzed > 0 else 0} words/review")

if __name__ == "__main__":
    analyze_reviews()
```

## 🔧 AI Error Handling

```bash
# AI implements robust error handling
extract_with_retry() {
    local title="$1"
    local year="$2"
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        echo "🔄 Attempt $attempt for: $title ($year)"
        
        RESULT=$(./ai_wrapper.sh extract "$title" "$year")
        STATUS=$(echo $RESULT | jq -r '.status')
        
        case $STATUS in
            "success")
                echo "✅ Success on attempt $attempt"
                echo $RESULT | jq .
                return 0
                ;;
            "not_found")
                echo "❌ Film not found - no retry needed"
                return 1
                ;;
            "error")
                echo "⚠️  Error on attempt $attempt"
                if [ $attempt -eq $max_attempts ]; then
                    echo "💥 Max attempts reached"
                    return 2
                fi
                sleep 5  # Wait before retry
                ;;
        esac
        
        ((attempt++))
    done
}
```

## 📋 Summary for AI Assistants

### Quick Commands:
- `./ai_wrapper.sh check "Title" YEAR` - Fast existence check
- `./ai_wrapper.sh extract "Title" YEAR` - Full extraction
- `./ai_wrapper.sh stats --json` - Get current statistics
- `./ai_wrapper.sh batch_json file.json` - Batch processing

### JSON Output Fields:
- `status`: "success"|"error"|"not_found"
- `title`, `year`: Input parameters
- `message`: Human-readable status
- `file_path`: Path to saved review (if any)
- `content_length`: Review length in characters
- `author`, `date`: Review metadata
- `timestamp`: ISO timestamp

### Error Handling:
- Return code 0 = success
- Return code 1 = not found
- Return code 2+ = error
- Always check `status` field in JSON

### Best Practices for AI:
1. Always check film exists before extracting
2. Parse JSON output for structured data
3. Implement retry logic for network errors
4. Use batch processing for multiple films
5. Monitor rate limits (2-3 seconds between requests)