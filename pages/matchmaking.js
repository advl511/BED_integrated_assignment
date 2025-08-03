// Matchmaking functionality
class MatchmakingSystem {
    constructor() {
        this.queueCheckInterval = null;
        this.matchCheckInterval = null;
        this.currentQueueId = null;
        this.currentUserId = localStorage.getItem('user_id');
        
        // DOM Elements
        this.joinQueueBtn = document.getElementById('joinQueueBtn');
        this.leaveQueueBtn = document.getElementById('leaveQueueBtn');
        this.queueInfo = document.getElementById('queueInfo');
        this.playersList = document.getElementById('playersList');
        this.matchFoundSection = document.getElementById('matchFoundSection');
        this.teamsContainer = document.getElementById('teamsContainer');
        this.startGameBtn = document.getElementById('startGameBtn');
        this.recentMatchesList = document.getElementById('recentMatchesList');
        
        // Form elements
        this.queueName = document.getElementById('queueName');
        this.teamSize = document.getElementById('teamSize');
        this.maxTeams = document.getElementById('maxTeams');
        
        // Initialize
        this.initEventListeners();
        this.checkCurrentMatch();
        this.loadRecentMatches();
    }
    
    initEventListeners() {
        // Join queue button
        this.joinQueueBtn.addEventListener('click', () => this.joinQueue());
        
        // Leave queue button
        this.leaveQueueBtn.addEventListener('click', () => this.leaveQueue());
        
        // Start game button
        this.startGameBtn.addEventListener('click', () => this.startGame());
    }
    
    async joinQueue() {
        if (!this.currentUserId) {
            this.showError('Please log in to join the queue');
            return;
        }
        
        const queueData = {
            queueName: this.queueName.value,
            teamSize: parseInt(this.teamSize.value),
            maxTeams: parseInt(this.maxTeams.value)
        };
        
        try {
            const response = await fetch('/api/matchmaking/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(queueData)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to join queue');
            }
            
            this.currentQueueId = data.queueId;
            this.updateQueueUI(data);
            this.startQueueCheck();
            
            // Show leave button and hide join button
            this.joinQueueBtn.style.display = 'none';
            this.leaveQueueBtn.style.display = 'inline-block';
            
        } catch (error) {
            console.error('Error joining queue:', error);
            this.showError(error.message);
        }
    }
    
    async leaveQueue() {
        if (!this.currentQueueId) return;
        
        try {
            const response = await fetch(`/api/matchmaking/leave/${this.currentQueueId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to leave queue');
            }
            
            this.resetQueueUI();
            
        } catch (error) {
            console.error('Error leaving queue:', error);
            this.showError(error.message);
        }
    }
    
    async checkQueueStatus() {
        if (!this.currentQueueId) return;
        
        try {
            const response = await fetch(`/api/matchmaking/status/${this.currentQueueId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to check queue status');
            }
            
            const data = await response.json();
            this.updateQueueUI(data);
            
        } catch (error) {
            console.error('Error checking queue status:', error);
            this.stopQueueCheck();
        }
    }
    
    async checkCurrentMatch() {
        try {
            const response = await fetch('/api/matchmaking/current-match', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.status === 200) {
                const matchData = await response.json();
                this.showMatchFound(matchData);
            }
            
        } catch (error) {
            console.error('Error checking current match:', error);
        }
    }
    
    async loadRecentMatches() {
        try {
            const response = await fetch('/api/matchmaking/recent-matches', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.displayRecentMatches(data);
            }
            
        } catch (error) {
            console.error('Error loading recent matches:', error);
        }
    }
    
    startQueueCheck() {
        // Clear any existing interval
        this.stopQueueCheck();
        
        // Check immediately
        this.checkQueueStatus();
        
        // Then check every 5 seconds
        this.queueCheckInterval = setInterval(() => {
            this.checkQueueStatus();
        }, 5000);
    }
    
    stopQueueCheck() {
        if (this.queueCheckInterval) {
            clearInterval(this.queueCheckInterval);
            this.queueCheckInterval = null;
        }
    }
    
    updateQueueUI(data) {
        // Update queue info
        this.queueInfo.innerHTML = `
            <p><strong>Queue:</strong> ${data.queueName || 'Casual'}</p>
            <p><strong>Players in queue:</strong> ${data.totalPlayers || 0} / ${data.playersNeeded || 0}</p>
            <p><strong>Waiting for ${(data.playersNeeded || 0) - (data.totalPlayers || 0)} more players...</strong></p>
        `;
        
        // Update players list
        this.playersList.innerHTML = '';
        
        if (data.participants && data.participants.length > 0) {
            data.participants.forEach(player => {
                const playerElement = document.createElement('div');
                playerElement.className = 'player-card';
                playerElement.innerHTML = `
                    <img src="${player.profile_picture_url || 'images/default-avatar.png'}" 
                         alt="${player.username}" 
                         class="player-avatar">
                    <span>${player.username}</span>
                `;
                this.playersList.appendChild(playerElement);
            });
        } else {
            this.playersList.innerHTML = '<p>No players in queue yet.</p>';
        }
    }
    
    showMatchFound(matchData) {
        // Hide queue section
        document.querySelector('.queue-section').style.display = 'none';
        
        // Show match found section
        this.matchFoundSection.style.display = 'block';
        
        // Clear previous teams
        this.teamsContainer.innerHTML = '';
        
        // Add teams to the container
        Object.entries(matchData.teams || {}).forEach(([teamNumber, members]) => {
            const teamElement = document.createElement('div');
            teamElement.className = 'team';
            teamElement.innerHTML = `
                <h3>Team ${teamNumber}</h3>
                <div class="team-members">
                    ${members.map(member => `
                        <div class="team-member">
                            <img src="${member.profilePicture || 'images/default-avatar.png'}" 
                                 alt="${member.username}" 
                                 class="player-avatar">
                            <span>${member.username}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            this.teamsContainer.appendChild(teamElement);
        });
        
        // Store match ID for starting the game
        this.currentMatchId = matchData.matchId;
    }
    
    async startGame() {
        if (!this.currentMatchId) return;
        
        try {
            const response = await fetch(`/api/matchmaking/start-match/${this.currentMatchId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to start game');
            }
            
            // Redirect to game page or show game UI
            alert('Game is starting!');
            // window.location.href = `/game.html?matchId=${this.currentMatchId}`;
            
        } catch (error) {
            console.error('Error starting game:', error);
            this.showError(error.message);
        }
    }
    
    displayRecentMatches(matches) {
        if (!matches || matches.length === 0) {
            this.recentMatchesList.innerHTML = '<p>No recent matches found.</p>';
            return;
        }
        
        this.recentMatchesList.innerHTML = '';
        
        matches.forEach(match => {
            const matchElement = document.createElement('div');
            matchElement.className = 'match-card';
            
            // Determine match result for the current user
            let resultClass = '';
            let resultText = 'Draw';
            
            if (match.winnerTeamId !== null) {
                const isWinner = match.winnerTeamId === match.userTeamId;
                resultClass = isWinner ? 'match-won' : 'match-lost';
                resultText = isWinner ? 'Victory' : 'Defeat';
            } else {
                resultClass = 'match-draw';
            }
            
            matchElement.innerHTML = `
                <div class="match-teams">
                    <span>${match.team1Name} vs ${match.team2Name}</span>
                </div>
                <div class="match-result ${resultClass}">${resultText}</div>
                <div class="match-time">${new Date(match.endedAt).toLocaleString()}</div>
            `;
            
            this.recentMatchesList.appendChild(matchElement);
        });
    }
    
    resetQueueUI() {
        this.stopQueueCheck();
        this.currentQueueId = null;
        
        // Reset UI elements
        this.queueInfo.innerHTML = '<p>Not in queue. Select options and click "Join Queue".</p>';
        this.playersList.innerHTML = '';
        this.joinQueueBtn.style.display = 'inline-block';
        this.leaveQueueBtn.style.display = 'none';
    }
    
    showError(message) {
        // You can implement a more sophisticated error display
        alert(`Error: ${message}`);
    }
}

// Initialize the matchmaking system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.matchmakingSystem = new MatchmakingSystem();
});
