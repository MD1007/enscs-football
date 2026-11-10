'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  text: string;
  /** Site path to share, e.g. /matches/35 */
  path: string;
  label?: string;
  className?: string;
}

/** Opens the phone's share sheet (WhatsApp, Telegram, ...) or copies the text and link. */
export default function ShareButton({ title, text, path, label = 'Share', className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
    } catch {
      return; // share sheet dismissed
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ||
        'inline-flex items-center justify-center space-x-2 min-h-[44px] px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-black uppercase tracking-wider transition'
      }
    >
      {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
      <span aria-live="polite">{copied ? 'Copied!' : label}</span>
    </button>
  );
}
