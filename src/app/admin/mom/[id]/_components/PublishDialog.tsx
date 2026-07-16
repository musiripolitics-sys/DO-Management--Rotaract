'use client'

import { Loader2, Mail, Send } from 'lucide-react'

/* Publish confirmation — emailing every president is one-way, so the blast is
 * an explicit choice rather than a side effect of publishing. */
export default function PublishDialog({
  presidentCount,
  publishing,
  onCancel,
  onPublish,
}: {
  presidentCount: number
  publishing: boolean
  onCancel: () => void
  onPublish: (notify: boolean) => void
}) {
  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1A1815]/50 backdrop-blur-sm"
      onClick={() => !publishing && onCancel()}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-[#1A1815]/8 shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-[#1A1815]">Publish these minutes?</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#1A1815]/70">
          Publishing makes the minutes public on the district site. You can also email them to every
          club president at once.
        </p>

        <div className="mt-4 flex items-start gap-3 rounded-xl bg-[#F5F3FF] border border-[#6D28D9]/15 p-3.5">
          <Mail className="w-4 h-4 mt-0.5 shrink-0 text-[#6D28D9]" />
          <p className="text-sm text-[#1A1815]/80">
            {presidentCount > 0 ? (
              <>
                Will email{' '}
                <strong className="text-[#1A1815]">
                  {presidentCount} club president{presidentCount === 1 ? '' : 's'}
                </strong>{' '}
                of District 3233. This can&rsquo;t be undone.
              </>
            ) : (
              <>No club presidents have an email address on file, so there is no one to notify yet.</>
            )}
          </p>
        </div>

        <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <button
            onClick={onCancel}
            disabled={publishing}
            className="text-sm font-medium text-[#1A1815]/60 hover:text-[#1A1815] rounded-xl px-4 py-2.5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onPublish(false)}
            disabled={publishing}
            className="inline-flex items-center justify-center gap-2 border border-[#1A1815]/12 hover:bg-[#1A1815]/5 text-[#1A1815] text-sm font-medium rounded-xl px-4 py-2.5 disabled:opacity-40"
          >
            Publish only
          </button>
          <button
            onClick={() => onPublish(true)}
            disabled={publishing || presidentCount === 0}
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl px-4 py-2.5 disabled:opacity-40"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" /> Publish &amp; email
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
