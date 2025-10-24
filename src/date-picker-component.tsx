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
	const [inputValue, setInputValue] = useState<string>(
		field.value ? format(new Date(field.value), 'P', { locale: detectedLocale }) : ''
	);
	const inputRef = useRef<HTMLInputElement | null>(null);

	const inputValueRef = useRef(inputValue);
	inputValueRef.current = inputValue;

	const validateField = useCallback(
		(_fieldId: string, _trimmedValues: Record<string, unknown>) => {
			void _fieldId;
			void _trimmedValues;
			helpers.setError(undefined);
		},
		[helpers]
	);

	useEffect(() => {
		const formattedFieldValue = field.value
			? format(new Date(field.value), 'P', { locale: detectedLocale })
			: '';

		if (
			formattedFieldValue !== inputValueRef.current &&
			document.activeElement !== inputRef.current
		) {
			setInputValue(formattedFieldValue);
		}
	}, [field.value, detectedLocale]);

	const handleChange = useCallback(
		(date: Date | null) => {
			const dateValue = date ? date.toISOString() : null;
			helpers.setValue(dateValue, false);
			validateField(fieldName, { [fieldName]: dateValue });
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
			const parsed = parse(trimmed, 'P', new Date(), { locale: detectedLocale });
			if (!isNaN(parsed.getTime())) parsedDate = parsed;
		}

		if (parsedDate && !isNaN(parsedDate.getTime())) {
			const isoDate = parsedDate.toISOString();
			const formatted = format(parsedDate, 'P', { locale: detectedLocale });
			helpers.setValue(isoDate, false);
			setInputValue(formatted);
			validateField(fieldName, { [fieldName]: isoDate });
		} else {
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

	// THE FIX: Add all necessary dependencies to useCallback
	const renderTextField = useCallback(
		(params: TextFieldProps) => {
			const finalProps: TextFieldProps = {
				...params,
				...(textFieldProps as Partial<TextFieldProps>),
				inputRef: inputRef,
				value: inputValue,
				error: errorState,
				helperText: errorState ? meta.error : helperText,
				onChange: handleInputChange,
				onBlur: handleInputBlur,
				onKeyDown: handleInputKeyDown,
			};

			return <TextField {...finalProps} />;
		},
		[
			textFieldProps,
			inputValue, // Added: current input value
			errorState, // Added: error state
			meta.error, // Added: meta error message
			helperText, // Added: helper text
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
