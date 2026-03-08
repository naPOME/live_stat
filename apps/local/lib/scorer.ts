import { getPointSystem } from './rosterStore';

export function calcTeamPoints(placement: number | undefined, kills: number): number {
  const sys = getPointSystem();
  const killPts = kills * sys.kill_points;
  const placePts = placement != null && placement >= 1
    ? (sys.placement_points[String(placement)] ?? 0)
    : 0;
  return killPts + placePts;
}
