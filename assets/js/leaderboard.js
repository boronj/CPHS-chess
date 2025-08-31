// Update Top 3 Podium
async function updateTop3Podium() {
    const podiumDiv = document.getElementById('podium-display');
    if (!podiumDiv) return;
    
    try {
        const topPlayers = await fetchTop3();
        
        if (topPlayers.length === 0) {
            podiumDiv.innerHTML = '<div style="text-align: center; color: #999;">No players yet</div>';
            return;
        }

        let podiumHTML = '';
        const isMobile = window.innerWidth <= 480;
        const displayOrder = isMobile ? [0, 1, 2] : [1, 0, 2];
        
        displayOrder.forEach((index) => {
            if (topPlayers[index]) {
                const player = topPlayers[index];
                const place = index + 1;
                podiumHTML += `
                    <div class="podium-place place-${place}">
                        <div class="podium-player">
                            <div class="podium-name">${player.name}</div>
                            <div class="podium-badges" style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 8px;">
                                ${getChampionBadge(player.name)}
                                ${getTournamentWinnerBadge(player.name)}
                            </div>
                            <div class="podium-points">${player.points} pts</div>
                        </div>
                        <div class="podium-block">
                            <div class="podium-number">${place}</div>
                        </div>
                    </div>
                `;
            }
        });
        
        podiumDiv.innerHTML = podiumHTML;
    } catch (error) {
        console.error('Failed to update top 3 podium:', error);
        podiumDiv.innerHTML = '<div style="text-align: center; color: #f56565;">Failed to load top players</div>';
    }
}

// Update leaderboard display
async function updateLeaderboard() {
    const container = document.getElementById('all-players-list');
    if (!container) return;
    
    try {
        const allPlayers = await fetchLeaderboard();
        
        container.innerHTML = '';
        
        if (allPlayers.length === 0) {
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">No players registered yet</div>';
            return;
        }
        
        allPlayers.forEach((player, index) => {
            const row = document.createElement('div');
            row.className = 'player-row';
            const playerNameEscaped = player.name.replace(/'/g, "\\'");
            const tierDisplay = player.tier.charAt(0).toUpperCase() + player.tier.slice(1);
            
            row.innerHTML = `
                <div class="player-info">
                    <div class="player-main-info">
                        <span class="player-rank">#${player.rank || index + 1}</span>
                        <span class="player-name" onclick="showPlayerStats(${player.id}, '${player.tier}')">${player.name}</span>
                    </div>
                    <div class="player-badges">
                        <span class="tier-badge tier-badge-${player.tier}">${tierDisplay}</span>
                        ${getChampionBadge(player.name)}
                        ${getTournamentWinnerBadge(player.name)}
                    </div>
                </div>
                <span class="player-points">${player.points} pts</span>
            `;
            container.appendChild(row);
        });
    } catch (error) {
        console.error('Failed to update leaderboard:', error);
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #f56565;">Failed to load leaderboard</div>';
    }
}

// Auto-refresh leaderboard periodically
let refreshInterval;

function startAutoRefresh() {
    // Refresh every 30 seconds
    refreshInterval = setInterval(async () => {
        try {
            await updateLeaderboard();
            await updateTop3Podium();
        } catch (error) {
            console.error('Auto-refresh failed:', error);
        }
    }, 30000);
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Initialize leaderboard page
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        await updateLeaderboard();
        await updateTop3Podium();
        
        // Start auto-refresh only if we're not in admin mode
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'index.html' || currentPage === '') {
            startAutoRefresh();
        }
    }, 100);
});

// Stop auto-refresh when leaving the page
window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});