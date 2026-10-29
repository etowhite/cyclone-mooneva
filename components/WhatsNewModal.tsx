import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { pushBackInterceptor } from '../hooks/useAppNavigation';

interface WhatsNewModalProps {
  onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ onClose }) => {
  const { t, i18n } = useTranslation();
  const ru = i18n.language.startsWith('ru');
  const notes = ru ? [
    'Пять палитр, светлая, тёмная и автоматическая тема cyclone.',
    'Оформление и язык в отдельном разделе настроек.',
    'Подписи навигации и читаемые контуры карточек.',
    'На Android иконка следует палитре приложения и яркости темы устройства.',
    'Расчёты, история и аналитика основаны на Mooneva; форк пока находится в разработке.'
  ] : [
    'Five palettes with light, dark and automatic cyclone appearance.',
    'Appearance and language in a dedicated settings page.',
    'Labeled navigation and outlined cards.',
    'On Android the icon follows the app palette and device theme brightness.',
    'Calculations, history and analytics are based on Mooneva. This fork is still in development.'
  ];
  // Android back runs the same onClose as the button (which marks the notes as seen).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => pushBackInterceptor(() => onCloseRef.current()), []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 sm:p-5" role="presentation">
      <div
        dir={i18n.dir()}
        lang={i18n.language}
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-6 shadow-2xl text-left"
        role="dialog"
        aria-modal="true"
        aria-labelledby="whats-new-title"
      >
        <h2 id="whats-new-title" className="text-xl font-bold text-slate-800">
          {ru ? 'Что нового в cyclone' : 'What is new in cyclone'}
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          {ru ? 'Текущий этап разработки:' : 'Current development milestone:'}
        </p>
        <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-slate-600">
          {notes.map(note => <li key={note}>{note}</li>)}
        </ul>
        <p className="mt-5 text-xs text-slate-500">{ru ? 'Mooneva Cycle — исходный проект. GPL-3.0-or-later, авторство сохранено.' : 'Based on Mooneva Cycle. GPL-3.0-or-later; upstream authorship retained.'}</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-2xl bg-[#7598a0] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#63858d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7598a0] focus-visible:ring-offset-2"
        >
          {t('common.close', ru ? 'Закрыть' : 'Close')}
        </button>
      </div>
    </div>
  );
};
