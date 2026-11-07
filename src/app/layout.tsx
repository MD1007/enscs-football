import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import { getFullTournamentData } from '@/lib/tournamentService';

export const metadata: Metadata = {
  title: 'ENSCS Football Tournament 2026 | National Higher School of Cybersecurity',
  description:
    'Official live football tournament platform of the École Nationale Supérieure de Cybersécurité (ENSCS), Algeria. Live scores, standings, knockout brackets, top scorers, and disciplinary statistics.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch next match time for the global header countdown
  let nextMatchTime: string | null = null;
  try {
    const data = getFullTournamentData();
    nextMatchTime = data.summary.next_match?.scheduled_time || null;
  } catch (e) {
    // Fallback if db is busy
  }

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-pitch-darkest text-slate-100 flex flex-col min-h-screen selection:bg-emerald-500 selection:text-black">
        <Navbar nextMatchTime={nextMatchTime} />
        <main className="flex-grow pb-16 lg:pb-0">{children}</main>
        <Footer />
        <BottomNav />
      </body>
    </html>
  );
}

