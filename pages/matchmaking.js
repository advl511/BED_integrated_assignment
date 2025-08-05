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
        this.startQueueCountPolling();
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
            queueCount: document.getElementById('queueCount'),
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
            // Update queue count first
            await this.updateQueueCount();

            // Check if user has an ongoing match
            const matchResponse = await fetch(`/api/matchmaking/current-match/${this.userId}`);
            const matchData = await matchResponse.json();

            if (matchData.success && matchData.hasMatch) {
                this.currentMatch = matchData.match;
                if (this.currentMatch.status === 'voting' && this.currentMatch.canVote) {
                    this.showVoting();
                } else if (this.currentMatch.status === 'voting' && this.currentMatch.hasVoted) {
                    this.showVotingStatus();
                } else {
                    this.showMatchFound();
                }
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
        if (!this.userId) {
            alert('Please log in to join the queue');
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
                    playerName: `Player_${this.userId.slice(0, 5)}`,
                    skillLevel: 'intermediate'
                })
            });

            const data = await response.json();

            if (data.success) {
                if (data.hasMatch) {
                    // We got matched immediately
                    this.currentMatch = data.match;
                    this.showMatchFound();
                    this.startMatchPolling();
                } else {
                    // Added to queue, show queue status
                    this.showQueueStatus(data);
                    this.startQueuePolling();
                }
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
            // Disable voting buttons to prevent multiple votes
            const buttons = document.querySelectorAll('.vote-btn');
            buttons.forEach(btn => btn.disabled = true);

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
                // Update UI based on voting status
                if (data.bothVoted) {
                    // Both players have voted, show final result
                    this.showMatchResult(data);
                } else {
                    // Only current player has voted, show waiting message
                    this.showVotingStatus('Waiting for opponent to vote...');
                }
                
                // Continue polling to check if match is completed
                this.startMatchPolling();
            } else {
                alert(data.message || 'Failed to submit vote');
                // Re-enable buttons on error
                buttons.forEach(btn => btn.disabled = false);
            }

        } catch (error) {
            console.error('Error voting:', error);
            alert('Failed to submit vote. Please try again.');
            // Re-enable buttons on error
            const buttons = document.querySelectorAll('.vote-btn');
            buttons.forEach(btn => btn.disabled = false);
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
                    
                    // Update UI based on match status
                    if (data.match.status === 'voting') {
                        if (data.match.canVote && !data.match.hasVoted) {
                            this.showVoting();
                        } else if (data.match.hasVoted) {
                            this.showVotingStatus('Waiting for opponent to vote...');
                        }
                    }
                } else {
                    // Match completed, show final result
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

    // Start polling for queue count updates
    startQueueCountPolling() {
        this.stopQueueCountPolling(); // Clear any existing interval
        this.queueCountInterval = setInterval(async () => {
            await this.updateQueueCount();
        }, 3000); // Update every 3 seconds
    }

    // Stop queue count polling
    stopQueueCountPolling() {
        if (this.queueCountInterval) {
            clearInterval(this.queueCountInterval);
            this.queueCountInterval = null;
        }
    }

    // Update queue count display
    async updateQueueCount() {
        try {
            // Get total number of players in queue by making a request to get queue status
            // We'll use a dummy user ID to get general queue info
            const response = await fetch('/api/matchmaking/queue-count');
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.elements.queueCount.textContent = data.count || 0;
                }
            } else {
                // Fallback: try to get queue info from status endpoint
                const statusResponse = await fetch(`/api/matchmaking/status/${this.userId}`);
                const statusData = await statusResponse.json();
                if (statusData.success && statusData.totalInQueue !== undefined) {
                    this.elements.queueCount.textContent = statusData.totalInQueue;
                }
            }
        } catch (error) {
            console.error('Error updating queue count:', error);
            // Don't show error to user, just keep the current count
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

    showVotingStatus(message = 'Waiting for opponent to vote...') {
        this.elements.votingSection.style.display = 'block';
        this.elements.votingStatus.style.display = 'block';
        this.elements.votingStatus.textContent = message;
        
        // Hide voting buttons if they exist
        const votingOptions = document.querySelector('.voting-options');
        if (votingOptions) votingOptions.style.display = 'none';
    }

    // Show match result after both players have voted
    showMatchResult(data) {
        const votingSection = document.getElementById('votingSection');
        if (!votingSection) return;

        const isWinner = data.winnerId === this.userId;
        const resultMessage = data.isDraw 
            ? 'The match ended in a draw! 🏆' 
            : isWinner 
                ? 'Congratulations! You won the match! 🎉' 
                : 'Match completed. Better luck next time! 👏';

        votingSection.innerHTML = `
            <div class="match-result text-center p-4">
                <h3 class="mb-3">${resultMessage}</h3>
                <p class="mb-2">Match ID: ${this.currentMatch.gameId}</p>
                <p class="mb-4">Played at: ${new Date().toLocaleString()}</p>
                <button id="backToQueue" class="btn btn-primary">Back to Queue</button>
            </div>
        `;

        // Add event listener for back to queue button
        const backButton = document.getElementById('backToQueue');
        if (backButton) {
            backButton.addEventListener('click', () => {
                this.resetUI();
                this.joinQueue();
            });
        }
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
