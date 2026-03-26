# DRC Tournaments

This project is a comprehensive **Sports Management Dashboard** built using **Electron**.

## Overview
DRC Tournaments provides a centralized platform for sports administrators to manage tournaments, matches, players, and venues. It features real-time score tracking and event management for various sports.

## Features
*   **Dashboard**: Real-time statistics for active tournaments, registered players, and live matches. Quick overview of upcoming events.
*   **Tournament Management**: Create, view, update, and delete tournaments. Track participants, schedules, and venue assignments for sports like Football, Basketball, Cricket, Tennis, Volleyball, Badminton, and Hockey.
*   **Live Match & Score Center**: Schedule matches, update scores in real-time, and record match events (goals, cards, substitutions).
*   **Player Registry**: Manage player profiles, contact information, and tournament participation history.
*   **Venue Registry**: Manage sports facilities, including capacity, location details, and contact information.
*   **Secure Admin Access**: Login system for administrators.
*   **Local Data Persistence**: All data is saved locally using `electron-store`.

## Technical Stack
*   **Framework**: Electron
*   **Frontend**: HTML, CSS (Tailwind CSS), JavaScript
*   **Backend**: Node.js (via Electron main process)
*   **Data Storage**: `electron-store` for local data persistence

## Getting Started
To run this application, clone the repository and install the dependencies:

```bash
git clone [YOUR_REPO_URL_HERE]
cd drc-tournaments
npm install
npm start
```

## Admin Credentials
*   **User ID**: `raj`
*   **Password**: `0000`