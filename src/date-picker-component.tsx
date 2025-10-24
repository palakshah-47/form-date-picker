import { TextField, TextFieldProps, InputAdornment, IconButton } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCallback, useMemo, useRef, useState } from 'react';
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
	extends Omit<React.ComponentProps<typeof DatePicker>, 'value'> {
	fieldName: keyof R & string;
	helperText?: string;
	locale?: Locale;
	textFieldProps?: Partial<TextFieldProps>;
}

export function FormDatePicker<R = Record<string, unknown>>({
	fieldName,
	helperText,
	locale,
	onChange: originalOnChange,
	textFieldProps,
	...props
}: FormDatePickerProps<R>) {
	const detectedLocale = locale || getLocaleFromBrowser();

	const [field, meta, helpers] = useField<string | null>(fieldName as string);
	const [error, setError] = useState<boolean | undefined>(undefined);
	const [inputValue, setInputValue] = useState<string>('');
	const [open, setOpen] = useState(false);
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

	const handleDateChange = useCallback(
		(date: Date | null) => {
			const dateValue = date ? date.toISOString() : null;
			helpers.setValue(dateValue, true);
			validateField(fieldName, { [fieldName]: dateValue });
			(originalOnChange as unknown as (d: Date | null) => void)?.(date);

			// Update input display
			if (date) {
				setInputValue(format(date, 'P', { locale: detectedLocale }));
			} else {
				setInputValue('');
			}
		},
		[helpers, fieldName, validateField, originalOnChange, detectedLocale]
	);

	const handleError = useCallback((newError: unknown) => {
		setError(newError !== null);
	}, []);

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

	// Handle keyboard shortcuts for date navigation
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

	const errorState = error ?? (meta.touched && Boolean(meta.error));

	const datePickerValue = useMemo(() => {
		if (!field.value) return null;
		return new Date(field.value);
	}, [field.value]);

	return (
		<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={detectedLocale}>
			<DatePicker
				enableAccessibleFieldDOMStructure={false}
				open={open}
				onOpen={() => setOpen(true)}
				onClose={() => setOpen(false)}
				value={datePickerValue}
				onChange={handleDateChange}
				onError={handleError}
				slots={{
					textField: (params) => {
						// Remove internal MUI props that shouldn't be passed to DOM
						const {
							inputRef: paramsInputRef,
							inputProps,
							InputProps,
							ownerState,
							sectionListRef,
							areAllSectionsEmpty,

							...cleanParams
						} = params;

						return (
							<TextField
								{...cleanParams}
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
												>
													<ClearIcon fontSize="small" />
												</IconButton>
											)}
											<IconButton
												size="small"
												onClick={() => setOpen(!open)}
												edge="end"
											>
												<CalendarTodayIcon fontSize="small" />
											</IconButton>
										</InputAdornment>
									),
								}}
							/>
						);
					},
				}}
				{...props}
			/>
		</LocalizationProvider>
	);
}
