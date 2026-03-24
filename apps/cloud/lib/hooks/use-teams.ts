'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import type { Team, Player } from '@/lib/types';

const supabase = createClient();

// ── Query keys ──────────────────────────────────────────────────
export const teamKeys = {
  all: ['teams'] as const,
  detail: (id: string) => ['teams', id] as const,
  players: (teamId: string) => ['teams', teamId, 'players'] as const,
};

// ── Teams list ──────────────────────────────────────────────────
export function useTeams(orgId: string, initialData?: Team[]) {
  return useQuery({
    queryKey: teamKeys.all,
    queryFn: async () => {
      const { data } = await supabase
        .from('teams')
        .select('id, org_id, name, short_name, logo_url, created_at')
        .eq('org_id', orgId)
        .order('name');
      return (data as Team[]) ?? [];
    },
    initialData,
  });
}

// ── Team players ────────────────────────────────────────────────
export function useTeamPlayers(teamId: string, initialData?: Player[]) {
  return useQuery({
    queryKey: teamKeys.players(teamId),
    queryFn: async () => {
      const { data } = await supabase
        .from('players')
        .select('id, team_id, display_name, player_open_id, photo_url, created_at')
        .eq('team_id', teamId)
        .order('display_name');
      return (data as Player[]) ?? [];
    },
    initialData,
  });
}

// ── Create team ─────────────────────────────────────────────────
export function useCreateTeam(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; short_name: string | null; logo_url?: string | null }) => {
      const { data, error } = await supabase
        .from('teams')
        .insert({ org_id: orgId, ...input })
        .select('id, org_id, name, short_name, logo_url, created_at')
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: (created) => {
      qc.setQueryData<Team[]>(teamKeys.all, (old) =>
        [...(old ?? []), created].sort((a, b) => a.name.localeCompare(b.name)),
      );
    },
  });
}

// ── Delete team ─────────────────────────────────────────────────
export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
      return teamId;
    },
    onMutate: async (teamId) => {
      await qc.cancelQueries({ queryKey: teamKeys.all });
      const prev = qc.getQueryData<Team[]>(teamKeys.all);
      qc.setQueryData<Team[]>(teamKeys.all, (old) => old?.filter((t) => t.id !== teamId));
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(teamKeys.all, context.prev);
    },
  });
}

// ── Add player ──────────────────────────────────────────────────
export function useAddPlayer(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { display_name: string; player_open_id: string }) => {
      const { data, error } = await supabase
        .from('players')
        .insert({ team_id: teamId, ...input })
        .select('id, team_id, display_name, player_open_id, photo_url, created_at')
        .single();
      if (error) throw error;
      return data as Player;
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: teamKeys.players(teamId) });
      const prev = qc.getQueryData<Player[]>(teamKeys.players(teamId));
      const optimistic: Player = {
        id: `temp-${Date.now()}`,
        team_id: teamId,
        display_name: input.display_name,
        player_open_id: input.player_open_id,
        photo_url: null,
        created_at: new Date().toISOString(),
      };
      qc.setQueryData<Player[]>(teamKeys.players(teamId), (old) =>
        [...(old ?? []), optimistic].sort((a, b) => a.display_name.localeCompare(b.display_name)),
      );
      return { prev, tempId: optimistic.id };
    },
    onSuccess: (created, _input, context) => {
      qc.setQueryData<Player[]>(teamKeys.players(teamId), (old) =>
        old?.map((p) => (p.id === context?.tempId ? created : p)),
      );
    },
    onError: (_err, _input, context) => {
      if (context?.prev) qc.setQueryData(teamKeys.players(teamId), context.prev);
    },
  });
}

// ── Delete player ───────────────────────────────────────────────
export function useDeletePlayer(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playerId: string) => {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;
      return playerId;
    },
    onMutate: async (playerId) => {
      await qc.cancelQueries({ queryKey: teamKeys.players(teamId) });
      const prev = qc.getQueryData<Player[]>(teamKeys.players(teamId));
      qc.setQueryData<Player[]>(teamKeys.players(teamId), (old) => old?.filter((p) => p.id !== playerId));
      return { prev };
    },
    onError: (_err, _id, context) => {
      if (context?.prev) qc.setQueryData(teamKeys.players(teamId), context.prev);
    },
  });
}

// ── Update team ─────────────────────────────────────────────────
export function useUpdateTeam(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Pick<Team, 'name' | 'short_name' | 'logo_url'>>) => {
      const { error } = await supabase.from('teams').update(input).eq('id', teamId);
      if (error) throw error;
      return input;
    },
    onMutate: async (input) => {
      const prevAll = qc.getQueryData<Team[]>(teamKeys.all);
      qc.setQueryData<Team[]>(teamKeys.all, (old) =>
        old?.map((t) => (t.id === teamId ? { ...t, ...input } : t)),
      );
      return { prevAll };
    },
    onError: (_err, _input, context) => {
      if (context?.prevAll) qc.setQueryData(teamKeys.all, context.prevAll);
    },
  });
}
