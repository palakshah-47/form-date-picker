import { TextField, TextFieldProps, InputAdornment, IconButton, Popover, Tooltip } from '@mui/material';
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useField } from 'formik';
import React from 'react';
import { Locale, format, parse, addMonths, addYears } from 'date-fns';
import { enUS, enGB, fr, de, es, it, ja, zhCN, zhTW, ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';

// Simple SVG icons
const CalendarIcon = () => (
	<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
		<path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM9 14H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2zm-8 4H7v-2h2v2zm4 0h-2v-2h2v2zm4 0h-2v-2h2v2z"/>
	</svg>
);

const ClearIcon = () => (
	<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
		<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
	</svg>
);

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

export interface FormDatePickerProps<R = Record<string, unknown>> {
	fieldName: keyof R & string;
	label?: string;
	helperText?: string;
	locale?: Locale;
	textFieldProps?: Partial<TextFieldProps>;
}

export function FormDatePicker<R = Record<string, unknown>>({
	fieldName,
	label,
	helperText,
	locale,
	textFieldProps,
}: FormDatePickerProps<R>) {
	const detectedLocale = locale || getLocaleFromBrowser();

	const [field, meta, helpers] = useField<string | null>(fieldName as string);
	const [inputValue, setInputValue] = useState<string>('');
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const open = Boolean(anchorEl);

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

	// Handle calendar date selection
	const handleDateChange = useCallback(
		(date: Date | null) => {
			const dateValue = date ? date.toISOString() : null;
			helpers.setValue(dateValue, true);
			validateField(fieldName, { [fieldName]: dateValue });

			// Update input display
			if (date) {
				setInputValue(format(date, 'P', { locale: detectedLocale }));
			} else {
				setInputValue('');
			}

			// Close calendar and return focus
			setAnchorEl(null);
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.focus();
				}
			}, 0);
		},
		[helpers, fieldName, validateField, detectedLocale]
	);

	// Clear date
	const clearDate = useCallback(() => {
		helpers.setValue(null, true);
		setInputValue('');
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}, [helpers]);

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

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			const input = event.currentTarget;
			const currentValue = field.value;

			// Ctrl+Left/Right: Change month
			if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
				event.preventDefault();
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
				}
				return;
			}

			// Ctrl+Up/Down: Change year
			if (event.ctrlKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
				event.preventDefault();
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
				}
				return;
			}

			// Tab: Process shortcuts
			if (event.key === 'Tab') {
				const inputValue = input.value.trim();
				const shortcutDate = parseShortcut(inputValue);
				if (shortcutDate) {
					event.preventDefault();
					const isoDate = shortcutDate.toISOString();
					helpers.setValue(isoDate, true);
					validateField(fieldName, { [fieldName]: isoDate });
					setInputValue(format(shortcutDate, 'P', { locale: detectedLocale }));
					
					// Move to next field
					setTimeout(() => {
						const form = input.form;
						if (form) {
							const inputs = Array.from(form.querySelectorAll('input, select, textarea, button'));
							const nextInput = inputs[inputs.indexOf(input) + 1] as HTMLElement;
							if (nextInput) nextInput.focus();
						}
					}, 0);
				}
			}

			// Enter: Process shortcuts
		if (event.key === 'Enter') {
				const inputValue = input.value.trim();
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

	// Handle focus
	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	// Handle blur to process shortcuts and parse dates
	const handleBlur = useCallback(
		(event: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(false);
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

			// Try parsing with the full locale format first
			let parsed = parse(value, 'P', new Date(), { locale: detectedLocale });
			
			// If that fails, try parsing partial dates
			if (isNaN(parsed.getTime())) {
				const currentYear = new Date().getFullYear();
				
				// Handle formats like "4/5" -> "04/05/2025"
				if (/^\d{1,2}\/\d{1,2}$/.test(value)) {
					const [month, day] = value.split('/');
					parsed = new Date(currentYear, parseInt(month) - 1, parseInt(day));
				}
				// Handle formats like "4/5/25" -> "04/05/2025"
				else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(value)) {
					const [month, day, year] = value.split('/');
					const fullYear = parseInt(year) + 2000;
					parsed = new Date(fullYear, parseInt(month) - 1, parseInt(day));
				}
				// Handle formats like "4/5/2025" -> "04/05/2025"
				else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
					const [month, day, year] = value.split('/');
					parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
				}
			}
			
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

	const dateValue = useMemo(() => {
		if (!field.value) return null;
		return new Date(field.value);
	}, [field.value]);

	const tooltipTitle = useMemo(() => {
		const today = new Date();
		const todayFormatted = format(today, 'P', { locale: detectedLocale });
		const oneDayMore = format(dayjs().add(1, 'day').toDate(), 'P', { locale: detectedLocale });
		const oneMonthMore = format(addMonths(today, 1), 'P', { locale: detectedLocale });
		const oneYearMore = format(addYears(today, 1), 'P', { locale: detectedLocale });

		return (
			<div style={{ whiteSpace: 'pre-line', fontSize: '12px', lineHeight: '1.6' }}>
				{`d - Current date (${todayFormatted})\n` +
				`d1 - One day more (${oneDayMore})\n` +
				`m1 - One month more (${oneMonthMore})\n` +
				`y1 - One year more (${oneYearMore})\n` +
				`Ctrl+Left/Right - Previous/Next month\n` +
				`Ctrl+Up/Down - Next/Previous year`}
			</div>
		);
	}, [detectedLocale]);

	return (
		<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={detectedLocale}>
			<Tooltip
				title={tooltipTitle}
				open={isFocused}
				placement="top"
				arrow
				slotProps={{
					popper: {
						modifiers: [
							{
								name: 'offset',
								options: {
									offset: [0, -8],
								},
							},
						],
					},
				}}
			>
				<TextField
					{...textFieldProps}
					label={label}
					inputRef={inputRef}
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={handleFocus}
					onBlur={handleBlur}
					error={errorState}
					helperText={errorState ? meta.error : helperText}
					placeholder=""
					sx={{ width: '200px', ...textFieldProps?.sx }}
				slotProps={{
					input: {
						sx: { width: '200px', ...textFieldProps?.sx },
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
										<ClearIcon />
									</IconButton>
								)}
								<IconButton
									size="small"
									onClick={(e) => setAnchorEl(e.currentTarget)}
									edge="end"
									tabIndex={-1}
								>
									<CalendarIcon />
								</IconButton>
							</InputAdornment>
						),
					},
					
				}}
				/>
			</Tooltip>
			
			<Popover
				open={open}
				anchorEl={anchorEl}
				onClose={() => setAnchorEl(null)}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'right',
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'right',
				}}
			>
				<DateCalendar
					value={dateValue}
					onChange={handleDateChange}
				/>
			</Popover>
		</LocalizationProvider>
	);
}
