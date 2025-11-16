# Basic Finance

A minimal financial dashboard web application built with Next.js, TypeScript, and Tailwind CSS. Inspired by The Row's clean, restrained, and sophisticated aesthetic.

## Features

- **Net Worth Tracking**: Automatically calculates your net worth (assets - liabilities)
- **Asset Management**: Track stocks, real estate, cash, bonds, crypto, and other assets
- **Liability Management**: Record and manage debts, loans, and mortgages
- **Transaction Logging**: Track income and expenses with categories
- **Cash Flow Analysis**: Visualize monthly income vs expenses with interactive charts
- **Local Storage**: All data is stored in your browser's localStorage
- **Minimalist Design**: Clean, sophisticated UI with smooth transitions

## Tech Stack

- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **Satoshi Font** from Fontshare

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Pages

- **Home**: Overview with net worth summary, recent transactions, and quick stats
- **Assets**: List and manage all your assets
- **Liabilities**: List and manage all your debts and loans
- **Cash Flow**: Monthly income vs expenses visualization with charts
- **Transactions**: Complete log of all financial transactions

## Data Storage

All financial data is stored locally in your browser's localStorage. No data is sent to any server, ensuring complete privacy.

## Building for Production

```bash
npm run build
npm start
```

## License

MIT

