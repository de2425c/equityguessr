# EquityGuessr Setup

## Install Dependencies

Run these commands in the `frontend` directory:

```bash
npm install tailwindcss postcss autoprefixer class-variance-authority clsx tailwind-merge tailwindcss-animate
```

## Run the App

1. Make sure the backend server is running:
```bash
cd backend/build
./poker_server
```

2. Start the frontend:
```bash
cd frontend
npm start
```

The app will open at `http://localhost:3000`

## How It Works

- **EquityGuessr** is a poker equity quiz game
- You're shown two hands and community cards (if any)
- Click on the hand you think has better equity
- Get instant feedback with actual equity percentages
- Track your score and accuracy
- 10 different scenarios to test your poker knowledge

Enjoy improving your poker equity intuition!
