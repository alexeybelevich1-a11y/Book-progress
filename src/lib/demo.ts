import { createBook, emptyState, setChapterStatus, toLocalDate } from './progress';
import type { AppState } from './types';

/** Example data, used only in preview builds (VITE_DEMO=1). */
export function demoState(): AppState {
  const day = (ago: number) => { const d = new Date(); d.setDate(d.getDate() - ago); return toLocalDate(d); };
  const robbins = createBook({
    title: 'Robbins and Cotran Pathologic Basis of Disease (example)', identifier: '9780323531139', authors: 'Vinay Kumar, Abul K. Abbas, Jon C. Aster', chapterCount: 29,
    chapterTitles: ['The Cell as a Unit of Health and Disease', 'Cellular Responses to Stress and Toxic Insults', 'Inflammation and Repair', 'Hemodynamic Disorders, Thromboembolic Disease, and Shock', 'Genetic Disorders', 'Diseases of the Immune System', 'Neoplasia', 'Infectious Diseases', 'Environmental and Nutritional Diseases', 'Diseases of Infancy and Childhood', 'Blood Vessels', 'The Heart'],
  });
  const harrison = createBook({ title: "Harrison's Principles of Internal Medicine, 21e (example)", identifier: '9781260464597', authors: 'Loscalzo, Fauci, Kasper et al.', chapterCount: 40 });
  let s: AppState = { ...emptyState(), books: [robbins, harrison] };
  const marks: [string, number, 'done' | 'reading', number][] = [
    [robbins.id, 1, 'done', 6], [robbins.id, 3, 'done', 5], [robbins.id, 7, 'done', 4], [robbins.id, 12, 'reading', 3],
    [harrison.id, 18, 'done', 2], [harrison.id, 24, 'done', 1], [harrison.id, 2, 'reading', 1], [robbins.id, 11, 'done', 0],
  ];
  for (const [id, ch, st, ago] of marks) s = setChapterStatus(s, id, ch, st, day(ago));
  return s;
}
