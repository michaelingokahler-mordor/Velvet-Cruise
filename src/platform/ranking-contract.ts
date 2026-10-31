import catalog from '../../assets/ui/boards.json';

export interface RankingEntry { rank: number; score: number; displayName: string; driverTag?: string; you?: boolean }
export interface RankingProfile { id: string; token: string; displayName: string }
export function rankingDisplayName(entry: Pick<RankingEntry, 'displayName' | 'driverTag'>): string {
  return entry.driverTag && /^[0-9A-F]{8}$/.test(entry.driverTag) ? `${entry.displayName}#${entry.driverTag}` : entry.displayName;
}
export interface RankingBoard { board: string; order: string; min: number; max: number }
export const RANKING_BOARDS: readonly RankingBoard[] = catalog.boards;
export const rankingBoard = (id: string): RankingBoard | undefined => RANKING_BOARDS.find(b => b.board === id);
export function rankingName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return Array.from(value.toUpperCase()).filter(c => /^[A-Z0-9 \-.!?&'ÄÖÜÉÈÀÑÇ]$/.test(c)).join('').replace(/\s+/g, ' ').trim().slice(0, 10);
}
export function validRankingScore(board: RankingBoard, value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= board.min && value <= board.max;
}
