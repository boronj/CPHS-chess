// Update Archives Display
async function updateArchivesDisplay() {
    const archivesContent = document.getElementById('archives-content');
    if (!archivesContent) return;
    
    try {
        const archives = await fetchArchives();
        
        if (archives.length === 0) {
            archivesContent.innerHTML = '<div class="no-archives">No archived data available yet</div>';
            return;
        }

        let archiveHTML = '';
        
        archives.forEach(archive => {
            const isMobile = window.innerWidth <= 480;
            const displayOrder = isMobile ? [
                { key: 'first', place: 1, name: archive.first_place_name, points: archive.first_place_points },
                { key: 'second', place: 2, name: archive.second_place_name, points: archive.second_place_points },
                { key: 'third', place: 3, name: archive.third_place_name, points: archive.third_place_points }
            ] : [
                { key: 'second', place: 2, name: archive.second_place_name, points: archive.second_place_points },
                { key: 'first', place: 1, name: archive.first_place_name, points: archive.first_place_points },
                { key: 'third', place: 3, name: archive.third_place_name, points: archive.third_place_points }
            ];
            
            archiveHTML += `
                <div class="archive-month-section">
                    <div class="archive-champions-header">${archive.archive_month} Champions</div>
                    <div class="podium archive-podium">
            `;
            
            displayOrder.forEach(({ place, name, points }) => {
                if (name && points !== undefined) {
                    archiveHTML += `
                        <div class="podium-place place-${place}">
                            <div class="podium-player">
                                <div class="podium-name">${name}</div>
                                <div class="podium-badges" style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; margin-top: 8px;">
                                    ${getChampionBadge(name)}
                                    ${getTournamentWinnerBadge(name)}
                                </div>
                                <div class="podium-points">${points} pts</div>
                            </div>
                            <div class="podium-block">
                                <div class="podium-number">${place}</div>
                            </div>
                        </div>
                    `;
                }
            });
            
            archiveHTML += `
                    </div>
                    <div class="archive-info" style="text-align: center; color: #94a3b8; font-size: 0.9em; margin-top: 16px;">
                        ${archive.total_players} players • ${archive.total_matches} matches • ${new Date(archive.archive_date).toLocaleDateString()}
                    </div>
                </div>
            `;
        });
        
        archivesContent.innerHTML = archiveHTML;
    } catch (error) {
        console.error('Failed to update archives display:', error);
        archivesContent.innerHTML = '<div style="text-align: center; color: #f56565; padding: 40px;">Failed to load archives</div>';
    }
}

// Initialize archives page
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(async () => {
        await updateArchivesDisplay();
    }, 100);
});