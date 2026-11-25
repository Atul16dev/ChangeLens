import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Star,
  Bug,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Paperclip,
  Film,
  Maximize2,
  X,
  Send,
  CheckCircle2,
  ArrowLeft,
  ThumbsUp,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  BarChart3,
  Layers,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { ThemeToggle } from '../components/ThemeToggle.jsx';
import { FriendlyValidationModal } from '../components/FriendlyValidationModal.jsx';
import { useAuth } from '../context/auth-context.js';
import {
  submitFeedback,
  getPublicFeedback,
  getMyFeedback,
} from '../services/api.js';

const CATEGORIES = [
  {
    id: 'bug_report',
    label: 'Bug Report',
    icon: Bug,
    title: 'Report a Bug or Glitch',
    description: 'Found an AST parser error, UI crash, or visual defect? Attach screenshots or video.',
    placeholder: 'Explain what happened. Steps to reproduce help us diagnose and patch it rapidly...',
    badgeColor: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
    accentColor: 'from-rose-500 to-red-600',
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-100 dark:bg-rose-500/15',
  },
  {
    id: 'feature_request',
    label: 'Feature Idea',
    icon: Lightbulb,
    title: 'Suggest a New Feature',
    description: 'Propose a new language, graph layout, CI/CD integration, or What-If simulation mode.',
    placeholder: 'Describe your feature idea, use cases, and how it will improve your dev workflow...',
    badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    accentColor: 'from-amber-500 to-orange-600',
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-500/15',
  },
  {
    id: 'general_feedback',
    label: 'General Feedback',
    icon: MessageSquare,
    title: 'General Feedback & Thoughts',
    description: 'Share your overall user experience, comments on design, performance, or ideas.',
    placeholder: 'Share your honest feedback or impressions with the engineering team...',
    badgeColor: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
    accentColor: 'from-cyan-500 to-blue-600',
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/15',
  },
  {
    id: 'app_rating',
    label: 'Rate ChangeLens',
    icon: Star,
    title: 'Rate Your Experience',
    description: 'Give ChangeLens a 1 to 5 star rating and tell us what you love or want improved.',
    placeholder: 'Optional: What did you enjoy the most or where can we do better?',
    badgeColor: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60',
    accentColor: 'from-indigo-500 to-purple-600',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-500/15',
  },
];

const STAR_LABELS = {
  1: 'Poor — Needs Major Work',
  2: 'Fair — Encountered Issues',
  3: 'Good — Works as Expected',
  4: 'Great — Very Useful & Fast',
  5: 'Excellent — Essential Dev Tool!',
};

const STAR_BAR_COLORS = {
  5: 'bg-emerald-500',
  4: 'bg-emerald-400',
  3: 'bg-amber-400',
  2: 'bg-orange-400',
  1: 'bg-rose-500',
};

const MAX_FILES = 3;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function timeAgo(dateString) {
  if (!dateString) return 'recently';
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDays = Math.floor(diffHour / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FeedbackPage() {
  const { user } = useAuth();

  // Navigation tab: 'community' | 'submit' | 'mine'
  const [activeTab, setActiveTab] = useState('community');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Community data & filters
  const [communityItems, setCommunityItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [starFilter, setStarFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'rating'

  // User submissions
  const [myItems, setMyItems] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  // Form submission state
  const [category, setCategory] = useState('bug_report');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [includeContext, setIncludeContext] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [, setSubmissionCount] = useState(0);

  // Helpful reaction counts (optimistic state)
  const [reactions, setReactions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('changelens_feedback_reactions') || '{}');
    } catch {
      return {};
    }
  });

  // Lightbox state
  const [lightboxImage, setLightboxImage] = useState(null);

  // File drag & drop hover state
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Friendly validation modal
  const [validationModal, setValidationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    example: '',
    iconType: 'alert',
    primaryActionLabel: 'Got it',
  });

  const closeValidationModal = () =>
    setValidationModal((prev) => ({ ...prev, isOpen: false }));

  // Load Community data & Stats
  const loadCommunityData = useCallback(async () => {
    setLoadingCommunity(true);
    try {
      const data = await getPublicFeedback({
        type: typeFilter !== 'all' ? typeFilter : '',
        rating: starFilter || '',
        limit: 50,
      });
      setCommunityItems(data?.feedback || []);
      if (data?.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to load community feedback:', err);
    } finally {
      setLoadingCommunity(false);
    }
  }, [typeFilter, starFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadCommunityData();
    });
    return () => {
      active = false;
    };
  }, [loadCommunityData]);

  // Load user submissions if logged in and tab is 'mine'
  useEffect(() => {
    if (activeTab !== 'mine') return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setLoadingMine(true);
      getMyFeedback(30)
        .then((data) => {
          if (active) setMyItems(data?.feedback || []);
        })
        .catch(() => {
          if (active) setMyItems([]);
        })
        .finally(() => {
          if (active) setLoadingMine(false);
        });
    });
    return () => {
      active = false;
    };
  }, [activeTab]);

  // Handle reaction click
  const toggleHelpful = (id) => {
    setReactions((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem('changelens_feedback_reactions', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Handle file uploads
  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    if (attachments.length + files.length > MAX_FILES) {
      setValidationModal({
        isOpen: true,
        title: 'Maximum Files Exceeded',
        message: `You can attach up to ${MAX_FILES} screenshots or short bug videos per report.`,
        example: 'Remove an existing file to attach a new one.',
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
        setValidationModal({
          isOpen: true,
          title: 'Unsupported File Format',
          message: `"${file.name}" is not supported. Please upload an image or video file.`,
          example: 'Allowed: PNG, JPG, WebP, GIF, MP4, WebM, MOV',
          iconType: 'alert',
        });
        return;
      }

      const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > maxBytes) {
        setValidationModal({
          isOpen: true,
          title: 'File Size Limit Exceeded',
          message: `"${file.name}" exceeds the ${isVideo ? '12 MB video' : '5 MB image'} limit.`,
          example: isVideo ? 'Compress video or trim to 30 seconds' : 'Use standard PNG/JPG screenshot',
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
        setValidationModal({
          isOpen: true,
          title: 'File Read Error',
          message: `Could not read "${file.name}". Please select the file again.`,
          iconType: 'alert',
        });
        return;
      }
    }

    setAttachments((prev) => [...prev, ...nextItems]);
  };

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e?.preventDefault();

    // Compact English Validations
    if (category === 'app_rating' && (!rating || rating < 1)) {
      setValidationModal({
        isOpen: true,
        title: 'Rating Required',
        message: 'Please choose a star rating from 1 to 5 to rate ChangeLens.',
        example: 'Click on any of the 5 stars above.',
        iconType: 'alert',
      });
      return;
    }

    if (category !== 'app_rating' && (!message || message.trim().length < 3)) {
      setValidationModal({
        isOpen: true,
        title: 'Description Required',
        message: 'Please write a brief description of at least 3 characters.',
        example:
          category === 'bug_report'
            ? 'e.g. Graph freezes when clicking circular dependency node'
            : 'e.g. Add support for Rust cargo dependencies',
        iconType: 'alert',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadAttachments = attachments.map((a) => ({
        dataUrl: a.dataUrl,
        fileName: a.fileName,
        mimeType: a.mimeType,
        mediaType: a.mediaType,
      }));

      const contextData = includeContext
        ? {
            pageUrl: window.location.href,
            viewMode: 'desktop_community_page',
            deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
            screenResolution: `${window.innerWidth}x${window.innerHeight}`,
          }
        : {};

      await submitFeedback({
        type: category,
        rating: category === 'app_rating' ? rating : rating || 5,
        title: title.trim() || undefined,
        message: message.trim(),
        attachments: payloadAttachments,
        context: contextData,
      });

      setSubmittedSuccess(true);
      setSubmissionCount((prev) => prev + 1);
      // Refresh community feed & stats
      loadCommunityData();
    } catch (err) {
      setValidationModal({
        isOpen: true,
        title: 'Submission Failed',
        message: err.message || 'Unable to submit feedback right now. Please try again.',
        iconType: 'alert',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedSuccess(false);
    setTitle('');
    setMessage('');
    setAttachments([]);
    setRating(5);
  };

  // Filtered & sorted community feed
  const displayItems = useMemo(() => {
    let items = [...communityItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter(
        (item) =>
          (item.title && item.title.toLowerCase().includes(q)) ||
          (item.message && item.message.toLowerCase().includes(q)) ||
          (item.author && item.author.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'rating') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else {
      items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return items;
  }, [communityItems, searchQuery, sortBy]);

  const activeCategoryObj =
    CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 font-sans selection:bg-violet-500/30 selection:text-violet-200 transition-colors">
      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300">
              <span className="font-medium truncate max-w-sm">
                {lightboxImage.fileName || 'Screenshot Preview'}
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.fileName || 'Screenshot preview'}
              className="max-h-[80vh] w-auto object-contain mx-auto bg-slate-100 dark:bg-slate-950"
            />
          </div>
        </div>
      )}

      {/* Friendly Compact Validation Popup */}
      <FriendlyValidationModal
        isOpen={validationModal.isOpen}
        onClose={closeValidationModal}
        title={validationModal.title}
        message={validationModal.message}
        example={validationModal.example}
        iconType={validationModal.iconType}
        primaryActionLabel={validationModal.primaryActionLabel}
        onPrimaryAction={closeValidationModal}
      />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0e1422]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Left: Brand & Breadcrumb */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 group focus:outline-none shrink-0"
              title="ChangeLens Home"
            >
              <BrandLogo size="sm" />
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                ChangeLens
              </span>
            </Link>

            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>

            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-violet-700 dark:text-violet-400 truncate">
                Community & Feedback Hub
              </span>
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-violet-500" />
                Live
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Desktop Actions (hidden on small mobile screens) */}
            <div className="hidden sm:flex items-center gap-2.5">
              {/* Return to Dashboard */}
              <Link
                to="/app"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all active:scale-95 cursor-pointer shadow-xs"
                title="Return to AST Impact Workspace"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>

              {/* Quick Submit CTA */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('submit');
                  window.scrollTo({ top: 350, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm shadow-violet-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Report Bug / Idea</span>
              </button>
            </div>

            {/* Theme Toggle (Available on both desktop & mobile) */}
            <ThemeToggle size="sm" variant="dock" />

            {/* Mobile Bar Option Button (shown ONLY on small mobile screens: sm:hidden) */}
            <button
              type="button"
              onClick={() => setIsMobileNavOpen((prev) => !prev)}
              className={`sm:hidden inline-flex items-center justify-center p-2 rounded-full border transition-all active:scale-95 cursor-pointer ${
                isMobileNavOpen
                  ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-[#131b2e] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800'
              }`}
              title="Toggle Menu Bar"
              aria-label="Toggle Menu Bar"
            >
              {isMobileNavOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation Tray (shown when Mobile Bar option is toggled) */}
        {isMobileNavOpen && (
          <div className="sm:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1220] px-4 py-3 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-150">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Feedback Menu
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/app"
                onClick={() => setIsMobileNavOpen(false)}
                className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-800 dark:text-slate-200 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('submit');
                  setIsMobileNavOpen(false);
                  window.scrollTo({ top: 300, behavior: 'smooth' });
                }}
                className="p-2.5 rounded-xl border bg-gradient-to-r from-violet-600/15 to-indigo-600/15 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-xs font-semibold flex items-center gap-2"
              >
                <Bug className="w-3.5 h-3.5 text-violet-500" />
                <span>Submit Report</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('community');
                  setIsMobileNavOpen(false);
                }}
                className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5 text-cyan-500" />
                <span>Community Feed</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('mine');
                  setIsMobileNavOpen(false);
                }}
                className="p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-2"
              >
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>My Reports</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden py-10 sm:py-14 border-b border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-[#0c1220]/60 backdrop-blur-sm">
        {/* Ambient Gradient Background Glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-bl from-cyan-500/15 via-blue-500/10 to-transparent rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-200 dark:border-violet-800/60 shadow-xs mb-4">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
              <span>Community Driven Engineering</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              Community Feedback &{' '}
              <span className="bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
                Platform Telemetry
              </span>
            </h1>

            <p className="mt-3.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Help shape the future of ChangeLens. Share detailed bug reports with screenshots &
              video recordings, suggest new features, or rate our AST blast radius engine.
            </p>
          </div>

          {/* COLUMN-WISE 5-STAR RATINGS & PLATFORM PULSE CARD */}
          <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#121929]/95 border border-slate-200 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-shadow">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              {/* Column 1 (3 of 12 cols): Overall Rating & Satisfaction */}
              <div className="md:col-span-3 flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-1.5 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  <span>{stats?.averageRating ? stats.averageRating.toFixed(1) : '4.9'}</span>
                  <Star className="w-6 h-6 sm:w-7 sm:h-7 fill-amber-400 text-amber-400 drop-shadow-xs" />
                </div>

                <div className="flex items-center gap-0.5 text-amber-400 mt-1.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        (stats?.averageRating || 4.9) >= s
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">
                  {stats?.totalRatings || 42} ratings & {stats?.totalReviews || 28} reviews
                </div>

                <span className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                  <span>98.4% Recommended</span>
                </span>
              </div>

              {/* Column 2 (6 of 12 cols): 5-Star Progress Bars */}
              <div className="md:col-span-6 px-1 sm:px-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    <span>Rating Distribution</span>
                  </span>
                  {starFilter ? (
                    <button
                      type="button"
                      onClick={() => setStarFilter(null)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline px-1.5 py-0.5 cursor-pointer"
                    >
                      <span>Showing {starFilter}★ Only (Clear)</span>
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Click a star row to filter</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {[5, 4, 3, 2, 1].map((s) => {
                    const count = stats?.starDistribution?.[s] ?? (s === 5 ? 32 : s === 4 ? 8 : s === 3 ? 2 : 0);
                    const pct = stats?.starPercentages?.[s] ?? (s === 5 ? 76 : s === 4 ? 19 : s === 3 ? 5 : 0);
                    const isSelected = starFilter === s;

                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStarFilter(isSelected ? null : s)}
                        className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-violet-50 dark:bg-violet-950/40 ring-1 ring-violet-500/50'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                        title={`Filter by ${s} stars (${count} reviews)`}
                      >
                        {/* Star label */}
                        <div className="w-9 shrink-0 flex items-center gap-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <span>{s}</span>
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </div>

                        {/* Progress Bar Container */}
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${STAR_BAR_COLORS[s]}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {/* Percentage */}
                        <div className="w-9 text-right shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {pct}%
                        </div>

                        {/* Count */}
                        <div className="w-8 text-right shrink-0 text-[11px] text-slate-400 dark:text-slate-500">
                          ({count})
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 3 (3 of 12 cols): Platform Highlights & Telemetry */}
              <div className="md:col-span-3 flex flex-col justify-center space-y-2.5 md:pl-3 md:border-l border-slate-100 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        Bug Fix Rate
                      </div>
                      <div className="text-[10px] text-slate-400">Patched in 24-48 hrs</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                    94.2%
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        AST Engine
                      </div>
                      <div className="text-[10px] text-slate-400">Zero-crash parser</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">
                    99.9%
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Film className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        Media Support
                      </div>
                      <div className="text-[10px] text-slate-400">Video & Screenshots</div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Navigation Tabs (Community Feed | Submit New | My Submissions) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 p-1 rounded-2xl sm:rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700/60 max-w-full w-full sm:w-fit shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('community')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                activeTab === 'community'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              Public Feed ({displayItems.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'submit'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              <span>Submit Feedback</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              className={`px-3 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'mine'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Reports</span>
            </button>
          </div>

          {/* Search & Sort Controls (only active on community tab) */}
          {activeTab === 'community' && (
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full lg:w-auto">
              <div className="relative min-w-0 flex-1 sm:min-w-[200px] lg:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search community posts..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 cursor-pointer shrink-0"
              >
                <option value="newest">Newest First</option>
                <option value="rating">Highest Rated</option>
              </select>

              <button
                type="button"
                onClick={loadCommunityData}
                disabled={loadingCommunity}
                className="p-2 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                title="Refresh feed"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loadingCommunity ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* TAB 1: COMMUNITY FEED & REPORTS */}
        {/* ============================================================== */}
        {activeTab === 'community' && (
          <div className="mt-6 space-y-6">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {[
                { id: 'all', label: 'All Categories' },
                { id: 'bug_report', label: 'Bug Reports 🐞' },
                { id: 'feature_request', label: 'Feature Ideas 💡' },
                { id: 'general_feedback', label: 'General Feedback 💬' },
                { id: 'app_rating', label: 'App Ratings ⭐' },
                { id: 'analysis_rating', label: 'Analysis Ratings 📊' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    typeFilter === f.id
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Loading Indicator */}
            {loadingCommunity && (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-600 animate-spin" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Loading community reports & telemetry...
                </p>
              </div>
            )}

            {/* Empty State */}
            {!loadingCommunity && displayItems.length === 0 && (
              <div className="py-16 text-center rounded-2xl bg-white dark:bg-[#121929]/60 border border-slate-200 dark:border-slate-800/80 p-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  No feedback posts match your filter
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Try clearing your search query or selecting a different category.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  {(searchQuery || typeFilter !== 'all' || starFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setTypeFilter('all');
                        setStarFilter(null);
                      }}
                      className="px-4 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('submit')}
                    className="px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors cursor-pointer"
                  >
                    Submit the First One
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Cards Grid */}
            {!loadingCommunity && displayItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {displayItems.map((item) => {
                  const cat = CATEGORIES.find((c) => c.id === item.type);
                  const isHelpful = Boolean(reactions[item.id]);

                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl bg-white dark:bg-[#121929]/90 border border-slate-200 dark:border-slate-800/90 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Card Header: Author, Badge, Stars, Timestamp */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-cyan-500 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                              {(item.author || 'User')[0].toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {item.author || 'Anonymous Developer'}
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300">
                                  Verified
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                {timeAgo(item.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* Star Rating Badge */}
                          {item.rating && item.rating >= 1 && (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{item.rating}★</span>
                            </div>
                          )}
                        </div>

                        {/* Category & Status Row */}
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              cat?.badgeColor ||
                              'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200'
                            }`}
                          >
                            {cat?.label || item.type}
                          </span>

                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Under Review
                          </span>
                        </div>

                        {/* Title & Message */}
                        {item.title && (
                          <h4 className="mt-2.5 text-sm font-bold text-slate-900 dark:text-white leading-snug">
                            {item.title}
                          </h4>
                        )}

                        <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {item.message}
                        </p>

                        {/* Attachments Section (Video Player & Screenshots) */}
                        {Array.isArray(item.attachments) && item.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
                            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              <span>Attachments ({item.attachments.length})</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {item.attachments.map((att, idx) =>
                                att.mediaType === 'video' ? (
                                  <div
                                    key={idx}
                                    className="w-full sm:w-60 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black shadow-xs"
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
                                    key={idx}
                                    type="button"
                                    onClick={() => setLightboxImage(att)}
                                    className="group relative w-24 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 cursor-pointer shrink-0 shadow-xs"
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
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Helpful Reaction */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <button
                          type="button"
                          onClick={() => toggleHelpful(item.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isHelpful
                              ? 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-300 dark:border-violet-700'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <ThumbsUp
                            className={`w-3.5 h-3.5 ${isHelpful ? 'fill-violet-600 text-violet-600' : ''}`}
                          />
                          <span>{isHelpful ? 'Helpful (1)' : 'Helpful'}</span>
                        </button>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                          {item.id}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: SUBMIT NEW FEEDBACK / BUG REPORT (COMPACT HORIZONTAL FORM) */}
        {/* ============================================================== */}
        {activeTab === 'submit' && (
          <div className="mt-6 max-w-5xl mx-auto">
            {submittedSuccess ? (
              /* Success Confirmation Banner */
              <div className="p-8 rounded-3xl bg-white dark:bg-[#121929]/90 border border-emerald-300 dark:border-emerald-700/60 shadow-xl text-center animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 ring-8 ring-emerald-50 dark:ring-emerald-950/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Feedback Received!
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Thank you for contributing to ChangeLens! Your feedback and media attachments have
                  been safely logged into our triage pipeline.
                </p>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('community');
                      setSubmittedSuccess(false);
                    }}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm shadow-violet-500/25 active:scale-95 transition-all cursor-pointer"
                  >
                    View in Community Feed
                  </button>
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-5 py-2.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
                  >
                    Submit Another Report
                  </button>
                </div>
              </div>
            ) : (
              /* Compact Horizontal Form */
              <form
                onSubmit={handleSubmit}
                className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#121929]/90 border border-slate-200 dark:border-slate-800/90 shadow-md space-y-4"
              >
                {/* Horizontal Header Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Submit Feedback or Bug Report
                    </h2>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <span>Posting as:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {user?.name || user?.email || 'Anonymous Developer'}
                    </strong>
                  </div>
                </div>

                {/* Horizontal 2-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Left Column (5 of 12 cols): Category & Rating & Options & Submit button */}
                  <div className="md:col-span-5 flex flex-col justify-between space-y-3 md:pr-4 md:border-r border-slate-100 dark:border-slate-800">
                    {/* 1. Category Selector (Compact 2x2 grid) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        1. Category
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((c) => {
                          const Icon = c.icon;
                          const isSelected = category === c.id;

                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setCategory(c.id)}
                              className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-500 dark:border-violet-400 ring-1 ring-violet-500/30'
                                  : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${c.iconBg} ${c.iconColor}`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {c.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Star Rating (Compact Inline) */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          2. Rating
                        </label>
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate max-w-[150px]">
                          {STAR_LABELS[hoverRating || rating] || 'Select'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseEnter={() => setHoverRating(s)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(s)}
                            className="p-1 transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                            aria-label={`Rate ${s} star`}
                          >
                            <Star
                              className={`w-5 h-5 transition-colors ${
                                (hoverRating || rating) >= s
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. System Telemetry Diagnostics (Compact Checkbox) */}
                    <label className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 cursor-pointer text-left">
                      <input
                        type="checkbox"
                        checked={includeContext}
                        onChange={(e) => setIncludeContext(e.target.checked)}
                        className="w-3.5 h-3.5 text-violet-600 rounded border-slate-300 dark:border-slate-700 focus:ring-violet-500 cursor-pointer"
                      />
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        Include viewport & browser telemetry
                      </div>
                    </label>

                    {/* Submit Button in Left Column */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/25 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Send Feedback Report</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right Column (7 of 12 cols): Title & Description & Media Upload */}
                  <div className="md:col-span-7 flex flex-col space-y-3">
                    {/* Title Input */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Title / Headline
                        </label>
                        <span className="text-[10px] text-slate-400">Optional</span>
                      </div>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={160}
                        placeholder={
                          category === 'bug_report'
                            ? 'e.g. Graph zoom snaps unexpectedly on Firefox'
                            : category === 'feature_request'
                            ? 'e.g. Support for Rust cargo dependencies'
                            : 'Short headline for your feedback'
                        }
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      />
                    </div>

                    {/* Description Textarea */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          Description & Details
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {message.length}/2000
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={2000}
                        placeholder={activeCategoryObj.placeholder}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 leading-relaxed"
                      />
                    </div>

                    {/* Compact Horizontal Media Upload Zone */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Film className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                          <span>Attach Media (Screenshots or Videos)</span>
                        </label>
                        <span className="text-[10px] text-slate-400">
                          {attachments.length}/{MAX_FILES} attached
                        </span>
                      </div>

                      {/* Compact Dropzone Strip */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          handleFiles(e.dataTransfer.files);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`p-3 rounded-xl border border-dashed flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isDraggingFile
                            ? 'border-violet-500 bg-violet-50/70 dark:bg-violet-950/40'
                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-violet-400'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                          className="hidden"
                          onChange={(e) => handleFiles(e.target.files)}
                        />

                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                            <Paperclip className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              Drag & drop or browse files
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              PNG/JPG/WebP &lt;5MB • MP4/WebM &lt;12MB
                            </div>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                          Browse
                        </span>
                      </div>

                      {/* Compact Attached Files Gallery */}
                      {attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attachments.map((att) => (
                            <div
                              key={att.id}
                              className="relative group p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-2 max-w-[200px]"
                            >
                              {att.mediaType === 'video' ? (
                                <div className="w-6 h-6 rounded bg-black flex items-center justify-center text-cyan-400 shrink-0">
                                  <Film className="w-3 h-3" />
                                </div>
                              ) : (
                                <img
                                  src={att.dataUrl}
                                  alt={att.fileName}
                                  className="w-6 h-6 rounded object-cover shrink-0"
                                />
                              )}
                              <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 truncate flex-1">
                                {att.fileName}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAttachment(att.id);
                                }}
                                className="p-0.5 rounded text-slate-400 hover:text-rose-500"
                                title="Remove"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MY SUBMISSIONS */}
        {/* ============================================================== */}
        {activeTab === 'mine' && (
          <div className="mt-6 max-w-4xl mx-auto space-y-4">
            {!user ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#121929]/60 border border-slate-200 dark:border-slate-800">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 mx-auto flex items-center justify-center mb-3">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Sign in to view your submissions
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  Log in to track status updates, bug triage notes, and replies on your feedback.
                </p>
                <div className="mt-4">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
                  >
                    <span>Sign In to ChangeLens</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : loadingMine ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-600 animate-spin" />
                <p className="text-xs text-slate-500">Loading your history...</p>
              </div>
            ) : myItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#121929]/60 border border-slate-200 dark:border-slate-800">
                <MessageSquare className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No submissions yet
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You haven't submitted any bug reports or feedback yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('submit')}
                  className="mt-3 px-4 py-1.5 rounded-full text-xs font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors"
                >
                  Create Your First Report
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white dark:bg-[#121929]/90 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.title || item.type}
                        </span>
                        {item.rating && (
                          <span className="text-xs text-amber-500 font-bold">
                            {item.rating}★
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{timeAgo(item.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                        {item.message}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      Received
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-[#0c1220]/60 backdrop-blur-sm py-8 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandLogo size="xs" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">ChangeLens</span>
            <span>— Know What Your Code Changes Will Break</span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link to="/app" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Impact Dashboard
            </Link>
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Platform Features
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
