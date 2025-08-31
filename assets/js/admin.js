// Update tier display when points change
function updateTierDisplay() {
    const points = parseInt(document.getElementById('new-player-points').value) || 0;
    const tier = getTierByPoints(points);
    const assignedTierElement = document.getElementById('assigned-tier');
    if (assignedTierElement) {
        assignedTierElement.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    }
}

// Add new player
async function addPlayer() {
    const name = document.getElementById('new-player-name').value.trim();
    const email = document.getElementById('new-player-email')?.value.trim() || '';
    const points = parseInt(document.getElementById('new-player-points').value) || 0;
    const messageDiv = document.getElementById('add-message');
    
    if (!name) {
        showMessage(messageDiv, 'Please enter a player name', 'error');
        return;
    }
    
    if (points < 0 || points > 49) {
        showMessage(messageDiv, 'Points must be between 0 and 49', 'error');
        return;
    }
    
    try {
        const result = await addPlayerAPI(name, email, points);
        
        document.getElementById('new-player-name').value = '';
        if (document.getElementById('new-player-email')) {
            document.getElementById('new-player-email').value = '';
        }
        document.getElementById('new-player-points').value = '0';
        updateTierDisplay();
        
        showMessage(messageDiv, result.message, 'success');
        updateAdminSelects();
        updateRemoveList();
    } catch (error) {
        showMessage(messageDiv, error.message || 'Failed to add player', 'error');
    }
}

// Validate match selections to prevent same player
function validateMatchSelections() {
    const winnerSelect = document.getElementById('winner-select');
    const loserSelect = document.getElementById('loser-select');
    
    if (!winnerSelect || !loserSelect) return;
    
    // Reset all options to enabled
    Array.from(winnerSelect.options).forEach(option => {
        option.disabled = false;
    });
    Array.from(loserSelect.options).forEach(option => {
        option.disabled = false;
    });
    
    // Disable the selected winner in the loser dropdown
    if (winnerSelect.value) {
        Array.from(loserSelect.options).forEach(option => {
            if (option.value === winnerSelect.value) {
                option.disabled = true;
                if (loserSelect.value === winnerSelect.value) {
                    loserSelect.value = '';
                }
            }
        });
    }
    
    // Disable the selected loser in the winner dropdown
    if (loserSelect.value) {
        Array.from(winnerSelect.options).forEach(option => {
            if (option.value === loserSelect.value) {
                option.disabled = true;
                if (winnerSelect.value === loserSelect.value) {
                    winnerSelect.value = '';
                }
            }
        });
    }
}

// Record match result with win/loss banners
async function recordMatch() {
    const winnerData = document.getElementById('winner-select').value;
    const loserData = document.getElementById('loser-select').value;
    const messageDiv = document.getElementById('match-message');
    
    if (!winnerData || !loserData) {
        showMessage(messageDiv, 'Please select both winner and loser', 'error');
        return;
    }
    
    if (winnerData === loserData) {
        showMessage(messageDiv, 'Winner and loser cannot be the same player', 'error');
        return;
    }
    
    try {
        const result = await recordMatchAPI(parseInt(winnerData), parseInt(loserData));
        
        const winner = result.winner;
        const loser = result.loser;
        
        // Show rounded banners for win/loss results
        const winnerBanner = document.createElement('div');
        winnerBanner.className = 'result-banner win';
        const winnerTierDisplay = winner.tier.charAt(0).toUpperCase() + winner.tier.slice(1);
        winnerBanner.innerHTML = `
            <div class="result-title">🏆 Victory!</div>
            <div class="result-details">${winner.name} <span class="tier-badge tier-badge-${winner.tier}">${winnerTierDisplay}</span> ${getChampionBadge(winner.name)} ${getTournamentWinnerBadge(winner.name)} (now ${winner.points} pts)</div>
        `;
        
        const loserBanner = document.createElement('div');
        loserBanner.className = 'result-banner loss';
        const loserTierDisplay = loser.tier.charAt(0).toUpperCase() + loser.tier.slice(1);
        loserBanner.innerHTML = `
            <div class="result-title">Defeat</div>
            <div class="result-details">${loser.name} <span class="tier-badge tier-badge-${loser.tier}">${loserTierDisplay}</span> ${getChampionBadge(loser.name)} ${getTournamentWinnerBadge(loser.name)} (now ${loser.points} pts)</div>
        `;
        
        // Clear previous messages and add banners
        messageDiv.innerHTML = '';
        messageDiv.appendChild(winnerBanner);
        messageDiv.appendChild(loserBanner);
        
        // Clear the banners after 5 seconds
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
        
        // Reset form
        document.getElementById('winner-select').value = '';
        document.getElementById('loser-select').value = '';
        
        await updateAdminSelects();
        await updateRemoveList();
    } catch (error) {
        showMessage(messageDiv, error.message || 'Failed to record match', 'error');
    }
}

// Add archive entry
async function addArchiveEntry() {
    const month = document.getElementById('archive-month').value.trim();
    const firstSelect = document.getElementById('archive-first');
    const secondSelect = document.getElementById('archive-second');
    const thirdSelect = document.getElementById('archive-third');
    const messageDiv = document.getElementById('archive-message');
    
    if (!month) {
        showMessage(messageDiv, 'Please enter a month', 'error');
        return;
    }
    
    if (!firstSelect.value || !secondSelect.value || !thirdSelect.value) {
        showMessage(messageDiv, 'Please select all three winners', 'error');
        return;
    }
    
    // Check for duplicates
    const winners = [firstSelect.value, secondSelect.value, thirdSelect.value];
    if (new Set(winners).size !== winners.length) {
        showMessage(messageDiv, 'Winners must be different players', 'error');
        return;
    }
    
    try {
        const result = await addArchiveAPI(
            month, 
            parseInt(firstSelect.value), 
            parseInt(secondSelect.value), 
            parseInt(thirdSelect.value)
        );
        
        // Clear form
        document.getElementById('archive-month').value = '';
        firstSelect.value = '';
        secondSelect.value = '';
        thirdSelect.value = '';
        
        showMessage(messageDiv, result.message, 'success');
        await updateExistingArchives();
    } catch (error) {
        showMessage(messageDiv, error.message || 'Failed to add archive', 'error');
    }
}

// Remove archive entry
async function removeArchive(archiveId) {
    if (confirm(`Are you sure you want to remove this archive entry?`)) {
        try {
            const result = await removeArchiveAPI(archiveId);
            showMessage(document.getElementById('archive-message'), result.message, 'success');
            await updateExistingArchives();
        } catch (error) {
            showMessage(document.getElementById('archive-message'), error.message || 'Failed to remove archive', 'error');
        }
    }
}

// Update existing archives list
async function updateExistingArchives() {
    const existingArchives = document.getElementById('existing-archives');
    if (!existingArchives) return;
    
    try {
        const archives = await fetchArchives();
        
        if (archives.length === 0) {
            existingArchives.innerHTML = '<div style="text-align: center; color: #999;">No archives yet</div>';
            return;
        }

        existingArchives.innerHTML = '';
        archives.forEach(archive => {
            const item = document.createElement('div');
            item.className = 'player-item';
            item.innerHTML = `
                <span>${archive.archive_month}: 1st: ${archive.first_place_name}, 2nd: ${archive.second_place_name}, 3rd: ${archive.third_place_name}</span>
                <button class="remove-btn" onclick="removeArchive(${archive.id})">Remove</button>
            `;
            existingArchives.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to update existing archives:', error);
        existingArchives.innerHTML = '<div style="text-align: center; color: #f56565;">Failed to load archives</div>';
    }
}

// Update tournament winners display
function updateTournamentWinnersDisplay() {
    const display = document.getElementById('tournament-winners-display');
    if (!display) return;
    
    const tournamentWinners = playersCache.filter(p => p.is_tournament_winner);
    
    if (tournamentWinners.length === 0) {
        display.innerHTML = '<div style="text-align: center; color: #999; padding: 10px;">No tournament winners yet</div>';
        return;
    }

    display.innerHTML = '';
    tournamentWinners.forEach(winner => {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
            <span>${winner.name} <span class="tournament-winner-badge">Tournament Winner</span></span>
            <button class="remove-btn" onclick="removeTournamentWinner(${winner.id})">Remove Badge</button>
        `;
        display.appendChild(item);
    });
}

// Remove individual tournament winner
async function removeTournamentWinner(playerId) {
    const player = playersCache.find(p => p.id === playerId);
    if (confirm(`Remove tournament winner badge from ${player?.name || 'this player'}?`)) {
        try {
            const result = await updateTournamentWinnerAPI(playerId, false);
            updateTournamentWinnersDisplay();
            showMessage(document.getElementById('badge-message'), result.message, 'success');
        } catch (error) {
            showMessage(document.getElementById('badge-message'), error.message || 'Failed to remove tournament winner badge', 'error');
        }
    }
}

// Clear all tournament winners
async function clearAllTournamentWinners() {
    if (confirm('Are you sure you want to remove ALL tournament winner badges? This cannot be undone.')) {
        try {
            const tournamentWinners = playersCache.filter(p => p.is_tournament_winner);
            
            for (const winner of tournamentWinners) {
                await updateTournamentWinnerAPI(winner.id, false);
            }
            
            await fetchAdminPlayers(); // Refresh cache
            updateTournamentWinnersDisplay();
            showMessage(document.getElementById('badge-message'), 'All tournament winner badges cleared!', 'success');
        } catch (error) {
            showMessage(document.getElementById('badge-message'), error.message || 'Failed to clear tournament winners', 'error');
        }
    }
}

// Remove player
async function removePlayer(playerId) {
    const player = playersCache.find(p => p.id === playerId);
    if (confirm(`Are you sure you want to remove ${player?.name || 'this player'}?`)) {
        try {
            const result = await removePlayerAPI(playerId);
            showMessage(document.getElementById('add-message'), result.message, 'success');
            await updateAdminSelects();
            await updateRemoveList();
        } catch (error) {
            showMessage(document.getElementById('add-message'), error.message || 'Failed to remove player', 'error');
        }
    }
}

// Update admin select dropdowns
async function updateAdminSelects() {
    const selects = ['winner-select', 'loser-select', 'archive-first', 'archive-second', 'archive-third'];
    
    try {
        const players = await fetchAdminPlayers();
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (!select) return;
            
            const isArchive = selectId.includes('archive');
            select.innerHTML = `<option value="">Select ${isArchive ? 'player' : selectId.includes('winner') ? 'winner' : 'loser'}...</option>`;
            
            players.forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                const championIndicator = player.is_champion ? ' 💎' : '';
                const tournamentIndicator = player.is_tournament_winner ? ' 🏆' : '';
                const tierDisplay = player.tier.charAt(0).toUpperCase() + player.tier.slice(1);
                option.textContent = `${player.name}${championIndicator}${tournamentIndicator} (${tierDisplay} - ${player.points}pts)`;
                select.appendChild(option);
            });
        });
        
        // Set up change event listeners for validation
        const winnerSelect = document.getElementById('winner-select');
        const loserSelect = document.getElementById('loser-select');
        
        if (winnerSelect && loserSelect) {
            winnerSelect.addEventListener('change', validateMatchSelections);
            loserSelect.addEventListener('change', validateMatchSelections);
        }
        
        validateMatchSelections();
    } catch (error) {
        console.error('Failed to update admin selects:', error);
    }
}

// Update remove player list
async function updateRemoveList() {
    const listDiv = document.getElementById('remove-player-list');
    if (!listDiv) return;
    
    try {
        const players = await fetchAdminPlayers();
        
        listDiv.innerHTML = '';
        
        if (players.length === 0) {
            listDiv.innerHTML = '<div style="padding: 10px; color: #999;">No players to remove</div>';
            return;
        }
        
        players.forEach(player => {
            const item = document.createElement('div');
            item.className = 'player-item';
            const championBadge = getChampionBadge(player.name);
            const tournamentBadge = getTournamentWinnerBadge(player.name);
            const tierDisplay = player.tier.charAt(0).toUpperCase() + player.tier.slice(1);
            
            item.innerHTML = `
                <span>${player.name} ${championBadge} ${tournamentBadge} (${tierDisplay} - ${player.points}pts)</span>
                <button class="remove-btn" onclick="removePlayer(${player.id})">Remove</button>
            `;
            listDiv.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to update remove list:', error);
        listDiv.innerHTML = '<div style="padding: 10px; color: #f56565;">Failed to load players</div>';
    }
}

// Set up event listeners
function setupAdminEventListeners() {
    // Player points input
    const pointsInput = document.getElementById('new-player-points');
    if (pointsInput) {
        pointsInput.addEventListener('change', updateTierDisplay);
        pointsInput.addEventListener('input', updateTierDisplay);
    }
    
    // Add player button
    const addPlayerBtn = document.getElementById('add-player-btn');
    if (addPlayerBtn) {
        addPlayerBtn.addEventListener('click', addPlayer);
    }
    
    // Record match button
    const recordMatchBtn = document.getElementById('record-match-btn');
    if (recordMatchBtn) {
        recordMatchBtn.addEventListener('click', recordMatch);
    }
    
    // Add archive button
    const addArchiveBtn = document.getElementById('add-archive-btn');
    if (addArchiveBtn) {
        addArchiveBtn.addEventListener('click', addArchiveEntry);
    }
    
    // Clear tournament winners button
    const clearTournamentBtn = document.getElementById('clear-tournament-winners-btn');
    if (clearTournamentBtn) {
        clearTournamentBtn.addEventListener('click', clearAllTournamentWinners);
    }
    
    // Logout button
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Override auth success function for admin page
async function onAuthSuccess() {
    const adminContent = document.getElementById('admin-content');
    if (adminContent) {
        adminContent.style.display = 'block';
    }
    
    try {
        await updateAdminSelects();
        await updateRemoveList();
        await updateExistingArchives();
        updateTournamentWinnersDisplay();
        updateTierDisplay();
    } catch (error) {
        console.error('Failed to load admin data:', error);
        showError('Failed to load admin data');
    }
}

// Initialize admin page
window.addEventListener('DOMContentLoaded', () => {
    setupAdminEventListeners();
    
    setTimeout(async () => {
        if (isAuthenticated()) {
            await onAuthSuccess();
        }
    }, 100);
});