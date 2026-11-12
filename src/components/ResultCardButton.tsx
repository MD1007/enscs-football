'use client';

import React, { useState } from 'react';
import { Match } from '@/lib/types';
import { Camera, Download, Share2, X, Check, Loader2, Sparkles } from 'lucide-react';

interface ResultCardButtonProps {
  match: Match;
  stageTitle?: string;
  className?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? truncated + '...' : '';
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export default function ResultCardButton({
  match,
  stageTitle = 'Tournament Match',
  className = '',
}: ResultCardButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cardDataUrl, setCardDataUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [canShareFile, setCanShareFile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Generate ASCII safe filename
  const fileName = (() => {
    const home = slugify(match.home_team_name || '');
    const away = slugify(match.away_team_name || '');
    const base = home && away ? `${home}-${match.home_score ?? 0}-${match.away_score ?? 0}-${away}` : `match-${match.id}`;
    return `${base}.png`;
  })();

  const generateCard = async () => {
    setGenerating(true);
    setIsOpen(true);

    try {
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }

      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const fontStack =
        'Inter, Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Tahoma, Arial, sans-serif';

      // 1. Dark pitch background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1350);
      bgGrad.addColorStop(0, '#060B14');
      bgGrad.addColorStop(0.35, '#0B1527');
      bgGrad.addColorStop(0.7, '#070D19');
      bgGrad.addColorStop(1, '#04070D');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1350);

      // Ambient radial glow behind the score
      const glowGrad = ctx.createRadialGradient(540, 430, 40, 540, 430, 400);
      glowGrad.addColorStop(0, 'rgba(0, 230, 118, 0.12)');
      glowGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.08)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, 1080, 800);

      // Pitch border line (subtle)
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 2;
      drawRoundedRect(ctx, 40, 40, 1000, 1270, 36);
      ctx.stroke();

      // Subtle center circle on canvas
      ctx.beginPath();
      ctx.arc(540, 430, 160, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // 2. Header: Tournament Title
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      // Small top badge
      ctx.fillStyle = 'rgba(0, 230, 118, 0.15)';
      drawRoundedRect(ctx, 430, 68, 220, 34, 17);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#4ADE80';
      ctx.font = `bold 14px ${fontStack}`;
      ctx.fillText('OFFICIAL RESULT', 540, 77);

      // Main Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 34px ${fontStack}`;
      ctx.fillText('ENSCS FOOTBALL TOURNAMENT', 540, 118);

      ctx.fillStyle = '#94A3B8';
      ctx.font = `500 18px ${fontStack}`;
      ctx.fillText('National Higher School of Cybersecurity • Algiers', 540, 164);

      // Stage Pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      drawRoundedRect(ctx, 360, 204, 360, 40, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.stroke();

      ctx.fillStyle = '#E2E8F0';
      ctx.font = `bold 16px ${fontStack}`;
      ctx.fillText(stageTitle.toUpperCase(), 540, 214);

      // 3. Teams and Big Score Box
      // Home Team (Left, x: 70 to 420)
      const homeColor = match.home_team_color || '#10B981';
      ctx.fillStyle = homeColor;
      drawRoundedRect(ctx, 160, 270, 72, 72, 20);
      ctx.fill();

      // Shield accent inside badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `bold 32px ${fontStack}`;
      ctx.fillText('🛡', 196, 286);

      // Home Team Name
      const homeName = match.home_team_name || 'Home Team';
      const homeIsRtl = /[\u0600-\u06FF]/.test(homeName);
      ctx.save();
      if ('direction' in ctx) ctx.direction = homeIsRtl ? 'rtl' : 'ltr';
      ctx.font = `900 32px ${fontStack}`;
      ctx.fillStyle = '#FFFFFF';
      const homeTruncated = truncateText(ctx, homeName, 320);
      ctx.fillText(homeTruncated, 196, 356);
      ctx.restore();

      // Score Center Box (x: 440 to 640)
      ctx.fillStyle = '#060A12';
      drawRoundedRect(ctx, 430, 275, 220, 120, 28);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Score numbers
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `900 68px ${fontStack}`;
      ctx.fillText(`${match.home_score ?? 0} : ${match.away_score ?? 0}`, 540, 300);

      // Shootout score if any
      if (match.home_penalties !== null && match.away_penalties !== null) {
        ctx.fillStyle = '#FBBF24';
        ctx.font = `bold 18px ${fontStack}`;
        ctx.fillText(`(${match.home_penalties} - ${match.away_penalties} pens)`, 540, 402);
      }

      // Away Team (Right, x: 660 to 1010)
      const awayColor = match.away_team_color || '#3B82F6';
      ctx.fillStyle = awayColor;
      drawRoundedRect(ctx, 848, 270, 72, 72, 20);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = `bold 32px ${fontStack}`;
      ctx.fillText('🛡', 884, 286);

      // Away Team Name
      const awayName = match.away_team_name || 'Away Team';
      const awayIsRtl = /[\u0600-\u06FF]/.test(awayName);
      ctx.save();
      if ('direction' in ctx) ctx.direction = awayIsRtl ? 'rtl' : 'ltr';
      ctx.font = `900 32px ${fontStack}`;
      ctx.fillStyle = '#FFFFFF';
      const awayTruncated = truncateText(ctx, awayName, 320);
      ctx.fillText(awayTruncated, 884, 356);
      ctx.restore();

      // Divider line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 445);
      ctx.lineTo(1000, 445);
      ctx.stroke();

      // 4. Goal Scorers List
      const events = match.events || [];
      const homeGoals = events.filter(
        (e) => e.team_id === match.home_team_id && e.event_type === 'goal'
      );
      const awayGoals = events.filter(
        (e) => e.team_id === match.away_team_id && e.event_type === 'goal'
      );

      ctx.fillStyle = '#94A3B8';
      ctx.font = `bold 18px ${fontStack}`;
      ctx.textAlign = 'left';
      ctx.fillText('⚽ GOALS & SCORERS', 80, 470);

      const maxGoalLines = 8;
      const startGoalY = 510;
      const lineSpacing = 36;

      // Draw Home Goals (left side)
      const renderGoalList = (
        goals: typeof events,
        startX: number,
        maxWidth: number,
        align: 'left' | 'right'
      ) => {
        ctx.textAlign = align;
        const visibleGoals = goals.slice(0, maxGoalLines);
        visibleGoals.forEach((g, idx) => {
          const y = startGoalY + idx * lineSpacing;
          const isOg = g.sub_type === 'own_goal';
          const isPen = g.sub_type === 'penalty';
          const tag = isOg ? ' (OG)' : isPen ? ' (P)' : '';
          const min = g.minute ? `${g.minute}' ` : '';
          const line = `${min}${g.player_name || 'Goal'}${tag}`;

          const isRtl = /[\u0600-\u06FF]/.test(line);
          ctx.save();
          if ('direction' in ctx) ctx.direction = isRtl ? 'rtl' : 'ltr';
          ctx.font = `500 20px ${fontStack}`;
          ctx.fillStyle = isOg ? '#F87171' : '#FFFFFF';
          const truncated = truncateText(ctx, line, maxWidth);
          ctx.fillText(truncated, startX, y);
          ctx.restore();
        });

        if (goals.length > maxGoalLines) {
          const moreCount = goals.length - maxGoalLines;
          const y = startGoalY + maxGoalLines * lineSpacing;
          ctx.font = `bold 18px ${fontStack}`;
          ctx.fillStyle = '#64748B';
          ctx.fillText(`+${moreCount} more`, startX, y);
        }

        if (goals.length === 0) {
          ctx.font = `italic 18px ${fontStack}`;
          ctx.fillStyle = '#475569';
          ctx.fillText('—', startX, startGoalY);
        }
      };

      // Home goals column
      renderGoalList(homeGoals, 80, 420, 'left');
      // Away goals column
      renderGoalList(awayGoals, 1000, 420, 'right');

      // 5. Official Match MVP Showcase (Y: 880 to 1020)
      if (match.mvp_player_name) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        drawRoundedRect(ctx, 80, 870, 920, 140, 24);
        ctx.fill();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.textAlign = 'left';
        // Crown icon / emoji
        ctx.font = `38px ${fontStack}`;
        ctx.fillText('👑', 115, 915);

        // Header
        ctx.font = `bold 16px ${fontStack}`;
        ctx.fillStyle = '#FBBF24';
        ctx.fillText('OFFICIAL MAN OF THE MATCH (MVP)', 180, 905);

        // MVP Name
        const mvpIsRtl = /[\u0600-\u06FF]/.test(match.mvp_player_name);
        ctx.save();
        if ('direction' in ctx) ctx.direction = mvpIsRtl ? 'rtl' : 'ltr';
        ctx.font = `900 32px ${fontStack}`;
        ctx.fillStyle = '#FFFFFF';
        const mvpTrunc = truncateText(ctx, match.mvp_player_name, 500);
        ctx.fillText(mvpTrunc, 180, 935);
        ctx.restore();

        // Team badge / pill
        if (match.mvp_team_name) {
          ctx.textAlign = 'right';
          ctx.font = `bold 20px ${fontStack}`;
          ctx.fillStyle = '#E2E8F0';
          const teamTrunc = truncateText(ctx, match.mvp_team_name, 280);
          ctx.fillText(teamTrunc, 960, 935);
        }
      }

      // 6. Match Details: Date & Venue (Y: 1060 to 1160)
      ctx.textAlign = 'center';
      const formattedDate = new Date(match.scheduled_time).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      ctx.font = `600 20px ${fontStack}`;
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(`📅 ${formattedDate}   •   📍 ${match.venue || 'Terrain ENSCS'}`, 540, 1070);

      // Bottom footer divider
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, 1140);
      ctx.lineTo(1000, 1140);
      ctx.stroke();

      // Website URL watermark at bottom
      ctx.fillStyle = '#00E676';
      ctx.font = `bold 22px ${fontStack}`;
      ctx.fillText('enscs-football.onrender.com', 540, 1180);

      ctx.fillStyle = '#64748B';
      ctx.font = `500 16px ${fontStack}`;
      ctx.fillText('National Higher School of Cybersecurity Tournament Platform', 540, 1215);

      // Export canvas to data URL and Blob
      const dataUrl = canvas.toDataURL('image/png');
      setCardDataUrl(dataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          setCardBlob(blob);
          const file = new File([blob], fileName, { type: 'image/png' });
          if (
            typeof navigator !== 'undefined' &&
            navigator.canShare &&
            navigator.canShare({ files: [file] })
          ) {
            setCanShareFile(true);
          }
        }
      }, 'image/png');
    } catch (err: any) {
      console.error('Failed to generate match result card:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardBlob) return;
    try {
      const file = new File([cardBlob], fileName, { type: 'image/png' });
      if (navigator.share && canShareFile) {
        await navigator.share({
          files: [file],
          title: `${match.home_team_name} vs ${match.away_team_name}`,
          text: `Match result: ${match.home_team_name} ${match.home_score}-${match.away_score} ${match.away_team_name}\nENSCS Football Tournament`,
        });
      } else {
        handleDownload();
      }
    } catch {
      // User cancelled share
    }
  };

  const handleDownload = () => {
    if (!cardDataUrl) return;
    const a = document.createElement('a');
    a.href = cardDataUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <button
        type="button"
        onClick={generateCard}
        className={`min-h-[44px] px-4 py-2.5 rounded-2xl bg-pitch-card hover:bg-pitch-cardHover border border-pitch-border text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center space-x-2 shadow-md ${className}`}
        title="Generate shareable match card image for Instagram / WhatsApp stories"
      >
        <Camera className="w-4 h-4 text-emerald-400" />
        <span>Story Card</span>
      </button>

      {/* Preview Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/90 backdrop-blur-md flex items-center justify-center animate-fadeIn"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-pitch-darkest border border-pitch-border rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-white text-base uppercase tracking-tight">
                  Match Story Card
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generating ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold">Rendering high-res story card...</span>
              </div>
            ) : cardDataUrl ? (
              <div className="space-y-4">
                {/* Visual Image Preview */}
                <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-pitch-darkest max-h-[50vh] flex items-center justify-center">
                  <img
                    src={cardDataUrl}
                    alt="Result Card Preview"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {canShareFile ? (
                    <button
                      type="button"
                      onClick={handleShare}
                      className="min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-pitch-darkest font-black text-xs uppercase tracking-wider shadow-glow transition flex items-center justify-center space-x-2"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Story</span>
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleDownload}
                    className={`min-h-[44px] py-3 px-4 rounded-xl border font-black text-xs uppercase tracking-wider transition flex items-center justify-center space-x-2 ${
                      canShareFile
                        ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white'
                        : 'w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-pitch-darkest shadow-glow'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Download className="w-4 h-4" />}
                    <span>{copied ? 'Downloaded!' : 'Download Image'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-xs text-red-400">
                Could not render result card.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

