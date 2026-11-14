import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Cloud,
  FolderOpen,
  Plus,
  Settings,
  LogOut,
  ChevronRight,
  MoreVertical,
  MapPin,
  Pin,
  Trash2,
  ExternalLink,
  Smartphone,
  Tablet,
  Maximize2,
  Check,
  RotateCcw,
  AudioLines,
  Mic,
  Search,
  X,
  ArrowRight,
} from 'lucide-react';
import {
  AiIntentResult,
  AppPreferences,
  CreateProjectPrefill,
  GisProject,
  GlobeLightingMode,
  ProjectFilter,
  ResolvedAtmosphereMode,
  ViewportMode,
} from './types/gis';
import { DEFAULT_PREFERENCES, INITIAL_PROJECTS } from './data/initialProjects';
import { dispatchAiIntent } from './utils/intentParser';
import { BrandLogo } from './components/BrandLogo';
import { InteractiveGlobe } from './components/InteractiveGlobe';
import { NewProjectModal } from './components/NewProjectModal';
import { ProjectWorkspaceModal } from './components/ProjectWorkspaceModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ExitConfirmModal } from './components/ExitConfirmModal';
import { AiChatMessage, AiCopilotDialog } from './components/AiCopilotWidget';
import { SplashScreen } from './components/SplashScreen';

const STORAGE_PROJECTS_KEY = 'cf_gis_projects_v2';
const STORAGE_PREFS_KEY = 'cf_gis_prefs_v2';

function getDynamicGreeting(now: Date): { greeting: string; dateLabel: string; timeLabel: string } {
  const hour = now.getHours();
  let greeting = '早上好';
  if (hour >= 12 && hour < 14) greeting = '中午好';
  else if (hour >= 14 && hour < 18) greeting = '下午好';
  else if (hour >= 18 || hour < 5) greeting = '晚上好';

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dateLabel = `${now.getMonth() + 1}月${now.getDate()}日 ${weekdays[now.getDay()]}`;
  const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return { greeting, dateLabel, timeLabel };
}

function normalizeAtmosphereSetting(raw: unknown): GlobeLightingMode {
  if (raw === 'day') return 'noon';
  if (raw === 'twilight') return 'sunset';
  if (raw === 'auto' || raw === 'dawn' || raw === 'noon' || raw === 'sunset' || raw === 'night') {
    return raw;
  }
  return 'auto';
}

function resolveAtmosphereMode(mode: GlobeLightingMode, hour: number): ResolvedAtmosphereMode {
  if (mode !== 'auto') return mode;
  if (hour >= 5 && hour < 9) return 'dawn';
  if (hour >= 9 && hour < 17) return 'noon';
  if (hour >= 17 && hour < 20) return 'sunset';
  return 'night';
}

const ATMOSPHERE_THEMES: Record<
  ResolvedAtmosphereMode,
  {
    skyGradient: string;
    glowGradient: string;
    starOpacityClass: string;
  }
> = {
  dawn: {
    skyGradient:
      'linear-gradient(180deg, #0c2b47 0%, #154865 24%, #2c6d7e 44%, #679fa3 60%, #b7d2cd 74%, #e2ece8 86%, #f0f5f3 94%, #f5f7f6 100%)',
    glowGradient:
      'radial-gradient(circle, rgba(253,224,71,0.20) 0%, rgba(110,231,183,0.20) 44%, transparent 72%)',
    starOpacityClass: 'opacity-35',
  },
  noon: {
    skyGradient:
      'linear-gradient(180deg, #093561 0%, #0f5082 24%, #25709e 46%, #5da1c2 62%, #aad0dc 75%, #dcebe9 87%, #eff4f3 94%, #f5f7f6 100%)',
    glowGradient:
      'radial-gradient(circle, rgba(186,230,253,0.32) 0%, rgba(56,189,248,0.14) 46%, transparent 72%)',
    starOpacityClass: 'opacity-10',
  },
  sunset: {
    skyGradient:
      'linear-gradient(180deg, #121530 0%, #272244 24%, #53334e 45%, #8f5a67 60%, #c89d9b 74%, #e6dad7 86%, #f1efed 94%, #f5f7f6 100%)',
    glowGradient:
      'radial-gradient(circle, rgba(251,146,60,0.30) 0%, rgba(244,114,182,0.16) 44%, transparent 72%)',
    starOpacityClass: 'opacity-55',
  },
  night: {
    skyGradient:
      'linear-gradient(180deg, #030a14 0%, #07172b 24%, #0e2a41 45%, #2b5063 60%, #7d9ea3 74%, #cfe0dc 86%, #eaf1ef 94%, #f5f7f6 100%)',
    glowGradient:
      'radial-gradient(circle, rgba(56,189,248,0.22) 0%, rgba(22,114,72,0.14) 46%, transparent 72%)',
    starOpacityClass: 'opacity-100',
  },
};

export default function App() {
  const [projects, setProjects] = useState<GisProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to defaults
    }
    return INITIAL_PROJECTS;
  });

  const [preferences, setPreferences] = useState<AppPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_PREFERENCES,
          ...parsed,
          globeLighting: normalizeAtmosphereSetting(parsed?.globeLighting),
        };
      }
    } catch {
      // Fallback to defaults
    }
    return DEFAULT_PREFERENCES;
  });

  const [viewportMode, setViewportMode] = useState<ViewportMode>('phone');
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string>(projects[0]?.id || INITIAL_PROJECTS[0].id);
  const [globeResetSignal, setGlobeResetSignal] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());

  // Launch Splash Screen state
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [isSplashExiting, setIsSplashExiting] = useState(false);
  const [splashSessionKey, setSplashSessionKey] = useState(0);
  const [homeEnterKey, setHomeEnterKey] = useState(0);

  // Modals & menus state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newProjectPrefill, setNewProjectPrefill] = useState<CreateProjectPrefill | null>(null);
  const [workspaceProject, setWorkspaceProject] = useState<GisProject | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitOpen, setIsExitOpen] = useState(false);
  const [menuProjectId, setMenuProjectId] = useState<string | null>(null);

  // AI Floating Assistant state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiStartVoice, setAiStartVoice] = useState(false);
  const [isSummoningAi, setIsSummoningAi] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiChatMessage[]>([
    {
      id: 'ai-welcome',
      role: 'assistant',
      text: '你好！我是萃凡 AI 助手。直接说你想去的调查地点、要发起的新调查，或切换昼夜地球光影都可以。',
    },
  ]);

  // Toast with optional undo
  const [toast, setToast] = useState<{
    message: string;
    undoProject?: { project: GisProject; index: number };
  } | null>(null);

  const projectsSectionRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splashAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const splashExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
    } catch {
      // Ignore storage quota issues
    }
  }, [projects]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota issues
    }
  }, [preferences]);

  useEffect(() => {
    const closeMenu = () => setMenuProjectId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const handleDismissSplash = () => {
    if (!isSplashVisible || isSplashExiting) return;
    if (splashAutoTimerRef.current) {
      clearTimeout(splashAutoTimerRef.current);
      splashAutoTimerRef.current = null;
    }
    setIsSplashExiting(true);
    setHomeEnterKey((k) => k + 1);
    setGlobeResetSignal((n) => n + 1);
    splashExitTimerRef.current = setTimeout(() => {
      setIsSplashVisible(false);
      setIsSplashExiting(false);
    }, 460);
  };

  const handleReplaySplash = () => {
    if (splashAutoTimerRef.current) {
      clearTimeout(splashAutoTimerRef.current);
      splashAutoTimerRef.current = null;
    }
    if (splashExitTimerRef.current) {
      clearTimeout(splashExitTimerRef.current);
      splashExitTimerRef.current = null;
    }
    setIsSplashExiting(false);
    setSplashSessionKey((k) => k + 1);
    setIsSplashVisible(true);
  };

  useEffect(() => {
    if (!isSplashVisible) return;
    splashAutoTimerRef.current = setTimeout(() => {
      setIsSplashExiting(true);
      setHomeEnterKey((k) => k + 1);
      setGlobeResetSignal((n) => n + 1);
      splashExitTimerRef.current = setTimeout(() => {
        setIsSplashVisible(false);
        setIsSplashExiting(false);
      }, 460);
    }, 3400);

    return () => {
      if (splashAutoTimerRef.current) {
        clearTimeout(splashAutoTimerRef.current);
        splashAutoTimerRef.current = null;
      }
    };
  }, [isSplashVisible, splashSessionKey]);

  useEffect(() => {
    return () => {
      if (splashAutoTimerRef.current) clearTimeout(splashAutoTimerRef.current);
      if (splashExitTimerRef.current) clearTimeout(splashExitTimerRef.current);
    };
  }, []);

  const showToast = (message: string, undoProject?: { project: GisProject; index: number }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, undoProject });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4200);
  };

  const { greeting, dateLabel, timeLabel } = useMemo(() => getDynamicGreeting(now), [now]);
  const resolvedAtmosphere = useMemo(
    () => resolveAtmosphereMode(preferences.globeLighting, now.getHours()),
    [preferences.globeLighting, now]
  );
  const atmosphereTheme = ATMOSPHERE_THEMES[resolvedAtmosphere];

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECTS[0],
    [projects, activeProjectId]
  );

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter !== 'all' && p.storageType !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.path.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.coordinateLabel.toLowerCase().includes(q)
      );
    });
  }, [projects, filter, searchQuery]);

  const featuredProject = useMemo(() => {
    const first = filteredProjects[0];
    if (!first) return null;
    if (searchQuery.trim()) return first.isFeatured ? first : null;
    return first.isFeatured || filter !== 'cloud' ? first : null;
  }, [filteredProjects, filter, searchQuery]);

  const listProjects = useMemo(() => {
    if (!featuredProject) return filteredProjects;
    return filteredProjects.filter((p) => p.id !== featuredProject.id);
  }, [filteredProjects, featuredProject]);

  const cloudCount = useMemo(
    () => projects.filter((p) => p.storageType === 'cloud').length,
    [projects]
  );
  const localCount = useMemo(
    () => projects.filter((p) => p.storageType === 'local').length,
    [projects]
  );

  const handleQuickFilter = (target: 'cloud' | 'local') => {
    setFilter((curr) => (curr === target ? 'all' : target));
    projectsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFocusProject = (proj: GisProject) => {
    setActiveProjectId(proj.id);
    setGlobeResetSignal((n) => n + 1);
  };

  const handleCreateProject = (newProj: GisProject) => {
    setProjects((prev) => [{ ...newProj, isFeatured: false }, ...prev]);
    setFilter('all');
    setSearchQuery('');
    setActiveProjectId(newProj.id);
    setGlobeResetSignal((n) => n + 1);
    setNewProjectPrefill(null);
    showToast(`已创建调查「${newProj.name}」并定位到地图`);
  };

  const handleSummonAi = (startVoice = false) => {
    setIsSummoningAi(true);
    setAiStartVoice(startVoice);
    setTimeout(() => {
      setIsAiOpen(true);
    }, 150);
    setTimeout(() => {
      setIsSummoningAi(false);
    }, 460);
  };

  const handleResetAiChat = () => {
    setAiMessages([
      {
        id: `ai-welcome-${Date.now()}`,
        role: 'assistant',
        text: '你好！我是萃凡 AI 助手。直接说你想去的调查地点、要发起的新调查，或切换昼夜地球光影都可以。',
      },
    ]);
  };

  const handleExecuteAiIntent = async (rawQuery: string): Promise<AiIntentResult | null> => {
    const query = rawQuery.trim();
    if (!query || isAiProcessing) return null;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setIsAiProcessing(true);

    try {
      const result = await dispatchAiIntent(query, projects, preferences.globeLighting);
      const targetProj = result.projectId
        ? projects.find((p) => p.id === result.projectId)
        : undefined;

      let actionSummary: string | undefined;
      let shouldCloseDialog = false;

      switch (result.action) {
        case 'FOCUS_PROJECT':
          if (targetProj) {
            handleFocusProject(targetProj);
            actionSummary = `已定位 · ${targetProj.name} (${targetProj.coordinateLabel})`;
          }
          break;
        case 'OPEN_PROJECT':
          if (targetProj) {
            handleFocusProject(targetProj);
            setWorkspaceProject(targetProj);
            actionSummary = `已打开 · ${targetProj.name}`;
            shouldCloseDialog = true;
          }
          break;
        case 'CREATE_PROJECT':
          setNewProjectPrefill(result.createDraft || null);
          setIsNewModalOpen(true);
          actionSummary = '已预填并打开新建调查向导';
          shouldCloseDialog = true;
          break;
        case 'FILTER_PROJECTS':
          if (result.filter) {
            setFilter(result.filter);
            projectsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            const labelMap = { all: '全部调查', cloud: '云端项目', local: '本地项目' };
            actionSummary = `列表已筛选 · ${labelMap[result.filter]}`;
          }
          break;
        case 'SYNC_PROJECT':
          if (targetProj) {
            handleSyncProject(targetProj.id);
            actionSummary = `记录已同步 · ${targetProj.name}`;
          }
          break;
        case 'PIN_PROJECT':
          if (targetProj) {
            handlePinProject(targetProj);
            actionSummary = `已设为常用 · ${targetProj.name}`;
          }
          break;
        case 'SET_ATMOSPHERE':
          if (result.atmosphere) {
            const normalized = normalizeAtmosphereSetting(result.atmosphere);
            setPreferences((p) => ({ ...p, globeLighting: normalized }));
            const modeMap: Record<GlobeLightingMode, string> = {
              auto: '随时间自适应',
              dawn: '晨光模式',
              noon: '中午模式',
              sunset: '晚霞模式',
              night: '夜光模式',
            };
            actionSummary = `光影切换 · ${modeMap[normalized]}`;
          }
          break;
        case 'TOGGLE_ROTATION':
          if (typeof result.autoRotate === 'boolean') {
            setPreferences((p) => ({ ...p, autoRotateGlobe: result.autoRotate! }));
            actionSummary = result.autoRotate ? '地球已开启自转' : '地球已暂停自转';
          }
          break;
        case 'OPEN_SETTINGS':
          setIsSettingsOpen(true);
          actionSummary = '已打开系统设置';
          shouldCloseDialog = true;
          break;
        default:
          break;
      }

      const assistantMsg: AiChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
        action: result.action,
        actionSummary,
      };
      setAiMessages((prev) => [...prev, assistantMsg]);

      if (shouldCloseDialog) {
        setIsAiOpen(false);
        showToast(result.reply);
      }

      return result;
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleRemoveProject = (proj: GisProject) => {
    const idx = projects.findIndex((p) => p.id === proj.id);
    setProjects((prev) => prev.filter((p) => p.id !== proj.id));
    setMenuProjectId(null);
    if (activeProjectId === proj.id) {
      const fallback = projects.find((p) => p.id !== proj.id);
      if (fallback) setActiveProjectId(fallback.id);
    }
    showToast(`已从最近列表移除「${proj.name}」`, { project: proj, index: idx });
  };

  const handleUndoRemove = () => {
    if (!toast?.undoProject) return;
    const { project, index } = toast.undoProject;
    setProjects((prev) => {
      const copy = [...prev];
      copy.splice(Math.max(0, Math.min(index, copy.length)), 0, project);
      return copy;
    });
    setActiveProjectId(project.id);
    setToast(null);
  };

  const handlePinProject = (proj: GisProject) => {
    setProjects((prev) => {
      const rest = prev.filter((p) => p.id !== proj.id).map((p) => ({ ...p, isFeatured: false }));
      return [{ ...proj, isFeatured: true, statusLabel: '最近打开' }, ...rest];
    });
    setActiveProjectId(proj.id);
    setMenuProjectId(null);
    showToast(`已将「${proj.name}」设为首页常用调查`);
  };

  const handleSyncProject = (id: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, sizeOrSyncLabel: '已同步', lastModified: '刚刚同步' }
          : p
      )
    );
    setWorkspaceProject((curr) =>
      curr && curr.id === id
        ? { ...curr, sizeOrSyncLabel: '已同步', lastModified: '刚刚同步' }
        : curr
    );
    showToast('现场拍照与位置记录已安全上传至云端');
  };

  const handleEnterFieldMode = (proj: GisProject) => {
    setWorkspaceProject(null);
    handleFocusProject(proj);
    showToast(`已打开「${proj.name}」地图，可随时拍照打点`);
  };

  const handleRestoreDemoData = () => {
    setProjects(INITIAL_PROJECTS);
    setPreferences(DEFAULT_PREFERENCES);
    setFilter('all');
    setSearchQuery('');
    setActiveProjectId(INITIAL_PROJECTS[0].id);
    setGlobeResetSignal((n) => n + 1);
    setIsSettingsOpen(false);
    showToast('已恢复默认示例调查与显示设置');
  };

  const shellWidthClass =
    viewportMode === 'phone'
      ? `w-full ${
          isSplashVisible
            ? 'h-[calc(100dvh-48px)] sm:h-[min(820px,calc(100dvh-88px))]'
            : 'min-h-[calc(100vh-48px)] sm:min-h-[820px]'
        } sm:max-w-[412px] sm:my-5 sm:rounded-[42px] sm:border-[8px] sm:border-[#141918] sm:ring-1 sm:ring-black/10 sm:shadow-[0_32px_80px_-20px_rgba(10,18,28,0.32)] overflow-hidden`
      : viewportMode === 'tablet'
      ? `w-full ${
          isSplashVisible
            ? 'h-[calc(100dvh-48px)] sm:h-[min(780px,calc(100dvh-88px))]'
            : 'min-h-[calc(100vh-48px)] sm:min-h-[780px]'
        } sm:max-w-[768px] sm:my-5 sm:rounded-[32px] sm:border-[8px] sm:border-[#141918] sm:ring-1 sm:ring-black/10 sm:shadow-[0_32px_80px_-20px_rgba(10,18,28,0.26)] overflow-hidden`
      : `w-full ${isSplashVisible ? 'h-[calc(100dvh-48px)] overflow-hidden' : 'min-h-[calc(100vh-48px)]'}`;

  const isMultiColumn = viewportMode !== 'phone';

  return (
    <div className="min-h-screen bg-[#e7ece9] text-[#11181c] flex flex-col items-center">
      {/* Quiet Preview Switcher Bar (Phone / Tablet / Adaptive) */}
      <nav
        aria-label="视口适配切换栏"
        className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-white/80 backdrop-blur-md"
      >
        <div className="mx-auto flex h-[48px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          {/* Zone 1: Quiet brand wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-sm font-bold tracking-tight text-[#11181c] whitespace-nowrap shrink-0"
          >
            萃凡云图
          </a>

          {/* Zone 2: Phone / Tablet / Adaptive viewport preview switcher */}
          <div
            role="group"
            aria-label="屏幕尺寸切换"
            className="flex items-center rounded-xl border border-black/[0.06] bg-[#f1f4f2] p-0.5"
          >
            <button
              type="button"
              aria-pressed={viewportMode === 'phone'}
              onClick={() => setViewportMode('phone')}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                viewportMode === 'phone'
                  ? 'bg-white text-[#11181c] shadow-[0_1px_3px_rgba(12,26,22,0.08)] ring-1 ring-black/[0.04]'
                  : 'text-[#5a6962] hover:text-[#11181c]'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>移动手机</span>
            </button>
            <button
              type="button"
              aria-pressed={viewportMode === 'tablet'}
              onClick={() => setViewportMode('tablet')}
              className={`hidden sm:inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                viewportMode === 'tablet'
                  ? 'bg-white text-[#11181c] shadow-[0_1px_3px_rgba(12,26,22,0.08)] ring-1 ring-black/[0.04]'
                  : 'text-[#5a6962] hover:text-[#11181c]'
              }`}
            >
              <Tablet className="h-3.5 w-3.5" />
              <span>平板</span>
            </button>
            <button
              type="button"
              aria-pressed={viewportMode === 'fluid'}
              onClick={() => setViewportMode('fluid')}
              className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                viewportMode === 'fluid'
                  ? 'bg-white text-[#11181c] shadow-[0_1px_3px_rgba(12,26,22,0.08)] ring-1 ring-black/[0.04]'
                  : 'text-[#5a6962] hover:text-[#11181c]'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>自适应</span>
            </button>
          </div>

          {/* Zone 3: Splash replay trigger & quiet focused survey badge */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (isSplashVisible ? handleDismissSplash() : handleReplaySplash())}
              className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-black/[0.06] bg-[#f1f4f2] px-2.5 text-[11px] font-semibold text-[#167248] whitespace-nowrap transition-all hover:bg-[#e5efe9] active:scale-95"
              title={isSplashVisible ? '跳过启动页进入首页' : '重播移动端启动页'}
            >
              {isSplashVisible ? (
                <ArrowRight className="h-3 w-3" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              <span>{isSplashVisible ? '进入首页' : '启动页'}</span>
            </button>
            <div className="hidden md:block max-w-[150px] truncate text-right text-[11px] font-medium text-[#5a6962]">
              {activeProject.name}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Responsive Canvas / Preview Shell */}
      <main
        id="top"
        className={`@container relative bg-[#f5f7f6] transition-all duration-300 ease-out ${shellWidthClass}`}
      >
        {isSplashVisible && (
          <SplashScreen
            key={splashSessionKey}
            atmosphere={resolvedAtmosphere}
            viewportMode={viewportMode}
            timeLabel={timeLabel}
            dateLabel={dateLabel}
            activeProjectName={activeProject.name}
            launchLastOnStart={preferences.launchLastOnStart}
            isExiting={isSplashExiting}
            onEnter={handleDismissSplash}
          />
        )}

        {/* Flagship Orbital Hero: Time-Adaptive Sky/Space Backdrop + Unobstructed 3D Earth + Unified Glass Dock */}
        <header
          className="relative overflow-hidden transition-[background-image] duration-700"
          style={{ backgroundImage: atmosphereTheme.skyGradient }}
        >
          {/* Atmospheric orbital exosphere glow centered behind the enlarged right-side Earth */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 -right-14 h-80 w-80 rounded-full opacity-90 transition-all duration-700 @[560px]:h-96 @[560px]:w-96"
            style={{
              background: atmosphereTheme.glowGradient,
            }}
          />

          {/* Crisp deep-space starfield & lower atmospheric horizon contours (scales opacity by time of day) */}
          <svg
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-700 ${atmosphereTheme.starOpacityClass}`}
            viewBox="0 0 1200 320"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            {/* Upper cosmos stars (crisp static points) */}
            <circle cx="58" cy="34" r="1.2" fill="#ffffff" fillOpacity="0.85" />
            <circle cx="112" cy="78" r="0.9" fill="#bae6fd" fillOpacity="0.7" />
            <circle cx="176" cy="24" r="1.4" fill="#ffffff" fillOpacity="0.9" />
            <circle cx="242" cy="58" r="0.8" fill="#ffffff" fillOpacity="0.55" />
            <circle cx="318" cy="38" r="1.1" fill="#7dd3fc" fillOpacity="0.75" />
            <circle cx="385" cy="92" r="0.85" fill="#ffffff" fillOpacity="0.6" />
            <circle cx="468" cy="28" r="1.3" fill="#ffffff" fillOpacity="0.85" />
            <circle cx="542" cy="64" r="0.9" fill="#bae6fd" fillOpacity="0.65" />
            <circle cx="624" cy="42" r="1.1" fill="#ffffff" fillOpacity="0.75" />
            <circle cx="712" cy="22" r="1.5" fill="#ffffff" fillOpacity="0.95" />
            <circle cx="788" cy="74" r="0.9" fill="#7dd3fc" fillOpacity="0.7" />
            <circle cx="864" cy="36" r="1.2" fill="#ffffff" fillOpacity="0.8" />
            <circle cx="940" cy="54" r="0.85" fill="#bae6fd" fillOpacity="0.6" />
            <circle cx="1018" cy="26" r="1.3" fill="#ffffff" fillOpacity="0.9" />
            <circle cx="1096" cy="68" r="1" fill="#ffffff" fillOpacity="0.7" />
            <circle cx="1158" cy="40" r="1.2" fill="#7dd3fc" fillOpacity="0.8" />
            <circle cx="88" cy="128" r="0.85" fill="#bae6fd" fillOpacity="0.5" />
            <circle cx="288" cy="116" r="1" fill="#ffffff" fillOpacity="0.55" />
            <circle cx="585" cy="110" r="0.9" fill="#ffffff" fillOpacity="0.5" />
            <circle cx="984" cy="108" r="1.1" fill="#7dd3fc" fillOpacity="0.6" />

            {/* Subtle 4-point star glints */}
            <path
              d="M352 60 L353.5 64 L357.5 65.5 L353.5 67 L352 71 L350.5 67 L346.5 65.5 L350.5 64 Z"
              fill="#e0f2fe"
              fillOpacity="0.75"
            />
            <path
              d="M895 82 L896.5 85.5 L900 87 L896.5 88.5 L895 92 L893.5 88.5 L890 87 L893.5 85.5 Z"
              fill="#a7f3d0"
              fillOpacity="0.7"
            />

            {/* Delicate horizon contour curves near atmospheric transition */}
            <path
              d="M-40 212 C 210 175, 430 245, 710 198 C 930 160, 1080 215, 1240 185"
              stroke="#7dd3fc"
              strokeOpacity="0.16"
              strokeWidth="1.1"
            />
            <path
              d="M-40 255 C 230 220, 460 280, 740 238 C 960 202, 1100 250, 1240 226"
              stroke="#34d399"
              strokeOpacity="0.16"
              strokeWidth="1.1"
            />
          </svg>

          {/* Seamless atmospheric mist veil dissolving sky, horizon curves & lower Earth edge into canvas */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-28 @[560px]:h-32"
            style={{
              background:
                'linear-gradient(180deg, rgba(245,247,246,0) 0%, rgba(245,247,246,0.12) 22%, rgba(245,247,246,0.44) 48%, rgba(245,247,246,0.82) 74%, rgba(245,247,246,0.97) 90%, #f5f7f6 100%)',
            }}
          />

          {/* Realistic Mobile / Tablet System Status Bar */}
          {viewportMode !== 'fluid' && (
            <div
              aria-hidden="true"
              className="relative z-30 mx-auto flex max-w-6xl items-center justify-between px-6 pt-2.5 pb-1 text-white select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
            >
              <span className="text-[12.5px] font-semibold tracking-tight tabular-nums">
                {viewportMode === 'tablet' ? `${timeLabel} · ${dateLabel}` : timeLabel}
              </span>

              {viewportMode === 'phone' && (
                <div className="pointer-events-none absolute top-2 left-1/2 flex h-[22px] w-[88px] -translate-x-1/2 items-center justify-end rounded-full bg-[#090d0c] px-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_2px_8px_rgba(0,0,0,0.32)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#13202e] ring-1 ring-white/10" />
                </div>
              )}

              <div className="flex items-center gap-1.5 text-white/95">
                {/* 4-Bar Cellular Signal */}
                <svg className="h-3 w-4" viewBox="0 0 18 12" fill="currentColor">
                  <rect x="1" y="8" width="2.6" height="3.5" rx="0.8" />
                  <rect x="5" y="5.8" width="2.6" height="5.7" rx="0.8" />
                  <rect x="9" y="3.4" width="2.6" height="8.1" rx="0.8" />
                  <rect x="13" y="1" width="2.6" height="10.5" rx="0.8" fillOpacity="0.95" />
                </svg>

                {viewportMode === 'phone' && (
                  <span className="text-[10px] font-bold tracking-tight">5G</span>
                )}

                {/* Wi-Fi Signal */}
                <svg className="h-3.5 w-3.5" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M1.8 5.2C5.2 2 10.8 2 14.2 5.2" />
                  <path d="M4.3 7.9C6.4 5.9 9.6 5.9 11.7 7.9" />
                  <circle cx="8" cy="11" r="1.25" fill="currentColor" stroke="none" />
                </svg>

                {viewportMode === 'tablet' && (
                  <span className="ml-0.5 text-[11px] font-medium tabular-nums">88%</span>
                )}

                {/* Battery Indicator */}
                <div className="flex items-center gap-[1.5px]">
                  <div className="flex h-[11.5px] w-[22px] items-center rounded-[3.5px] border border-white/65 p-[1.5px]">
                    <div className="h-full w-[86%] rounded-[1.5px] bg-white" />
                  </div>
                  <span className="h-[4px] w-[1.5px] rounded-r-full bg-white/65" />
                </div>
              </div>
            </div>
          )}

          <div
            className={`relative z-20 mx-auto px-4 pb-3.5 @[560px]:px-6 @[560px]:pb-4 ${
              viewportMode === 'fluid' ? 'pt-5 @[560px]:pt-4' : 'pt-2.5 @[560px]:pt-2'
            } ${isMultiColumn ? 'max-w-6xl' : 'max-w-3xl'}`}
          >
            {/* Compact Top Utility Row (Beidou Status · Active 3D Earth Target + Quiet Circular Controls) */}
            <div className="relative z-30 flex items-center justify-between gap-2 pr-1">
              <button
                type="button"
                onClick={() => {
                  setGlobeResetSignal((n) => n + 1);
                  showToast(`3D 地球已对准「${activeProject.name}」`);
                }}
                title="点击回中当前 3D 地球定位测区"
                className="group inline-flex min-w-0 items-center gap-1.5 rounded-full py-1 pr-2 text-left text-[11px] font-medium tracking-tight text-sky-50/90 tabular-nums drop-shadow-[0_1px_2px_rgba(0,0,0,0.22)] transition-colors hover:text-white active:scale-[0.98]"
              >
                {viewportMode === 'fluid' && (
                  <>
                    <span className="shrink-0">{dateLabel}</span>
                    <span className="shrink-0 text-white/35" aria-hidden="true">
                      ·
                    </span>
                  </>
                )}
                <span className="shrink-0">北斗定位就绪</span>
                <span className="shrink-0 text-white/35" aria-hidden="true">
                  ·
                </span>
                <span className="truncate text-emerald-200/95 group-hover:text-emerald-100">
                  {activeProject.name}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(true)}
                  aria-label="系统设置"
                  title="系统设置"
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-white/10 text-sky-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/20 hover:text-white active:scale-95 after:absolute after:-inset-1.5 after:content-['']"
                >
                  <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExitOpen(true)}
                  aria-label="安全退出"
                  title="安全退出"
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/18 bg-white/10 text-sky-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-md transition-all hover:border-white/30 hover:bg-white/20 hover:text-white active:scale-95 after:absolute after:-inset-1.5 after:content-['']"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Middle Orbital Stage: Clean Editorial Left Column + Unobstructed Enlarged 3D Earth */}
            <div className="relative mt-1.5">
              {/* Unobstructed Enlarged 3D Earth bleeding subtly off the right edge */}
              <div
                key={`globe-entrance-${homeEnterKey}`}
                className="pointer-events-auto absolute top-0 -right-7 z-10 @[560px]:-top-2 @[560px]:right-0"
              >
                <InteractiveGlobe
                  projects={projects}
                  activeProject={activeProject}
                  lightingMode={resolvedAtmosphere}
                  autoRotate={preferences.autoRotateGlobe}
                  resetSignal={globeResetSignal}
                  onSelectProject={(proj) => {
                    handleFocusProject(proj);
                    showToast(`已定位至测区「${proj.name}」`);
                  }}
                />
              </div>

              {/* Left Brand AI Robot & Concentric Aurora Glass Summon Trigger */}
              <div className="pointer-events-none relative z-20 flex min-h-[144px] flex-col justify-center pr-[162px] @[560px]:min-h-[166px] @[560px]:pr-[260px]">
                <div>
                  <div className="flex items-center gap-3 @[560px]:gap-4">
                    <button
                      type="button"
                      onClick={() => handleSummonAi(false)}
                      aria-label="点击召唤萃凡 AI 空间助手"
                      title="点击召唤萃凡 AI 对话"
                      className="pointer-events-auto group relative shrink-0 rounded-[15px] transition-transform duration-150 hover:scale-[1.05] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      <BrandLogo
                        size={52}
                        isSummoning={isSummoningAi}
                      />
                    </button>
                    <div className="min-w-0 drop-shadow-[0_1px_3px_rgba(0,0,0,0.24)]">
                      <h1 className="text-[23px] font-bold tracking-tight text-white leading-tight @[560px]:text-[28px] whitespace-nowrap">
                        {greeting}
                      </h1>
                      <p className="mt-1 text-[12.5px] font-medium text-sky-50/90 @[560px]:text-[13.5px] whitespace-nowrap">
                        欢迎使用萃凡云图
                      </p>
                    </div>
                  </div>

                  {/* Sleek Compact Whisper-Glass AI Summon Trigger */}
                  <div className="pointer-events-auto mt-2.5 inline-flex h-8 items-center gap-1 rounded-full border border-white/24 bg-[#071a26]/26 p-1 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_8px_20px_-8px_rgba(4,16,28,0.34)] backdrop-blur-md transition-all duration-150 hover:border-white/36 hover:bg-[#071a26]/34">
                    <button
                      type="button"
                      onClick={() => handleSummonAi(false)}
                      className="relative inline-flex h-6 items-center gap-1.5 rounded-full pl-2 pr-1.5 text-[11px] font-medium tracking-tight text-white/95 whitespace-nowrap transition-colors hover:text-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 after:absolute after:-inset-y-2 after:-inset-x-1 after:content-['']"
                    >
                      <AudioLines className="h-3 w-3 shrink-0 text-emerald-300" />
                      <span>召唤 AI 助手</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSummonAi(true)}
                      aria-label="语音唤醒 AI 助手"
                      title="语音说出调查指令"
                      className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/24 text-emerald-200 transition-all duration-150 hover:bg-emerald-400/40 hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70 after:absolute after:-inset-2 after:content-['']"
                    >
                      <Mic className="h-3 w-3" strokeWidth={2.2} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Unified Frosted Glass Instrument Dock fused across the Earth's Horizon */}
              <section
                aria-label="快捷调查入口"
                className="relative z-20 mt-3.5 grid grid-cols-3 items-stretch gap-1.5 rounded-[22px] border border-white/95 bg-white/92 p-1.5 shadow-[0_10px_28px_-14px_rgba(15,40,56,0.09),0_2px_6px_-2px_rgba(15,40,56,0.04)] backdrop-blur-xl @[560px]:gap-2 @[560px]:p-2"
              >
                {/* 云端项目 */}
                <button
                  type="button"
                  onClick={() => handleQuickFilter('cloud')}
                  className={`group flex min-h-[56px] flex-col justify-center rounded-[16px] px-2.5 py-2 text-left transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7]/45 @[560px]:flex-row @[560px]:items-center @[560px]:gap-3 @[560px]:px-3.5 ${
                    filter === 'cloud'
                      ? 'bg-[#e9f5fc] ring-1 ring-inset ring-[#0284c7]/28'
                      : 'bg-[#f4f7f6] ring-1 ring-inset ring-black/[0.03] hover:bg-[#edf3f1]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 @[560px]:gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#e0f2fe] text-[#0284c7]"
                    >
                      <Cloud className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="text-[12.5px] font-bold tracking-tight text-[#11181c] whitespace-nowrap @[560px]:text-sm">
                      云端项目
                    </span>
                  </div>
                  <div className="mt-1 pl-[1px] text-[11px] font-medium text-[#0369a1] tabular-nums whitespace-nowrap @[560px]:mt-0 @[560px]:ml-auto @[560px]:pl-0">
                    <span className="@[560px]:hidden">{cloudCount} 项协作</span>
                    <span className="hidden @[560px]:inline">{cloudCount} 项云端协作</span>
                  </div>
                </button>

                {/* 本地项目 */}
                <button
                  type="button"
                  onClick={() => handleQuickFilter('local')}
                  className={`group flex min-h-[56px] flex-col justify-center rounded-[16px] px-2.5 py-2 text-left transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#167248]/45 @[560px]:flex-row @[560px]:items-center @[560px]:gap-3 @[560px]:px-3.5 ${
                    filter === 'local'
                      ? 'bg-[#e8f5ee] ring-1 ring-inset ring-[#167248]/28'
                      : 'bg-[#f4f7f6] ring-1 ring-inset ring-black/[0.03] hover:bg-[#edf3f1]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 @[560px]:gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#dff4ea] text-[#167248]"
                    >
                      <FolderOpen className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="text-[12.5px] font-bold tracking-tight text-[#11181c] whitespace-nowrap @[560px]:text-sm">
                      本地项目
                    </span>
                  </div>
                  <div className="mt-1 pl-[1px] text-[11px] font-medium text-[#167248] tabular-nums whitespace-nowrap @[560px]:mt-0 @[560px]:ml-auto @[560px]:pl-0">
                    <span className="@[560px]:hidden">{localCount} 项离线</span>
                    <span className="hidden @[560px]:inline">{localCount} 项离线可用</span>
                  </div>
                </button>

                {/* 新建调查 */}
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(true)}
                  className="group flex min-h-[56px] flex-col justify-center rounded-[16px] bg-[#f4f7f6] px-2.5 py-2 text-left ring-1 ring-inset ring-black/[0.03] transition-all duration-150 hover:bg-[#ebf5f0] hover:ring-[#167248]/20 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e]/45 @[560px]:flex-row @[560px]:items-center @[560px]:gap-3 @[560px]:px-3.5"
                >
                  <div className="flex items-center gap-1.5 @[560px]:gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#dcf4ee] text-[#0f766e]"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="text-[12.5px] font-bold tracking-tight text-[#11181c] whitespace-nowrap @[560px]:text-sm">
                      新建调查
                    </span>
                  </div>
                  <div className="mt-1 pl-[1px] text-[11px] font-medium text-[#0f766e] tabular-nums whitespace-nowrap @[560px]:mt-0 @[560px]:ml-auto @[560px]:pl-0">
                    <span className="@[560px]:hidden">3 类场景</span>
                    <span className="hidden @[560px]:inline">3 类常用场景</span>
                  </div>
                </button>
              </section>
            </div>
          </div>
        </header>

        {/* Main Workspace Body */}
        <div
          className={`mx-auto space-y-5 px-3.5 pt-2.5 pb-7 @[560px]:px-6 ${
            isMultiColumn ? 'max-w-6xl' : 'max-w-3xl'
          }`}
        >
          {/* Recent Surveys Section */}
          <section ref={projectsSectionRef} aria-label="最近调查列表" className="space-y-3">
            {/* Section Header, On-Demand Search Trigger & Fluid Mobile Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-[#11181c]">最近调查</h2>
                <span className="text-xs font-medium tabular-nums text-[#5a6962]">
                  共 {filteredProjects.length} 项
                </span>
                <button
                  type="button"
                  aria-label={isSearchOpen || searchQuery ? '收起搜索' : '搜索调查任务'}
                  aria-expanded={isSearchOpen || Boolean(searchQuery)}
                  title="搜索调查任务"
                  onClick={() => {
                    if (isSearchOpen || searchQuery) {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    } else {
                      setIsSearchOpen(true);
                      setTimeout(() => searchInputRef.current?.focus(), 40);
                    }
                  }}
                  className={`relative ml-0.5 flex h-8 w-8 items-center justify-center rounded-full transition-all active:scale-90 after:absolute after:-inset-1.5 after:content-[''] ${
                    isSearchOpen || searchQuery
                      ? 'bg-[#eaf5ef] text-[#167248]'
                      : 'text-[#66766e] hover:bg-black/[0.04] hover:text-[#11181c]'
                  }`}
                >
                  <Search className="h-3.5 w-3.5" strokeWidth={2.2} />
                </button>
              </div>

              <div
                role="tablist"
                aria-label="调查类型筛选"
                className="relative inline-grid grid-cols-3 items-center"
              >
                {[
                  { id: 'all' as const, label: '全部', activeText: 'text-[#167248]' },
                  { id: 'cloud' as const, label: '云端', activeText: 'text-[#0284c7]' },
                  { id: 'local' as const, label: '本地', activeText: 'text-[#167248]' },
                ].map((tab) => {
                  const isSelected = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setFilter(tab.id)}
                      className={`relative flex h-10 min-w-[52px] items-center justify-center rounded-xl px-3 text-[13px] whitespace-nowrap transition-all duration-200 active:scale-90 ${
                        isSelected
                          ? `font-bold ${tab.activeText}`
                          : 'font-medium text-[#66766e] hover:text-[#11181c]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}

                {/* Fluid Spring-Gliding Mobile Indicator Bar */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-1 flex">
                  <div
                    className={`flex w-1/3 justify-center transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none ${
                      filter === 'cloud'
                        ? 'translate-x-full'
                        : filter === 'local'
                        ? 'translate-x-[200%]'
                        : 'translate-x-0'
                    }`}
                  >
                    <span
                      className={`h-[3px] w-5 rounded-full transition-colors duration-200 motion-reduce:transition-none ${
                        filter === 'cloud' ? 'bg-[#0284c7]' : 'bg-[#167248]'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Quick Search Bar (saves vertical space on mobile until needed) */}
            {(isSearchOpen || Boolean(searchQuery)) && (
              <div className="flex h-10 items-center gap-2.5 rounded-[16px] border border-black/[0.05] bg-white px-3.5 shadow-[0_2px_10px_-4px_rgba(12,26,22,0.06)] transition-all focus-within:border-[#167248]/40 focus-within:ring-2 focus-within:ring-[#167248]/10">
                <Search className="h-4 w-4 shrink-0 text-[#167248]" />
                <input
                  ref={searchInputRef}
                  type="search"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索调查名称、地点或关键词…"
                  aria-label="搜索调查任务"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-[#11181c] placeholder:text-[#7c8b84] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery) {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    } else {
                      setIsSearchOpen(false);
                    }
                  }}
                  aria-label="关闭或清空搜索"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#7c8b84] transition-colors hover:bg-slate-100 hover:text-[#11181c] active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <p className="text-sm font-semibold text-[#11181c]">未找到匹配的调查任务</p>
                <p className="mt-1 text-xs text-[#5a6962]">
                  您可以换个关键词搜索、重置筛选，或直接新建一项外业调查
                </p>
                <div className="mt-4 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setFilter('all');
                      setSearchQuery('');
                      setIsSearchOpen(false);
                    }}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-[#5a6962] hover:bg-slate-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>显示全部</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(true)}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#167248] px-4 text-xs font-semibold text-white hover:bg-[#115a38]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>新建调查</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                className={`grid grid-cols-1 gap-3.5 ${
                  isMultiColumn && featuredProject ? '@[660px]:grid-cols-12 @[660px]:items-start @[660px]:gap-4' : ''
                }`}
              >
                {/* Featured Recent Survey Card */}
                {featuredProject && (
                  <div className={isMultiColumn ? '@[660px]:col-span-5' : ''}>
                    <div
                      onClick={() => {
                        handleFocusProject(featuredProject);
                        setWorkspaceProject(featuredProject);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleFocusProject(featuredProject);
                          setWorkspaceProject(featuredProject);
                        }
                      }}
                      className={`group relative cursor-pointer overflow-hidden rounded-[22px] border bg-white transition-all duration-200 hover:shadow-lg active:scale-[0.99] ${
                        activeProjectId === featuredProject.id
                          ? 'border-[#167248]/45 shadow-[0_10px_28px_-12px_rgba(22,114,72,0.22)] ring-1 ring-[#167248]/18'
                          : 'border-black/[0.06] shadow-[0_10px_28px_-12px_rgba(12,26,22,0.12)]'
                      }`}
                    >
                      {/* Authentic East Asia Satellite Terrain Preview Canvas */}
                      <div className="relative h-44 w-full overflow-hidden bg-[#04101e] @[560px]:h-52 @[660px]:h-60">
                        <img
                          src={
                            featuredProject.thumbnailUrl ||
                            '/assets/aistudio/earth_atmos_2048_2faa400d.jpg'
                          }
                          alt={featuredProject.name}
                          referrerPolicy="no-referrer"
                          className={`h-full w-full object-cover transition-transform duration-500 ${
                            featuredProject.thumbnailUrl
                              ? 'group-hover:scale-105'
                              : ' origin-[83%_34%] scale-[2.35] brightness-[0.95] contrast-[1.08] saturate-[1.08] group-hover:scale-[2.45]'
                          }`}
                        />

                        {/* Balanced Top & Bottom Scrim for ≥4.5:1 Contrast Over Satellite Map */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#04120e]/55 via-[#04120e]/12 to-[#04100c]/90" />

                        {/* Focused Single-Anchor Top Kicker */}
                        <div className="absolute inset-x-4 top-3.5 flex items-center justify-between text-[11.5px] font-medium text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                          <span>
                            {featuredProject.statusLabel} · {featuredProject.linkTypeLabel}
                          </span>
                          <span className="tabular-nums text-white/75">
                            {featuredProject.lastModified}
                          </span>
                        </div>

                        {/* Bottom Info & Primary Continue CTA */}
                        <div className="absolute inset-x-4 bottom-3.5 flex items-end justify-between gap-3">
                          <div className="min-w-0 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
                            <h3 className="truncate text-xl font-extrabold tracking-tight @[560px]:text-2xl">
                              {featuredProject.name}
                            </h3>
                            <p className="mt-0.5 truncate text-xs text-white/85 tabular-nums">
                              {featuredProject.path} · {featuredProject.sizeOrSyncLabel}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFocusProject(featuredProject);
                              setWorkspaceProject(featuredProject);
                            }}
                            className="inline-flex min-h-[42px] shrink-0 items-center gap-1 rounded-[14px] bg-[#167248] px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap shadow-[0_6px_16px_-4px_rgba(22,114,72,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] transition-all hover:bg-[#198754] active:scale-[0.97]"
                          >
                            <span>继续调查</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Unified Grouped Survey List Container + Lightweight Startup Preference Entry */}
                <div className={`space-y-2.5 ${isMultiColumn && featuredProject ? '@[660px]:col-span-7' : ''}`}>
                  {listProjects.length > 0 && (
                    <div className="relative rounded-[22px] border border-black/[0.06] bg-white shadow-[0_4px_20px_-8px_rgba(12,26,22,0.07)] divide-y divide-black/[0.05]">
                      {listProjects.map((proj) => {
                        const isFocused = activeProjectId === proj.id;
                        const isMenuOpen = menuProjectId === proj.id;

                        return (
                          <div
                            key={proj.id}
                            className={`relative first:rounded-t-[22px] last:rounded-b-[22px] transition-colors duration-150 ${
                              isFocused ? 'bg-[#f3faf6]' : 'hover:bg-slate-50/75'
                            }`}
                          >
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                handleFocusProject(proj);
                                setWorkspaceProject(proj);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleFocusProject(proj);
                                  setWorkspaceProject(proj);
                                }
                              }}
                              className="flex min-h-[68px] cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 transition-transform active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#167248]/40 @[560px]:px-4 @[560px]:py-3"
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {/* Clean Map Thumbnail (tap thumbnail to preview location on 3D Earth) */}
                                <button
                                  type="button"
                                  title={`在 3D 地球上定位「${proj.name}」`}
                                  aria-label={`在 3D 地球上定位 ${proj.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleFocusProject(proj);
                                    showToast(`3D 地球已定位至「${proj.name}」`);
                                  }}
                                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[14px] border border-black/[0.08] bg-[#e8f0ec] transition-transform hover:scale-105 active:scale-95"
                                >
                                  {proj.thumbnailUrl ? (
                                    <img
                                      src={proj.thumbnailUrl}
                                      alt={proj.name}
                                      referrerPolicy="no-referrer"
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[#167248]">
                                      <MapPin className="h-5 w-5" />
                                    </div>
                                  )}
                                </button>

                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-[14.5px] font-bold tracking-tight text-[#11181c]">
                                      {proj.name}
                                    </span>
                                    {isFocused && (
                                      <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[#167248] whitespace-nowrap">
                                        · 地球已对准
                                      </span>
                                    )}
                                  </div>
                                  {/* Unboxed Single-Line Metadata with · separators */}
                                  <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden text-xs whitespace-nowrap text-[#5a6962]">
                                    <span
                                      className={`shrink-0 font-medium ${
                                        proj.storageType === 'cloud' ? 'text-[#0284c7]' : 'text-[#167248]'
                                      }`}
                                    >
                                      {proj.statusLabel}
                                    </span>
                                    <span className="shrink-0 text-slate-300" aria-hidden="true">
                                      ·
                                    </span>
                                    <span className="truncate tabular-nums">{proj.sizeOrSyncLabel}</span>
                                    <span className="shrink-0 text-slate-300" aria-hidden="true">
                                      ·
                                    </span>
                                    <span className="shrink-0 tabular-nums">{proj.lastModified}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex shrink-0 items-center gap-1">
                                <span
                                  aria-hidden="true"
                                  className="hidden @[560px]:inline-flex items-center gap-0.5 text-xs font-medium text-[#7c8b84]"
                                >
                                  <span>进入</span>
                                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                                </span>

                                <button
                                  type="button"
                                  aria-label={`${proj.name} 更多操作`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setMenuProjectId(isMenuOpen ? null : proj.id);
                                  }}
                                  className="flex min-h-[44px] min-w-[40px] items-center justify-center rounded-xl text-[#7c8b84] transition-colors hover:bg-black/[0.05] hover:text-[#11181c]"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            {/* Context Action Menu */}
                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="modal-sheet-pop absolute top-14 right-3 z-30 w-52 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/96 py-1.5 shadow-[0_14px_38px_-10px_rgba(12,26,22,0.18),0_2px_6px_rgba(0,0,0,0.04)] backdrop-blur-md"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWorkspaceProject(proj);
                                    setMenuProjectId(null);
                                  }}
                                  className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-xs font-medium text-[#11181c] hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 text-[#167248]" />
                                  <span>查看调查详情</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleFocusProject(proj);
                                    setMenuProjectId(null);
                                    showToast(`3D 地球已定位至「${proj.name}」`);
                                  }}
                                  className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-xs font-medium text-[#11181c] hover:bg-slate-50"
                                >
                                  <MapPin className="h-3.5 w-3.5 text-[#0284c7]" />
                                  <span>在 3D 地球查看位置</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePinProject(proj)}
                                  className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-xs font-medium text-[#11181c] hover:bg-slate-50"
                                >
                                  <Pin className="h-3.5 w-3.5 text-[#5a6962]" />
                                  <span>设为首页常用调查</span>
                                </button>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProject(proj)}
                                  className="flex min-h-[44px] w-full items-center gap-2.5 px-4 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>从最近列表中移除</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quiet Footer Startup & Preferences Entry Bar (Thumb-Reachable without Card Clutter) */}
                  <div className="flex min-h-[44px] items-center justify-between gap-2 rounded-[16px] border border-black/[0.04] bg-[#ebf0ed]/75 px-3.5 py-1.5 transition-colors hover:bg-[#e5ece8]">
                    <button
                      type="button"
                      onClick={() => setIsSettingsOpen(true)}
                      className="group flex min-h-[36px] min-w-0 flex-1 items-center gap-2 text-left text-xs text-[#5a6962] transition-colors hover:text-[#11181c] focus-visible:outline-none"
                    >
                      <Settings className="h-3.5 w-3.5 shrink-0 text-[#167248] transition-transform duration-200 group-hover:rotate-45" />
                      <span className="truncate font-medium text-[#2c3833]">
                        启动时自动进入上次调查
                      </span>
                      <span className="shrink-0 text-[11px] text-[#687770] group-hover:text-[#167248]">
                        · 更多偏好 &gt;
                      </span>
                    </button>

                    <label
                      className="relative inline-flex min-h-[36px] shrink-0 cursor-pointer items-center pl-1"
                      title="开启或关闭启动时自动进入上次调查"
                    >
                      <input
                        type="checkbox"
                        checked={preferences.launchLastOnStart}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPreferences((p) => ({ ...p, launchLastOnStart: checked }));
                          showToast(
                            checked
                              ? `已开启：下次启动将直接进入「${activeProject.name}」`
                              : '已关闭启动时自动进入上次调查'
                          );
                        }}
                        aria-label="启动时自动进入上次调查"
                        className="peer sr-only"
                      />
                      <span className="h-5 w-9 rounded-full bg-slate-300/90 transition-colors peer-checked:bg-[#167248] peer-focus-visible:ring-2 peer-focus-visible:ring-[#167248]/40" />
                      <span className="pointer-events-none absolute left-1.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform peer-checked:translate-x-4" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Subtle OS Home Gesture Pill for Device Frames */}
        {viewportMode !== 'fluid' && (
          <div aria-hidden="true" className="flex justify-center pt-0.5 pb-2.5">
            <span className="h-[4px] w-[112px] rounded-full bg-[#11181c]/18" />
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <AiCopilotDialog
        open={isAiOpen}
        startVoiceOnOpen={aiStartVoice}
        isProcessing={isAiProcessing}
        messages={aiMessages}
        onClose={() => {
          setIsAiOpen(false);
          setAiStartVoice(false);
        }}
        onResetChat={handleResetAiChat}
        onSubmitQuery={handleExecuteAiIntent}
      />

      <NewProjectModal
        open={isNewModalOpen}
        prefill={newProjectPrefill}
        onClose={() => {
          setIsNewModalOpen(false);
          setNewProjectPrefill(null);
        }}
        onCreate={handleCreateProject}
      />

      <ProjectWorkspaceModal
        project={workspaceProject}
        onClose={() => setWorkspaceProject(null)}
        onSyncProject={handleSyncProject}
        onEnterFieldMode={handleEnterFieldMode}
      />

      <SettingsDrawer
        open={isSettingsOpen}
        preferences={preferences}
        onClose={() => setIsSettingsOpen(false)}
        onChange={setPreferences}
        onRestoreDemoData={handleRestoreDemoData}
      />

      <ExitConfirmModal
        open={isExitOpen}
        onCancel={() => setIsExitOpen(false)}
        onConfirmExit={() => {
          setIsExitOpen(false);
          handleReplaySplash();
          showToast('已安全保存全部离线缓存与工程索引');
        }}
      />

      {/* Non-intrusive Feedback Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="modal-sheet-pop fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-2xl border border-white/12 bg-[#11181c]/95 px-4 py-2.5 text-xs font-medium text-white shadow-[0_16px_40px_-10px_rgba(0,0,0,0.45)] backdrop-blur-md"
        >
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" strokeWidth={2.5} aria-hidden="true" />
          <span className="truncate">{toast.message}</span>
          {toast.undoProject && (
            <button
              type="button"
              onClick={handleUndoRemove}
              className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1 font-semibold text-emerald-300 transition-colors hover:bg-white/25"
            >
              撤销
            </button>
          )}
        </div>
      )}
    </div>
  );
}
