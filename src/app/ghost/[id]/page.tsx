'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Terminal, Award, AlertOctagon, Share2, ArrowLeft, Check, Users, History } from 'lucide-react';
import { GhostReceipt } from '@/lib/types';
import { GhostHopDiff } from '@/lib/ghosts';
import { GhostTimeline } from '@/components/GhostTimeline';

export default function GhostReceiptPage() {
  const params = useParams();
  const id = params?.id as string;

  const [receipt, setReceipt] = useState<GhostReceipt | null>(null);
  const [diffs, setDiffs] = useState<GhostHopDiff[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    async function fetchReceipt() {
      try {
        const res = await fetch(`/api/ghost/${id}`);
        const data = await res.json();
        if (data.success && data.receipt) {
          setReceipt(data.receipt);
          setDiffs(data.diffs || []);
        } else {
          setError(data.message || 'Archived record not found.');
        }
      } catch (err: unknown) {
        const errObj = err as Error;
        setError(errObj?.message || 'Error fetching archive.');
      } finally {
        setLoading(false);
      }
    }
    fetchReceipt();
  }, [id]);

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div
        data-testid="ghost-loading"
        className="min-h-screen flex items-center justify-center font-mono text-slate-400 bg-background"
      >
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
          <span>DECRYPTING GHOST ARCHIVE...</span>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div
        data-testid="ghost-not-found"
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center font-mono bg-background"
      >
        <AlertOctagon className="w-12 h-12 text-cyber-red mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-slate-100 mb-2">RECORD EXPUNGED OR MISSING</h1>
        <p className="text-slate-400 text-sm mb-6">{error || 'Chain receipt could not be resolved.'}</p>
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface border border-slate-700 text-cyber-cyan hover:bg-cyber-cyan hover:text-black transition-all text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          RETURN TO TERMINAL
        </Link>
      </div>
    );
  }

  const isVictory = receipt.outcome === 'victory';

  return (
    <main
      data-testid="ghost-receipt-page"
      className="min-h-screen p-4 sm:p-8 max-w-5xl mx-auto w-full flex flex-col gap-8 font-mono"
    >
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-cyber-cyan transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO TERMINAL</span>
        </Link>

        <button
          onClick={handleCopyLink}
          data-testid="copy-permalink-btn"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-elevated hover:bg-slate-800 border border-slate-700 text-cyber-cyan text-xs font-bold transition-all active:scale-95 shadow-lg"
        >
          {copied ? <Check className="w-4 h-4 text-cyber-green" /> : <Share2 className="w-4 h-4" />}
          <span>{copied ? 'LINK COPIED' : 'SHARE GHOST RECEIPT'}</span>
        </button>
      </div>

      {/* Receipt Card Header */}
      <section className="p-6 sm:p-8 rounded-2xl bg-surface border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Terminal className="w-4 h-4 text-cyber-cyan" />
              <span>HALL OF GHOSTS // PERMANENT ARCHIVAL RECORD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-100" data-testid="receipt-chain-id">
              CHAIN #{receipt.chainId}
            </h1>
          </div>

          <div>
            {isVictory ? (
              <span
                data-testid="outcome-victory-badge"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-green/10 border border-cyber-green text-cyber-green font-bold text-sm shadow-[0_0_20px_rgba(0,255,136,0.4)]"
              >
                <Award className="w-5 h-5" /> 100-HOP VICTORY
              </span>
            ) : (
              <span
                data-testid="outcome-destroyed-badge"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-red/10 border border-cyber-red text-cyber-red font-bold text-sm shadow-[0_0_20px_rgba(255,0,85,0.4)]"
              >
                <AlertOctagon className="w-5 h-5" /> SIGNAL COLLAPSE (DESTROYED)
              </span>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-6 text-xs border-b border-slate-800">
          <div className="flex flex-col">
            <span className="text-slate-500">ORIGIN THEME</span>
            <strong className="text-slate-200 capitalize text-sm">{receipt.themeTitle.replace(/-/g, ' ')}</strong>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500">FINAL HOP</span>
            <strong className="text-cyber-cyan text-sm">{receipt.finalHop} / 100</strong>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500">CONTRIBUTORS</span>
            <strong className="text-cyber-green text-sm flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {receipt.totalContributors} Operatives
            </strong>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500">ARCHIVED AT</span>
            <strong className="text-slate-400 text-xs">{new Date(receipt.completedAt).toLocaleString()}</strong>
          </div>
        </div>

        {/* Origin Sentence vs Final Sentence */}
        <div className="pt-6 flex flex-col gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-bold">ORIGIN SENTENCE (HOP 0):</span>
            <p className="mt-1 p-3 rounded-lg bg-surface-elevated border border-slate-800/80 text-slate-300" data-testid="receipt-initial-sentence">
              {receipt.initialSentence}
            </p>
          </div>
          <div>
            <span className="text-slate-500 font-bold">FINAL SENTENCE (HOP #{receipt.finalHop}):</span>
            <p className="mt-1 p-3 rounded-lg bg-surface-elevated border border-slate-800/80 text-slate-200 font-bold" data-testid="receipt-final-sentence">
              {receipt.finalSentence}
            </p>
          </div>
        </div>
      </section>

      {/* Mutation Timeline */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
          <History className="w-4 h-4 text-cyber-cyan" />
          <span>CHRONOLOGICAL MUTATION TIMELINE</span>
        </div>

        <GhostTimeline diffs={diffs} />
      </section>
    </main>
  );
}
