import type { HabitCategory } from '$lib/habits/categories';

export type HabitType = 'do_target' | 'do_on_time' | 'do_binary' | 'avoid' | 'rate';
export type LogStatus = 'logged' | 'skipped';
export type { HabitCategory };

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			profiles: {
				Row: {
					user_id: string;
					timezone: string;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					user_id: string;
					timezone?: string;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					user_id?: string;
					timezone?: string;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			habits: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					type: HabitType;
					category: HabitCategory | null;
					active_days: number[];
					allow_skip: boolean;
					max_consecutive_skips: number;
					anchor_time: string | null;
					target_value: number | null;
					target_unit: string | null;
					target_time: string | null;
					grace_minutes: number;
					falloff_minutes_per_10_percent: number;
					log_step: number;
					archived_at: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					type: HabitType;
					category?: HabitCategory | null;
					active_days: number[];
					allow_skip?: boolean;
					max_consecutive_skips?: number;
					anchor_time?: string | null;
					target_value?: number | null;
					target_unit?: string | null;
					target_time?: string | null;
					grace_minutes?: number;
					falloff_minutes_per_10_percent?: number;
					log_step?: number;
					archived_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					name?: string;
					type?: HabitType;
					category?: HabitCategory | null;
					active_days?: number[];
					allow_skip?: boolean;
					max_consecutive_skips?: number;
					anchor_time?: string | null;
					target_value?: number | null;
					target_unit?: string | null;
					target_time?: string | null;
					grace_minutes?: number;
					falloff_minutes_per_10_percent?: number;
					log_step?: number;
					archived_at?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			habit_logs: {
				Row: {
					id: string;
					habit_id: string;
					user_id: string;
					log_date: string;
					status: LogStatus;
					actual_value: number | null;
					actual_time: string | null;
					satisfaction: number | null;
					adherence_score: number | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					habit_id: string;
					user_id: string;
					log_date: string;
					status: LogStatus;
					actual_value?: number | null;
					actual_time?: string | null;
					satisfaction?: number | null;
					adherence_score?: number | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					habit_id?: string;
					user_id?: string;
					log_date?: string;
					status?: LogStatus;
					actual_value?: number | null;
					actual_time?: string | null;
					satisfaction?: number | null;
					adherence_score?: number | null;
					created_at?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: {
			habit_type: HabitType;
			habit_category: HabitCategory;
			log_status: LogStatus;
		};
		CompositeTypes: Record<string, never>;
	};
}

export type Habit = Database['public']['Tables']['habits']['Row'];
export type HabitLog = Database['public']['Tables']['habit_logs']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

export type HabitWithLog = Habit & { log: HabitLog | null };
