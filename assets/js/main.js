// Show player stats modal
async function showPlayerStats(playerId, tier = null) {
    try {
        const data = await fetchPlayerStats(playerId);
        const player = data.player;
        const matchHistory = data.matchHistory;
        
        document.getElementById('stats-player-name').textContent = player.name;
        const tierDisplay = player.tier.charAt(0).toUpperCase() + player.tier.slice(1);
        document.getElementById('stats-tier').innerHTML = `<span class="tier-badge tier-badge-${player.tier}">${tierDisplay}</span> ${getChampionBadge(player.name)} ${getTournamentWinnerBadge(player.name)}`;
        document.getElementById('stats-points').textContent = player.points + ' Points';

        document.getElementById('stat-wins').textContent = player.wins || 0;
        document.getElementById('stat-losses').textContent = player.losses || 0;
        document.getElementById('stat-winrate').textContent = (player.win_percentage || 0) + '%';

        const historyList = document.getElementById('match-history-list');
        if (matchHistory.length === 0) {
            historyList.innerHTML = '<div style="text-align: center; color: #999;">No matches played yet</div>';
        } else {
            historyList.innerHTML = '';
            matchHistory.slice(0, 10).forEach(match => {
                const matchDiv = document.createElement('div');
                matchDiv.className = `match-item match-${match.result}`;
                const opponentChampionBadge = getChampionBadge(match.opponent_name);
                const opponentTournamentBadge = getTournamentWinnerBadge(match.opponent_name);
                const opponentTier = match.opponent_tier || 'unknown';
                const opponentTierDisplay = opponentTier.charAt(0).toUpperCase() + opponentTier.slice(1);
                const matchDate = new Date(match.match_date).toLocaleDateString();
                
                matchDiv.innerHTML = `
                    <div>
                        <span class="match-opponent">vs ${match.opponent_name}</span>
                        ${opponentChampionBadge}
                        ${opponentTournamentBadge}
                        <span class="tier-badge tier-badge-${opponentTier}" style="margin-left: 8px; font-size: 0.7em; padding: 3px 8px;">${opponentTierDisplay}</span>
                        <small style="color: #666; margin-left: 10px;">${match.point_change > 0 ? '+' : ''}${match.point_change} pts</small>
                        <small style="color: #999; margin-left: 10px;">${matchDate}</small>
                    </div>
                    <span class="match-result">${match.result === 'win' ? 'Won' : 'Lost'}</span>
                `;
                historyList.appendChild(matchDiv);
            });
        }

        document.getElementById('stats-modal').classList.add('active');
    } catch (error) {
        console.error('Failed to show player stats:', error);
        showError('Failed to load player statistics');
    }
}

function closeStatsModal() {
    document.getElementById('stats-modal').classList.remove('active');
}

// Handle window resize for podium reordering
window.addEventListener('resize', () => {
    if (typeof updateTop3Podium === 'function') updateTop3Podium();
    if (typeof updateArchivesDisplay === 'function') updateArchivesDisplay();
});

// Initialize on load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize the app with database integration
        await initializeApp();
        
        // Close stats modal if clicked outside
        const statsModal = document.getElementById('stats-modal');
        if (statsModal) {
            statsModal.addEventListener('click', (e) => {
                if (e.target === statsModal) {
                    closeStatsModal();
                }
            });
        }
        
        // Add global error handling
        window.addEventListener('unhandledrejection', event => {
            console.error('Unhandled promise rejection:', event.reason);
            showError('An unexpected error occurred. Please refresh the page.');
        });
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
});