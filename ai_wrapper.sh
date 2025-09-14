#!/bin/bash

# MyMovies Extractor - AI Terminal Wrapper
# Ottimizzato per utilizzo con AI assistants (aider, cursor, codeium, etc.)
# Fornisce output strutturato e machine-readable

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MYMOVIES_CMD="$SCRIPT_DIR/bin/mymovies"

# Configurazione output per AI
AI_MODE=true
STRUCTURED_OUTPUT=true

# Funzione per output strutturato JSON
output_result() {
    local status="$1"
    local title="$2" 
    local year="$3"
    local message="$4"
    local file_path="$5"
    local content_length="$6"
    local author="$7"
    local date="$8"
    
    if [ "$STRUCTURED_OUTPUT" = true ]; then
        echo "{"
        echo "  \"status\": \"$status\","
        echo "  \"title\": \"$title\","
        echo "  \"year\": $year,"
        echo "  \"message\": \"$message\","
        echo "  \"file_path\": \"$file_path\","
        echo "  \"content_length\": ${content_length:-0},"
        echo "  \"author\": \"$author\","
        echo "  \"date\": \"$date\","
        echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
        echo "}"
    else
        echo "[$status] $title ($year): $message"
        [ -n "$file_path" ] && echo "File: $file_path"
    fi
}

# Funzione per help AI-friendly
show_ai_help() {
    cat << 'EOF'
# MyMovies Extractor - AI Wrapper

## Usage for AI Assistants

```bash
# Basic extraction
./ai_wrapper.sh extract "Film Title" YEAR

# JSON output
./ai_wrapper.sh extract "Film Title" YEAR --json

# Batch processing
./ai_wrapper.sh batch_json film_list.json

# Check if film exists
./ai_wrapper.sh check "Film Title" YEAR

# Get review stats
./ai_wrapper.sh stats --json
```

## Input Formats

### Single Film
```bash
./ai_wrapper.sh extract "Oppenheimer" 2023
```

### JSON Batch Input
```json
{
  "films": [
    {"title": "Oppenheimer", "year": 2023},
    {"title": "Dune", "year": 2021}
  ],
  "options": {
    "format": "json",
    "save_files": true,
    "rate_limit": 2000
  }
}
```

## Output Format

All outputs are JSON structured for easy parsing:

```json
{
  "status": "success|error|not_found",
  "title": "Film Title",
  "year": 2023,
  "message": "Description",
  "file_path": "/path/to/review.txt",
  "content_length": 1234,
  "author": "Reviewer Name",
  "date": "Review Date",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

## Return Codes
- 0: Success
- 1: Not found
- 2: Invalid input
- 3: Network/technical error
EOF
}

# Controlla esistenza film senza estrarre
check_film() {
    local title="$1"
    local year="$2"
    
    # Test rapido con timeout ridotto (compatible con macOS)
    local temp_file=$(mktemp)
    "$MYMOVIES_CMD" "$title" "$year" --no-save > "$temp_file" 2>&1 &
    local pid=$!
    local timeout_duration=10
    local count=0
    
    while [ $count -lt $timeout_duration ] && kill -0 $pid 2>/dev/null; do
        sleep 1
        count=$((count + 1))
    done
    
    if kill -0 $pid 2>/dev/null; then
        kill $pid 2>/dev/null
        wait $pid 2>/dev/null
        rm -f "$temp_file"
        local result=124  # timeout exit code
    else
        wait $pid
        local result=$?
        rm -f "$temp_file"
    fi
    
    case $result in
        0)
            output_result "found" "$title" "$year" "Film exists on MyMovies.it" "" "" "" ""
            return 0
            ;;
        *)
            output_result "not_found" "$title" "$year" "Film not found or unavailable" "" "" "" ""
            return 1
            ;;
    esac
}

# Estrazione con parsing output
extract_film() {
    local title="$1"
    local year="$2"
    local format="${3:-text}"
    
    local temp_file=$(mktemp)
    
    if [ "$format" = "json" ]; then
        "$MYMOVIES_CMD" "$title" "$year" --json > "$temp_file" 2>&1
    else
        "$MYMOVIES_CMD" "$title" "$year" > "$temp_file" 2>&1
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        # Estrai informazioni dal file output
        local file_path=""
        local content_length=0
        local author=""
        local date=""
        
        # Parse dell'output per estrarre metadati
        if [ "$format" = "json" ]; then
            # Parse JSON output
            if command -v jq &> /dev/null; then
                author=$(jq -r '.review.author // ""' "$temp_file" 2>/dev/null)
                date=$(jq -r '.review.date // ""' "$temp_file" 2>/dev/null)
                content_length=$(jq -r '.metadata.contentLength // 0' "$temp_file" 2>/dev/null)
            fi
        else
            # Parse text output
            author=$(grep "👤 Autore:" "$temp_file" | sed 's/👤 Autore: //' 2>/dev/null)
            date=$(grep "📅 Data:" "$temp_file" | sed 's/📅 Data: //' 2>/dev/null)
            content_length=$(grep "📊 Lunghezza:" "$temp_file" | grep -o '[0-9]*' | head -1 2>/dev/null)
            file_path=$(grep "💾 File salvato" "$temp_file" | sed 's/.*: //' 2>/dev/null)
        fi
        
        [ -z "$content_length" ] && content_length=0
        
        output_result "success" "$title" "$year" "Review extracted successfully" "$file_path" "$content_length" "$author" "$date"
        rm -f "$temp_file"
        return 0
    else
        local error_msg=$(cat "$temp_file" | grep -o "❌ Errore:.*" | head -1 | sed 's/❌ Errore: //')
        [ -z "$error_msg" ] && error_msg="Unknown extraction error"
        
        output_result "error" "$title" "$year" "$error_msg" "" "0" "" ""
        rm -f "$temp_file"
        return 1
    fi
}

# Batch processing da JSON
batch_json() {
    local json_file="$1"
    
    if [ ! -f "$json_file" ]; then
        output_result "error" "" "" "JSON file not found: $json_file" "" "0" "" ""
        return 2
    fi
    
    if ! command -v jq &> /dev/null; then
        output_result "error" "" "" "jq not installed (required for JSON batch processing)" "" "0" "" ""
        return 3
    fi
    
    echo "{"
    echo "  \"batch_results\": ["
    
    local films=$(jq -r '.films[] | @base64' "$json_file" 2>/dev/null)
    local rate_limit=$(jq -r '.options.rate_limit // 2000' "$json_file" 2>/dev/null)
    local format=$(jq -r '.options.format // "text"' "$json_file" 2>/dev/null)
    
    local first=true
    
    while IFS= read -r film_data; do
        local film_json=$(echo "$film_data" | base64 --decode)
        local title=$(echo "$film_json" | jq -r '.title')
        local year=$(echo "$film_json" | jq -r '.year')
        
        [ "$first" = true ] && first=false || echo ","
        
        # Estrai senza il wrapper JSON esterno
        STRUCTURED_OUTPUT=true extract_film "$title" "$year" "$format"
        
        # Rate limiting
        [ "$rate_limit" -gt 0 ] && sleep $(echo "$rate_limit / 1000" | bc -l) 2>/dev/null
        
    done <<< "$films"
    
    echo "  ],"
    echo "  \"batch_completed\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
    echo "}"
}

# Statistiche in formato JSON
stats_json() {
    local reviews_dir="$SCRIPT_DIR/reviews"
    
    if [ ! -d "$reviews_dir" ]; then
        output_result "error" "" "" "Reviews directory not found" "" "0" "" ""
        return 1
    fi
    
    local total_files=$(find "$reviews_dir" -name "*.txt" | wc -l)
    local successful_files=$(find "$reviews_dir" -name "*.txt" -size +100c | wc -l)
    local failed_files=$((total_files - successful_files))
    local total_size=$(du -sb "$reviews_dir" 2>/dev/null | cut -f1 || echo "0")
    
    echo "{"
    echo "  \"total_files\": $total_files,"
    echo "  \"successful_extractions\": $successful_files,"
    echo "  \"failed_extractions\": $failed_files,"
    echo "  \"total_size_bytes\": ${total_size:-0},"
    echo "  \"recent_files\": ["
    
    local recent_files=$(find "$reviews_dir" -name "*.txt" -size +100c -exec ls -la {} \; | tail -5)
    local first=true
    
    while IFS= read -r line; do
        if [ -n "$line" ]; then
            [ "$first" = true ] && first=false || echo ","
            
            local filename=$(echo "$line" | awk '{print $NF}' | xargs basename)
            local size=$(echo "$line" | awk '{print $5}')
            local date=$(echo "$line" | awk '{print $6 " " $7 " " $8}')
            
            echo "    {"
            echo "      \"filename\": \"$filename\","
            echo "      \"size_bytes\": $size,"
            echo "      \"modified\": \"$date\""
            echo -n "    }"
        fi
    done <<< "$recent_files"
    
    echo ""
    echo "  ],"
    echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\""
    echo "}"
}

# Main command dispatcher
case "$1" in
    "extract")
        if [ $# -lt 3 ]; then
            output_result "error" "" "" "Usage: extract \"Title\" YEAR [--json]" "" "0" "" ""
            exit 2
        fi
        extract_film "$2" "$3" "$4"
        ;;
    
    "check")
        if [ $# -lt 3 ]; then
            output_result "error" "" "" "Usage: check \"Title\" YEAR" "" "0" "" ""
            exit 2
        fi
        check_film "$2" "$3"
        ;;
    
    "batch_json")
        if [ $# -lt 2 ]; then
            output_result "error" "" "" "Usage: batch_json file.json" "" "0" "" ""
            exit 2
        fi
        batch_json "$2"
        ;;
    
    "stats")
        if [ "$2" = "--json" ]; then
            stats_json
        else
            "$SCRIPT_DIR/wrapper.sh" stats
        fi
        ;;
    
    "help"|"--help"|"-h"|"")
        show_ai_help
        ;;
    
    *)
        output_result "error" "" "" "Unknown command: $1" "" "0" "" ""
        exit 2
        ;;
esac