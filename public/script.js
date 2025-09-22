// Global state
let currentExtractionTimer = null;
let extractionStartTime = null;

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const directTitle = document.getElementById('directTitle');
const directYear = document.getElementById('directYear');
const extractBtn = document.getElementById('extractBtn');
const reviewsList = document.getElementById('reviewsList');
const refreshBtn = document.getElementById('refreshBtn');
const extractionModal = document.getElementById('extractionModal');
const reviewModal = document.getElementById('reviewModal');

// Stats elements
const totalReviews = document.getElementById('totalReviews');
const totalSize = document.getElementById('totalSize');
const lastUpdate = document.getElementById('lastUpdate');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    loadReviews();
    loadStats();
    
    // Event listeners
    searchBtn.addEventListener('click', searchMovies);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') searchMovies();
    });
    
    extractBtn.addEventListener('click', extractDirect);
    refreshBtn.addEventListener('click', function() {
        loadReviews();
        loadStats();
    });
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        loadStats();
    }, 30000);
});

// Search movies using TMDB
async function searchMovies() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ricerca...';
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        
        const results = await response.json();
        
        if (results.error) {
            showSearchResults([]);
            alert('Errore ricerca: ' + results.error);
            return;
        }
        
        showSearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
        alert('Errore durante la ricerca');
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Cerca';
    }
}

// Show search results
function showSearchResults(movies) {
    if (!movies || movies.length === 0) {
        searchResults.innerHTML = '<p class="text-muted">Nessun film trovato</p>';
        searchResults.classList.remove('hidden');
        return;
    }
    
    const html = movies.map(movie => `
        <div class="movie-result">
            <div class="movie-info">
                <h4>${movie.title} (${movie.year})</h4>
                <p><strong>Regia:</strong> ${movie.director}</p>
                <p><strong>Voto TMDB:</strong> ${movie.vote_average}/10</p>
                <p>${movie.overview}</p>
            </div>
            <button class="btn btn-primary" onclick="extractMovie('${movie.title.replace(/'/g, "\\'")}', ${movie.year})">
                <i class="fas fa-download"></i> Estrai
            </button>
        </div>
    `).join('');
    
    searchResults.innerHTML = html;
    searchResults.classList.remove('hidden');
}

// Extract movie from search results
function extractMovie(title, year) {
    directTitle.value = title;
    directYear.value = year;
    extractDirect();
}

// Direct extraction
async function extractDirect() {
    const title = directTitle.value.trim();
    const year = parseInt(directYear.value);
    
    if (!title || !year) {
        alert('Inserisci titolo e anno');
        return;
    }
    
    showExtractionModal(title, year);
    
    try {
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, year })
        });
        
        const result = await response.json();
        
        hideExtractionModal();
        
        if (result.success) {
            alert(`✅ Recensione estratta con successo!\n\nFilm: ${result.review.title}\nAutore: ${result.review.author}\nLunghezza: ${result.metadata.contentLength} caratteri`);
            
            // Clear form and refresh
            directTitle.value = '';
            directYear.value = '';
            searchInput.value = '';
            searchResults.classList.add('hidden');
            
            loadReviews();
            loadStats();
        } else {
            alert(`❌ Errore estrazione: ${result.error}`);
        }
    } catch (error) {
        hideExtractionModal();
        console.error('Extraction error:', error);
        alert('Errore durante l\'estrazione');
    }
}

// Show extraction modal
function showExtractionModal(title, year) {
    document.getElementById('extractingTitle').textContent = title;
    document.getElementById('extractingYear').textContent = year;
    document.getElementById('extractionStatus').textContent = 'Connessione a MyMovies.it...';
    
    extractionModal.classList.remove('hidden');
    
    extractionStartTime = Date.now();
    currentExtractionTimer = setInterval(updateExtractionTimer, 1000);
    
    // Simulate progress updates
    setTimeout(() => {
        document.getElementById('extractionStatus').textContent = 'Caricamento pagina film...';
    }, 2000);
    
    setTimeout(() => {
        document.getElementById('extractionStatus').textContent = 'Estrazione contenuto recensione...';
    }, 5000);
    
    setTimeout(() => {
        document.getElementById('extractionStatus').textContent = 'Pulizia e validazione testo...';
    }, 10000);
}

// Hide extraction modal
function hideExtractionModal() {
    extractionModal.classList.add('hidden');
    if (currentExtractionTimer) {
        clearInterval(currentExtractionTimer);
        currentExtractionTimer = null;
    }
}

// Update extraction timer
function updateExtractionTimer() {
    if (!extractionStartTime) return;
    
    const elapsed = Math.floor((Date.now() - extractionStartTime) / 1000);
    document.getElementById('extractionTime').textContent = `${elapsed}s`;
}

// Load reviews list
async function loadReviews() {
    reviewsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Caricamento recensioni...</div>';
    
    try {
        const response = await fetch('/api/reviews');
        const data = await response.json();
        
        if (data.reviews.length === 0) {
            reviewsList.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 20px; display: block; opacity: 0.3;"></i>
                    <h3>Nessuna recensione estratta</h3>
                    <p>Usa il modulo di ricerca sopra per estrarre la tua prima recensione</p>
                </div>
            `;
            return;
        }
        
        const html = data.reviews.map(review => `
            <div class="review-card" onclick="showReview('${review.filename}', '${review.title}', ${review.year})">
                <div class="review-header">
                    <div>
                        <div class="review-title">${review.title} (${review.year})</div>
                        <div class="review-meta">
                            <span><i class="fas fa-user"></i> ${review.author}</span>
                            <span><i class="fas fa-calendar"></i> ${review.date}</span>
                        </div>
                    </div>
                    <div class="review-year">${review.year}</div>
                </div>
                <div class="review-stats">
                    <div class="stat">
                        <i class="fas fa-file-text"></i>
                        ${review.length.toLocaleString()} caratteri
                    </div>
                    <div class="stat">
                        <i class="fas fa-hdd"></i>
                        ${formatFileSize(review.size)}
                    </div>
                    <div class="stat">
                        <i class="fas fa-clock"></i>
                        ${formatDate(review.modified)}
                    </div>
                </div>
            </div>
        `).join('');
        
        reviewsList.innerHTML = html;
    } catch (error) {
        console.error('Error loading reviews:', error);
        reviewsList.innerHTML = '<div class="text-center text-muted">Errore caricamento recensioni</div>';
    }
}

// Show review in modal
async function showReview(filename, title, year) {
    try {
        const response = await fetch(`/api/reviews/${filename}`);
        const data = await response.json();
        
        document.getElementById('reviewTitle').textContent = `${title} (${year})`;
        document.getElementById('reviewContent').innerHTML = `<pre>${data.content}</pre>`;
        
        reviewModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error loading review:', error);
        alert('Errore caricamento recensione');
    }
}

// Close review modal
function closeReviewModal() {
    reviewModal.classList.add('hidden');
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        totalReviews.textContent = stats.totalReviews;
        totalSize.textContent = formatFileSize(stats.totalSize);
        
        if (stats.recentExtractions.length > 0) {
            const latest = stats.recentExtractions[0];
            lastUpdate.textContent = formatDate(latest.modified);
        } else {
            lastUpdate.textContent = 'Mai';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Oggi';
    if (diffDays === 2) return 'Ieri';
    if (diffDays <= 7) return `${diffDays} giorni fa`;
    
    return date.toLocaleDateString('it-IT');
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target === extractionModal) {
        // Don't allow closing extraction modal by clicking outside
    }
    if (e.target === reviewModal) {
        closeReviewModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (!reviewModal.classList.contains('hidden')) {
            closeReviewModal();
        }
    }
});