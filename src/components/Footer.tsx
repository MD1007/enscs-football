import React from 'react';
import Link from 'next/link';
import { Shield, Trophy, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-pitch-border bg-pitch-darkest/95 text-slate-400 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-white font-bold tracking-tight text-lg uppercase">
                ENSCS Football Tournament
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md">
              Official football competition platform for the National Higher School of Cybersecurity (École Nationale Supérieure de Cybersécurité), Algiers, Algeria. Supporting fair play, sportsmanship, and student excellence.
            </p>
            <div className="flex items-center space-x-2 text-xs text-emerald-400/90 pt-1">
              <Shield className="w-3.5 h-3.5" />
              <span>National Higher School of Cybersecurity • Cyber Champions 2026</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Competition</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/matches" className="hover:text-emerald-400 transition">Fixtures & Results</Link>
              </li>
              <li>
                <Link href="/standings" className="hover:text-emerald-400 transition">Group Standings</Link>
              </li>
              <li>
                <Link href="/knockout" className="hover:text-emerald-400 transition">Knockout Bracket</Link>
              </li>
              <li>
                <Link href="/scorers" className="hover:text-emerald-400 transition">Top Scorers (Golden Boot)</Link>
              </li>
              <li>
                <Link href="/rules" className="hover:text-emerald-400 transition">Official Rules & Regulations</Link>
              </li>
            </ul>
          </div>

          {/* Disciplinary & Groups */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3">Tournament Groups</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-300">Group A: OSPF, Wolves, Spider-Feet, Laghbina</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-slate-300">Group B: Rats, PVC, Nscs, Barca</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span className="text-slate-300">Group C: Zoro, deddou, فريق الرجال, Rono</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 ENSCS Football Tournament. Developed with passion for ENSCS students.</p>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <span>Made with</span>
              <Heart className="w-3 h-3 text-red-500 fill-red-500" />
              <span>for ENSCS Cybersecurity Students</span>
            </span>
            <span>•</span>
            <Link href="/admin" className="text-slate-400 hover:text-white transition">Admin Login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

