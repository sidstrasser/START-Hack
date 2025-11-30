# Accordia Frontend

Modern Next.js frontend for Accordia — an AI-powered procurement negotiation support tool.

## Overview

Accordia helps procurement professionals prepare for and conduct supplier negotiations through AI-generated briefings, real-time call assistance, and actionable insights.

## Features

- **Document Upload** — Upload supplier offers and supporting documents (PDF)
- **AI-Generated Briefings** — Comprehensive negotiation briefings with supplier analysis, market insights, and recommended strategies
- **Action Items Management** — Select and track key negotiation points
- **Live Call Support** — Real-time transcription, metrics tracking, and AI-powered insights during calls
- **Call Summary & Export** — Post-call analytics with CRM integration

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: Custom component library with glassmorphism design

## Project Structure

```
frontend/
├── app/
│   ├── globals.css              # Global styles & design tokens
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Homepage
│   ├── document-upload/         # Step 1: Upload documents
│   ├── negotiation-input/       # Negotiation details form
│   ├── briefing/                # AI briefing display
│   ├── briefing-new/            # Updated briefing view
│   ├── action-items/            # Step 2: Select action items
│   ├── live-call/               # Step 3: Live call interface
│   │   └── components/          # Call-specific components
│   ├── summary/                 # Step 4: Post-call summary
│   │   └── components/          # Summary components
│   └── components/              # Shared page components
├── components/
│   ├── ui/                      # Reusable UI components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   └── SectionHeader.tsx
│   ├── LoadingSpinner.tsx
│   ├── ProgressBar.tsx
│   ├── StepIndicator.tsx
│   └── ErrorAlert.tsx
├── lib/
│   ├── api.ts                   # Backend API client
│   ├── types.ts                 # TypeScript definitions
│   └── hooks/
│       └── useSSE.ts            # Server-Sent Events hook
├── tailwind.config.ts
├── next.config.js
└── package.json
```

## Setup

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Production Build

```bash
npm run build
npm start
```

## User Flow

1. **Upload Documents** (`/document-upload`) — Upload supplier offer PDF
2. **Review Briefing** (`/briefing`) — View AI-generated negotiation briefing
3. **Select Action Items** (`/action-items`) — Choose key points to track
4. **Live Call** (`/live-call`) — Conduct negotiation with real-time AI support
5. **Summary** (`/summary`) — Review metrics and export to CRM

## Design System

The frontend uses a modern design system featuring:

- **Colors**: Purple accents on light blue background
- **Cards**: `.glass-card` (translucent) and `.surface-card` (solid)
- **Animations**: Smooth transitions (150-350ms)

See `DESIGN_SYSTEM.md` for complete documentation.

## API Integration

The frontend communicates with the FastAPI backend via:

- REST endpoints for document upload and briefing generation
- Server-Sent Events (SSE) for real-time progress updates

See `lib/api.ts` for implementation details.
