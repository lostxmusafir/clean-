const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Initialize data store
const store = new Store();

// Initialize default data if not exists
if (!store.get('tournaments')) {
  store.set('tournaments', []);
}
if (!store.get('players')) {
  store.set('players', []);
}
if (!store.get('venues')) {
  store.set('venues', []);
}
if (!store.get('matches')) {
  store.set('matches', []);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    title: 'Kinetic Dashboard | DRC Tournaments',
    backgroundColor: '#060e20'
  });

  mainWindow.loadFile('index.html');

  // Open DevTools in development
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for Tournaments
ipcMain.handle('get-tournaments', () => {
  return store.get('tournaments', []);
});

ipcMain.handle('add-tournament', (event, tournament) => {
  const tournaments = store.get('tournaments', []);
  tournament.id = Date.now().toString();
  tournament.createdAt = new Date().toISOString();
  tournaments.push(tournament);
  store.set('tournaments', tournaments);
  return tournament;
});

ipcMain.handle('update-tournament', (event, updatedTournament) => {
  const tournaments = store.get('tournaments', []);
  const index = tournaments.findIndex(t => t.id === updatedTournament.id);
  if (index !== -1) {
    tournaments[index] = updatedTournament;
    store.set('tournaments', tournaments);
    return updatedTournament;
  }
  return null;
});

ipcMain.handle('delete-tournament', (event, id) => {
  const tournaments = store.get('tournaments', []);
  const filtered = tournaments.filter(t => t.id !== id);
  store.set('tournaments', filtered);
  return true;
});

// IPC Handlers for Players
ipcMain.handle('get-players', () => {
  return store.get('players', []);
});

ipcMain.handle('add-player', (event, player) => {
  const players = store.get('players', []);
  player.id = Date.now().toString();
  player.registeredAt = new Date().toISOString();
  player.tournaments = [];
  players.push(player);
  store.set('players', players);
  return player;
});

ipcMain.handle('update-player', (event, updatedPlayer) => {
  const players = store.get('players', []);
  const index = players.findIndex(p => p.id === updatedPlayer.id);
  if (index !== -1) {
    players[index] = updatedPlayer;
    store.set('players', players);
    return updatedPlayer;
  }
  return null;
});

ipcMain.handle('delete-player', (event, id) => {
  const players = store.get('players', []);
  const filtered = players.filter(p => p.id !== id);
  store.set('players', filtered);
  return true;
});

ipcMain.handle('register-player-tournament', (event, playerId, tournamentId) => {
  const players = store.get('players', []);
  const tournaments = store.get('tournaments', []);
  
  const playerIndex = players.findIndex(p => p.id === playerId);
  const tournamentIndex = tournaments.findIndex(t => t.id === tournamentId);
  
  if (playerIndex !== -1 && tournamentIndex !== -1) {
    if (!players[playerIndex].tournaments.includes(tournamentId)) {
      players[playerIndex].tournaments.push(tournamentId);
      store.set('players', players);
    }
    if (!tournaments[tournamentIndex].participants.includes(playerId)) {
      tournaments[tournamentIndex].participants.push(playerId);
      store.set('tournaments', tournaments);
    }
    return { success: true };
  }
  return { success: false };
});

// IPC Handlers for Venues
ipcMain.handle('get-venues', () => {
  return store.get('venues', []);
});

ipcMain.handle('add-venue', (event, venue) => {
  const venues = store.get('venues', []);
  venue.id = Date.now().toString();
  venues.push(venue);
  store.set('venues', venues);
  return venue;
});

ipcMain.handle('update-venue', (event, updatedVenue) => {
  const venues = store.get('venues', []);
  const index = venues.findIndex(v => v.id === updatedVenue.id);
  if (index !== -1) {
    venues[index] = updatedVenue;
    store.set('venues', venues);
    return updatedVenue;
  }
  return null;
});

ipcMain.handle('delete-venue', (event, id) => {
  const venues = store.get('venues', []);
  const filtered = venues.filter(v => v.id !== id);
  store.set('venues', filtered);
  return true;
});

// IPC Handlers for Matches
ipcMain.handle('get-matches', () => {
  return store.get('matches', []);
});

ipcMain.handle('add-match', (event, match) => {
  const matches = store.get('matches', []);
  match.id = Date.now().toString();
  match.createdAt = new Date().toISOString();
  match.status = 'scheduled';
  match.scoreTeam1 = 0;
  match.scoreTeam2 = 0;
  match.events = [];
  matches.push(match);
  store.set('matches', matches);
  return match;
});

ipcMain.handle('update-match', (event, updatedMatch) => {
  const matches = store.get('matches', []);
  const index = matches.findIndex(m => m.id === updatedMatch.id);
  if (index !== -1) {
    matches[index] = updatedMatch;
    store.set('matches', matches);
    return updatedMatch;
  }
  return null;
});

ipcMain.handle('update-score', (event, matchId, scoreTeam1, scoreTeam2) => {
  const matches = store.get('matches', []);
  const index = matches.findIndex(m => m.id === matchId);
  if (index !== -1) {
    matches[index].scoreTeam1 = scoreTeam1;
    matches[index].scoreTeam2 = scoreTeam2;
    matches[index].lastUpdated = new Date().toISOString();
    store.set('matches', matches);
    return matches[index];
  }
  return null;
});

ipcMain.handle('add-match-event', (event, matchId, eventData) => {
  const matches = store.get('matches', []);
  const index = matches.findIndex(m => m.id === matchId);
  if (index !== -1) {
    eventData.id = Date.now().toString();
    eventData.timestamp = new Date().toISOString();
    matches[index].events.push(eventData);
    store.set('matches', matches);
    return matches[index];
  }
  return null;
});

ipcMain.handle('delete-match', (event, id) => {
  const matches = store.get('matches', []);
  const filtered = matches.filter(m => m.id !== id);
  store.set('matches', filtered);
  return true;
});

// Get dashboard stats
ipcMain.handle('get-dashboard-stats', () => {
  const tournaments = store.get('tournaments', []);
  const players = store.get('players', []);
  const matches = store.get('matches', []);
  const venues = store.get('venues', []);
  
  const activeMatches = matches.filter(m => m.status === 'live').length;
  const upcomingTournaments = tournaments.filter(t => new Date(t.startDate) > new Date()).length;
  
  return {
    totalTournaments: tournaments.length,
    totalPlayers: players.length,
    totalMatches: matches.length,
    totalVenues: venues.length,
    activeMatches,
    upcomingTournaments
  };
});