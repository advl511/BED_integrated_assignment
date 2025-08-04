// Matchmaking System Frontend
class MatchmakingSystem {
    constructor() {
        this.userId = this.getUserId();
        this.currentMatch = null;
        this.queueCheckInterval = null;
        this.matchCheckInterval = null;
        
        this.initializeElements();
        this.bindEvents();
        this.checkCurrentStatus();
    }

    // Get or generate user ID from localStorage
    getUserId() {
        let userId = localStorage.getItem('matchmaking_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('matchmaking_user_id', userId);
        }
        return userId;
    }

    // Initialize DOM elements
    initializeElements() {
        this.elements = {
            // Queue section
            playerName: document.getElementById('playerName'),
            skillLevel: document.getElementById('skillLevel'),
            joinQueueBtn: document.getElementById('joinQueueBtn'),
            leaveQueueBtn: document.getElementById('leaveQueueBtn'),
            queueSection: document.getElementById('queueSection'),
            queueStatus: document.getElementById('queueStatus'),
            queuePosition: document.getElementById('queuePosition'),
            totalInQueue: document.getElementById('totalInQueue'),
            joinedAt: document.getElementById('joinedAt'),

            // Match found section
            matchFoundSection: document.getElementById('matchFoundSection'),
            opponentName: document.getElementById('opponentName'),
            facilityName: document.getElementById('facilityName'),
            facilityAddress: document.getElementById('facilityAddress'),
            viewMapBtn: document.getElementById('viewMapBtn'),
            startVotingBtn: document.getElementById('startVotingBtn'),

            // Voting section
            votingSection: document.getElementById('votingSection'),
            voteForSelfBtn: document.getElementById('voteForSelfBtn'),
            voteForOpponentBtn: document.getElementById('voteForOpponentBtn'),
            votingStatus: document.getElementById('votingStatus'),

            // Match history
            matchHistorySection: document.getElementById('matchHistorySection'),
            matchesList: document.getElementById('matchesList'),
            loadHistoryBtn: document.getElementById('loadHistoryBtn'),

            // Map modal
            mapModal: document.getElementById('mapModal'),
            closeMapModal: document.getElementById('closeMapModal'),
            modalFacilityAddress: document.getElementById('modalFacilityAddress'),
            getDirectionsBtn: document.getElementById('getDirectionsBtn')
        };

        // Load saved player name
        const savedName = localStorage.getItem('player_name');
        if (savedName) {
            this.elements.playerName.value = savedName;
        }
    }

    // Bind event listeners
    bindEvents() {
        this.elements.joinQueueBtn.addEventListener('click', () => this.joinQueue());
        this.elements.leaveQueueBtn.addEventListener('click', () => this.leaveQueue());
        this.elements.startVotingBtn.addEventListener('click', () => this.startVoting());
        this.elements.voteForSelfBtn.addEventListener('click', () => this.voteForWinner(this.userId));
        this.elements.voteForOpponentBtn.addEventListener('click', () => this.voteForWinner(this.currentMatch?.opponent?.id));
        this.elements.loadHistoryBtn.addEventListener('click', () => this.loadMatchHistory());
        this.elements.viewMapBtn.addEventListener('click', () => this.showMap());
        this.elements.closeMapModal.addEventListener('click', () => this.hideMap());
        this.elements.getDirectionsBtn.addEventListener('click', () => this.getDirections());

        // Close modal when clicking outside
        this.elements.mapModal.addEventListener('click', (e) => {
            if (e.target === this.elements.mapModal) {
                this.hideMap();
            }
        });

        // Save player name on change
        this.elements.playerName.addEventListener('change', () => {
            localStorage.setItem('player_name', this.elements.playerName.value);
        });
    }

    // Check current status on page load
    async checkCurrentStatus() {
        try {
            // Check if user has an ongoing match
            const matchResponse = await fetch(`/api/matchmaking/current-match/${this.userId}`);
            const matchData = await matchResponse.json();

            if (matchData.success && matchData.hasMatch) {
                this.currentMatch = matchData.match;
                this.showMatchFound();
                this.startMatchPolling();
                return;
            }

            // Check if user is in queue
            const queueResponse = await fetch(`/api/matchmaking/status/${this.userId}`);
            const queueData = await queueResponse.json();

            if (queueData.success && queueData.inQueue) {
                this.showQueueStatus(queueData);
                this.startQueuePolling();
            }

        } catch (error) {
            console.error('Error checking current status:', error);
        }
    }

    // Join the matchmaking queue
    async joinQueue() {
        const playerName = this.elements.playerName.value.trim();
        const skillLevel = this.elements.skillLevel.value;

        if (!playerName) {
            alert('Please enter your name');
            return;
        }

        try {
            this.elements.joinQueueBtn.disabled = true;
            this.elements.joinQueueBtn.textContent = 'Joining...';

            const response = await fetch('/api/matchmaking/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId,
                    playerName: playerName,
                    skillLevel: skillLevel
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showQueueStatus({
                    inQueue: true,
                    queuePosition: data.queuePosition,
                    totalInQueue: data.queuePosition,
                    joinedAt: new Date().toISOString()
                });
                this.startQueuePolling();
            } else {
                alert(data.message || 'Failed to join queue');
                this.elements.joinQueueBtn.disabled = false;
                this.elements.joinQueueBtn.textContent = 'Join Queue';
            }

        } catch (error) {
            console.error('Error joining queue:', error);
            alert('Failed to join queue. Please try again.');
            this.elements.joinQueueBtn.disabled = false;
            this.elements.joinQueueBtn.textContent = 'Join Queue';
        }
    }

    // Leave the matchmaking queue
    async leaveQueue() {
        try {
            this.elements.leaveQueueBtn.disabled = true;
            this.elements.leaveQueueBtn.textContent = 'Leaving...';

            const response = await fetch('/api/matchmaking/leave', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: this.userId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.hideQueueStatus();
                this.stopQueuePolling();
            } else {
                alert(data.message || 'Failed to leave queue');
            }

        } catch (error) {
            console.error('Error leaving queue:', error);
            alert('Failed to leave queue. Please try again.');
        } finally {
            this.elements.leaveQueueBtn.disabled = false;
            this.elements.leaveQueueBtn.textContent = 'Leave Queue';
        }
    }

    // Start voting phase
    async startVoting() {
        if (!this.currentMatch) return;

        try {
            this.elements.startVotingBtn.disabled = true;
            this.elements.startVotingBtn.textContent = 'Starting Voting...';

            const response = await fetch('/api/matchmaking/start-voting', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gameId: this.currentMatch.gameId,
                    userId: this.userId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showVoting();
            } else {
                alert(data.message || 'Failed to start voting');
            }

        } catch (error) {
            console.error('Error starting voting:', error);
            alert('Failed to start voting. Please try again.');
        } finally {
            this.elements.startVotingBtn.disabled = false;
            this.elements.startVotingBtn.textContent = 'Finished Playing - Start Voting';
        }
    }

    // Vote for match winner
    async voteForWinner(winnerId) {
        if (!this.currentMatch || !winnerId) return;

        try {
            const response = await fetch('/api/matchmaking/vote', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    gameId: this.currentMatch.gameId,
                    userId: this.userId,
                    winnerId: winnerId
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showVotingStatus();
                // Continue polling to check if match is completed
                this.startMatchPolling();
            } else {
                alert(data.message || 'Failed to submit vote');
            }

        } catch (error) {
            console.error('Error voting:', error);
            alert('Failed to submit vote. Please try again.');
        }
    }

    // Load match history
    async loadMatchHistory() {
        try {
            this.elements.loadHistoryBtn.disabled = true;
            this.elements.loadHistoryBtn.textContent = 'Loading...';

            const response = await fetch(`/api/matchmaking/history/${this.userId}`);
            const data = await response.json();

            if (data.success) {
                this.displayMatchHistory(data.matches);
            } else {
                alert(data.message || 'Failed to load match history');
            }

        } catch (error) {
            console.error('Error loading match history:', error);
            alert('Failed to load match history. Please try again.');
        } finally {
            this.elements.loadHistoryBtn.disabled = false;
            this.elements.loadHistoryBtn.textContent = 'Load Match History';
        }
    }

    // Start polling for queue updates
    startQueuePolling() {
        this.stopQueuePolling(); // Clear any existing interval
        this.queueCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/matchmaking/status/${this.userId}`);
                const data = await response.json();

                if (data.success && data.inQueue) {
                    this.updateQueueStatus(data);
                } else {
                    // User is no longer in queue, check for match
                    this.stopQueuePolling();
                    this.checkForMatch();
                }
            } catch (error) {
                console.error('Error checking queue status:', error);
            }
        }, 2000); // Check every 2 seconds
    }

    // Stop queue polling
    stopQueuePolling() {
        if (this.queueCheckInterval) {
            clearInterval(this.queueCheckInterval);
            this.queueCheckInterval = null;
        }
    }

    // Start polling for match updates
    startMatchPolling() {
        this.stopMatchPolling(); // Clear any existing interval
        this.matchCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/matchmaking/current-match/${this.userId}`);
                const data = await response.json();

                if (data.success && data.hasMatch) {
                    this.currentMatch = data.match;
                    if (data.match.status === 'voting' && data.match.canVote && !data.match.hasVoted) {
                        this.showVoting();
                    }
                } else {
                    // Match completed, refresh page or show completion message
                    this.stopMatchPolling();
                    this.showMatchCompleted();
                }
            } catch (error) {
                console.error('Error checking match status:', error);
            }
        }, 3000); // Check every 3 seconds
    }

    // Stop match polling
    stopMatchPolling() {
        if (this.matchCheckInterval) {
            clearInterval(this.matchCheckInterval);
            this.matchCheckInterval = null;
        }
    }

    // Check for match after leaving queue
    async checkForMatch() {
        try {
            const response = await fetch(`/api/matchmaking/current-match/${this.userId}`);
            const data = await response.json();

            if (data.success && data.hasMatch) {
                this.currentMatch = data.match;
                this.showMatchFound();
                this.startMatchPolling();
            }
        } catch (error) {
            console.error('Error checking for match:', error);
        }
    }

    // UI Methods
    showQueueStatus(data) {
        this.elements.joinQueueBtn.style.display = 'none';
        this.elements.leaveQueueBtn.style.display = 'block';
        this.elements.queueStatus.style.display = 'block';
        this.updateQueueStatus(data);
    }

    updateQueueStatus(data) {
        this.elements.queuePosition.textContent = data.queuePosition || '-';
        this.elements.totalInQueue.textContent = data.totalInQueue || '-';
        this.elements.joinedAt.textContent = data.joinedAt ? 
            new Date(data.joinedAt).toLocaleTimeString() : '-';
    }

    hideQueueStatus() {
        this.elements.joinQueueBtn.style.display = 'block';
        this.elements.leaveQueueBtn.style.display = 'none';
        this.elements.queueStatus.style.display = 'none';
        this.elements.joinQueueBtn.disabled = false;
        this.elements.joinQueueBtn.textContent = 'Join Queue';
    }

    showMatchFound() {
        this.hideQueueStatus();
        this.elements.matchFoundSection.style.display = 'block';
        this.elements.votingSection.style.display = 'none';

        if (this.currentMatch) {
            this.elements.opponentName.textContent = this.currentMatch.opponent.name;
            this.elements.facilityName.textContent = this.currentMatch.facility.name;
            this.elements.facilityAddress.textContent = this.currentMatch.facility.address;
        }
    }

    showVoting() {
        this.elements.matchFoundSection.style.display = 'none';
        this.elements.votingSection.style.display = 'block';
        this.elements.votingStatus.style.display = 'none';
    }

    showVotingStatus() {
        this.elements.votingSection.style.display = 'block';
        this.elements.votingStatus.style.display = 'block';
        // Hide voting buttons
        document.querySelector('.voting-options').style.display = 'none';
    }

    showMatchCompleted() {
        this.elements.matchFoundSection.style.display = 'none';
        this.elements.votingSection.style.display = 'none';
        this.currentMatch = null;
        this.loadMatchHistory(); // Refresh match history
        alert('Match completed! Check your match history for results.');
    }

    displayMatchHistory(matches) {
        if (!matches || matches.length === 0) {
            this.elements.matchesList.innerHTML = '<p class="no-matches">No matches played yet</p>';
            return;
        }

        const matchesHtml = matches.map(match => `
            <div class="match-card">
                <div class="match-info">
                    <div class="match-opponent">vs ${match.opponent.name}</div>
                    <div class="match-facility">${match.facility.name}</div>
                    <div class="match-date">${new Date(match.completedAt).toLocaleDateString()}</div>
                </div>
                <div class="match-result match-${match.result}">${match.result.toUpperCase()}</div>
            </div>
        `).join('');

        this.elements.matchesList.innerHTML = matchesHtml;
    }

    showMap() {
        if (!this.currentMatch) return;
        
        this.elements.modalFacilityAddress.textContent = this.currentMatch.facility.address;
        this.elements.mapModal.style.display = 'flex';
        
        // Simple map placeholder - you can integrate with Google Maps API here
        const mapDiv = document.getElementById('facilityMap');
        mapDiv.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p><strong>${this.currentMatch.facility.name}</strong></p>
                <p>Latitude: ${this.currentMatch.facility.latitude}</p>
                <p>Longitude: ${this.currentMatch.facility.longitude}</p>
                <p style="margin-top: 15px; color: #666;">
                    Click "Get Directions" to open in your maps app
                </p>
            </div>
        `;
    }

    hideMap() {
        this.elements.mapModal.style.display = 'none';
    }

    getDirections() {
        if (!this.currentMatch) return;
        
        const { latitude, longitude } = this.currentMatch.facility;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        window.open(url, '_blank');
    }
}

// Initialize the matchmaking system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.matchmakingSystem = new MatchmakingSystem();
});
