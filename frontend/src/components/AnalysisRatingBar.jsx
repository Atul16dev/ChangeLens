import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, Send, RefreshCw } from 'lucide-react';
import { submitFeedback, getAnalysisRating } from '../services/api.js';

const STAR_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Spot on',
};

export function AnalysisRatingBar({ analysisId }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [note, setNote] = useState('');
  const [showNoteBox, setShowNoteBox] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [prevAnalysisId, setPrevAnalysisId] = useState(analysisId);

  if (analysisId !== prevAnalysisId) {
    setPrevAnalysisId(analysisId);
    setRating(0);
    setNote('');
    setShowNoteBox(false);
    setSaved(false);
    setError(null);
  }

  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;

    getAnalysisRating(analysisId)
      .then((res) => {
        if (!cancelled && res?.userRating?.rating) {
          setRating(res.userRating.rating);
          setNote(res.userRating.message || '');
          setSaved(true);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [analysisId]);

  if (!analysisId) return null;

  const displayed = hoverRating || rating;

  const saveRating = async (nextStar, nextNote = note) => {
    setSaving(true);
    setError(null);
    try {
      let viewMode = '2D';
      try {
        viewMode = localStorage.getItem('changelens_graph_view_mode') || '2D';
      } catch {}
      await submitFeedback({
        type: 'analysis_rating',
        rating: nextStar,
        message: nextNote.trim(),
        analysisId,
        context: {
          pageUrl: typeof window !== 'undefined' ? window.location.pathname + window.location.search : null,
          viewMode,
          deviceType:
            typeof window !== 'undefined'
              ? window.innerWidth < 640
                ? 'mobile'
                : window.innerWidth < 1024
                ? 'tablet'
                : 'desktop'
              : null,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Could not save rating');
    } finally {
      setSaving(false);
    }
  };

  const handleStarClick = async (star) => {
    setRating(star);
    setShowNoteBox(true);
    await saveRating(star, note);
  };

  const handleNoteSubmit = async (e) => {
    e.preventDefault();
    if (!rating) return;
    await saveRating(rating, note);
    setShowNoteBox(false);
  };

  return (
    <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-[#0c1220] px-3.5 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {saved ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : null}
          <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
            {saved
              ? `Rated ${rating}/5${displayed && STAR_LABELS[displayed] ? ` · ${STAR_LABELS[displayed]}` : ''}`
              : displayed
              ? STAR_LABELS[displayed]
              : 'Rate this analysis'}
          </span>
        </div>

        <div
          className="flex items-center gap-0.5 shrink-0"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={saving}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHoverRating(star)}
              className="p-0.5 transition-transform hover:scale-110 active:scale-95 disabled:opacity-60 cursor-pointer"
              title={`Rate ${star} out of 5`}
              aria-label={`Rate analysis ${star} out of 5 stars`}
            >
              <Star
                className={`w-4 h-4 transition-colors ${
                  star <= displayed
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-slate-300 dark:text-slate-600'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      {showNoteBox && (
        <form onSubmit={handleNoteSubmit} className="mt-2 flex items-center gap-1.5">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder="Optional note on accuracy..."
            className="flex-1 min-w-0 px-2.5 py-1 rounded-lg text-[11px] bg-white dark:bg-[#090e1a] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 cursor-pointer shrink-0"
          >
            {saving ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            <span>Save</span>
          </button>
        </form>
      )}

      {error && (
        <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400">{error}</p>
      )}
    </div>
  );
}
