const { ipcRenderer } = require('electron');

// Global data
let tournaments = [];
let players = [];
let venues = [];
let matches = [];
let currentMatchId = null;
let dataSyncInterval = null;

// Admin credentials
const ADMIN_ID = 'raj';
const ADMIN_PASSWORD = '0000';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initLogin();
  initNavigation();
  initForms();
  updateCurrentTime();
  setInterval(updateCurrentTime, 1000);
  
  // Start auto-sync for data changes
  startDataSync();
});

// Auto-sync functionality for real-time data updates
function startDataSync() {
  if (dataSyncInterval) {
    clearInterval(dataSyncInterval);
  }
  
  // Sync data every 2 seconds
  dataSyncInterval = setInterval(async () => {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
      await syncDataChanges();
    }
  }, 2000);
}

function stopDataSync() {
  if (dataSyncInterval) {
    clearInterval(dataSyncInterval);
    dataSyncInterval = null;
  }
}

async function syncDataChanges() {
  try {
    // Get current data from backend
    const backendTournaments = await ipcRenderer.invoke('get-tournaments');
    const backendPlayers = await ipcRenderer.invoke('get-players');
    const backendVenues = await ipcRenderer.invoke('get-venues');
    const backendMatches = await ipcRenderer.invoke('get-matches');
    
    // Check for changes and merge
    const changes = {
      tournaments: detectChanges(tournaments, backendTournaments),
      players: detectChanges(players, backendPlayers),
      venues: detectChanges(venues, backendVenues),
      matches: detectChanges(matches, backendMatches)
    };
    
    // Apply changes if any detected
    if (changes.tournaments.hasChanges) {
      tournaments = backendTournaments;
      if (document.getElementById('tournaments-section').classList.contains('active')) {
        loadTournaments();
        showNotification('Tournament data updated', 'success');
      }
    }
    
    if (changes.players.hasChanges) {
      players = backendPlayers;
      if (document.getElementById('players-section').classList.contains('active')) {
        loadPlayers();
        showNotification('Player data updated', 'success');
      }
    }
    
    if (changes.venues.hasChanges) {
      venues = backendVenues;
      if (document.getElementById('venues-section').classList.contains('active')) {
        loadVenues();
        showNotification('Venue data updated', 'success');
      }
    }
    
    if (changes.matches.hasChanges) {
      matches = backendMatches;
      if (document.getElementById('matches-section').classList.contains('active')) {
        loadMatches();
        showNotification('Match data updated', 'success');
      }
    }
    
    // Update dashboard if active
    if (document.getElementById('dashboard-section').classList.contains('active')) {
      loadDashboard();
    }
    
  } catch (error) {
    console.warn('Sync error:', error);
  }
}

function detectChanges(currentData, backendData) {
  const currentMap = new Map(currentData.map(item => [item.id, item]));
  const backendMap = new Map(backendData.map(item => [item.id, item]));
  
  let hasChanges = false;
  let added = [];
  let updated = [];
  let deleted = [];
  
  // Check for deleted items
  for (const [id, item] of currentMap) {
    if (!backendMap.has(id)) {
      deleted.push(id);
      hasChanges = true;
    } else {
      // Check for updates
      const backendItem = backendMap.get(id);
      if (JSON.stringify(item) !== JSON.stringify(backendItem)) {
        updated.push(backendItem);
        hasChanges = true;
      }
    }
  }
  
  // Check for added items
  for (const [id, item] of backendMap) {
    if (!currentMap.has(id)) {
      added.push(item);
      hasChanges = true;
    }
  }
  
  return {
    hasChanges,
    added,
    updated,
    deleted
  };
}

function showNotification(message, type = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Add to notification container
  const container = document.getElementById('notifications');
  container.appendChild(notification);
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      container.removeChild(notification);
    }, 300);
  }, 3000);
}

// Login functionality
function initLogin() {
  const loginForm = document.getElementById('login-form');
  const loginError = document.getElementById('login-error');
  
  // Check if already logged in
  const isLoggedIn = sessionStorage.getItem('isLoggedIn');
  if (isLoggedIn === 'true') {
    showApp();
  }
  
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('login-id').value.trim();
    const password = document.getElementById('login-password').value;
    
    if (userId === ADMIN_ID && password === ADMIN_PASSWORD) {
      // Successful login
      sessionStorage.setItem('isLoggedIn', 'true');
      loginError.classList.add('hidden');
      showApp();
    } else {
      // Failed login
      loginError.classList.remove('hidden');
      document.getElementById('login-password').value = '';
      document.getElementById('login-password').focus();
    }
  });
}

function showApp() {
  document.getElementById('login-page').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  loadDashboard();
}

function logout() {
  sessionStorage.removeItem('isLoggedIn');
  document.getElementById('login-page').classList.remove('hidden');
  document.getElementById('app-container').classList.add('hidden');
  document.getElementById('login-form').reset();
  document.getElementById('login-error').classList.add('hidden');
}

// Navigation
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      showSection(section);
    });
  });
}

function showSection(sectionName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.dataset.section === sectionName) {
      item.classList.add('active');
    }
  });

  // Update sections
  document.querySelectorAll('.section').forEach(section => {
    section.classList.remove('active');
  });
  document.getElementById(`${sectionName}-section`).classList.add('active');

  // Load section data
  switch (sectionName) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'tournaments':
      loadTournaments();
      break;
    case 'matches':
      loadMatches();
      break;
    case 'players':
      loadPlayers();
      break;
    case 'venues':
      loadVenues();
      break;
  }
}

// Update current time
function updateCurrentTime() {
  const now = new Date();
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  document.getElementById('current-time').textContent = now.toLocaleDateString('en-US', options);
}

// Dashboard
async function loadDashboard() {
  try {
    const stats = await ipcRenderer.invoke('get-dashboard-stats');
    document.getElementById('total-tournaments').textContent = stats.totalTournaments;
    document.getElementById('total-players').textContent = stats.totalPlayers;
    document.getElementById('active-matches').textContent = stats.activeMatches;
    document.getElementById('total-venues').textContent = stats.totalVenues;

    // Load live matches
    const allMatches = await ipcRenderer.invoke('get-matches');
    const liveMatches = allMatches.filter(m => m.status === 'live');
    const liveMatchesList = document.getElementById('live-matches-list');
    
    if (liveMatches.length > 0) {
      liveMatchesList.innerHTML = liveMatches.slice(0, 5).map(match => `
        <div class="live-match-item">
          <span class="live-match-teams">${match.team1} vs ${match.team2}</span>
          <span class="live-match-score">${match.scoreTeam1} - ${match.scoreTeam2}</span>
        </div>
      `).join('');
    } else {
      liveMatchesList.innerHTML = '<p class="empty-state">No live matches at the moment</p>';
    }

    // Load upcoming tournaments
    const allTournaments = await ipcRenderer.invoke('get-tournaments');
    const upcomingTournaments = allTournaments
      .filter(t => new Date(t.startDate) >= new Date())
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5);
    
    const upcomingList = document.getElementById('upcoming-tournaments-list');
    if (upcomingTournaments.length > 0) {
      upcomingList.innerHTML = upcomingTournaments.map(t => `
        <div class="upcoming-tournament-item">
          <div class="upcoming-tournament-name">${t.name}</div>
          <div class="upcoming-tournament-date">
            <span class="material-symbols-outlined" style="font-size: 14px;">calendar_month</span> ${formatDate(t.startDate)} at ${t.startTime || 'TBD'}
          </div>
        </div>
      `).join('');
    } else {
      upcomingList.innerHTML = '<p class="empty-state">No upcoming tournaments</p>';
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// Tournaments
async function loadTournaments() {
  try {
    tournaments = await ipcRenderer.invoke('get-tournaments');
    const container = document.getElementById('tournaments-list');
    
    if (tournaments.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">emoji_events</span>
          <p>No tournaments yet. Create your first tournament!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = tournaments.map(tournament => `
      <div class="tournament-card">
        <div class="card-title">
          <span class="material-symbols-outlined">emoji_events</span>
          ${tournament.name}
        </div>
        <span class="sport-badge ${tournament.sport}">${tournament.sport}</span>
        <div class="card-info">
          <div class="card-info-item">
            <span class="material-symbols-outlined">calendar_month</span>
            <span>${formatDate(tournament.startDate)} - ${formatDate(tournament.endDate)}</span>
          </div>
          <div class="card-info-item">
            <span class="material-symbols-outlined">schedule</span>
            <span>${tournament.startTime || 'TBD'} - ${tournament.endTime || 'TBD'}</span>
          </div>
          <div class="card-info-item">
            <span class="material-symbols-outlined">location_on</span>
            <span>${getVenueName(tournament.venueId) || 'No venue assigned'}</span>
          </div>
          <div class="card-info-item">
            <span class="material-symbols-outlined">groups</span>
            <span>${(tournament.participants || []).length} / ${tournament.maxParticipants} participants</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-secondary" onclick="viewTournament('${tournament.id}')">
            <span class="material-symbols-outlined">visibility</span> View
          </button>
          <button class="btn btn-sm btn-primary" onclick="openRegisterTournamentModal('${tournament.id}')">
            <span class="material-symbols-outlined">person_add</span> Register
          </button>
          <button class="btn btn-sm btn-secondary" onclick="editTournament('${tournament.id}')">
            <span class="material-symbols-outlined">edit</span> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteTournament('${tournament.id}')">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading tournaments:', error);
  }
}

function openTournamentModal(tournament = null) {
  const modal = document.getElementById('tournament-modal');
  const title = document.getElementById('tournament-modal-title');
  const form = document.getElementById('tournament-form');
  
  // Load venues into dropdown
  loadVenueDropdown('tournament-venue');
  
  if (tournament) {
    title.textContent = 'Edit Tournament';
    document.getElementById('tournament-id').value = tournament.id;
    document.getElementById('tournament-name').value = tournament.name;
    document.getElementById('tournament-sport').value = tournament.sport;
    document.getElementById('tournament-max-participants').value = tournament.maxParticipants;
    document.getElementById('tournament-start-date').value = tournament.startDate;
    document.getElementById('tournament-end-date').value = tournament.endDate;
    document.getElementById('tournament-start-time').value = tournament.startTime || '';
    document.getElementById('tournament-end-time').value = tournament.endTime || '';
    document.getElementById('tournament-venue').value = tournament.venueId || '';
    document.getElementById('tournament-description').value = tournament.description || '';
    document.getElementById('tournament-rules').value = tournament.rules || '';
  } else {
    title.textContent = 'Create Tournament';
    form.reset();
    document.getElementById('tournament-id').value = '';
  }
  
  modal.classList.add('active');
}

function closeTournamentModal() {
  document.getElementById('tournament-modal').classList.remove('active');
}

async function editTournament(id) {
  const tournament = tournaments.find(t => t.id === id);
  if (tournament) {
    openTournamentModal(tournament);
  }
}

async function deleteTournament(id) {
  if (confirm('Are you sure you want to delete this tournament?')) {
    await ipcRenderer.invoke('delete-tournament', id);
    loadTournaments();
  }
}

async function viewTournament(id) {
  const tournament = tournaments.find(t => t.id === id);
  if (!tournament) return;

  const allPlayers = await ipcRenderer.invoke('get-players');
  const participants = (tournament.participants || []).map(pId => {
    const player = allPlayers.find(p => p.id === pId);
    return player ? `${player.firstName} ${player.lastName}` : 'Unknown';
  });

  const details = document.getElementById('tournament-details');
  details.innerHTML = `
    <div class="detail-section">
      <h3><span class="material-symbols-outlined">info</span> Tournament Information</h3>
      <div class="detail-row">
        <span class="detail-label">Name</span>
        <span class="detail-value">${tournament.name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Sport</span>
        <span class="detail-value"><span class="sport-badge ${tournament.sport}">${tournament.sport}</span></span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Max Participants</span>
        <span class="detail-value">${tournament.maxParticipants}</span>
      </div>
    </div>
    <div class="detail-section">
      <h3><span class="material-symbols-outlined">calendar_month</span> Schedule</h3>
      <div class="detail-row">
        <span class="detail-label">Start Date</span>
        <span class="detail-value">${formatDate(tournament.startDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">End Date</span>
        <span class="detail-value">${formatDate(tournament.endDate)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Time</span>
        <span class="detail-value">${tournament.startTime || 'TBD'} - ${tournament.endTime || 'TBD'}</span>
      </div>
    </div>
    <div class="detail-section">
      <h3><span class="material-symbols-outlined">location_on</span> Venue</h3>
      <div class="detail-row">
        <span class="detail-label">Location</span>
        <span class="detail-value">${getVenueName(tournament.venueId) || 'No venue assigned'}</span>
      </div>
    </div>
    ${tournament.description ? `
    <div class="detail-section">
      <h3><span class="material-symbols-outlined">description</span> Description</h3>
      <p>${tournament.description}</p>
    </div>
    ` : ''}
    ${tournament.rules ? `
    <div class="detail-section">
      <h3><span class="material-symbols-outlined">gavel</span> Rules & Regulations</h3>
      <p>${tournament.rules}</p>
    </div>
    ` : ''}
    <div class="detail-section">
      <h3><span class="material-symbols-outlined">groups</span> Participants (${participants.length}/${tournament.maxParticipants})</h3>
      ${participants.length > 0 ? `
        <div class="participants-list">
          ${participants.map(p => `<span class="participant-chip">${p}</span>`).join('')}
        </div>
      ` : '<p class="empty-state">No participants registered yet</p>'}
    </div>
  `;

  document.getElementById('view-tournament-modal').classList.add('active');
}

function closeViewTournamentModal() {
  document.getElementById('view-tournament-modal').classList.remove('active');
}

// Register player for tournament
async function openRegisterTournamentModal(tournamentId) {
  document.getElementById('register-tournament-id').value = tournamentId;
  
  // Load players into dropdown
  const allPlayers = await ipcRenderer.invoke('get-players');
  const select = document.getElementById('register-player-select');
  select.innerHTML = '<option value="">Choose a player</option>' + 
    allPlayers.map(p => `<option value="${p.id}">${p.firstName} ${p.lastName}</option>`).join('');
  
  document.getElementById('register-tournament-modal').classList.add('active');
}

function closeRegisterTournamentModal() {
  document.getElementById('register-tournament-modal').classList.remove('active');
}

async function registerPlayerForTournament() {
  const playerId = document.getElementById('register-player-select').value;
  const tournamentId = document.getElementById('register-tournament-id').value;
  
  if (!playerId) {
    alert('Please select a player');
    return;
  }

  const result = await ipcRenderer.invoke('register-player-tournament', playerId, tournamentId);
  if (result.success) {
    alert('Player registered successfully!');
    closeRegisterTournamentModal();
    loadTournaments();
  } else {
    alert('Failed to register player');
  }
}

// Matches
async function loadMatches() {
  try {
    matches = await ipcRenderer.invoke('get-matches');
    tournaments = await ipcRenderer.invoke('get-tournaments');
    venues = await ipcRenderer.invoke('get-venues');
    
    const container = document.getElementById('matches-list');
    
    if (matches.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">sports_esports</span>
          <p>No matches scheduled. Create your first match!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = matches.map(match => `
      <div class="match-card ${match.status === 'live' ? 'live' : ''}">
        <div class="match-teams">
          <div class="team">
            <div class="team-name">${match.team1}</div>
          </div>
          <div class="match-score">
            <span class="score">${match.scoreTeam1}</span>
            <span class="score-divider">-</span>
            <span class="score">${match.scoreTeam2}</span>
          </div>
          <div class="team">
            <div class="team-name">${match.team2}</div>
          </div>
        </div>
        <div class="match-info">
          <div class="match-date">
            <span class="material-symbols-outlined">calendar_month</span> ${formatDate(match.date)}
          </div>
          <div class="match-time">
            <span class="material-symbols-outlined">schedule</span> ${match.time || 'TBD'}
          </div>
          <div class="match-venue">
            <span class="material-symbols-outlined">location_on</span> ${getVenueName(match.venueId) || 'No venue'}
          </div>
          <span class="status-badge ${match.status}">${match.status}</span>
        </div>
        <div class="match-actions">
          <button class="btn btn-sm btn-success" onclick="openScoreModal('${match.id}')">
            <span class="material-symbols-outlined">edit</span> Edit Score
          </button>
          <button class="btn btn-sm btn-secondary" onclick="editMatch('${match.id}')">
            <span class="material-symbols-outlined">settings</span>
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMatch('${match.id}')">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading matches:', error);
  }
}

function openMatchModal(match = null) {
  const modal = document.getElementById('match-modal');
  const title = document.getElementById('match-modal-title');
  const form = document.getElementById('match-form');
  
  // Load tournaments and venues into dropdowns
  loadTournamentDropdown('match-tournament');
  loadVenueDropdown('match-venue');
  
  if (match) {
    title.textContent = 'Edit Match';
    document.getElementById('match-id').value = match.id;
    document.getElementById('match-tournament').value = match.tournamentId || '';
    document.getElementById('match-team1').value = match.team1;
    document.getElementById('match-team2').value = match.team2;
    document.getElementById('match-date').value = match.date;
    document.getElementById('match-time').value = match.time || '';
    document.getElementById('match-venue').value = match.venueId || '';
    document.getElementById('match-status').value = match.status;
  } else {
    title.textContent = 'Create Match';
    form.reset();
    document.getElementById('match-id').value = '';
  }
  
  modal.classList.add('active');
}

function closeMatchModal() {
  document.getElementById('match-modal').classList.remove('active');
}

async function editMatch(id) {
  const match = matches.find(m => m.id === id);
  if (match) {
    openMatchModal(match);
  }
}

async function deleteMatch(id) {
  if (confirm('Are you sure you want to delete this match?')) {
    await ipcRenderer.invoke('delete-match', id);
    loadMatches();
  }
}

// Score editing
function openScoreModal(matchId) {
  const match = matches.find(m => m.id === matchId);
  if (!match) return;

  currentMatchId = matchId;
  document.getElementById('score-match-id').value = matchId;
  document.getElementById('score-team1-name').textContent = match.team1;
  document.getElementById('score-team2-name').textContent = match.team2;
  document.getElementById('score-team1').value = match.scoreTeam1;
  document.getElementById('score-team2').value = match.scoreTeam2;
  
  document.getElementById('score-modal').classList.add('active');
}

function closeScoreModal() {
  document.getElementById('score-modal').classList.remove('active');
  currentMatchId = null;
}

function adjustScore(team, delta) {
  const input = document.getElementById(`score-team${team}`);
  let value = parseInt(input.value) + delta;
  if (value < 0) value = 0;
  input.value = value;
}

async function saveScore() {
  const matchId = document.getElementById('score-match-id').value;
  const scoreTeam1 = parseInt(document.getElementById('score-team1').value);
  const scoreTeam2 = parseInt(document.getElementById('score-team2').value);
  
  // Update score
  await ipcRenderer.invoke('update-score', matchId, scoreTeam1, scoreTeam2);
  
  // Add event if specified
  const eventType = document.getElementById('score-event-type').value;
  const eventTeam = document.getElementById('score-event-team').value;
  const eventDescription = document.getElementById('score-event-description').value;
  
  if (eventType) {
    await ipcRenderer.invoke('add-match-event', matchId, {
      type: eventType,
      team: eventTeam,
      description: eventDescription
    });
  }
  
  closeScoreModal();
  loadMatches();
}

// Players
async function loadPlayers() {
  try {
    players = await ipcRenderer.invoke('get-players');
    const container = document.getElementById('players-list');
    
    if (players.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">groups</span>
          <p>No players registered. Add your first player!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = players.map(player => `
      <div class="player-card">
        <div class="card-title">
          <span class="material-symbols-outlined">person</span>
          ${player.firstName} ${player.lastName}
        </div>
        <div class="card-info">
          <div class="card-info-item">
            <span class="material-symbols-outlined">email</span>
            <span>${player.email}</span>
          </div>
          ${player.phone ? `
          <div class="card-info-item">
            <span class="material-symbols-outlined">phone</span>
            <span>${player.phone}</span>
          </div>
          ` : ''}
          ${player.sport ? `
          <div class="card-info-item">
            <span class="material-symbols-outlined">sports_soccer</span>
            <span class="sport-badge ${player.sport}">${player.sport}</span>
          </div>
          ` : ''}
          ${player.team ? `
          <div class="card-info-item">
            <span class="material-symbols-outlined">groups</span>
            <span>${player.team}</span>
          </div>
          ` : ''}
          <div class="card-info-item">
            <span class="material-symbols-outlined">emoji_events</span>
            <span>${(player.tournaments || []).length} tournaments</span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-secondary" onclick="editPlayer('${player.id}')">
            <span class="material-symbols-outlined">edit</span> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deletePlayer('${player.id}')">
            <span class="material-symbols-outlined">delete</span> Delete
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading players:', error);
  }
}

function openPlayerModal(player = null) {
  const modal = document.getElementById('player-modal');
  const title = document.getElementById('player-modal-title');
  const form = document.getElementById('player-form');
  
  if (player) {
    title.textContent = 'Edit Player';
    document.getElementById('player-id').value = player.id;
    document.getElementById('player-firstname').value = player.firstName;
    document.getElementById('player-lastname').value = player.lastName;
    document.getElementById('player-email').value = player.email;
    document.getElementById('player-phone').value = player.phone || '';
    document.getElementById('player-dob').value = player.dateOfBirth || '';
    document.getElementById('player-gender').value = player.gender || '';
    document.getElementById('player-sport').value = player.sport || '';
    document.getElementById('player-team').value = player.team || '';
    document.getElementById('player-address').value = player.address || '';
  } else {
    title.textContent = 'Add Player';
    form.reset();
    document.getElementById('player-id').value = '';
  }
  
  modal.classList.add('active');
}

function closePlayerModal() {
  document.getElementById('player-modal').classList.remove('active');
}

async function editPlayer(id) {
  const player = players.find(p => p.id === id);
  if (player) {
    openPlayerModal(player);
  }
}

async function deletePlayer(id) {
  if (confirm('Are you sure you want to delete this player?')) {
    await ipcRenderer.invoke('delete-player', id);
    loadPlayers();
  }
}

// Venues
async function loadVenues() {
  try {
    venues = await ipcRenderer.invoke('get-venues');
    const container = document.getElementById('venues-list');
    
    if (venues.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="material-symbols-outlined">stadium</span>
          <p>No venues added. Add your first venue!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = venues.map(venue => `
      <div class="venue-card">
        <div class="card-title">
          <span class="material-symbols-outlined">location_on</span>
          ${venue.name}
        </div>
        <div class="card-info">
          <div class="card-info-item">
            <span class="material-symbols-outlined">place</span>
            <span>${venue.address}, ${venue.city}</span>
          </div>
          <div class="card-info-item">
            <span class="material-symbols-outlined">public</span>
            <span>${venue.state ? venue.state + ', ' : ''}${venue.country}</span>
          </div>
          ${venue.capacity ? `
          <div class="card-info-item">
            <span class="material-symbols-outlined">groups</span>
            <span>Capacity: ${venue.capacity}</span>
          </div>
          ` : ''}
          <div class="card-info-item">
            <span class="material-symbols-outlined">business</span>
            <span>${venue.type || 'Indoor'}</span>
          </div>
          ${venue.phone ? `
          <div class="card-info-item">
            <span class="material-symbols-outlined">phone</span>
            <span>${venue.phone}</span>
          </div>
          ` : ''}
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-secondary" onclick="editVenue('${venue.id}')">
            <span class="material-symbols-outlined">edit</span> Edit
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteVenue('${venue.id}')">
            <span class="material-symbols-outlined">delete</span> Delete
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading venues:', error);
  }
}

function openVenueModal(venue = null) {
  const modal = document.getElementById('venue-modal');
  const title = document.getElementById('venue-modal-title');
  const form = document.getElementById('venue-form');
  
  if (venue) {
    title.textContent = 'Edit Venue';
    document.getElementById('venue-id').value = venue.id;
    document.getElementById('venue-name').value = venue.name;
    document.getElementById('venue-address').value = venue.address;
    document.getElementById('venue-city').value = venue.city;
    document.getElementById('venue-state').value = venue.state || '';
    document.getElementById('venue-country').value = venue.country;
    document.getElementById('venue-postal').value = venue.postalCode || '';
    document.getElementById('venue-capacity').value = venue.capacity || '';
    document.getElementById('venue-type').value = venue.type || 'indoor';
    document.getElementById('venue-phone').value = venue.phone || '';
    document.getElementById('venue-email').value = venue.email || '';
    document.getElementById('venue-facilities').value = venue.facilities || '';
    document.getElementById('venue-notes').value = venue.notes || '';
  } else {
    title.textContent = 'Add Venue';
    form.reset();
    document.getElementById('venue-id').value = '';
  }
  
  modal.classList.add('active');
}

function closeVenueModal() {
  document.getElementById('venue-modal').classList.remove('active');
}

async function editVenue(id) {
  const venue = venues.find(v => v.id === id);
  if (venue) {
    openVenueModal(venue);
  }
}

async function deleteVenue(id) {
  if (confirm('Are you sure you want to delete this venue?')) {
    await ipcRenderer.invoke('delete-venue', id);
    loadVenues();
  }
}

// Form handlers
function initForms() {
  // Tournament form
  document.getElementById('tournament-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tournament-id').value;
    const tournament = {
      name: document.getElementById('tournament-name').value,
      sport: document.getElementById('tournament-sport').value,
      maxParticipants: parseInt(document.getElementById('tournament-max-participants').value),
      startDate: document.getElementById('tournament-start-date').value,
      endDate: document.getElementById('tournament-end-date').value,
      startTime: document.getElementById('tournament-start-time').value,
      endTime: document.getElementById('tournament-end-time').value,
      venueId: document.getElementById('tournament-venue').value,
      description: document.getElementById('tournament-description').value,
      rules: document.getElementById('tournament-rules').value,
      participants: []
    };
    
    if (id) {
      tournament.id = id;
      const existing = tournaments.find(t => t.id === id);
      tournament.participants = existing?.participants || [];
      tournament.createdAt = existing?.createdAt;
      await ipcRenderer.invoke('update-tournament', tournament);
    } else {
      await ipcRenderer.invoke('add-tournament', tournament);
    }
    
    closeTournamentModal();
    loadTournaments();
  });

  // Match form
  document.getElementById('match-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('match-id').value;
    const match = {
      tournamentId: document.getElementById('match-tournament').value,
      team1: document.getElementById('match-team1').value,
      team2: document.getElementById('match-team2').value,
      date: document.getElementById('match-date').value,
      time: document.getElementById('match-time').value,
      venueId: document.getElementById('match-venue').value,
      status: document.getElementById('match-status').value
    };
    
    if (id) {
      match.id = id;
      const existing = matches.find(m => m.id === id);
      match.scoreTeam1 = existing?.scoreTeam1 || 0;
      match.scoreTeam2 = existing?.scoreTeam2 || 0;
      match.events = existing?.events || [];
      match.createdAt = existing?.createdAt;
      await ipcRenderer.invoke('update-match', match);
    } else {
      await ipcRenderer.invoke('add-match', match);
    }
    
    closeMatchModal();
    loadMatches();
  });

  // Player form
  document.getElementById('player-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('player-id').value;
    const player = {
      firstName: document.getElementById('player-firstname').value,
      lastName: document.getElementById('player-lastname').value,
      email: document.getElementById('player-email').value,
      phone: document.getElementById('player-phone').value,
      dateOfBirth: document.getElementById('player-dob').value,
      gender: document.getElementById('player-gender').value,
      sport: document.getElementById('player-sport').value,
      team: document.getElementById('player-team').value,
      address: document.getElementById('player-address').value
    };
    
    if (id) {
      player.id = id;
      const existing = players.find(p => p.id === id);
      player.tournaments = existing?.tournaments || [];
      player.registeredAt = existing?.registeredAt;
      await ipcRenderer.invoke('update-player', player);
    } else {
      await ipcRenderer.invoke('add-player', player);
    }
    
    closePlayerModal();
    loadPlayers();
  });

  // Venue form
  document.getElementById('venue-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('venue-id').value;
    const venue = {
      name: document.getElementById('venue-name').value,
      address: document.getElementById('venue-address').value,
      city: document.getElementById('venue-city').value,
      state: document.getElementById('venue-state').value,
      country: document.getElementById('venue-country').value,
      postalCode: document.getElementById('venue-postal').value,
      capacity: document.getElementById('venue-capacity').value ? parseInt(document.getElementById('venue-capacity').value) : null,
      type: document.getElementById('venue-type').value,
      phone: document.getElementById('venue-phone').value,
      email: document.getElementById('venue-email').value,
      facilities: document.getElementById('venue-facilities').value,
      notes: document.getElementById('venue-notes').value
    };
    
    if (id) {
      venue.id = id;
      await ipcRenderer.invoke('update-venue', venue);
    } else {
      await ipcRenderer.invoke('add-venue', venue);
    }
    
    closeVenueModal();
    loadVenues();
  });
}

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

function getVenueName(venueId) {
  if (!venueId) return null;
  const venue = venues.find(v => v.id === venueId);
  return venue ? venue.name : null;
}

async function loadVenueDropdown(selectId) {
  const venuesList = await ipcRenderer.invoke('get-venues');
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Select Venue</option>' + 
    venuesList.map(v => `<option value="${v.id}">${v.name} - ${v.city}</option>`).join('');
}

async function loadTournamentDropdown(selectId) {
  const tournamentsList = await ipcRenderer.invoke('get-tournaments');
  const select = document.getElementById(selectId);
  select.innerHTML = '<option value="">Select Tournament</option>' + 
    tournamentsList.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}