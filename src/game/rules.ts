import type {DiffId} from './difficulty';
import {SAVE_PREFIX} from './edition';

/** Longer roads and changed handling need comparable records of their own. */
export const RULESET = 'tour2';
export const STAGE_BEST_KEY = `${SAVE_PREFIX}.stage-bests.${RULESET}`;
export const ARCADE_KEY = `${SAVE_PREFIX}.arcade.${RULESET}`;
export const boardId = (kind:'score'|'run',diff:DiffId):string => `${kind}-${diff}-${RULESET}`;
