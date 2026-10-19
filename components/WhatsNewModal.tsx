import React, { useEffect, useRef } from 'react';
import { Trans } from 'react-i18next';
import { pushBackInterceptor } from '../hooks/useAppNavigation';

interface WhatsNewModalProps {
  onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onClose }) => {
  // Android back runs the same onClose as the button (which marks the notes as seen).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => pushBackInterceptor(() => onCloseRef.current()), []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 sm:p-5" role="presentation">
      <div
        dir="ltr"
        lang="en"
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
      >
        <h2 id="whats-new-title" className="text-xl font-bold text-slate-800">
          What's new
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          Since the last release:
        </p>
        {/* Release notes are intentionally English-only and hard-coded -- see RELEASE.md.
            Replace this list every release; do not add these strings to the locale files. */}
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs sm:text-sm leading-relaxed text-slate-600">
          <li><strong>Mooneva Lab (experimental).</strong> Turn it on in Settings for a device timer and a blood estimate for cups, discs, pads and tampons. English only for now.</li>
          <li><strong>Your own symptoms and moods.</strong> Add them in the day log. They show in Trends and in the doctor report.</li>
          <li><strong>Pregnancy:</strong> set the end date yourself, and each pregnancy gets its own row in History.</li>
          <li><strong>Discreet notifications</strong> on their own, and "Show ovulation day" without fertility wording.</li>
          <li><strong>Import from SimpleInnovation</strong>, plus many fixes for screen readers, dark mode, Persian and Arabic.</li>
        </ul>

        <p dir="auto" className="mt-5 rounded-2xl bg-[#F0F4F6] px-4 py-3.5 text-center text-xs sm:text-sm leading-relaxed text-slate-600">
          <Trans
            i18nKey="whats_new.tip"
            components={{ b: <strong className="font-bold text-[#557880]" /> }}
          />
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-[#7598a0] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#63858d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7598a0] focus-visible:ring-offset-2"
        >
          Close
        </button>
      </div>
    </div>
  );
};
