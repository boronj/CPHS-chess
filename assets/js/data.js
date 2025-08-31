// API Configuration
const API_BASE_URL = window.location.origin.includes('localhost') 
    ? 'http://localhost:3000/api' 
    : '/api';

// Authentication storage
let authToken = localStorage.getItem('chess_admin_token');

// In-memory cache for better performance
let playersCache = [];
let archivesCache = [];
let leaderboardCache = [];

// Tournament bracket storage (still client-side for real-time updates)
let currentTournament = {
    active: false,
    participants: [],
    bracket: {},
    winner: null,
    tierFilter: 'all'
};

// Tier ranges (unchanged)
const tierRanges = {
    bronze: { min: 0, max: 9 },
    silver: { min: 10, max: 19 },
    gold: { min: 20, max: 29 },
    platinum: { min: 30, max: 39 },
    diamond: { min: 40, max: 49 }
};

// Tier hierarchy
const tierOrder = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

// API Helper Functions
async function apiCall(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(error.message || error.error || 'API request failed');
    }
    
    return response.json();
}

// Data fetching functions
async function fetchLeaderboard() {
    try {
        const data = await apiCall('/leaderboard');
        leaderboardCache = data.players || [];
        return leaderboardCache;
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return leaderboardCache; // Return cached data on error
    }
}

async function fetchTop3() {
    try {
        const data = await apiCall('/leaderboard/top3');
        return data.top3 || [];
    } catch (error) {
        console.error('Failed to fetch top 3:', error);
        return [];
    }
}

async function fetchPlayerStats(playerId) {
    try {
        const data = await apiCall(`/player/${playerId}/stats`);
        return data;
    } catch (error) {
        console.error('Failed to fetch player stats:', error);
        throw error;
    }
}

async function fetchArchives() {
    try {
        const data = await apiCall('/archives');
        archivesCache = data.archives || [];
        return archivesCache;
    } catch (error) {
        console.error('Failed to fetch archives:', error);
        return archivesCache;
    }
}

async function fetchAdminPlayers() {
    try {
        const data = await apiCall('/admin/players');
        playersCache = data.players || [];
        return playersCache;
    } catch (error) {
        console.error('Failed to fetch admin players:', error);
        return playersCache;
    }
}

// Admin functions
async function addPlayerAPI(name, email, points) {
    try {
        const data = await apiCall('/admin/players', {
            method: 'POST',
            body: JSON.stringify({ name, email, points })
        });
        
        // Refresh cache
        await fetchAdminPlayers();
        await fetchLeaderboard();
        
        return data;
    } catch (error) {
        console.error('Failed to add player:', error);
        throw error;
    }
}

async function recordMatchAPI(winnerId, loserId, pointsExchanged = null) {
    try {
        // Calculate points based on tier difference if not provided
        if (!pointsExchanged) {
            const winner = playersCache.find(p => p.id == winnerId);
            const loser = playersCache.find(p => p.id == loserId);
            
            if (winner && loser) {
                const winnerTierIndex = tierOrder.indexOf(winner.tier);
                const loserTierIndex = tierOrder.indexOf(loser.tier);
                const tierDifference = loserTierIndex - winnerTierIndex;
                
                if (tierDifference >= 2) {
                    pointsExchanged = 3;
                } else if (tierDifference === 1) {
                    pointsExchanged = 2;
                } else {
                    pointsExchanged = 1;
                }
            } else {
                pointsExchanged = 1; // Default
            }
        }
        
        const data = await apiCall('/admin/matches', {
            method: 'POST',
            body: JSON.stringify({ 
                winnerId, 
                loserId, 
                pointsExchanged,
                matchType: 'casual'
            })
        });
        
        // Refresh caches
        await fetchAdminPlayers();
        await fetchLeaderboard();
        
        return data;
    } catch (error) {
        console.error('Failed to record match:', error);
        throw error;
    }
}

async function removePlayerAPI(playerId) {
    try {
        const data = await apiCall(`/admin/players/${playerId}`, {
            method: 'DELETE'
        });
        
        // Refresh caches
        await fetchAdminPlayers();
        await fetchLeaderboard();
        
        return data;
    } catch (error) {
        console.error('Failed to remove player:', error);
        throw error;
    }
}

async function addArchiveAPI(month, firstPlaceId, secondPlaceId, thirdPlaceId) {
    try {
        const data = await apiCall('/admin/archives', {
            method: 'POST',
            body: JSON.stringify({ 
                month, 
                firstPlaceId, 
                secondPlaceId, 
                thirdPlaceId,
                totalPlayers: playersCache.length,
                totalMatches: 0 // Could calculate this if needed
            })
        });
        
        // Refresh caches
        await fetchArchives();
        await fetchAdminPlayers();
        await fetchLeaderboard();
        
        return data;
    } catch (error) {
        console.error('Failed to add archive:', error);
        throw error;
    }
}

async function removeArchiveAPI(archiveId) {
    try {
        const data = await apiCall(`/admin/archives/${archiveId}`, {
            method: 'DELETE'
        });
        
        // Refresh caches
        await fetchArchives();
        await fetchAdminPlayers();
        await fetchLeaderboard();
        
        return data;
    } catch (error) {
        console.error('Failed to remove archive:', error);
        throw error;
    }
}

async function updateTournamentWinnerAPI(playerId, isTournamentWinner) {
    try {
        const data = await apiCall(`/admin/players/${playerId}/tournament-winner`, {
            method: 'PATCH',
            body: JSON.stringify({ isTournamentWinner })
        });
        
        // Refresh caches
        await fetchAdminPlayers();
        await fetchLeaderboard();
        
        return data;
    } catch (error) {
        console.error('Failed to update tournament winner:', error);
        throw error;
    }
}

// Initialize data loading
async function initializeData() {
    try {
        // Load initial data
        await Promise.all([
            fetchLeaderboard(),
            fetchArchives()
        ]);
        
        console.log('Data initialized successfully');
    } catch (error) {
        console.error('Failed to initialize data:', error);
        // Show user-friendly error message
        showError('Failed to load data. Please refresh the page.');
    }
}

// Get tier by points
function getTierByPoints(points) {
    if (points >= 40) return 'diamond';
    if (points >= 30) return 'platinum';
    if (points >= 20) return 'gold';
    if (points >= 10) return 'silver';
    return 'bronze';
}

// Get all players sorted by points (from cache)
function getAllPlayersSorted() {
    return [...leaderboardCache].sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.win_percentage - a.win_percentage;
    });
}

// Check if a player is a previous champion (from cache)
function isChampion(playerName) {
    return archivesCache.some(archive => 
        archive.first_place_name === playerName ||
        archive.second_place_name === playerName ||
        archive.third_place_name === playerName
    );
}

// Check if player is tournament winner (from database)
function isTournamentWinner(playerName) {
    const player = leaderboardCache.find(p => p.name === playerName);
    return player?.is_tournament_winner || false;
}

// Get champion badge HTML if player is a champion
function getChampionBadge(playerName) {
    return isChampion(playerName) ? '<span class="champion-badge">Champion</span>' : '';
}

// Get tournament winner badge HTML if player is a tournament winner
function getTournamentWinnerBadge(playerName) {
    return isTournamentWinner(playerName) ? '<span class="tournament-winner-badge">Tournament Winner</span>' : '';
}

// Show message utility
function showMessage(element, message, type) {
    if (!element) return;
    element.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(() => {
        element.innerHTML = '';
    }, 5000);
}

// Show error message
function showError(message) {
    // Create or find error display element
    let errorDiv = document.getElementById('global-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'global-error';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #f56565, #c53030);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            z-index: 9999;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(errorDiv);
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
    }, 5000);
}

// Set auth token
function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('chess_admin_token', token);
    } else {
        localStorage.removeItem('chess_admin_token');
    }
}

// Check if user is authenticated
function isAuthenticated() {
    return !!authToken;
}

// Logout helper
function clearAuth() {
    setAuthToken(null);
}

// Convert old-style players object to array format for compatibility
function convertPlayersToArray(playersObj) {
    const allPlayers = [];
    tierOrder.forEach(tier => {
        if (playersObj[tier]) {
            playersObj[tier].forEach(player => {
                allPlayers.push({ ...player, tier });
            });
        }
    });
    return allPlayers;
}

// Group players by tier (for compatibility with old code)
function groupPlayersByTier(playersArray) {
    const grouped = {
        bronze: [],
        silver: [],
        gold: [],
        platinum: [],
        diamond: []
    };
    
    playersArray.forEach(player => {
        if (grouped[player.tier]) {
            grouped[player.tier].push(player);
        }
    });
    
    return grouped;
}

// Initialize data when page loads
async function initializeApp() {
    try {
        // Check if we're running in development mode
        const isDevelopment = window.location.hostname === 'localhost';
        
        if (isDevelopment) {
            console.log('Development mode - checking API connection...');
            
            try {
                await apiCall('/health');
                console.log('API connection successful');
            } catch (error) {
                console.warn('API not available, using fallback mode');
                initializeFallbackData();
                return;
            }
        }
        
        await initializeData();
    } catch (error) {
        console.error('App initialization failed:', error);
        initializeFallbackData();
    }
}

// Fallback data for when API is not available (development/testing)
function initializeFallbackData() {
    console.log('Using fallback data...');
    
    // Create mock data in the new format
    leaderboardCache = [
        { id: 1, name: 'Magnus King', points: 45, tier: 'diamond', wins: 15, losses: 3, win_percentage: 83.33, is_champion: true, is_tournament_winner: true },
        { id: 2, name: 'Beth Queen', points: 42, tier: 'diamond', wins: 12, losses: 4, win_percentage: 75.00, is_champion: true, is_tournament_winner: false },
        { id: 3, name: 'Viktor Grand', points: 48, tier: 'diamond', wins: 18, losses: 2, win_percentage: 90.00, is_champion: true, is_tournament_winner: false },
        { id: 4, name: 'David Kim', points: 35, tier: 'platinum', wins: 22, losses: 8, win_percentage: 73.33, is_champion: true, is_tournament_winner: false },
        { id: 5, name: 'Anna Johnson', points: 38, tier: 'platinum', wins: 16, losses: 6, win_percentage: 72.73, is_champion: false, is_tournament_winner: false },
        { id: 6, name: 'Chris Wang', points: 31, tier: 'platinum', wins: 14, losses: 9, win_percentage: 60.87, is_champion: false, is_tournament_winner: false },
        { id: 7, name: 'James Smith', points: 25, tier: 'gold', wins: 20, losses: 12, win_percentage: 62.50, is_champion: false, is_tournament_winner: true },
        { id: 8, name: 'Lisa Taylor', points: 22, tier: 'gold', wins: 15, losses: 11, win_percentage: 57.69, is_champion: false, is_tournament_winner: false },
        { id: 9, name: 'Ryan Lee', points: 28, tier: 'gold', wins: 18, losses: 10, win_percentage: 64.29, is_champion: false, is_tournament_winner: false },
        { id: 10, name: 'Mike Davis', points: 12, tier: 'silver', wins: 12, losses: 15, win_percentage: 44.44, is_champion: false, is_tournament_winner: false },
        { id: 11, name: 'Emma Brown', points: 15, tier: 'silver', wins: 10, losses: 8, win_percentage: 55.56, is_champion: false, is_tournament_winner: false },
        { id: 12, name: 'Jack Miller', points: 18, tier: 'silver', wins: 14, losses: 12, win_percentage: 53.85, is_champion: false, is_tournament_winner: false },
        { id: 13, name: 'Alex Chen', points: 5, tier: 'bronze', wins: 5, losses: 12, win_percentage: 29.41, is_champion: false, is_tournament_winner: false },
        { id: 14, name: 'Sarah Jones', points: 3, tier: 'bronze', wins: 3, losses: 8, win_percentage: 27.27, is_champion: false, is_tournament_winner: false },
        { id: 15, name: 'Tom Wilson', points: 8, tier: 'bronze', wins: 6, losses: 9, win_percentage: 40.00, is_champion: false, is_tournament_winner: false }
    ];
    
    archivesCache = [
        {
            id: 1,
            archive_month: 'December 2024',
            first_place_name: 'Magnus King',
            first_place_points: 44,
            second_place_name: 'Beth Queen',
            second_place_points: 41,
            third_place_name: 'Viktor Grand',
            third_place_points: 47,
            total_players: 15,
            total_matches: 45
        },
        {
            id: 2,
            archive_month: 'November 2024',
            first_place_name: 'Viktor Grand',
            first_place_points: 46,
            second_place_name: 'David Kim',
            second_place_points: 34,
            third_place_name: 'Magnus King',
            third_place_points: 43,
            total_players: 14,
            total_matches: 38
        }
    ];
    
    playersCache = leaderboardCache;
}