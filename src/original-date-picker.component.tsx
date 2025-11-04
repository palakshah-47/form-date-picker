import * as React from "react";
import dayjs, { Dayjs } from "dayjs";
import TextField from "@mui/material/TextField";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import {
  DatePicker,
  DatePickerProps,
  DatePickerFieldProps,
} from "@mui/x-date-pickers/DatePicker";
import {
  useSplitFieldProps,
  useParsedFormat,
  usePickerContext,
} from "@mui/x-date-pickers/hooks";
import { useValidation, validateDate } from "@mui/x-date-pickers/validation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { CalendarToday, Clear } from "@mui/icons-material"; // Import icons
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import { useField } from "formik";

// CustomDateField component to handle 'd' input, display formatting, and render icons
function CustomDateField(
  props: DatePickerFieldProps & {
    clearable?: boolean;
    onClear?: () => void;
  }
) {
  // Extract custom props and then pass to useSplitFieldProps
  const { clearable, onClear, ...restOfCustomFieldProps } = props;
  const { internalProps, forwardedProps } = useSplitFieldProps(
    restOfCustomFieldProps,
    "date"
  );
  const pickerContext = usePickerContext<Dayjs | null>();
  const placeholder = useParsedFormat();
  const [inputValue, setInputValue] = useInputValue();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const shouldMaintainFocusRef = React.useRef(false);

  const { hasValidationError } = useValidation({
    value: pickerContext.value,
    timezone: pickerContext.timezone,
    props: internalProps,
    validator: validateDate,
  });

  // Maintain focus after keyboard shortcuts
  React.useEffect(() => {
    if (shouldMaintainFocusRef.current) {
      shouldMaintainFocusRef.current = false;
      const input = inputRef.current;
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, [inputValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newInputValue = event.target.value;
    setInputValue(newInputValue);

    // Don't parse or validate while typing - only on blur
    // This prevents validation errors while the user is still entering the date
  };

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const currentInput = event.target.value.trim();
    const lower = currentInput.toLowerCase();

    // Handle 'd' for today
    if (lower === "d") {
      const today = dayjs();
      pickerContext.setValue(today);
      setInputValue(createInputValue(today, pickerContext.fieldFormat));
    }
    // Handle d1, d2, etc. to add days
    else if (/^d\d+$/.test(lower)) {
      const daysToAdd = parseInt(lower.substring(1), 10);
      const newDate = dayjs().add(daysToAdd, "day");
      pickerContext.setValue(newDate);
      setInputValue(createInputValue(newDate, pickerContext.fieldFormat));
    }
    // Handle m1, m2, etc. to add months
    else if (/^m\d+$/.test(lower)) {
      const monthsToAdd = parseInt(lower.substring(1), 10);
      const newDate = dayjs().add(monthsToAdd, "month");
      pickerContext.setValue(newDate);
      setInputValue(createInputValue(newDate, pickerContext.fieldFormat));
    }
    // Handle y1, y2, etc. to add years
    else if (/^y\d+$/.test(lower)) {
      const yearsToAdd = parseInt(lower.substring(1), 10);
      const newDate = dayjs().add(yearsToAdd, "year");
      pickerContext.setValue(newDate);
      setInputValue(createInputValue(newDate, pickerContext.fieldFormat));
    }
    // Handle short date formats like 4/5
    else if (/^\d{1,2}\/\d{1,2}$/.test(currentInput)) {
      const [month, day] = currentInput.split("/");
      const currentYear = dayjs().year();
      const newDate = dayjs(`${month.padStart(2, "0")}/${day.padStart(2, "0")}/${currentYear}`, "MM/DD/YYYY");
      if (newDate.isValid()) {
        pickerContext.setValue(newDate);
        setInputValue(createInputValue(newDate, pickerContext.fieldFormat));
      }
    }
    // Handle 2-digit year formats like 4/5/23 -> 04/05/2023
    else if (/^\d{1,2}\/\d{1,2}\/\d{2}$/.test(currentInput)) {
      const [month, day, year] = currentInput.split("/");
      const fullYear = parseInt(year, 10) + 2000;
      const newDate = dayjs(`${month.padStart(2, "0")}/${day.padStart(2, "0")}/${fullYear}`, "MM/DD/YYYY");
      if (newDate.isValid()) {
        pickerContext.setValue(newDate);
        setInputValue(createInputValue(newDate, pickerContext.fieldFormat));
      }
    }
    // Handle 4-digit year formats like 4/5/2023
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(currentInput)) {
      const [month, day, year] = currentInput.split("/");
      const newDate = dayjs(`${month.padStart(2, "0")}/${day.padStart(2, "0")}/${year}`, "MM/DD/YYYY");
      if (newDate.isValid()) {
        pickerContext.setValue(newDate);
        setInputValue(createInputValue(newDate, pickerContext.fieldFormat));
      }
    }
    // Normal date parsing (for other formats)
    else {
      const newValue = dayjs(currentInput, pickerContext.fieldFormat);
      pickerContext.setValue(newValue);
    }

    if ((forwardedProps as any).onBlur) {
      (forwardedProps as any).onBlur(event);
    }
  };

  const handleClearClick = (event: React.MouseEvent) => {
    event.preventDefault(); // Prevent blur
    pickerContext.setValue(null);
    setInputValue("");
    if (onClear) {
      onClear();
    }
    // Keep focus in the field after clearing
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey && pickerContext.value && dayjs.isDayjs(pickerContext.value)) {
      let newDate: Dayjs | null = null;

      switch (event.key) {
        case "ArrowUp":
          // Ctrl+Up: Add 1 year
          newDate = pickerContext.value.add(1, "year");
          event.preventDefault();
          event.stopPropagation();
          break;
        case "ArrowDown":
          // Ctrl+Down: Subtract 1 year
          newDate = pickerContext.value.subtract(1, "year");
          event.preventDefault();
          event.stopPropagation();
          break;
        case "ArrowRight":
          // Ctrl+Right: Add 1 month
          newDate = pickerContext.value.add(1, "month");
          event.preventDefault();
          event.stopPropagation();
          break;
        case "ArrowLeft":
          // Ctrl+Left: Subtract 1 month
          newDate = pickerContext.value.subtract(1, "month");
          event.preventDefault();
          event.stopPropagation();
          break;
      }

      if (newDate) {
        shouldMaintainFocusRef.current = true;
        pickerContext.setValue(newDate);
        setInputValue(createInputValue(newDate, pickerContext.fieldFormat));
      }
    }
  };

  // Construct the custom endAdornment
  const customEndAdornment = (
    <InputAdornment position="end">
      {clearable &&
        pickerContext.value && ( // Only show clear icon if clearable and a value exists
          <IconButton
            onMouseDown={handleClearClick}
            edge="end"
            size="small"
            tabIndex={-1}
          >
            <Clear fontSize="small" />
          </IconButton>
        )}
      <IconButton
        onClick={() => pickerContext.setOpen(true)}
        edge="end"
        size="small"
        tabIndex={-1}
      >
        <CalendarToday fontSize="small" />
      </IconButton>
    </InputAdornment>
  );

  return (
    <Tooltip
      title={
        <Box sx={{ whiteSpace: "pre-line", fontSize: "14px", padding: "0px" }}>
          Ctrl+Up/Down - change year
          {"\n"}
          Ctrl+Left/Right - change month
          {"\n"}
          d - display current date
          {"\n"}
          d1 - Add 1 day to the current date
          {"\n"}
          m1 - Add 1 month to the current date
          {"\n"}
          y1 - Add 1 year to the current date
        </Box>
      }
      placement="bottom-end"
      arrow={false}
      slotProps={{
        tooltip: {
          sx: {
            maxWidth: "400px",
            fontSize: "14px",
          },
        },
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 0],
              },
            },
          ],
        },
      }}
    >
      <TextField
        {...forwardedProps} // Spread all forwarded props
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        error={hasValidationError}
        focused={pickerContext.open}
        label={pickerContext.label}
        name={pickerContext.name}
        className={pickerContext.rootClassName}
        sx={pickerContext.rootSx}
        ref={pickerContext.rootRef}
        inputRef={inputRef}
        InputProps={{
          ...(forwardedProps as any).InputProps, // Merge any InputProps from forwardedProps
          endAdornment: customEndAdornment, // Override/set our custom endAdornment
        }}
      />
    </Tooltip>
  );
}

// Helper hook to manage input value synchronization with pickerContext
function useInputValue() {
  const pickerContext = usePickerContext<Dayjs | null>();
  const [lastValueProp, setLastValueProp] = React.useState<Dayjs | null>(
    pickerContext.value
  );
  const [inputValue, setInputValue] = React.useState(() =>
    createInputValue(pickerContext.value, pickerContext.fieldFormat)
  );

  React.useEffect(() => {
    // Only update inputValue if pickerContext.value has genuinely changed
    // This prevents unnecessary re-renders or resetting input if the user is typing
    if (
      !dayjs.isDayjs(pickerContext.value) ||
      !pickerContext.value.isSame(lastValueProp) ||
      (lastValueProp === null && pickerContext.value !== null) ||
      (lastValueProp !== null && pickerContext.value === null)
    ) {
      setLastValueProp(pickerContext.value);
      setInputValue(
        createInputValue(pickerContext.value, pickerContext.fieldFormat)
      );
    }
  }, [pickerContext.value, pickerContext.fieldFormat, lastValueProp]);

  return [inputValue, setInputValue] as const;
}

// Helper function to format the Dayjs object into a string for the input field
function createInputValue(value: Dayjs | null, format: string) {
  if (value === null) {
    return "";
  }
  return value.isValid() ? value.format(format) : "";
}

// Wrapper component to use CustomDateField with DatePicker
function CustomFieldDatePicker(props: DatePickerProps & {
  clearable?: boolean;
  onClear?: () => void;
}) {
  const { slots, slotProps, clearable, onClear, ...restProps } = props;
  
  return (
    <DatePicker
      slots={{
        ...slots,
        field: (fieldProps) => (
          <CustomDateField
            {...fieldProps}
            clearable={clearable}
            onClear={onClear}
          />
        ),
      }}
      slotProps={{
        ...slotProps,
        popper: {
          placement: "bottom",
          ...slotProps?.popper,
        },
      }}
      {...restProps}
    />
  );
}

// Formik-integrated DatePicker component
export interface FormDatePickerProps<R = Record<string, unknown>> {
  fieldName: keyof R & string;
  label?: string;
  helperText?: string;
  sx?: any;
}

export function FormDatePicker<R = Record<string, unknown>>({
  fieldName,
  label,
  helperText,
  sx,
}: FormDatePickerProps<R>) {
  const [field, meta, helpers] = useField<string | null>(fieldName as string);

  // Convert ISO string to Dayjs for the picker
  const dateValue = React.useMemo(() => {
    if (!field.value) return null;
    return dayjs(field.value);
  }, [field.value]);

  // Handle date change from picker
  const handleChange = React.useCallback(
    (newValue: any) => {
      const dayjsValue = newValue ? dayjs(newValue) : null;
      const dateValue = dayjsValue && dayjsValue.isValid() ? dayjsValue.toISOString() : null;
      helpers.setValue(dateValue, true);
      helpers.setError(undefined);
    },
    [helpers]
  );

  // Handle clear
  const handleClear = React.useCallback(() => {
    helpers.setValue(null, true);
    helpers.setError(undefined);
  }, [helpers]);

  const errorState = meta.touched && Boolean(meta.error);
  const displayError = React.useMemo(() => {
    if (meta.touched && meta.error) return meta.error;
    return helperText;
  }, [meta.touched, meta.error, helperText]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <CustomFieldDatePicker
        sx={{ width: "300px", ...sx }}
        value={dateValue}
        onChange={handleChange}
        onClear={handleClear}
        clearable
        format="MM/DD/YYYY"
        label={label}
        slotProps={{
          textField: {
            error: errorState,
            helperText: displayError,
            onBlur: () => helpers.setTouched(true),
          },
        }}
      />
    </LocalizationProvider>
  );
}