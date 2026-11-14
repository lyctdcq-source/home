import { X, Play, RefreshCw, Layers, MapPin, Compass, CheckCircle2 } from 'lucide-react';
import { GisProject } from '../types/gis';

interface ProjectWorkspaceModalProps {
  project: GisProject | null;
  onClose: () => void;
  onSyncProject: (id: string) => void;
  onEnterFieldMode: (project: GisProject) => void;
}

export function ProjectWorkspaceModal({
  project,
  onClose,
  onSyncProject,
  onEnterFieldMode,
}: ProjectWorkspaceModalProps) {
  if (!project) return null;

  const needsSync = project.sizeOrSyncLabel.includes('待');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#11181c]/40 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-sheet-pop w-full max-w-lg overflow-hidden rounded-t-[26px] border border-black/[0.08] bg-white shadow-2xl sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-slate-200 sm:hidden" />

        {/* Real GIS map preview banner */}
        <div className="relative h-48 w-full overflow-hidden bg-[#eaf2ee]">
          {project.thumbnailUrl ? (
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          ) : (
            <svg
              className="h-full w-full"
              viewBox="0 0 480 200"
              preserveAspectRatio="xMidYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="topoBg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#e8f3ed" />
                  <stop offset="100%" stopColor="#d3e8dd" />
                </linearGradient>
              </defs>
              <rect width="480" height="200" fill="url(#topoBg)" />
              <path
                d="M0 40 Q120 15 240 50 T480 35 M0 80 Q130 55 260 90 T480 75 M0 120 Q140 95 270 130 T480 115 M0 160 Q140 135 280 170 T480 155"
                fill="none"
                stroke="#167248"
                strokeOpacity="0.22"
                strokeWidth="1.2"
              />
              <path
                d="M80 0 V200 M160 0 V200 M240 0 V200 M320 0 V200 M400 0 V200"
                stroke="#167248"
                strokeOpacity="0.08"
                strokeWidth="1"
              />
              <path
                d="M120 140 L210 95 L295 112 L370 65"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="210" cy="95" r="5" fill="#167248" stroke="#fff" strokeWidth="2" />
              <circle cx="295" cy="112" r="5" fill="#167248" stroke="#fff" strokeWidth="2" />
              <circle cx="370" cy="65" r="5" fill="#0284c7" stroke="#fff" strokeWidth="2" />
            </svg>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

          <button
            type="button"
            onClick={onClose}
            aria-label="关闭工程详情"
            className="absolute top-3 right-3 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-colors hover:bg-black/55"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="absolute inset-x-5 bottom-4 text-white">
            <div className="text-xs font-medium text-white/85">
              {project.statusLabel} · {project.linkTypeLabel} · {project.lastModified}
            </div>
            <h3 id="workspace-modal-title" className="mt-0.5 text-xl font-bold tracking-tight">
              {project.name}
            </h3>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-[#5a6962]">{project.description}</p>

          {/* Clean tabular metadata grid */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-[#f7faf8] p-4 sm:grid-cols-3">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-[#7c8b84]">
                <MapPin className="h-3 w-3" />
                <span>所在位置</span>
              </div>
              <div className="mt-1 font-mono text-xs font-semibold text-[#11181c]">
                {project.coordinateLabel}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-[#7c8b84]">
                <Compass className="h-3 w-3" />
                <span>定位标准</span>
              </div>
              <div className="mt-1 font-mono text-xs font-semibold text-[#11181c]">
                {project.crs}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1 text-[11px] text-[#7c8b84]">
                <Layers className="h-3 w-3" />
                <span>调查规模</span>
              </div>
              <div className="mt-1 text-xs font-semibold tabular-nums text-[#11181c]">
                {project.layerCount} 图层 · {project.featureCount.toLocaleString()} 条记录
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-[#5a6962]">
            <span className="truncate">{project.path}</span>
            {project.topologyChecked && (
              <span className="ml-2 inline-flex shrink-0 items-center gap-1 font-medium text-[#167248]">
                <CheckCircle2 className="h-3.5 w-3.5" />
                记录完整可用
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4 pb-[max(4px,env(safe-area-inset-bottom))]">
            {needsSync && (
              <button
                type="button"
                onClick={() => onSyncProject(project.id)}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-[#167248]/25 bg-[#eaf5ef] px-4 py-2 text-xs font-semibold text-[#167248] transition-colors hover:bg-[#dceee4] active:scale-[0.98]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>立即上传待同步记录</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onEnterFieldMode(project)}
              className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#167248] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#115a38] active:scale-[0.98] sm:flex-initial"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>打开地图开始记录</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
