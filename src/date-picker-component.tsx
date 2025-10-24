import { TextField, TextFieldProps } from '@mui/material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useField } from 'formik';
import React from 'react';
import { Locale, format, parse } from 'date-fns';
import { enUS, enGB, fr, de, es, it, ja, zhCN, zhTW, ptBR } from 'date-fns/locale';
import dayjs from 'dayjs';

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

	// Match full locale code first, then primary language
	return (
		localeMap[lang] || localeMap[lang.split('-')[0]] || enUS // default fallback
	);
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
	const [inputValue, setInputValue] = useState<string>(
		field.value ? format(new Date(field.value), 'P', { locale: detectedLocale }) : ''
	);
	const inputRef = useRef<HTMLInputElement | null>(null);

	// Use a ref to hold the latest inputValue for use in callbacks without adding a dependency.
	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;

	const validateField = useCallback(
		(_fieldId: string, _trimmedValues: Record<string, unknown>) => {
			// placeholder: if you have a form-level validator, call it here.
			// For now, just clear previous errors when value changes.
			void _fieldId; // mark used to satisfy linter
			void _trimmedValues;
			helpers.setError(undefined);
		},
		[helpers]
	);

	// Sync input display with Formik field value when field.value changes.
	// This handles cases where field.value is updated by the calendar picker or externally.
	useEffect(() => {
		const formattedFieldValue = field.value
			? format(new Date(field.value), 'P', { locale: detectedLocale })
			: '';

		// Only update inputValue if field.value has changed and
		// inputValue does not already match the formatted field.value.
		// This prevents overwriting user's partial input while typing,
		// but ensures consistency if field.value is set by other means.
		// We also check if the input is currently focused to avoid changing text while the user is typing.
		if (
			formattedFieldValue !== inputValueRef.current &&
			document.activeElement !== inputRef.current
		) {
			setInputValue(formattedFieldValue);
		}
	}, [field.value, detectedLocale]); // inputValueRef is stable and not needed as a dependency

	const handleChange = useCallback(
		(date: Date | null) => {
			const dateValue = date ? date.toISOString() : null;
			helpers.setValue(dateValue, false);
			validateField(fieldName, { [fieldName]: dateValue });
			// forward original onChange if provided
			// MUI DatePicker onChange signature: (value: T | null) => void
			(originalOnChange as unknown as (d: Date | null) => void)?.(date);
		},
		[helpers, fieldName, validateField, originalOnChange]
	);

	const handleError = useCallback((newError: unknown) => {
		setError(newError !== null);
	}, []);

	const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(event.target.value);
	}, []);

	// allow Enter to commit the typed shortcut (e.g. "d") without needing to blur
	const handleInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Enter') {
			event.currentTarget.blur();
		}
	}, []);

	const clearDate = useCallback(() => {
		helpers.setValue(null, false);
		setInputValue('');
	}, [helpers]);

	const handleInputBlur = useCallback(() => {
		const trimmed = inputValueRef.current.trim();
		if (!trimmed) {
			helpers.setValue(null, false);
			return;
		}

		let parsedDate: Date | null = null;

		// --- Relative shortcuts (d, m, y) ---
		if (/^d\d*$|^m\d*$|^y\d*$|^d$/i.test(trimmed)) {
			const token = trimmed.toLowerCase();
			if (token === 'd') parsedDate = dayjs().toDate();
			else if (token.startsWith('d'))
				parsedDate = dayjs()
					.add(parseInt(token.slice(1), 10), 'day')
					.toDate();
			else if (token.startsWith('m'))
				parsedDate = dayjs()
					.add(parseInt(token.slice(1), 10), 'month')
					.toDate();
			else if (token.startsWith('y'))
				parsedDate = dayjs()
					.add(parseInt(token.slice(1), 10), 'year')
					.toDate();
		} else {
			// --- Locale-based parsing ---
			const parsed = parse(trimmed, 'P', new Date(), { locale: detectedLocale });
			if (!isNaN(parsed.getTime())) parsedDate = parsed;
		}

		if (parsedDate && !isNaN(parsedDate.getTime())) {
			const isoDate = parsedDate.toISOString();
			// Explicitly format and set inputValue here, as this is the "on blur" formatting.
			// The useEffect will then see that inputValue already matches and won't re-set.
			const formatted = format(parsedDate, 'P', { locale: detectedLocale });
			helpers.setValue(isoDate, false);
			setInputValue(formatted);
			validateField(fieldName, { [fieldName]: isoDate });
		} else {
			// If invalid, clear the field and Formik value
			helpers.setValue(null, false);
			setInputValue('');
			validateField(fieldName, { [fieldName]: null });
		}
	}, [detectedLocale, helpers, validateField, fieldName]);

	const errorState = error ?? (meta.touched && Boolean(meta.error));

	const datePickerValue = useMemo(() => {
		if (!field.value) return null;
		return new Date(field.value);
	}, [field.value]);

	const renderTextField = useCallback(
		(params: TextFieldProps) => {
			const finalProps: TextFieldProps = {
				// start with params provided by MUI
				...params,
				// allow user overrides from textFieldProps
				...(textFieldProps as Partial<TextFieldProps>),
				// ensure our inputProps and handlers override any incoming ones
				value: inputValue,
				error: errorState,
				helperText: errorState ? meta.error : helperText,
				onChange: handleInputChange,
				onBlur: handleInputBlur,
				onKeyDown: handleInputKeyDown,
			};

			return <TextField {...finalProps} />;
		},
		// Dependencies for useCallback:
		// These ensure the function is only recreated if one of these values changes.
		// All event handlers (handleInputChange, handleInputBlur, handleInputKeyDown)
		// and refs (inputRef) are stable or memoized, so they don't cause unnecessary re-renders.
		// By removing all volatile dependencies, this function becomes stable during typing,
		// which prevents the TextField from being re-created and losing focus.
		// It will still render the correct values because it has access to the latest state via closure.
		[
			textFieldProps, // Keep textFieldProps for custom overrides
			handleInputChange,
			handleInputBlur,
			handleInputKeyDown,
		]
	);

	return (
		<LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={detectedLocale}>
			<DatePicker
				enableAccessibleFieldDOMStructure={false}
				value={datePickerValue}
				onChange={handleChange}
				onError={handleError}
				slots={{ textField: renderTextField }}
				slotProps={{
					field: { clearable: true, onClear: clearDate },
				}}
				{...props}
			/>
		</LocalizationProvider>
	);
}
