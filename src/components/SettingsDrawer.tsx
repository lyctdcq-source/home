import { X, Clock, Sunrise, Sun, Sunset, Moon, RotateCw, Map, RotateCcw } from 'lucide-react';
import { AppPreferences, GlobeLightingMode } from '../types/gis';

interface SettingsDrawerProps {
  open: boolean;
  preferences: AppPreferences;
  onClose: () => void;
  onChange: (next: AppPreferences) => void;
  onRestoreDemoData: () => void;
}

export function SettingsDrawer({
  open,
  preferences,
  onClose,
  onChange,
  onRestoreDemoData,
}: SettingsDrawerProps) {
  if (!open) return null;

  const setLighting = (globeLighting: GlobeLightingMode) =>
    onChange({ ...preferences, globeLighting });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#11181c]/40 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-sheet-pop w-full max-w-md overflow-hidden rounded-t-[26px] border border-black/[0.08] bg-white shadow-2xl sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 id="settings-modal-title" className="text-lg font-bold text-[#11181c]">
              系统设置与地图偏好
            </h3>
            <p className="mt-0.5 text-xs text-[#5a6962]">设置 3D 地球光影、常用地图底图与启动行为</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭设置"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#5a6962] transition-colors hover:bg-slate-100 hover:text-[#11181c]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* 3D 地球与苍穹天际光影模式 */}
          <div>
            <div className="mb-2 text-xs font-semibold text-[#11181c]">3D 地球与天际光影</div>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'auto' as const, label: '随时间', icon: Clock },
                { id: 'dawn' as const, label: '晨光', icon: Sunrise },
                { id: 'noon' as const, label: '中午', icon: Sun },
                { id: 'sunset' as const, label: '晚霞', icon: Sunset },
                { id: 'night' as const, label: '夜光', icon: Moon },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = preferences.globeLighting === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLighting(opt.id)}
                    className={`flex min-h-[46px] flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[11px] font-medium whitespace-nowrap transition-colors ${
                      active
                        ? 'border-[#167248] bg-[#eaf5ef] text-[#167248]'
                        : 'border-slate-200 bg-white text-[#5a6962] hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-[#5a6962]">
              {preferences.globeLighting === 'auto'
                ? '已开启全天自适应：随本地时间流转晨光、中午晴空、傍晚霞光与深夜星野。'
                : '当前为固定光影模式，可切回「随时间」体验全天四时自动渐变。'}
            </p>
          </div>

          {/* 默认底图样式 */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#11181c]">
              <Map className="h-3.5 w-3.5 text-[#167248]" />
              <span>常用地图底图</span>
            </div>
            <div className="space-y-2">
              {[
                { id: 'vector-day' as const, title: '标准电子地图', desc: '道路、地标与街区轮廓清晰易读' },
                { id: 'satellite-hybrid' as const, title: '高清卫星实景图', desc: '航拍影像叠加路网，识别地物更直观' },
                { id: 'terrain-contour' as const, title: '户外等高线地形图', desc: '清晰显示山体坡度与海拔起伏，适合踏勘' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChange({ ...preferences, basemapStyle: item.id })}
                  className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all active:scale-[0.99] ${
                    preferences.basemapStyle === item.id
                      ? 'border-[#167248] bg-[#f4faf7] shadow-[0_0_0_1px_#167248]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="text-xs font-semibold text-[#11181c]">{item.title}</div>
                    <div className="text-[11px] text-[#5a6962]">{item.desc}</div>
                  </div>
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border-2 transition-colors ${
                      preferences.basemapStyle === item.id
                        ? 'border-[#167248] bg-[#167248] ring-[3px] ring-inset ring-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 开关选项 */}
          <div className="space-y-3 border-t border-slate-100 pt-4">
            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-medium text-[#11181c]">
                <RotateCw className="h-4 w-4 text-[#5a6962]" />
                闲置时地球轻缓旋转
              </span>
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={preferences.autoRotateGlobe}
                  onChange={(e) => onChange({ ...preferences, autoRotateGlobe: e.target.checked })}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#167248] peer-focus-visible:ring-2 peer-focus-visible:ring-[#167248]/40" />
                <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>

            <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-[#11181c]">启动时自动进入上次调查</div>
                <div className="text-[11px] text-[#5a6962]">开启后打开应用将直接恢复上次调查工作区</div>
              </div>
              <span className="relative inline-flex shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={preferences.launchLastOnStart}
                  onChange={(e) => onChange({ ...preferences, launchLastOnStart: e.target.checked })}
                  className="peer sr-only"
                />
                <span className="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-[#167248] peer-focus-visible:ring-2 peer-focus-visible:ring-[#167248]/40" />
                <span className="pointer-events-none absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 pb-[max(4px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onRestoreDemoData}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-[#5a6962] transition-colors hover:bg-slate-100 hover:text-[#11181c]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>恢复默认示例调查</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl bg-[#167248] px-5 text-xs font-semibold text-white transition-colors hover:bg-[#115a38] active:scale-[0.98]"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
