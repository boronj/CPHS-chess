// Tournament Bracket Functions
async function generateBracket() {
    if (!checkAdminAccess()) return;
    
    const filter = document.getElementById('bracket-filter').value;
    let players = await fetchAdminPlayers();
    players = groupPlayersByTier(players);
    let participants = [];
    
    if (filter === 'all') {
        tierOrder.forEach(tier => {
            players[tier].forEach(player => {
                participants.push({ ...player, tier });
            });
        });
    } else {
        participants = players[filter].map(player => ({ ...player, tier: filter }));
    }
    
    if (participants.length < 2) {
        alert('Need at least 2 players to generate a tournament!');
        return;
    }
    
    // Shuffle participants randomly
    participants = shuffleArray(participants);
    
    // Ensure power of 2 for bracket (add byes if needed)
    const bracketSize = getNextPowerOfTwo(participants.length);
    while (participants.length < bracketSize) {
        participants.push({ name: 'BYE', points: 0, tier: 'bye', isBye: true });
    }
    
    currentTournament = {
        active: true,
        participants: participants,
        bracket: createBracketStructure(participants),
        winner: null,
        tierFilter: filter
    };
    
    displayBracket();
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getNextPowerOfTwo(n) {
    return Math.pow(2, Math.ceil(Math.log2(n)));
}

function createBracketStructure(participants) {
    const rounds = Math.log2(participants.length);
    const bracket = {};
    
    // Create first round
    bracket[`round1`] = [];
    for (let i = 0; i < participants.length; i += 2) {
        bracket[`round1`].push({
            player1: participants[i],
            player2: participants[i + 1],
            winner: null,
            completed: false,
            matchId: i / 2
        });
    }
    
    // Create subsequent rounds
    for (let round = 2; round <= rounds; round++) {
        bracket[`round${round}`] = [];
        const prevRoundMatches = bracket[`round${round - 1}`].length;
        for (let i = 0; i < prevRoundMatches / 2; i++) {
            bracket[`round${round}`].push({
                player1: null,
                player2: null,
                winner: null,
                completed: false,
                matchId: i
            });
        }
    }
    
    return bracket;
}

function displayBracket() {
    const display = document.getElementById('bracket-display');
    const completeSection = document.getElementById('tournament-complete-section');
    
    if (!display || !completeSection) return;
    
    if (!currentTournament.active) {
        display.innerHTML = '<div class="bracket-empty">Select players and click "Generate Random Bracket" to start a tournament!</div>';
        completeSection.innerHTML = '';
        return;
    }
    
    if (currentTournament.winner) {
        completeSection.innerHTML = `
            <div class="tournament-complete">
                <h2>🏆 Tournament Champion! 🏆</h2>
                <div class="winner-name">${currentTournament.winner.name}</div>
                <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 16px 0;">
                    ${getChampionBadge(currentTournament.winner.name)} 
                    ${getTournamentWinnerBadge(currentTournament.winner.name)}
                </div>
                <p>Congratulations on winning the ${currentTournament.tierFilter === 'all' ? 'All Players' : currentTournament.tierFilter.charAt(0).toUpperCase() + currentTournament.tierFilter.slice(1)} Tournament!</p>
            </div>
        `;
    } else {
        completeSection.innerHTML = '';
    }
    
    const rounds = Object.keys(currentTournament.bracket).length;
    
    // Fix round naming based on tournament size
    const roundNames = getRoundNames(rounds);
    
    let bracketHTML = '<div class="bracket-wrapper"><div class="bracket-grid">';
    
    for (let round = 1; round <= rounds; round++) {
        const roundKey = `round${round}`;
        const matches = currentTournament.bracket[roundKey];
        
        bracketHTML += `
            <div class="bracket-round">
                <div class="round-title">${roundNames[round] || `Round ${round}`}</div>
        `;
        
        matches.forEach((match, matchIndex) => {
            const matchId = `${roundKey}-${matchIndex}`;
            const isClickable = canAdvance(round, matchIndex);
            
            bracketHTML += `
                <div class="bracket-match ${match.completed ? 'completed' : ''}" ${isClickable ? `onclick="showMatchDialog('${matchId}')"` : ''}>
            `;
            
            // Player 1
            if (match.player1 && !match.player1.isBye) {
                const isWinner = match.winner?.name === match.player1.name;
                const isLoser = match.completed && !isWinner;
                bracketHTML += `
                    <div class="bracket-player ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">
                        <div class="player-bracket-info">
                            <div class="player-bracket-main">
                                <span class="bracket-seed">${getPlayerSeed(match.player1, round)}</span>
                                <span class="player-bracket-name">${match.player1.name}</span>
                            </div>
                            <div class="player-bracket-badges">
                                <span class="tier-badge tier-badge-${match.player1.tier}">${match.player1.tier.charAt(0).toUpperCase() + match.player1.tier.slice(1)}</span>
                                ${getChampionBadge(match.player1.name)}
                                ${getTournamentWinnerBadge(match.player1.name)}
                            </div>
                        </div>
                        <span>${match.player1.points} pts</span>
                    </div>
                `;
            } else if (match.player1?.isBye) {
                bracketHTML += '<div class="bracket-player"><em>BYE</em></div>';
            } else {
                bracketHTML += '<div class="bracket-player"><em>TBD</em></div>';
            }
            
            // Player 2
            if (match.player2 && !match.player2.isBye) {
                const isWinner = match.winner?.name === match.player2.name;
                const isLoser = match.completed && !isWinner;
                bracketHTML += `
                    <div class="bracket-player ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''}">
                        <div class="player-bracket-info">
                            <div class="player-bracket-main">
                                <span class="bracket-seed">${getPlayerSeed(match.player2, round)}</span>
                                <span class="player-bracket-name">${match.player2.name}</span>
                            </div>
                            <div class="player-bracket-badges">
                                <span class="tier-badge tier-badge-${match.player2.tier}">${match.player2.tier.charAt(0).toUpperCase() + match.player2.tier.slice(1)}</span>
                                ${getChampionBadge(match.player2.name)}
                                ${getTournamentWinnerBadge(match.player2.name)}
                            </div>
                        </div>
                        <span>${match.player2.points} pts</span>
                    </div>
                `;
            } else if (match.player2?.isBye) {
                bracketHTML += '<div class="bracket-player"><em>BYE</em></div>';
            } else {
                bracketHTML += '<div class="bracket-player"><em>TBD</em></div>';
            }
            
            bracketHTML += '</div>';
        });
        
        bracketHTML += '</div>';
    }
    
    bracketHTML += '</div></div>';
    display.innerHTML = bracketHTML;
}

// Helper function to get proper round names
function getRoundNames(totalRounds) {
    const names = {};
    
    if (totalRounds === 1) {
        names[1] = 'Final';
    } else if (totalRounds === 2) {
        names[1] = 'Semifinals';
        names[2] = 'Final';
    } else if (totalRounds === 3) {
        names[1] = 'Quarterfinals';
        names[2] = 'Semifinals';
        names[3] = 'Final';
    } else if (totalRounds === 4) {
        names[1] = 'First Round';
        names[2] = 'Quarterfinals';
        names[3] = 'Semifinals';
        names[4] = 'Final';
    } else if (totalRounds === 5) {
        names[1] = 'First Round';
        names[2] = 'Second Round';
        names[3] = 'Quarterfinals';
        names[4] = 'Semifinals';
        names[5] = 'Final';
    } else if (totalRounds === 6) {
        names[1] = 'First Round';
        names[2] = 'Second Round';
        names[3] = 'Third Round';
        names[4] = 'Quarterfinals';
        names[5] = 'Semifinals';
        names[6] = 'Final';
    } else {
        // For larger tournaments
        for (let i = 1; i <= totalRounds; i++) {
            if (i === totalRounds) {
                names[i] = 'Final';
            } else if (i === totalRounds - 1) {
                names[i] = 'Semifinals';
            } else if (i === totalRounds - 2) {
                names[i] = 'Quarterfinals';
            } else {
                names[i] = `Round ${i}`;
            }
        }
    }
    
    return names;
}

function getPlayerSeed(player, round) {
    if (!player || player.isBye) return '';
    const index = currentTournament.participants.findIndex(p => p.name === player.name);
    return index + 1;
}

function canAdvance(round, matchIndex) {
    const match = currentTournament.bracket[`round${round}`][matchIndex];
    if (match.completed) return false;
    
    // Check if both players are available
    if (round === 1) {
        return match.player1 && match.player2;
    } else {
        // Check if previous round matches are completed
        const prevRound = round - 1;
        const requiredMatches = [matchIndex * 2, matchIndex * 2 + 1];
        return requiredMatches.every(i => 
            currentTournament.bracket[`round${prevRound}`][i]?.completed
        );
    }
}

function showMatchDialog(matchId) {
    if (!checkAdminAccess()) return;
    
    const [roundKey, matchIndex] = matchId.split('-');
    const match = currentTournament.bracket[roundKey][parseInt(matchIndex)];
    
    if (match.player1?.isBye) {
        advanceWinner(matchId, match.player2);
        return;
    }
    if (match.player2?.isBye) {
        advanceWinner(matchId, match.player1);
        return;
    }
    
    const winner = prompt(`Who won this match?\n1: ${match.player1.name}\n2: ${match.player2.name}\n\nEnter 1 or 2:`);
    
    if (winner === '1') {
        advanceWinner(matchId, match.player1);
    } else if (winner === '2') {
        advanceWinner(matchId, match.player2);
    }
}

async function advanceWinner(matchId, winner) {
    const [roundKey, matchIndex] = matchId.split('-');
    const round = parseInt(roundKey.replace('round', ''));
    const match = currentTournament.bracket[roundKey][parseInt(matchIndex)];
    
    match.winner = winner;
    match.completed = true;
    
    // Advance to next round
    const totalRounds = Object.keys(currentTournament.bracket).length;
    if (round < totalRounds) {
        const nextRoundKey = `round${round + 1}`;
        const nextMatchIndex = Math.floor(parseInt(matchIndex) / 2);
        const nextMatch = currentTournament.bracket[nextRoundKey][nextMatchIndex];
        
        if (parseInt(matchIndex) % 2 === 0) {
            nextMatch.player1 = winner;
        } else {
            nextMatch.player2 = winner;
        }
    } else {
        // Tournament complete!
        currentTournament.winner = winner;
        if (!isTournamentWinner(winner.name)) { //This should probably be fixed to go by ID
            await updateTournamentWinnerAPI(winner.id, true);
        }
    }
    
    displayBracket();
}

function resetBracket() {
    if (!checkAdminAccess()) return;
    
    if (confirm('Are you sure you want to reset the current tournament?')) {
        currentTournament = {
            active: false,
            participants: [],
            bracket: {},
            winner: null,
            tierFilter: 'all'
        };
        displayBracket();
    }
}

// Override auth success function
function onAuthSuccess() {
    displayBracket();
}

// Initialize tournament page
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (isAuthenticated) {
            displayBracket();
        }
    }, 100);
});