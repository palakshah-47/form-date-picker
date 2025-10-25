import { TextField, TextFieldProps, InputAdornment, IconButton, Popover } from '@mui/material';
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCallback, useRef, useState } from 'react';
import { useField } from 'formik';
import React from 'react';
import { Locale, format, parse, addMonths, addYears } from 'date-fns';
import { enUS, enGB, fr, de, es, it, ja, zhCN, zhTW, ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ClearIcon from '@mui/icons-material/Clear';

/** Helper to map navigator.language to a date-fns locale */
function getLocaleFromBrowser(): Locale {
	const lang = (navigator.language || 'en-US').toLowerCase();

	const localeMap: Record<string, Locale> = {
		'en-us': enUS,
		'en-gb': enGB,
		fr,
		de,
		es,
		it,
		ja,
		'zh-cn': zhCN,
		'zh-tw': zhTW,
		'pt-br': ptBR,
	};

	return localeMap[lang] || localeMap[lang.split('-')[0]] || enUS;
}

export interface FormDatePickerProps<R = Record<string, unknown>>
	extends Omit<TextFieldProps, 'value' | 'onChange'> {
	fieldName: keyof R & string;
	helperText?: string;
	locale?: Locale;
}

export function FormDatePicker<R = Record<string, unknown>>({
	fieldName,
	helperText,
	locale,
	...textFieldProps
}: FormDatePickerProps<R>) {
	const detectedLocale = locale || getLocaleFromBrowser();

	const [field, meta, helpers] = useField<string | null>(fieldName as string);
	const [inputValue, setInputValue] = useState<string>('');
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const validateField = useCallback(
		(_fieldId: string, _trimmedValues: Record<string, unknown>) => {
			void _fieldId;
			void _trimmedValues;
			helpers.setError(undefined);
		},
		[helpers]
	);

	// Sync input value with field value when field changes externally
	React.useEffect(() => {
		if (field.value) {
			const formatted = format(new Date(field.value), 'P', { locale: detectedLocale });
			setInputValue(formatted);
		} else {
			setInputValue('');
		}
	}, [field.value, detectedLocale]);

	const handleCalendarChange = useCallback(
		(date: Date | null) => {
			if (date) {
				const dateValue = date.toISOString();
				helpers.setValue(dateValue, true);
				validateField(fieldName, { [fieldName]: dateValue });
				setInputValue(format(date, 'P', { locale: detectedLocale }));
			}
			setAnchorEl(null); // Close popover
		},
		[helpers, fieldName, validateField, detectedLocale]
	);

	const clearDate = useCallback(() => {
		helpers.setValue(null, true);
		setInputValue('');
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, [helpers]);

	const openCalendar = useCallback((event: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(event.currentTarget);
	}, []);

	const closeCalendar = useCallback(() => {
		setAnchorEl(null);
	}, []);

	// Parse shortcut strings like "d", "d1", "m2", "y3"
	const parseShortcut = useCallback((input: string): Date | null => {
		const trimmed = input.trim().toLowerCase();

		// Match patterns: d, d1, m2, y3, etc.
		const match = trimmed.match(/^([dmy])(\d*)$/);
		if (!match) return null;

		const [, type, numStr] = match;
		const num = numStr ? parseInt(numStr, 10) : 0;

		if (type === 'd') {
			return dayjs().add(num, 'day').toDate();
		} else if (type === 'm') {
			return dayjs().add(num, 'month').toDate();
		} else if (type === 'y') {
			return dayjs().add(num, 'year').toDate();
		}

		return null;
	}, []);

	// Handle input change
	const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value);
	}, []);

	// Handle keyboard shortcuts for date navigation
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			const input = event.currentTarget;
			const currentValue = field.value;
			const currentInputValue = input.value.trim();

			// Ctrl+Left/Right: Change month
			if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
				event.preventDefault();

				// If there's a value in Formik, use it
				if (currentValue) {
					const currentDate = new Date(currentValue);
					const newDate =
						event.key === 'ArrowLeft'
							? addMonths(currentDate, -1)
							: addMonths(currentDate, 1);

					const isoDate = newDate.toISOString();
					helpers.setValue(isoDate, true);
					validateField(fieldName, { [fieldName]: isoDate });
					setInputValue(format(newDate, 'P', { locale: detectedLocale }));
				} else if (currentInputValue) {
					// Try to parse what the user typed first
					const shortcutDate = parseShortcut(currentInputValue);
					const parsedDate =
						shortcutDate ||
						parse(currentInputValue, 'P', new Date(), { locale: detectedLocale });

					if (!isNaN(parsedDate.getTime())) {
						const newDate =
							event.key === 'ArrowLeft'
								? addMonths(parsedDate, -1)
								: addMonths(parsedDate, 1);

						const isoDate = newDate.toISOString();
						helpers.setValue(isoDate, true);
						validateField(fieldName, { [fieldName]: isoDate });
						setInputValue(format(newDate, 'P', { locale: detectedLocale }));
					}
				}
			}

			// Ctrl+Up/Down: Change year
			if (event.ctrlKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
				event.preventDefault();

				// If there's a value in Formik, use it
				if (currentValue) {
					const currentDate = new Date(currentValue);
					const newDate =
						event.key === 'ArrowUp'
							? addYears(currentDate, 1)
							: addYears(currentDate, -1);

					const isoDate = newDate.toISOString();
					helpers.setValue(isoDate, true);
					validateField(fieldName, { [fieldName]: isoDate });
					setInputValue(format(newDate, 'P', { locale: detectedLocale }));
				} else if (currentInputValue) {
					// Try to parse what the user typed first
					const shortcutDate = parseShortcut(currentInputValue);
					const parsedDate =
						shortcutDate ||
						parse(currentInputValue, 'P', new Date(), { locale: detectedLocale });

					if (!isNaN(parsedDate.getTime())) {
						const newDate =
							event.key === 'ArrowUp'
								? addYears(parsedDate, 1)
								: addYears(parsedDate, -1);

						const isoDate = newDate.toISOString();
						helpers.setValue(isoDate, true);
						validateField(fieldName, { [fieldName]: isoDate });
						setInputValue(format(newDate, 'P', { locale: detectedLocale }));
					}
				}
			}

			// Tab: Process shortcuts
			if (event.key === 'Tab') {
				const inputValue = input.value.trim();

				// Try shortcut parsing
				const shortcutDate = parseShortcut(inputValue);
				if (shortcutDate) {
					event.preventDefault();

					const isoDate = shortcutDate.toISOString();
					helpers.setValue(isoDate, true);
					validateField(fieldName, { [fieldName]: isoDate });
					setInputValue(format(shortcutDate, 'P', { locale: detectedLocale }));

					// Move focus to next field
					setTimeout(() => {
						const form = input.form;
						if (form) {
							const inputs = Array.from(
								form.querySelectorAll('input, select, textarea, button')
							);
							const currentIndex = inputs.indexOf(input);
							const nextInput = inputs[currentIndex + 1] as HTMLElement;
							if (nextInput) {
								nextInput.focus();
							}
						}
					}, 0);
				}
			}

			// Enter: Process shortcuts and stay on field
			if (event.key === 'Enter') {
				const inputValue = input.value.trim();

				// Try shortcut parsing
				const shortcutDate = parseShortcut(inputValue);
				if (shortcutDate) {
					event.preventDefault();

					const isoDate = shortcutDate.toISOString();
					helpers.setValue(isoDate, true);
					validateField(fieldName, { [fieldName]: isoDate });
					setInputValue(format(shortcutDate, 'P', { locale: detectedLocale }));
				}
			}
		},
		[field.value, helpers, fieldName, validateField, parseShortcut, detectedLocale]
	);

	// Handle blur to process shortcuts
	const handleBlur = useCallback(
		(event: React.FocusEvent<HTMLInputElement>) => {
			const value = event.target.value.trim();

			if (!value) {
				helpers.setValue(null, true);
				setInputValue('');
				return;
			}

			// Try shortcut parsing first
			const shortcutDate = parseShortcut(value);
			if (shortcutDate) {
				const isoDate = shortcutDate.toISOString();
				helpers.setValue(isoDate, true);
				validateField(fieldName, { [fieldName]: isoDate });
				setInputValue(format(shortcutDate, 'P', { locale: detectedLocale }));
				return;
			}

			// Try parsing as a regular date
			const parsed = parse(value, 'P', new Date(), { locale: detectedLocale });
			if (!isNaN(parsed.getTime())) {
				const isoDate = parsed.toISOString();
				helpers.setValue(isoDate, true);
				validateField(fieldName, { [fieldName]: isoDate });
				setInputValue(format(parsed, 'P', { locale: detectedLocale }));
			} else {
				// Invalid date, clear it
				helpers.setValue(null, true);
				setInputValue('');
				validateField(fieldName, { [fieldName]: null });
			}
		},
		[helpers, validateField, fieldName, parseShortcut, detectedLocale]
	);

	const errorState = meta.touched && Boolean(meta.error);
	const calendarValue = field.value ? new Date(field.value) : null;

	return (
		<>
			<TextField
				{...textFieldProps}
				inputRef={inputRef}
				value={inputValue}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				onBlur={handleBlur}
				error={errorState}
				helperText={errorState ? meta.error : helperText}
				placeholder=""
				InputProps={{
					endAdornment: (
						<InputAdornment position="end">
							{inputValue && (
								<IconButton
									size="small"
									onClick={clearDate}
									edge="end"
									sx={{ mr: 0.5 }}
									tabIndex={-1}
								>
									<ClearIcon fontSize="small" />
								</IconButton>
							)}
							<IconButton
								size="small"
								onClick={openCalendar}
								edge="end"
								tabIndex={-1}
							>
								<CalendarTodayIcon fontSize="small" />
							</IconButton>
						</InputAdornment>
					),
				}}
			/>

			<Popover
				open={Boolean(anchorEl)}
				anchorEl={anchorEl}
				onClose={closeCalendar}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'left',
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'left',
				}}
			>
				<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={detectedLocale}>
					<DateCalendar value={calendarValue} onChange={handleCalendarChange} />
				</LocalizationProvider>
			</Popover>
		</>
	);
}
