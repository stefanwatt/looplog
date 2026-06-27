import type { Habit } from '$lib/database.types';
import type { HabitLogPayload } from '$lib/habits/log-actions';
import { nailedItInput } from '$lib/habits/adherence';

export type HabitCardForm = {
	actualValue: number | null;
	actualTime: string;
	satisfaction: number | null;
	touched: boolean;
};

export function blankCardForm(habit: Habit): Omit<HabitCardForm, 'touched'> {
	switch (habit.type) {
		case 'do_target':
			return { actualValue: null, actualTime: '', satisfaction: null };
		case 'do_on_time':
			return { actualValue: null, actualTime: '', satisfaction: null };
		case 'do_binary':
			return { actualValue: null, actualTime: '', satisfaction: null };
		case 'avoid':
		case 'rate':
			return { actualValue: null, actualTime: '', satisfaction: null };
	}
}

export function failPayload(habit: Habit): HabitLogPayload {
	switch (habit.type) {
		case 'do_binary':
			return { actualValue: 0 };
		case 'do_target':
			return { actualValue: 0 };
		case 'do_on_time':
			return { actualTime: null };
		case 'avoid':
		case 'rate':
			return { satisfaction: 1 };
	}
}

export function checkPayload(habit: Habit, form: HabitCardForm): HabitLogPayload {
	switch (habit.type) {
		case 'do_binary':
			return { actualValue: 1 };
		case 'do_target':
			return { actualValue: form.actualValue };
		case 'do_on_time':
			return { actualTime: `${form.actualTime}:00`.slice(0, 8) };
		case 'avoid':
		case 'rate':
			return { satisfaction: form.satisfaction };
	}
}

export function nailedItPayload(habit: Habit, timezone: string): HabitLogPayload {
	const input = nailedItInput(habit, timezone);
	return {
		actualValue: input.actualValue,
		actualTime: input.actualTime,
		satisfaction: input.satisfaction
	};
}

export function nailedItForm(habit: Habit, timezone: string): HabitCardForm {
	const input = nailedItInput(habit, timezone);
	return payloadToForm(
		{
			actualValue: input.actualValue,
			actualTime: input.actualTime,
			satisfaction: input.satisfaction
		},
		{ ...blankCardForm(habit), touched: false }
	);
}

function payloadToForm(payload: HabitLogPayload, fallback: HabitCardForm): HabitCardForm {
	return {
		actualValue:
			payload.actualValue !== undefined ? (payload.actualValue ?? null) : fallback.actualValue,
		actualTime:
			payload.actualTime !== undefined
				? (payload.actualTime ?? '').slice(0, 5)
				: fallback.actualTime,
		satisfaction:
			payload.satisfaction !== undefined ? (payload.satisfaction ?? null) : fallback.satisfaction,
		touched: true
	};
}

export function failForm(habit: Habit): HabitCardForm {
	return payloadToForm(failPayload(habit), { ...blankCardForm(habit), touched: false });
}

export function checkForm(habit: Habit, form: HabitCardForm): HabitCardForm {
	return payloadToForm(checkPayload(habit, form), form);
}

export function canCheckHabit(habit: Habit, form: HabitCardForm): boolean {
	switch (habit.type) {
		case 'do_binary':
			return true;
		case 'do_target':
			return form.touched && form.actualValue != null;
		case 'do_on_time':
			return form.touched && Boolean(form.actualTime);
		case 'avoid':
		case 'rate':
			return form.touched && form.satisfaction != null && form.satisfaction >= 1;
	}
}

export function canNailIt(habit: Habit): boolean {
	return habit.type !== 'do_binary';
}
