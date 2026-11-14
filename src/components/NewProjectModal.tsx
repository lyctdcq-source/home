import { useEffect, useState } from 'react';
import { X, FolderOpen, Cloud, MapPin, Layers, Compass } from 'lucide-react';
import {
  CreateProjectPrefill,
  GisProject,
  ProjectStorageType,
  ProjectTemplate,
} from '../types/gis';

interface NewProjectModalProps {
  open: boolean;
  prefill?: CreateProjectPrefill | null;
  onClose: () => void;
  onCreate: (project: GisProject) => void;
}

const TEMPLATES: {
  id: ProjectTemplate;
  name: string;
  desc: string;
  layers: number;
  thumb: string;
}[] = [
  {
    id: 'cadastral',
    name: '踏勘打卡与生态调查',
    desc: '拍照定位、植物动物分布标注与巡护轨迹记录',
    layers: 9,
    thumb: '/assets/aistudio/bees.qgz_6f84489e.jpg',
  },
  {
    id: 'pipeline',
    name: '城乡设施与隐患巡检',
    desc: '道路井盖、路灯积水点拍照上报与整改核对',
    layers: 12,
    thumb: '/assets/aistudio/wastewater.qgz_4eab8634.jpg',
  },
  {
    id: 'photogrammetry',
    name: '地块测量与实景核查',
    desc: '绕地测算面积周长，叠加实景影像核对范围',
    layers: 8,
    thumb: '/assets/aistudio/live_qfield_users_survey.qgs_1363f4fd.jpg',
  },
];

const REGION_PRESETS = [
  { label: '长三角地区 (上海周边)', short: '长三角地区', lat: 31.23, lon: 121.47 },
  { label: '成渝地区 (成都周边)', short: '成渝地区', lat: 30.67, lon: 104.06 },
  { label: '京津冀地区 (北京周边)', short: '京津冀地区', lat: 39.9, lon: 116.4 },
  { label: '粤港澳大湾区 (广深周边)', short: '粤港澳大湾区', lat: 23.13, lon: 113.26 },
];

export function NewProjectModal({ open, prefill, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('');
  const [storageType, setStorageType] = useState<ProjectStorageType>('local');
  const [template, setTemplate] = useState<ProjectTemplate>('cadastral');
  const [crs, setCrs] = useState<'CGCS2000' | 'WGS84' | 'EPSG:2056'>('CGCS2000');
  const [regionIndex, setRegionIndex] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.name) setName(prefill.name);
    if (prefill.storageType) setStorageType(prefill.storageType);
    if (prefill.template) setTemplate(prefill.template);
    if (prefill.crs) setCrs(prefill.crs);
    if (typeof prefill.regionIndex === 'number') setRegionIndex(prefill.regionIndex);
    setError('');
  }, [open, prefill]);

  if (!open) return null;

  const selectedTemplate = TEMPLATES.find((t) => t.id === template) || TEMPLATES[0];
  const selectedRegion = REGION_PRESETS[regionIndex] || REGION_PRESETS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入调查任务名称');
      return;
    }

    const newProj: GisProject = {
      id: `proj-${Date.now()}`,
      name: trimmed,
      path: `${selectedRegion.short} · ${storageType === 'cloud' ? '多人在线' : '本地离线'}`,
      storageType,
      linkTypeLabel: storageType === 'cloud' ? '团队共享' : '本机离线',
      statusLabel: storageType === 'cloud' ? '云端协同' : '本地离线',
      sizeOrSyncLabel: storageType === 'cloud' ? '已建立云端同步' : '支持离线地图',
      coordinateLabel: `${selectedRegion.lon.toFixed(2)}°E, ${selectedRegion.lat.toFixed(2)}°N`,
      lat: selectedRegion.lat,
      lon: selectedRegion.lon,
      crs,
      template,
      layerCount: selectedTemplate.layers,
      featureCount: 0,
      lastModified: '刚刚创建',
      thumbnailUrl: selectedTemplate.thumb,
      topologyChecked: true,
      description: `采用「${selectedTemplate.name}」场景模板创建，定位区域为${selectedRegion.short}。`,
    };

    onCreate(newProj);
    setName('');
    setError('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#11181c]/40 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      onClick={onClose}
    >
      <div
        className="modal-sheet-pop w-full max-w-lg overflow-hidden rounded-t-[26px] border border-black/[0.08] bg-white shadow-2xl sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-slate-200 sm:hidden" />

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 id="new-project-title" className="text-lg font-bold text-[#11181c]">
              新建外业调查
            </h3>
            <p className="mt-0.5 text-xs text-[#5a6962]">选好调查场景与区域，即可在地图上拍照打点</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭弹窗"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[#5a6962] transition-colors hover:bg-slate-100 hover:text-[#11181c]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[78vh] space-y-5 overflow-y-auto px-6 py-5">
          {/* 调查名称 */}
          <div>
            <label htmlFor="project-name-input" className="mb-1.5 block text-xs font-semibold text-[#11181c]">
              调查名称
            </label>
            <input
              id="project-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="例如：西湖景区古树名木巡护记录"
              className="w-full rounded-xl border border-slate-200 bg-[#f8faf9] px-3.5 py-2.5 text-sm text-[#11181c] placeholder:text-slate-400 focus:border-[#167248] focus:bg-white focus:ring-2 focus:ring-[#167248]/12 focus:outline-none"
            />
            {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
          </div>

          {/* 使用方式 */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-[#11181c]">保存与协作方式</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setStorageType('local')}
                className={`flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                  storageType === 'local'
                    ? 'border-[#167248] bg-[#eaf5ef] text-[#167248]'
                    : 'border-slate-200 bg-white text-[#5a6962] hover:border-slate-300'
                }`}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">本机离线使用</div>
                  <div className="text-[11px] opacity-80">无网络也能照常记录</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setStorageType('cloud')}
                className={`flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                  storageType === 'cloud'
                    ? 'border-[#0284c7] bg-[#f0f9ff] text-[#0284c7]'
                    : 'border-slate-200 bg-white text-[#5a6962] hover:border-slate-300'
                }`}
              >
                <Cloud className="h-4 w-4 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">云端团队协作</div>
                  <div className="text-[11px] opacity-80">多人打点实时汇总</div>
                </div>
              </button>
            </div>
          </div>

          {/* 调查场景 */}
          <div>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#11181c]">
              <Layers className="h-3.5 w-3.5 text-[#167248]" />
              <span>常用调查场景（3 类预设）</span>
            </span>
            <div className="space-y-2">
              {TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTemplate(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all active:scale-[0.99] ${
                    template === item.id
                      ? 'border-[#167248] bg-[#f4faf7] shadow-[0_0_0_1px_#167248]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={item.thumb}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="h-10 w-10 shrink-0 rounded-lg border border-black/10 object-cover"
                    />
                    <div>
                      <div className="text-xs font-semibold text-[#11181c]">{item.name}</div>
                      <div className="mt-0.5 text-[11px] text-[#5a6962]">{item.desc}</div>
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 text-[11px] font-medium tabular-nums text-[#5a6962]">
                    {item.layers} 项预设
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 区域与定位标准 */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="region-select" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#11181c]">
                <MapPin className="h-3.5 w-3.5 text-[#167248]" />
                <span>初始调查区域</span>
              </label>
              <select
                id="region-select"
                value={regionIndex}
                onChange={(e) => setRegionIndex(Number(e.target.value))}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-[#f8faf9] px-3 text-xs font-medium text-[#11181c] focus:border-[#167248] focus:bg-white focus:outline-none"
              >
                {REGION_PRESETS.map((r, idx) => (
                  <option key={r.label} value={idx}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="crs-select" className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#11181c]">
                <Compass className="h-3.5 w-3.5 text-[#167248]" />
                <span>定位标准</span>
              </label>
              <select
                id="crs-select"
                value={crs}
                onChange={(e) => setCrs(e.target.value as 'CGCS2000' | 'WGS84' | 'EPSG:2056')}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-[#f8faf9] px-3 text-xs font-medium text-[#11181c] focus:border-[#167248] focus:bg-white focus:outline-none"
              >
                <option value="CGCS2000">中国通用标准 (CGCS2000)</option>
                <option value="WGS84">全球通用定位 (WGS 84)</option>
                <option value="EPSG:2056">高精度地方投影 (EPSG:2056)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 pb-[max(4px,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-[#5a6962] transition-colors hover:bg-slate-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="min-h-[44px] rounded-xl bg-[#167248] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#115a38] active:scale-[0.98]"
            >
              创建并定位地图
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
