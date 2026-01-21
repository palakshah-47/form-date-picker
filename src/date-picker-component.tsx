import { TextField, TextFieldProps, InputAdornment, IconButton, Popover, Tooltip } from '@mui/material';
import { DateCalendar, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateView } from '@mui/x-date-pickers/models';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useField } from 'formik';
import React from 'react';
import { Locale, format, parse, addMonths, addYears } from 'date-fns';
import { enUS, enGB, fr, de, es, it, ja, zhCN, zhTW, ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';

/**
 * Converts a Date object to ISO string at UTC midnight (00:00:00.000Z)
 * This ensures the date doesn't shift when converted to UTC
 */
function dateToISOString(date: Date): string {
	const year = date.getFullYear();
	const month = date.getMonth();
	const day = date.getDate();
	// Create date at UTC midnight to avoid timezone shifts
	const utcDate = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
	return utcDate.toISOString();
}

/**
 * Parses an ISO date string and extracts only the date part (YYYY-MM-DD)
 * Returns a Date object at UTC noon to avoid timezone shifts when displaying
 */
function parseDateFromISO(isoString: string): Date | null {
	if (!isoString || typeof isoString !== 'string') return null;
	
	try {
		// Extract date part (YYYY-MM-DD) from ISO string
		const dateMatch = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
		if (!dateMatch) return null;
		
		const [year, month, day] = dateMatch[1].split('-').map(Number);
		
		// Create date at UTC noon to avoid timezone shifts when displaying
		// Using noon instead of midnight prevents date shifts in timezones ahead of UTC
		return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
	} catch {
		return null;
	}
}

/**
 * Parses a date string that can be either ISO format or localized format (MM/DD/YYYY)
 * Supports formats like:
 * - ISO: "2025-11-25" or "2025-11-25T18:30:00Z"
 * - Localized: "11/25/2025" (from toLocaleDateString())
 * Returns a Date object at UTC noon to avoid timezone shifts when displaying
 */
function parseDateString(dateString: string): Date | null {
	if (!dateString || typeof dateString !== 'string') return null;
	
	try {
		// Try ISO format first (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
		const isoMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
		if (isoMatch) {
			const [year, month, day] = isoMatch[1].split('-').map(Number);
			return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
		}
		
		// Try localized format (MM/DD/YYYY or M/D/YYYY) - common format from toLocaleDateString()
		const localizedMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
		if (localizedMatch) {
			const [, month, day, year] = localizedMatch.map(Number);
			// Validate date components
			if (month < 1 || month > 12 || day < 1 || day > 31) return null;
			return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
		}
		
		return null;
	} catch {
		return null;
	}
}

/**
 * Extracts date-only string (YYYY-MM-DD) from ISO string
 */
function extractDateOnly(isoString: string): string | null {
	if (!isoString || typeof isoString !== 'string') return null;
	const dateMatch = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
	return dateMatch ? dateMatch[1] : null;
}

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
	disabled?: boolean;
	textFieldProps?: Partial<TextFieldProps>;
}

export function FormDatePicker<R = Record<string, unknown>>({
	fieldName,
	label,
	helperText,
	locale,	
	disabled,
	textFieldProps,
}: FormDatePickerProps<R>) {
	const detectedLocale = locale || getLocaleFromBrowser();

	const [field, meta, helpers] = useField<string | null>(fieldName as string);
	const [inputValue, setInputValue] = useState<string>('');
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
	const [isFocused, setIsFocused] = useState(false);
	const [calendarView, setCalendarView] = useState<DateView>('day');
	const inputRef = useRef<HTMLInputElement | null>(null);

	const open = Boolean(anchorEl);

	// Extract defaultValue from textFieldProps if provided
	const defaultValue = textFieldProps?.defaultValue;

	// Initialize field value with defaultValue if provided (takes precedence over initialValues)
	React.useEffect(() => {
		if (defaultValue !== undefined) {
			// defaultValue can be a string (ISO date or localized date like "11/25/2025"), empty string, or null
			if (typeof defaultValue === 'string' && defaultValue.trim() !== '') {
				// Parse date string (supports both ISO and localized formats)
				const parsedDate = parseDateString(defaultValue);
				if (parsedDate) {
					const normalizedISO = dateToISOString(parsedDate);
					helpers.setValue(normalizedISO, false);
				} else {
					helpers.setValue(null, false);
				}
			} else {
				helpers.setValue(null, false);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []); // Only run on mount - defaultValue takes precedence over initialValues

	// Sync input value with field value when field changes externally
	React.useEffect(() => {
		// If field.value exists, use it; otherwise check defaultValue (only if it's a string)
		const valueToUse = field.value ?? (typeof defaultValue === 'string' ? defaultValue : null);
		
		if (valueToUse) {
			// Parse date from field value (supports both ISO and localized formats)
			const parsedDate = parseDateString(valueToUse);
			if (parsedDate) {
				const formatted = format(parsedDate, 'P', { locale: detectedLocale });
				setInputValue(formatted);
			} else {
				setInputValue('');
			}
		} else {
			setInputValue('');
		}
	}, [field.value, defaultValue, detectedLocale]);

	// Handle calendar view change (year -> month -> day)
	const handleViewChange = useCallback((newView: DateView) => {
		setCalendarView(newView);
	}, []);

	// Handle calendar date selection
	const handleDateChange = useCallback(
		(date: Date | null) => {
			// Only update the value and close calendar if we're in the 'day' view
			// This allows navigation through year -> month -> day without closing or updating the value
			// When selecting year or month, the calendar will navigate to the next view
			// but we don't update the form value until a day is actually selected
			if (calendarView === 'day') {
				// Convert to UTC midnight ISO string to avoid timezone shifts
				const dateValue = date ? dateToISOString(date) : null;
				helpers.setValue(dateValue, true);
				helpers.setError(undefined);

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
			}
			// When selecting year or month, do nothing - let the calendar navigate
			// The form value will only be updated when a day is selected in the day view
		},
		[helpers, detectedLocale, calendarView]
	);

	// Reset calendar view when opening
	const handleOpenCalendar = useCallback((e: React.MouseEvent<HTMLElement>) => {
		setAnchorEl(e.currentTarget);
		setCalendarView('day'); // Reset to day view when opening
	}, []);

	// Clear date
	const clearDate = useCallback(() => {
		helpers.setValue(null, true);
		helpers.setError(undefined);
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
		const newValue = event.target.value;
		setInputValue(newValue);
		
		// Clear error while typing to allow user to correct without seeing error
		if (meta.error) {
			helpers.setError(undefined);
		}
	}, [meta.error, helpers]);

	// Handle keyboard shortcuts
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLInputElement>) => {
			const input = event.currentTarget;
			const currentValue = field.value;

			// Ctrl+Left/Right: Change month
			if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
				event.preventDefault();
				if (currentValue) {
					const currentDate = parseDateString(currentValue);
					if (currentDate) {
						const newDate =
							event.key === 'ArrowLeft'
								? addMonths(currentDate, -1)
								: addMonths(currentDate, 1);

						const isoDate = dateToISOString(newDate);
						helpers.setValue(isoDate, true);
						helpers.setError(undefined);
						setInputValue(format(newDate, 'P', { locale: detectedLocale }));
					}
				}
				return;
			}

			// Ctrl+Up/Down: Change year
			if (event.ctrlKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
				event.preventDefault();
				if (currentValue) {
					const currentDate = parseDateString(currentValue);
					if (currentDate) {
						const newDate =
							event.key === 'ArrowUp'
								? addYears(currentDate, 1)
								: addYears(currentDate, -1);

						const isoDate = dateToISOString(newDate);
						helpers.setValue(isoDate, true);
						helpers.setError(undefined);
						setInputValue(format(newDate, 'P', { locale: detectedLocale }));
					}
				}
				return;
			}

			// Tab: Process shortcuts
			if (event.key === 'Tab') {
				const inputValue = input.value?.trim();
				const shortcutDate = parseShortcut(inputValue);
				if (shortcutDate) {
					event.preventDefault();
					const isoDate = dateToISOString(shortcutDate);
					helpers.setValue(isoDate, true);
					helpers.setError(undefined);
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
					const isoDate = dateToISOString(shortcutDate);
					helpers.setValue(isoDate, true);
					helpers.setError(undefined);
					setInputValue(format(shortcutDate, 'P', { locale: detectedLocale }));
				}
			}
		},
		[field.value, helpers, parseShortcut, detectedLocale]
	);

	// Handle focus
	const handleFocus = useCallback(() => {
		setIsFocused(true);
	}, []);

	// Handle blur to process shortcuts and parse dates
	const handleBlur = useCallback(
		(event: React.FocusEvent<HTMLInputElement>) => {
			setIsFocused(false);
			helpers.setTouched(true);
			const value = event.target.value.trim();

			if (!value) {
				helpers.setValue(null, true);
				helpers.setError(undefined);
				setInputValue('');
				return;
			}

			// Try shortcut parsing first
			const shortcutDate = parseShortcut(value);
			if (shortcutDate) {
				const isoDate = dateToISOString(shortcutDate);
				helpers.setValue(isoDate, true);
				helpers.setError(undefined);
				setInputValue(format(shortcutDate, 'P', { locale: detectedLocale }));
				return;
			}

		// Validate numeric date formats before parsing
		if (/^\d{1,2}\/\d{1,2}(\/\d{2,4})?$/.test(value)) {
			const parts = value.split('/');
			const month = parseInt(parts[0]);
			const day = parseInt(parts[1]);
			
			// Validate month and day ranges
			if (month < 1 || month > 12 || day < 1 || day > 31) {
				helpers.setError('Invalid date format');
				return;
			}
		}

		let parsed: Date;
		const currentYear = new Date().getFullYear();
		
		// Handle specific date patterns first to avoid ambiguity
		// Handle formats like "4/5" -> "04/05/2025"
		if (/^\d{1,2}\/\d{1,2}$/.test(value)) {
			const [month, day] = value.split('/');
			parsed = new Date(currentYear, parseInt(month) - 1, parseInt(day));
		}
		// Handle formats like "4/5/23" -> "04/05/2023" (2-digit year)
		else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(value)) {
			const [month, day, year] = value.split('/');
			const fullYear = parseInt(year) + 2000;
			parsed = new Date(fullYear, parseInt(month) - 1, parseInt(day));
		}
		// Handle formats like "4/5/2025" -> "04/05/2025" (4-digit year)
		else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
			const [month, day, year] = value.split('/');
			parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
		}
		// Fall back to locale-specific parsing for other formats
		else {
			parsed = parse(value, 'P', new Date(), { locale: detectedLocale });
		}
			
			if (!isNaN(parsed.getTime())) {
				// Convert to UTC midnight to avoid timezone shifts
				const isoDate = dateToISOString(parsed);
				helpers.setValue(isoDate, true);
				helpers.setError(undefined);
				setInputValue(format(parsed, 'P', { locale: detectedLocale }));
			} else {
				// Invalid date, show error and keep the input value
				helpers.setError('Invalid date format');
			}
		},
		[helpers, parseShortcut, detectedLocale]
	);

	const errorState = meta.touched && Boolean(meta.error);
	
	const displayError = useMemo(() => {
		if (meta.touched && meta.error) return meta.error;
		return helperText;
	}, [meta.touched, meta.error, helperText]);

	const dateValue = useMemo(() => {
		if (!field.value) return null;
		// Parse date from field value (supports both ISO and localized formats)
		return parseDateString(field.value);
	}, [field.value]);

	// Filter out conflicting props from textFieldProps since we're using Formik (controlled mode)
	// Remove defaultValue and value to avoid conflicts with controlled input
	// defaultValue is extracted above and used to initialize the field value
	const sanitizedTextFieldProps = useMemo(() => {
		if (!textFieldProps) return {};
		const { defaultValue, value, ...rest } = textFieldProps;
		return rest;
	}, [textFieldProps]);

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
					{...sanitizedTextFieldProps}
					label={label}
					inputRef={inputRef}
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={handleFocus}
					onBlur={handleBlur}
					error={errorState}
					helperText={displayError}
					disabled={disabled}
					
					placeholder=""
					sx={{ width: '200px', ...sanitizedTextFieldProps?.sx }}
					slotProps={{
					input: {
						sx: { width: '200px', ...sanitizedTextFieldProps?.sx },
						endAdornment: (
							<InputAdornment position="end">
								{inputValue && isFocused && (
									<IconButton
										size="small"
										onMouseDown={(e) => {
											e.preventDefault(); // Prevent blur
											clearDate();
										}}
										edge="end"
										sx={{ mr: 0.5 }}
										tabIndex={-1}
									>
										<ClearIcon />
									</IconButton>
								)}
								<IconButton
									size="small"
									onClick={handleOpenCalendar}
									edge="end"
									tabIndex={-1}
									disabled={disabled}
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
					view={calendarView}
					onViewChange={handleViewChange}
					views={['year', 'month', 'day']}
				/>
			</Popover>
		</LocalizationProvider>
	);
}
