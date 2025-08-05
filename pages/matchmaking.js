class Matchmaking {
    constructor() {
        this.checkInterval = null;
        this.userId = this.getUserId(); // Get from auth system
        this.initEventListeners();
        this.checkStatus();
    }

    initEventListeners() {
        document.getElementById('joinQueueBtn').addEventListener('click', () => this.joinQueue());
        document.getElementById('leaveQueueBtn').addEventListener('click', () => this.leaveQueue());
    }

    async joinQueue() {
        try {
            const response = await fetch('/api/matchmaking/join', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const result = await response.json();
            this.updateUI(result);
        } catch (error) {
            console.error('Error joining queue:', error);
        }
    }

    async leaveQueue() {
        try {
            await fetch('/api/matchmaking/leave', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            this.stopChecking();
            this.showView('notInQueue');
        } catch (error) {
            console.error('Error leaving queue:', error);
        }
    }

    async checkStatus() {
        try {
            const response = await fetch('/api/matchmaking/status', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const status = await response.json();
            this.updateUI(status);
        } catch (error) {
            console.error('Error checking status:', error);
        }
    }

    updateUI(status) {
        if (status.status === 'matched') {
            this.showView('matchFound');
            document.getElementById('opponentName').textContent = status.match.opponent;
            document.getElementById('matchId').textContent = status.match.MatchID;
            this.stopChecking();
        } else if (status.status === 'in_queue') {
            this.showView('inQueue');
            document.getElementById('queuePosition').textContent = status.position;
            document.getElementById('totalInQueue').textContent = status.total;
            if (!this.checkInterval) {
                this.startChecking();
            }
        } else {
            this.showView('notInQueue');
            this.stopChecking();
        }
    }

    showView(viewId) {
        ['notInQueue', 'inQueue', 'matchFound'].forEach(view => {
            document.getElementById(view).style.display = view === viewId ? 'block' : 'none';
        });
    }

    startChecking() {
        this.stopChecking();
        this.checkInterval = setInterval(() => this.checkStatus(), 3000);
    }

    stopChecking() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    getUserId() {
        // Implement based on your auth system
        return parseInt(localStorage.getItem('userId'));
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.matchmaking = new Matchmaking();
});