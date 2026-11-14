import { LogOut, ShieldCheck } from 'lucide-react';

interface ExitConfirmModalProps {
  open: boolean;
  onCancel: () => void;
  onConfirmExit: () => void;
}

export function ExitConfirmModal({ open, onCancel, onConfirmExit }: ExitConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#11181c]/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-modal-title"
      onClick={onCancel}
    >
      <div
        className="modal-sheet-pop w-full max-w-sm rounded-[26px] border border-black/[0.08] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf5ef] text-[#167248]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h3 id="exit-modal-title" className="mt-4 text-base font-bold text-[#11181c]">
          保存记录并退出当前界面？
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[#5a6962]">
          系统会自动核对尚未上传的现场照片与定位轨迹，确保离线记录安全不丢失。
        </p>

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-[#5a6962] transition-colors hover:bg-slate-50 active:scale-[0.98]"
          >
            继续留在本页
          </button>
          <button
            type="button"
            onClick={onConfirmExit}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-[#11181c] px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 active:scale-[0.98]"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>保存并退出</span>
          </button>
        </div>
      </div>
    </div>
  );
}
