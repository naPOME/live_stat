import type { PointSystem } from './types';

export function calcTeamPoints(
  placement: number | undefined,
  kills: number,
  system: PointSystem,
): number {
  const killPts = kills * system.kill_points;
  const placementPts =
    placement !== undefined && placement >= 1
      ? (system.placement_points[String(placement)] ?? 0)
      : 0;
  return killPts + placementPts;
}

export const DEFAULT_POINT_SYSTEM: PointSystem = {
  kill_points: 1,
  placement_points: {
    '1': 10, '2': 6, '3': 5, '4': 4, '5': 3,
    '6': 2, '7': 1, '8': 1, '9': 0, '10': 0,
    '11': 0, '12': 0, '13': 0, '14': 0, '15': 0,
    '16': 0, '17': 0, '18': 0, '19': 0, '20': 0,
  },
};
