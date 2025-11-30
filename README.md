# Multiplayer Word Search Game

A real-time multiplayer word search game built with Node.js, Express, and Socket.io. Players can compete against each other to find words in a generated grid.

> [!NOTE]
> **Version:** 25w12a 1.0
> **Status:** Version 2.0 is coming soon!
> It can be Viewed at `https://firebase.google.com/grid-maxxing`
## Features

- **Real-time Multiplayer**: Play against other players in real-time.
- **Lobby System**: Create and join game lobbies.
- **Dynamic Puzzle Generation**: Puzzles are generated on the fly with different categories and difficulty levels.
- **Categories**: Choose from General, Tech, Animals, Food, and Countries.
- **Scoring System**: Earn points for finding words.
- **Timer**: Race against the clock.

## Tech Stack

- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.io
- **Frontend**: HTML, CSS, JavaScript (served via Express)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/xorinf/grid-clash
    ```
2.  Navigate to the project directory:
    ```bash
    cd grid-clash
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

1.  Start the server:
    ```bash
    npm start
    ```
    Or for development with nodemon:
    ```bash
    npm run dev
    ```
2.  Open your browser and navigate to `http://localhost:3000`.
3.  Create a game or join an existing lobby.

## Project Structure

- `server.js`: Main server file handling Express and Socket.io logic.
- `public/`: Contains static frontend files.
- `models/`: (If applicable) Database models.
- `partials/`: HTML partials.

## License

ISC
