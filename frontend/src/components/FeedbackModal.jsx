import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Bug,
  Lightbulb,
  MessageSquare,
  Star,
  Send,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Users,
  Paperclip,
  Image as ImageIcon,
  Film,
  Trash2,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { submitFeedback, getMyFeedback, getPublicFeedback } from '../services/api.js';
import { FriendlyValidationModal } from './FriendlyValidationModal.jsx';

const CATEGORIES = [
  {
    id: 'bug_report',
    label: 'Bug Report',
    icon: Bug,
    placeholder: 'What went wrong? Steps to reproduce help us fix it faster...',
    titlePlaceholder: 'Short bug summary (optional)',
    accent: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40',
  },
  {
    id: 'feature_request',
    label: 'Feature',
    icon: Lightbulb,
    placeholder: 'What feature or workflow would make ChangeLens more useful for you?',
    titlePlaceholder: 'Feature idea title (optional)',
    accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40',
  },
  {
    id: 'general_feedback',
    label: 'General',
    icon: MessageSquare,
    placeholder: 'Share your thoughts, impressions, or suggestions...',
    titlePlaceholder: '',
    accent: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/15 border-cyan-300 dark:border-cyan-500/40',
  },
  {
    id: 'app_rating',
    label: 'Rate App',
    icon: Star,
    placeholder: 'Optional: what did you like most or what can we improve?',
    titlePlaceholder: '',
    accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40',
  },
];

const STAR_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Excellent',
};

const STAR_BAR_COLORS = {
  5: 'bg-emerald-500',
  4: 'bg-emerald-400',
  3: 'bg-amber-400',
  2: 'bg-orange-400',
  1: 'bg-rose-500',
};

const STAR_PILL_COLORS = {
  5: 'bg-emerald-600 text-white',
  4: 'bg-emerald-500 text-white',
  3: 'bg-amber-500 text-white',
  2: 'bg-orange-500 text-white',
  1: 'bg-rose-600 text-white',
};

const TYPE_BADGES = {
  bug_report: { label: 'Bug Report', cls: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300' },
  feature_request: { label: 'Feature', cls: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  general_feedback: { label: 'General', cls: 'bg-cyan-100 dark:bg-cyan-500/15 text-cyan-700 dark:text-cyan-300' },
  app_rating: { label: 'App Rating', cls: 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300' },
  analysis_rating: { label: 'Analysis Rating', cls: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
};

const COMMUNITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'bug_report', label: 'Bugs' },
  { id: 'feature_request', label: 'Features' },
  { id: 'general_feedback', label: 'General' },
  { id: 'app_rating', label: 'App Ratings' },
  { id: 'analysis_rating', label: 'Analysis' },
];

const MAX_FILES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function AttachmentGallery({ attachments = [], onPreviewImage }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((att, idx) =>
        att.mediaType === 'video' ? (
          <div
            key={`${att.url}-${idx}`}
            className="w-full sm:w-56 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black"
          >
            <video
              src={att.url}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-36 object-contain bg-black"
            />
            {att.fileName && (
              <div className="px-2 py-1 text-[10px] text-slate-300 bg-slate-900/90 truncate flex items-center gap-1">
                <Film className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{att.fileName}</span>
              </div>
            )}
          </div>
        ) : (
          <button
            key={`${att.url}-${idx}`}
            type="button"
            onClick={() => onPreviewImage && onPreviewImage(att)}
            className="group relative w-24 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer shrink-0"
            title={att.fileName || 'View screenshot'}
          >
            <img
              src={att.url}
              alt={att.fileName || 'Bug screenshot'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/35 flex items-center justify-center transition-colors">
              <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          </button>
        )
      )}
    </div>
  );
}

export function FeedbackModal({
  isOpen,
  onClose,
  currentAnalysisId = null,
  initialCategory = 'general_feedback',
}) {
  const [activeView, setActiveView] = useState('submit'); // 'submit' | 'community' | 'history'
  const [category, setCategory] = useState(initialCategory);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]); // [{ id, fileName, mimeType, mediaType, size, dataUrl }]
  const [includeContext, setIncludeContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);
  const [apiError, setApiError] = useState(null);

  // Community tab state (5-star rating breakdown + public feed)
  const [communityItems, setCommunityItems] = useState([]);
  const [communityStats, setCommunityStats] = useState(null);
  const [communityTypeFilter, setCommunityTypeFilter] = useState('all');
  const [communityStarFilter, setCommunityStarFilter] = useState(null);
  const [loadingCommunity, setLoadingCommunity] = useState(false);

  // User history state
  const [historyItems, setHistoryItems] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Image lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);

  // Compact validation popup
  const [validationPopup, setValidationPopup] = useState({
    isOpen: false,
    title: '',
    message: '',
    iconType: 'alert',
  });

  const messageRef = useRef(null);
  const fileInputRef = useRef(null);
  const openCategoryKey = isOpen ? `${initialCategory || 'general_feedback'}` : 'closed';
  const [prevOpenCategoryKey, setPrevOpenCategoryKey] = useState(openCategoryKey);

  if (openCategoryKey !== prevOpenCategoryKey) {
    setPrevOpenCategoryKey(openCategoryKey);
    if (isOpen) {
      setCategory(initialCategory || 'general_feedback');
      setSubmittedRecord(null);
      setApiError(null);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else if (!validationPopup.isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, validationPopup.isOpen, lightboxImage]);

  // Load Community stats & public feed
  useEffect(() => {
    if (!isOpen || activeView !== 'community') return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadingCommunity(true);
      getPublicFeedback({
        type: communityTypeFilter,
        rating: communityStarFilter || '',
        limit: 30,
      })
        .then((data) => {
          if (!cancelled) {
            setCommunityItems(data?.feedback || []);
            setCommunityStats(data?.stats || null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCommunityItems([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingCommunity(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeView, communityTypeFilter, communityStarFilter]);

  // Load current user's submissions
  useEffect(() => {
    if (!isOpen || activeView !== 'history') return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoadingHistory(true);
      getMyFeedback(20)
        .then((data) => {
          if (!cancelled) setHistoryItems(data?.feedback || []);
        })
        .catch(() => {
          if (!cancelled) setHistoryItems([]);
        })
        .finally(() => {
          if (!cancelled) setLoadingHistory(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen, activeView]);

  if (!isOpen) return null;

  const activeCategoryConfig =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[2];
  const isRatingMode = category === 'app_rating';
  const displayedStar = hoverRating || rating;

  const handleFilesSelected = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    if (attachments.length + files.length > MAX_FILES) {
      setValidationPopup({
        isOpen: true,
        title: 'File Limit Reached',
        message: `You can attach up to ${MAX_FILES} screenshots or videos per submission.`,
        iconType: 'alert',
      });
      return;
    }

    const nextItems = [];
    for (const file of files) {
      const mime = (file.type || '').toLowerCase();
      const isImage = ALLOWED_IMAGE_TYPES.includes(mime);
      const isVideo = ALLOWED_VIDEO_TYPES.includes(mime);

      if (!isImage && !isVideo) {
        setValidationPopup({
          isOpen: true,
          title: 'Unsupported File Type',
          message: `"${file.name}" is not supported. Use PNG, JPG, WebP, GIF, MP4, WebM, or MOV.`,
          iconType: 'alert',
        });
        return;
      }

      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > maxBytes) {
        setValidationPopup({
          isOpen: true,
          title: 'File Too Large',
          message: `"${file.name}" exceeds the ${isVideo ? '12 MB video' : '5 MB image'} limit.`,
          iconType: 'alert',
        });
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        nextItems.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fileName: file.name,
          mimeType: mime,
          mediaType: isVideo ? 'video' : 'image',
          size: file.size,
          dataUrl,
        });
      } catch {
        setValidationPopup({
          isOpen: true,
          title: 'Could Not Read File',
          message: `Unable to read "${file.name}". Please try selecting it again.`,
          iconType: 'alert',
        });
        return;
      }
    }

    setAttachments((prev) => [...prev, ...nextItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const buildDebugContext = () => {
    if (!includeContext || typeof window === 'undefined') return {};
    let viewMode = '2D';
    try {
      viewMode = localStorage.getItem('changelens_graph_view_mode') || '2D';
    } catch {}
    const width = window.innerWidth;
    const deviceType = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';
    return {
      pageUrl: window.location.pathname + window.location.search,
      viewMode,
      deviceType,
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (isRatingMode && rating < 1) {
      setValidationPopup({
        isOpen: true,
        title: 'Star Rating Required',
        message: 'Please select a star rating from 1 to 5 before submitting.',
        iconType: 'sparkles',
      });
      return;
    }

    if (!isRatingMode && message.trim().length < 3) {
      setValidationPopup({
        isOpen: true,
        title: 'Message Required',
        message: 'Please write a short message so we know how to help.',
        iconType: 'alert',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payloadAttachments = attachments.map((a) => ({
        fileName: a.fileName,
        dataUrl: a.dataUrl,
      }));

      const result = await submitFeedback({
        type: category,
        rating: rating > 0 ? rating : null,
        title: title.trim(),
        message: message.trim(),
        analysisId: includeContext ? currentAnalysisId : null,
        attachments: payloadAttachments,
        context: buildDebugContext(),
      });
      setSubmittedRecord(result?.feedback || { type: category, rating });
      setTitle('');
      setMessage('');
      setRating(0);
      setAttachments([]);
    } catch (err) {
      setApiError(err.message || 'Could not submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmittedRecord(null);
    setApiError(null);
    setActiveView('submit');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-xl bg-white dark:bg-[#0f1626] border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-500/15 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                Feedback & Community Ratings
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Report bugs with media, request features, or browse user ratings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/feedback"
              className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 hover:underline px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/60 transition-colors"
              title="Open dedicated Feedback & Community Page"
            >
              <span>Full Page Hub</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close feedback modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-navigation: New Feedback | Community | My Submissions */}
        <div className="px-5 pt-3 flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveView('submit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'submit'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            New Feedback
          </button>
          <button
            type="button"
            onClick={() => setActiveView('community')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'community'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Community & Ratings</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeView === 'history'
                ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>My Submissions</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto">
          {activeView === 'community' ? (
            <div className="space-y-4">
              {/* 5-Star Ratings Breakdown Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-[135px_1fr] gap-4 items-center">
                {/* Average Rating Left Block */}
                <div className="flex flex-col items-center justify-center sm:border-r border-slate-200 dark:border-slate-800 sm:pr-4 text-center">
                  <div className="inline-flex items-center gap-1.5 text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    <span>
                      {communityStats && communityStats.totalRatings > 0
                        ? communityStats.averageRating.toFixed(1)
                        : '0.0'}
                    </span>
                    <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
                  </div>
                  <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-snug">
                    {communityStats?.totalRatings ?? 0} Ratings &amp;
                    <br />
                    {communityStats?.totalReviews ?? 0} Reviews
                  </p>
                </div>

                {/* 5-to-1 Star Progress Bars Right Block */}
                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = communityStats?.starDistribution?.[star] ?? 0;
                    const total = communityStats?.totalRatings ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const isSelected = communityStarFilter === star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() =>
                          setCommunityStarFilter((prev) => (prev === star ? null : star))
                        }
                        className={`w-full flex items-center gap-2.5 text-xs px-1.5 py-0.5 rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-100/80 dark:bg-cyan-500/15 ring-1 ring-cyan-400/50'
                            : 'hover:bg-slate-200/60 dark:hover:bg-slate-800/70'
                        }`}
                        title={`Filter by ${star}-star ratings`}
                      >
                        <span className="w-8 flex items-center justify-end gap-0.5 font-bold text-slate-700 dark:text-slate-200 shrink-0">
                          {star}
                          <Star className="w-3 h-3 fill-slate-600 dark:fill-slate-300 text-slate-600 dark:text-slate-300" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${STAR_BAR_COLORS[star]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-[11px] font-mono text-slate-600 dark:text-slate-400 shrink-0">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COMMUNITY_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setCommunityTypeFilter(f.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                        communityTypeFilter === f.id
                          ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {communityStarFilter && (
                  <button
                    type="button"
                    onClick={() => setCommunityStarFilter(null)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 cursor-pointer"
                  >
                    <span>{communityStarFilter}★ only</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Public Community Feedback Feed */}
              {loadingCommunity ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                  <span>Loading community feedback...</span>
                </div>
              ) : communityItems.length === 0 ? (
                <div className="py-8 text-center space-y-2 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No matching community reports or ratings yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('submit')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                  >
                    Be the First to Share
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {communityItems.map((item) => {
                    const badge = TYPE_BADGES[item.type] || TYPE_BADGES.general_feedback;
                    const initial = (item.authorName || 'U').charAt(0).toUpperCase();
                    return (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-cyan-600/15 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold text-[11px] flex items-center justify-center shrink-0">
                              {initial}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {item.authorName || 'ChangeLens User'}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.rating && (
                              <span
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                  STAR_PILL_COLORS[item.rating] || 'bg-emerald-600 text-white'
                                }`}
                              >
                                {item.rating}
                                <Star className="w-2.5 h-2.5 fill-current" />
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {item.title && (
                          <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </div>
                        )}
                        {item.message && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {item.message}
                          </p>
                        )}

                        <AttachmentGallery
                          attachments={item.attachments}
                          onPreviewImage={setLightboxImage}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeView === 'history' ? (
            <div className="space-y-2.5">
              {loadingHistory ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                  <span>Loading your feedback...</span>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    You have not submitted any feedback yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('submit')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer"
                  >
                    Share Feedback
                  </button>
                </div>
              ) : (
                historyItems.map((item) => {
                  const badge = TYPE_BADGES[item.type] || TYPE_BADGES.general_feedback;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.cls}`}>
                          {badge.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.rating && (
                            <span
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                STAR_PILL_COLORS[item.rating] || 'bg-emerald-600 text-white'
                              }`}
                            >
                              {item.rating}
                              <Star className="w-2.5 h-2.5 fill-current" />
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {item.title && (
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </div>
                      )}
                      {item.message && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {item.message}
                        </p>
                      )}
                      <AttachmentGallery
                        attachments={item.attachments}
                        onPreviewImage={setLightboxImage}
                      />
                    </div>
                  );
                })
              )}
            </div>
          ) : submittedRecord ? (
            /* Success state */
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Thank you for your feedback!
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto leading-relaxed">
                Your submission is saved and now visible in the community ratings &amp; feedback feed.
              </p>
              <div className="pt-3 flex items-center justify-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedRecord(null);
                    setActiveView('community');
                  }}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/15 hover:bg-cyan-100 dark:hover:bg-cyan-500/25 border border-cyan-200 dark:border-cyan-500/30 cursor-pointer"
                >
                  View Community Feed
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Send Another
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Feedback submission form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Category
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const active = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategory(cat.id);
                          setApiError(null);
                        }}
                        className={`flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                          active
                            ? `${cat.accent} shadow-sm scale-[1.01]`
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5-Star Rating Selector */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {isRatingMode ? 'Rate your experience' : 'Overall rating (optional)'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {displayedStar ? STAR_LABELS[displayedStar] : 'Tap a star to rate'}
                  </div>
                </div>
                <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                      aria-label={`Rate ${star} out of 5 stars`}
                    >
                      <Star
                        className={`w-5 h-5 transition-colors ${
                          star <= displayedStar
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Short Title (Bug Report / Feature Request) */}
              {activeCategoryConfig.titlePlaceholder && (
                <div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={160}
                    placeholder={activeCategoryConfig.titlePlaceholder}
                    className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-[#090e1a] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* Message Textarea */}
              <div>
                <textarea
                  ref={messageRef}
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  placeholder={activeCategoryConfig.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-white dark:bg-[#090e1a] border border-slate-300 dark:border-slate-700 focus:border-cyan-500 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none resize-none transition-colors"
                />
              </div>

              {/* Compact Media Attachments Section (Screenshots & Short Videos) */}
              {!isRatingMode && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>
                        {category === 'bug_report'
                          ? 'Attach Screenshot or Bug Video (optional)'
                          : 'Attach Screenshot or Video (optional)'}
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {attachments.length}/{MAX_FILES} · Img ≤5MB · Vid ≤12MB
                    </span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                    onChange={(e) => handleFilesSelected(e.target.files)}
                    className="hidden"
                  />

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFilesSelected(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-500/70 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                      <ImageIcon className="w-4 h-4 text-cyan-500 shrink-0" />
                      <Film className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Click or drop screenshots (PNG/JPG/GIF) or short videos (MP4/WebM)</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shrink-0">
                      Browse
                    </span>
                  </div>

                  {/* Selected Attachments Preview */}
                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
                        >
                          {att.mediaType === 'video' ? (
                            <video
                              src={att.dataUrl}
                              muted
                              playsInline
                              className="w-full h-20 object-cover bg-black"
                            />
                          ) : (
                            <img
                              src={att.dataUrl}
                              alt={att.fileName}
                              className="w-full h-20 object-cover"
                            />
                          )}
                          <div className="px-2 py-1 flex items-center justify-between gap-1 text-[10px] bg-slate-50 dark:bg-slate-950/70">
                            <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                              {att.fileName}
                            </span>
                            <span className="text-slate-400 shrink-0">
                              {formatBytes(att.size)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(att.id)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-slate-950/75 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                            title="Remove file"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Context Checkbox + Char Count */}
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={(e) => setIncludeContext(e.target.checked)}
                    className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Include page &amp; active view info</span>
                </label>
                <span>{message.length}/2000</span>
              </div>

              {apiError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300">
                  {apiError}
                </div>
              )}

              {/* Submit Row */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-sm active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{attachments.length > 0 ? 'Uploading...' : 'Sending...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Feedback</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Screenshot Lightbox Viewer */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-3 -right-3 p-1.5 rounded-full bg-slate-900 text-white border border-slate-700 hover:bg-rose-600 cursor-pointer shadow-lg"
              aria-label="Close image preview"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.fileName || 'Screenshot'}
              className="max-w-full max-h-[80vh] rounded-xl border border-slate-700 shadow-2xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Compact validation popup */}
      <FriendlyValidationModal
        isOpen={validationPopup.isOpen}
        onClose={() => setValidationPopup((prev) => ({ ...prev, isOpen: false }))}
        title={validationPopup.title}
        message={validationPopup.message}
        iconType={validationPopup.iconType}
        primaryActionLabel="Got it"
        onPrimaryAction={() => {
          setValidationPopup((prev) => ({ ...prev, isOpen: false }));
          setTimeout(() => messageRef.current?.focus(), 80);
        }}
      />
    </div>
  );
}
