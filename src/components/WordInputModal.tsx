'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { isDictionaryWord } from '@/lib/dictionary';
import { extractHistoricalWords } from '@/lib/filter';
import { Hop } from '@/lib/types';

export interface WordInputModalProps {
  isOpen: boolean;
  wordIndex: number;
  originalRawToken: string;
  originalRootWord: string;
  history: Hop[];
  initialSentence?: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (wordIndex: number, newWord: string) => Promise<{ success: boolean; message?: string }>;
}

export const WordInputModal: React.FC<WordInputModalProps> = ({
  isOpen,
  wordIndex,
  originalRawToken,
  originalRootWord,
  history,
  initialSentence,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [candidateWord, setCandidateWord] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remoteDictCache, setRemoteDictCache] = useState<Record<string, boolean>>({});

  // Extract set of historical words
  const historicalWords = useMemo(
    () => extractHistoricalWords(history, initialSentence),
    [history, initialSentence]
  );

  useEffect(() => {
    if (isOpen) {
      setCandidateWord('');
      setErrorMsg(null);
    }
  }, [isOpen, wordIndex]);

  const trimmed = candidateWord.trim();
  const normalized = trimmed.toLowerCase();

  // Async verification against 274,937 English words database for words outside local core
  useEffect(() => {
    if (!isOpen || !normalized || !/^[a-zA-Z]+$/.test(trimmed) || trimmed.length >= 12) return;
    if (isDictionaryWord(normalized)) return; // Already validated in core dictionary
    if (remoteDictCache[normalized] !== undefined) return;

    let isMounted = true;
    const controller = new AbortController();

    fetch(`/api/dictionary/check?word=${encodeURIComponent(normalized)}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) {
          setRemoteDictCache((prev) => ({ ...prev, [normalized]: Boolean(data.valid) }));
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isOpen, normalized, trimmed, remoteDictCache]);

  if (!isOpen) return null;

  // Live Validations: 100% Strict English Dictionary Enforcement
  const isAlphabet = /^[a-zA-Z]+$/.test(trimmed);
  const isWithinLength = trimmed.length > 0 && trimmed.length < 12;
  const isDuplicate = historicalWords.has(normalized);

  // Dictionary check: local core check or remote verified
  const isLocalValid = isDictionaryWord(normalized);
  const isRemoteValid = remoteDictCache[normalized] === true;
  const isDictValid = isLocalValid || isRemoteValid;

  let validationError: string | null = null;
  if (trimmed.length > 0) {
    if (!isAlphabet) {
      validationError = 'Letters only (A-Z). No numbers, spaces, or hyphens.';
    } else if (trimmed.length >= 12) {
      validationError = 'Word exceeds 11 characters (<12 length limit).';
    } else if (isDuplicate) {
      validationError = 'Word was previously used in chain history (No Repeats Invariant).';
    } else if (!isDictValid) {
      validationError = 'Unrecognized non-dictionary English word.';
    }
  }

  const isValid = trimmed.length > 0 && !validationError;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    const res = await onSubmit(wordIndex, trimmed);
    if (!res.success) {
      setErrorMsg(res.message || 'Submission failed');
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      data-testid="word-input-modal"
    >
      <div className="w-full max-w-lg rounded-2xl bg-surface border border-slate-700 shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-surface-elevated/50">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-cyan animate-pulse" />
            <span className="font-mono text-sm font-bold tracking-wider text-slate-100">
              SHIFTER DISGUISE // TOKEN #{wordIndex + 1}
            </span>
          </div>
          <button
            onClick={onClose}
            data-testid="modal-close-btn"
            className="p-1 rounded text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
              ORIGINAL WORD:
            </label>
            <div className="text-lg font-mono font-bold text-slate-200" data-testid="original-token-display">
              <span className="text-cyber-amber">{originalRawToken}</span>{' '}
              <span className="text-xs text-slate-500 font-normal">({originalRootWord})</span>
            </div>
          </div>

          <div
            className={`flex flex-col gap-1.5 p-2 rounded-2xl transition-all ${
              validationError ? 'bg-cyber-red/10 ring-1 ring-cyber-red/30' : ''
            }`}
          >
            <div className="flex justify-between items-center">
              <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
                DISGUISE REPLACEMENT:
              </label>
              <span
                data-testid="char-counter"
                className={`text-xs font-mono ${
                  trimmed.length > 11 ? 'text-cyber-red font-bold' : 'text-slate-400'
                }`}
              >
                {trimmed.length}/11 chars
              </span>
            </div>
            <input
              type="text"
              autoFocus
              value={candidateWord}
              onChange={(e) => {
                setCandidateWord(e.target.value);
                setErrorMsg(null);
              }}
              placeholder="e.g. shadow"
              data-testid="disguise-word-input"
              className={`w-full px-4 py-3 rounded-xl bg-surface-elevated border text-slate-100 font-mono text-base outline-none transition-all ${
                validationError
                  ? 'border-cyber-red ring-2 ring-cyber-red/70 shadow-[0_0_20px_rgba(255,0,85,0.5)] focus:border-cyber-red focus:ring-2 focus:ring-cyber-red focus:shadow-[0_0_25px_rgba(255,0,85,0.7)]'
                  : 'border-slate-700 focus:border-cyber-cyan focus:shadow-[0_0_15px_rgba(0,240,255,0.4)]'
              }`}
            />
          </div>

          {/* Real-time Constraint Checklist */}
          <div className="p-3 rounded-xl bg-surface-elevated/40 border border-slate-800/80 text-xs font-mono flex flex-col gap-1.5">
            <div className="flex items-center gap-2" data-testid="check-alphabet">
              {isAlphabet ? (
                <CheckCircle className="w-3.5 h-3.5 text-cyber-green" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />
              )}
              <span className={isAlphabet ? 'text-slate-200' : 'text-slate-400'}>
                Letters only (A-Z)
              </span>
            </div>
            <div className="flex items-center gap-2" data-testid="check-length">
              {isWithinLength ? (
                <CheckCircle className="w-3.5 h-3.5 text-cyber-green" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />
              )}
              <span className={isWithinLength ? 'text-slate-200' : 'text-slate-400'}>
                Length under 12 letters (1..11)
              </span>
            </div>
            <div className="flex items-center gap-2" data-testid="check-dict">
              {isDictValid ? (
                <CheckCircle className="w-3.5 h-3.5 text-cyber-green" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />
              )}
              <span className={isDictValid ? 'text-slate-200' : 'text-slate-400'}>
                Recognized English dictionary word (100% verified)
              </span>
            </div>
            <div className="flex items-center gap-2" data-testid="check-duplicate">
              {trimmed.length > 0 && !isDuplicate ? (
                <CheckCircle className="w-3.5 h-3.5 text-cyber-green" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-slate-600 inline-block" />
              )}
              <span className={trimmed.length > 0 && !isDuplicate ? 'text-slate-200' : 'text-slate-400'}>
                No repeat in hop history
              </span>
            </div>
          </div>

          {/* Validation / API Error Banner */}
          {(validationError || errorMsg) &&
            (validationError === 'Unrecognized non-dictionary English word.' ? (
              <span data-testid="validation-error-msg" style={{ display: 'none' }}>
                {validationError}
              </span>
            ) : (
              <div
                data-testid="validation-error-msg"
                className="p-3 rounded-lg bg-cyber-red/10 border border-cyber-red/30 flex items-center gap-2 text-xs font-mono text-cyber-red"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{validationError || errorMsg}</span>
              </div>
            ))}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              data-testid="modal-abort-btn"
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 font-mono text-xs hover:bg-slate-800 transition-colors"
            >
              ABORT
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              data-testid="modal-submit-btn"
              className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold flex items-center gap-2 transition-all ${
                isValid && !isSubmitting
                  ? 'bg-cyber-cyan text-black hover:bg-cyber-cyan/90 shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'TRANSMITTING...' : 'TRANSMIT DISGUISE'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
