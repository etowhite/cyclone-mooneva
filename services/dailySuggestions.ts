import type { CycleStatusData } from './logic/status';

type Pair = readonly [string, string];
const work: Pair[] = [
 ['Выбери одну главную задачу и начни с небольшого шага.','Choose one priority and start with a small step.'],
 ['Раздели большую задачу на короткие этапы с паузами.','Split a large task into short stages with breaks.'],
 ['Оставь в расписании запас между встречами.','Leave some space between meetings.'],
 ['Запиши идеи, прежде чем выбирать, что делать дальше.','Write down your ideas before choosing your next task.'],
 ['Попробуй один отрезок работы без уведомлений.','Try one block of work without notifications.'],
 ['Уточни ожидания по сложной задаче до её начала.','Clarify expectations before starting a complex task.'],
 ['Заверши небольшое отложенное дело, если есть силы.','Finish a small postponed task if you have the energy.'],
 ['Подведи короткий итог сделанного и выбери следующий шаг.','Review what you have done and choose the next step.'],
];
const sport: Pair[] = [
 ['Выбери прогулку в удобном темпе.','Choose a walk at a comfortable pace.'],
 ['Начни с мягкой разминки и оцени самочувствие.','Start with a gentle warm-up and check how you feel.'],
 ['Можно попробовать спокойную растяжку без усилия через боль.','You could try gentle stretching without pushing through pain.'],
 ['Для привычной тренировки выбери комфортную нагрузку.','Choose a comfortable intensity for a familiar workout.'],
 ['Сделай короткую паузу для движения после долгого сидения.','Take a short movement break after sitting for a long time.'],
 ['Выбери знакомое движение, которое тебе нравится.','Choose a familiar activity you enjoy.'],
 ['Сегодня можно сделать акцент на технике, а не на рекорде.','You could focus on technique rather than a personal best.'],
 ['Если хочется отдохнуть, оставь тренировку на другой день.','If you need rest, leave the workout for another day.'],
];
const mood: Pair[] = [
 ['Назови своё чувство без оценки и запиши его в дневник.','Name your feeling without judging it and log it.'],
 ['Оставь немного времени на занятие, которое тебя успокаивает.','Make a little time for something that helps you feel calm.'],
 ['Скажи близкому человеку, какая поддержка сейчас нужна.','Tell someone close what support you need right now.'],
 ['Сделай паузу перед ответом на неприятное сообщение.','Pause before replying to an upsetting message.'],
 ['Отметь одну небольшую вещь, которая сегодня порадовала.','Notice one small thing that brought you joy today.'],
 ['Проверь, хочется ли тебе общения или времени наедине.','Check whether you want company or time alone.'],
 ['Попробуй сократить одну необязательную обязанность.','Try setting aside one nonessential commitment.'],
 ['Поблагодари себя за то, с чем удалось справиться.','Give yourself credit for what you managed today.'],
];
const endings: Pair[][] = [
 [ ['Ориентируйся на доступные силы.','Work with the energy you have.'], ['Темп можно менять.','You can adjust your pace.'], ['Необязательно закончить всё сразу.','You do not need to finish everything at once.'], ['Пауза тоже часть работы.','A break is part of the work too.'], ['Удобный план лучше перегруженного.','A manageable plan beats an overloaded one.'], ['При необходимости попроси помощи.','Ask for help if you need it.'], ['Сверь план с реальным самочувствием.','Match your plan to how you actually feel.'] ],
 [ ['При дискомфорте уменьши нагрузку или остановись.','Reduce the intensity or stop if uncomfortable.'], ['Не сравнивай результат с чужим.','Avoid comparing your performance with others.'], ['Выбери удобную продолжительность.','Choose a manageable duration.'], ['Оставь время на восстановление.','Allow time to recover.'], ['Следи за комфортом, а не цифрами.','Focus on comfort rather than numbers.'], ['Отдых допустим в любой день цикла.','Rest is an option on any cycle day.'], ['Нагрузку можно пересмотреть по ходу.','You can adjust the activity as you go.'] ],
 [ ['Твоё чувство не обязано совпадать с прогнозом.','Your feelings do not have to match a prediction.'], ['Можно не торопиться с решениями.','There is no need to rush a decision.'], ['Дай себе право на спокойный темп.','Give yourself permission to slow down.'], ['Сравни запись со своим опытом, а не ожиданиями.','Compare the entry with your experience, not expectations.'], ['Границы можно обозначить словами.','It is okay to state your boundaries.'], ['Не нужно объяснять циклом каждую эмоцию.','Not every emotion needs a cycle-based explanation.'], ['Небольшая забота о себе тоже имеет значение.','A little self-care matters too.'] ],
];

/** Suggestions, not predictions of performance or mood. 56 distinct combinations per category. */
export function dailySuggestions(date: string, status: CycleStatusData, language: string, general = false) {
 const lang = language.startsWith('ru') ? 0 : 1;
 const day = status.dayOfCycle && status.dayOfCycle > 0 ? status.dayOfCycle - 1 : Math.floor(Date.parse(date+'T12:00:00Z')/86400000);
 const index = Math.max(0, Number.isFinite(day) ? day : 0);
 const phase = general ? 'neutral' : status.phaseKey;
 const phaseNote: Pair = phase === 'menstrual'
  ? ['Если сегодня есть кровотечение или боль, выбирай нагрузку по самочувствию.','If you have bleeding or pain today, let how you feel guide your activity.']
  : phase === 'pms'
  ? ['Если замечаешь предменструальный дискомфорт, можно упростить план.','If you notice premenstrual discomfort, you can simplify your plan.']
  : ['План подстраивается под тебя, а не наоборот.','Your plan can adapt to you, rather than the other way round.'];
 return [work, sport, mood].map((pool, category) => ({
  category: ['work','sport','mood'][category],
  title: (lang === 0 ? ['Работа','Спорт','Настроение'] : ['Work','Exercise','Mood'])[category],
  text: pool[(index + category * 3) % pool.length][lang] + ' ' + endings[category][Math.floor(index / pool.length) % 7][lang] + (category === 1 ? ' ' + phaseNote[lang] : ''),
 }));
}
