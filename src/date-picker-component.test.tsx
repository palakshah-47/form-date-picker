import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Formik, Form } from 'formik';
import { FormDatePicker } from './date-picker-component';
import { format, addMonths, addYears } from 'date-fns';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock component wrapper with Formik
const FormDatePickerWrapper = ({
	initialValue = null,
	onSubmit = vi.fn(),
}: {
	initialValue?: string | null;
	onSubmit?: (values: { testDate: string | null }) => void;
}) => {
	return (
		<Formik
			initialValues={{ testDate: initialValue }}
			onSubmit={onSubmit}
			validate={(values) => {
				const errors: { testDate?: string } = {};
				if (!values.testDate) {
					errors.testDate = 'Date is required';
				}
				return errors;
			}}
		>
			{({ errors, touched }) => (
				<Form>
					<FormDatePicker
						fieldName="testDate"
						label="Test Date"
						helperText={touched.testDate && errors.testDate ? errors.testDate : ''}
					/>
					<button type="submit">Submit</button>
				</Form>
			)}
		</Formik>
	);
};

describe('FormDatePicker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Basic Rendering', () => {
		it('should render the date picker with label', () => {
			render(<FormDatePickerWrapper />);
			expect(screen.getByLabelText('Test Date')).toBeInTheDocument();
		});

		it('should render with empty value initially', () => {
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			expect(input.value).toBe('');
		});

		it('should render calendar icon button', () => {
			render(<FormDatePickerWrapper />);
			const calendarButtons = screen.getAllByRole('button');
			expect(calendarButtons.length).toBeGreaterThan(0);
		});
	});

	describe('User Input', () => {
		it('should allow typing a date', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, '10/28/2025');
			expect(input.value).toBe('10/28/2025');
		});

	it('should parse partial date on blur (4/5 -> 04/05/2025)', async () => {
		const user = userEvent.setup();
		render(<FormDatePickerWrapper />);
		const input = screen.getByLabelText('Test Date') as HTMLInputElement;

		await user.type(input, '4/5');
		await user.tab();

		await waitFor(() => {
			const currentYear = new Date().getFullYear();
			expect(input.value).toBe(`04/05/${currentYear}`);
		});
	});

	it('should parse 2-digit year correctly (4/5/23 -> 04/05/2023)', async () => {
		const user = userEvent.setup();
		render(<FormDatePickerWrapper />);
		const input = screen.getByLabelText('Test Date') as HTMLInputElement;

		await user.type(input, '4/5/23');
		await user.tab();

		await waitFor(() => {
			expect(input.value).toBe('04/05/2023');
		});
	});

		it('should not show error while typing invalid date', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, 'invalid');

			// Error should NOT be shown while typing
			expect(screen.queryByText('Invalid date format')).not.toBeInTheDocument();
		});

		it('should show error for invalid date only after blur', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, 'invalid');
			
			// No error while typing
			expect(screen.queryByText('Invalid date format')).not.toBeInTheDocument();
			
			// Error shows after blur
			await user.tab();

			await waitFor(() => {
				expect(screen.getByText('Invalid date format')).toBeInTheDocument();
			});
		});

		it('should show error for invalid date values like month 13 only after blur', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, '13/45/2025');
			
			// No error while typing
			expect(screen.queryByText('Invalid date format')).not.toBeInTheDocument();
			
			// Error shows after blur
			await user.tab();

			await waitFor(() => {
				expect(screen.getByText('Invalid date format')).toBeInTheDocument();
			});
		});

		it('should clear error when user starts typing again', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			// Type invalid date and blur to show error
			await user.type(input, 'invalid');
			await user.tab();

			await waitFor(() => {
				expect(screen.getByText('Invalid date format')).toBeInTheDocument();
			});

			// Click back into field and start typing
			await user.click(input);
			await user.keyboard('1');

			// Error should be cleared
			await waitFor(() => {
				expect(screen.queryByText('Invalid date format')).not.toBeInTheDocument();
			});
		});
	});

	describe('Calendar Interaction', () => {
		it('should open calendar when clicking calendar icon', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);

			const buttons = screen.getAllByRole('button');
			const calendarButton = buttons[buttons.length - 1]; // Last button is calendar icon
			await user.click(calendarButton);

			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});
		});

	it('should close calendar after date selection', async () => {
		const user = userEvent.setup();
		render(<FormDatePickerWrapper />);

		// Open calendar
		const buttons = screen.getAllByRole('button');
		const calendarButton = buttons[buttons.length - 1];
		await user.click(calendarButton);

		await waitFor(() => {
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		// Select a date - find a button within a gridcell that's not disabled
		const dateButtons = screen.getAllByRole('gridcell');
		let selectedDate = false;

		for (const cell of dateButtons) {
			const button = cell.querySelector('button');
			if (button && !button.disabled && !button.classList.contains('Mui-disabled')) {
				fireEvent.click(button);
				selectedDate = true;
				break;
			}
		}

		if (selectedDate) {
			await waitFor(() => {
				expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
			});
		}
	});
	});

	describe('Clear Button', () => {
		it('should show clear button when value is present', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, '10/28/2025');
			await user.tab();

			await waitFor(() => {
				const buttons = screen.getAllByRole('button');
				// Should have both clear and calendar buttons
				expect(buttons.length).toBeGreaterThan(1);
			});
		});

		it('should clear value when clicking clear button', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, '10/28/2025');
			await user.tab();

			await waitFor(async () => {
				const buttons = screen.getAllByRole('button');
				const clearButton = buttons[buttons.length - 2]; // Second to last is clear
				await user.click(clearButton);

				await waitFor(() => {
					expect(input.value).toBe('');
				});
			});
		});
	});

	describe('Keyboard Shortcuts - Date Shortcuts', () => {
		it('should handle "d" shortcut for current date', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, 'd');
			await user.tab();

			await waitFor(() => {
				const today = format(new Date(), 'P');
				expect(input.value).toBe(today);
			});
		});

		it('should handle "d1" shortcut for tomorrow', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.type(input, 'd1');
			await user.tab();

			await waitFor(() => {
				const tomorrow = new Date();
				tomorrow.setDate(tomorrow.getDate() + 1);
				const formatted = format(tomorrow, 'P');
				expect(input.value).toBe(formatted);
			});
		});

	it('should handle "m1" shortcut for one month from now', async () => {
		const user = userEvent.setup();
		render(<FormDatePickerWrapper />);
		const input = screen.getByLabelText('Test Date') as HTMLInputElement;

		await user.type(input, 'm1');
		await user.tab();

		await waitFor(() => {
			const nextMonth = addMonths(new Date(), 1);
			const formatted = format(nextMonth, 'P');
			expect(input.value).toBe(formatted);
		});
	});

	it('should handle "y1" shortcut for one year from now', async () => {
		const user = userEvent.setup();
		render(<FormDatePickerWrapper />);
		const input = screen.getByLabelText('Test Date') as HTMLInputElement;

		await user.type(input, 'y1');
		await user.tab();

		await waitFor(() => {
			const nextYear = addYears(new Date(), 1);
			const formatted = format(nextYear, 'P');
			expect(input.value).toBe(formatted);
		});
	});
	});

	describe('Keyboard Shortcuts - Navigation', () => {
		it('should handle Ctrl+Right to move to next month', async () => {
			const user = userEvent.setup();
			const today = new Date().toISOString();
			render(<FormDatePickerWrapper initialValue={today} />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.click(input);
			await user.keyboard('{Control>}{ArrowRight}{/Control}');

			await waitFor(() => {
				const nextMonth = addMonths(new Date(today), 1);
				const formatted = format(nextMonth, 'P');
				expect(input.value).toBe(formatted);
			});
		});

		it('should handle Ctrl+Left to move to previous month', async () => {
			const user = userEvent.setup();
			const today = new Date().toISOString();
			render(<FormDatePickerWrapper initialValue={today} />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.click(input);
			await user.keyboard('{Control>}{ArrowLeft}{/Control}');

			await waitFor(() => {
				const prevMonth = addMonths(new Date(today), -1);
				const formatted = format(prevMonth, 'P');
				expect(input.value).toBe(formatted);
			});
		});

		it('should handle Ctrl+Up to move to next year', async () => {
			const user = userEvent.setup();
			const today = new Date().toISOString();
			render(<FormDatePickerWrapper initialValue={today} />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.click(input);
			await user.keyboard('{Control>}{ArrowUp}{/Control}');

			await waitFor(() => {
				const nextYear = addYears(new Date(today), 1);
				const formatted = format(nextYear, 'P');
				expect(input.value).toBe(formatted);
			});
		});

		it('should handle Ctrl+Down to move to previous year', async () => {
			const user = userEvent.setup();
			const today = new Date().toISOString();
			render(<FormDatePickerWrapper initialValue={today} />);
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;

			await user.click(input);
			await user.keyboard('{Control>}{ArrowDown}{/Control}');

			await waitFor(() => {
				const prevYear = addYears(new Date(today), -1);
				const formatted = format(prevYear, 'P');
				expect(input.value).toBe(formatted);
			});
		});
	});

	describe('Tooltip', () => {
		it('should show tooltip on focus', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date');

			await user.click(input);

			await waitFor(() => {
				// Tooltip should contain shortcut information
				expect(screen.getByText(/Current date/i)).toBeInTheDocument();
			});
		});

		it('should hide tooltip on blur', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);
			const input = screen.getByLabelText('Test Date');

			await user.click(input);
			await waitFor(() => {
				expect(screen.getByText(/Current date/i)).toBeInTheDocument();
			});

			await user.tab();

			await waitFor(() => {
				expect(screen.queryByText(/Current date/i)).not.toBeInTheDocument();
			});
		});
	});

	describe('Formik Integration', () => {
		it('should integrate with Formik validation', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);

			const submitButton = screen.getByText('Submit');
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Date is required')).toBeInTheDocument();
			});
		});

		it('should submit with valid date', async () => {
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			render(<FormDatePickerWrapper onSubmit={onSubmit} />);

			const input = screen.getByLabelText('Test Date');
			await user.type(input, '10/28/2025');
			await user.tab();

			const submitButton = screen.getByText('Submit');
			await user.click(submitButton);

			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalled();
			});
		});
	});

	describe('Error States', () => {
		it('should display error state when touched and invalid', async () => {
			const user = userEvent.setup();
			render(<FormDatePickerWrapper />);

			const input = screen.getByLabelText('Test Date');
			await user.click(input);
			await user.tab();

			const submitButton = screen.getByText('Submit');
			await user.click(submitButton);

			await waitFor(() => {
				expect(screen.getByText('Date is required')).toBeInTheDocument();
			});
		});
	});

	describe('Initial Value', () => {
		it('should display initial date value from Formik', () => {
			const today = new Date().toISOString();
			render(<FormDatePickerWrapper initialValue={today} />);

			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			const formatted = format(new Date(today), 'P');
			expect(input.value).toBe(formatted);
		});

		it('should handle undefined initialValue correctly', () => {
			render(<FormDatePickerWrapper initialValue={undefined} />);

			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			expect(input.value).toBe('');
		});
	});

	describe('DefaultValue and InitialValue as Undefined', () => {
		// Helper wrapper that accepts both defaultValue and initialValue
		const FormDatePickerWrapperWithBoth = ({
			defaultValue,
			initialValue,
			onSubmit = vi.fn(),
		}: {
			defaultValue?: string | undefined;
			initialValue?: string | null | undefined;
			onSubmit?: (values: { testDate: string | null }) => void;
		}) => {
			return (
				<Formik
					initialValues={{ testDate: initialValue }}
					onSubmit={onSubmit}
				>
					{() => (
						<Form>
							<FormDatePicker
								fieldName="testDate"
								label="Test Date"
								textFieldProps={{
									defaultValue: defaultValue,
								}}
							/>
							<button type="submit">Submit</button>
						</Form>
					)}
				</Formik>
			);
		};

		it('should handle undefined defaultValue and undefined initialValue', async () => {
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			
			render(
				<FormDatePickerWrapperWithBoth
					defaultValue={undefined}
					initialValue={undefined}
					onSubmit={onSubmit}
				/>
			);

			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			// Input should be empty initially
			expect(input.value).toBe('');

			// Component should still function normally - user can type a date
			await user.type(input, '10/28/2025');
			await user.tab();

			await waitFor(() => {
				expect(input.value).toBe('10/28/2025');
			});

			// Form should submit successfully.
			const submitButton = screen.getByText('Submit');
			await user.click(submitButton);

			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalled();
				const submittedValue = onSubmit.mock.calls[0][0].testDate;
				expect(submittedValue).toBeTruthy();
			});
		});

		it('should handle undefined defaultValue with null initialValue', async () => {
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			
			render(
				<FormDatePickerWrapperWithBoth
					defaultValue={undefined}
					initialValue={null}
					onSubmit={onSubmit}
				/>
			);

			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			// Input should be empty initially
			expect(input.value).toBe('');

			// Component should still function normally
			await user.type(input, '12/25/2025');
			await user.tab();

			await waitFor(() => {
				expect(input.value).toBe('12/25/2025');
			});
		});

		it('should handle undefined defaultValue when initialValue is not provided', async () => {
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			
			render(
				<FormDatePickerWrapperWithBoth
					defaultValue={undefined}
					onSubmit={onSubmit}
				/>
			);

			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			// Input should be empty initially
			expect(input.value).toBe('');

			// User should be able to interact with the component
			await user.type(input, '01/15/2026');
			await user.tab();

			await waitFor(() => {
				expect(input.value).toBe('01/15/2026');
			});

			// Calendar should still work
			const buttons = screen.getAllByRole('button');
			const calendarButton = buttons[buttons.length - 1];
			await user.click(calendarButton);

			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});
		});
	});

	describe('Timezone Handling - India Timezone (IST UTC+5:30)', () => {
		// Helper to create a wrapper that accepts defaultValue
		const FormDatePickerWrapperWithDefault = ({
			defaultValue,
			onSubmit = vi.fn(),
		}: {
			defaultValue?: string;
			onSubmit?: (values: { testDate: string | null }) => void;
		}) => {
			return (
				<Formik
					initialValues={{ testDate: null }}
					onSubmit={onSubmit}
				>
					{() => (
						<Form>
							<FormDatePicker
								fieldName="testDate"
								label="Test Date"
								textFieldProps={{
									defaultValue: defaultValue,
								}}
							/>
							<button type="submit">Submit</button>
						</Form>
					)}
				</Formik>
			);
		};

		it('should correctly display date from API with time component (India timezone scenario)', async () => {
			// Simulate API response with time component: "2025-07-08T18:30:00Z"
			// In India (UTC+5:30), this would normally display as July 9, but we want July 8
			const apiDate = '2025-07-08T18:30:00Z';
			
			render(<FormDatePickerWrapperWithDefault defaultValue={apiDate} />);
			
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			await waitFor(() => {
				// Should display as July 8, 2025 (not July 9)
				// The component normalizes to date-only, so it should show the correct date
				expect(input.value).toBe('07/08/2025');
			});
		});

		it('should save selected date correctly without timezone shift (India timezone scenario)', async () => {
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			
			render(<FormDatePickerWrapperWithDefault onSubmit={onSubmit} />);
			
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			// User selects July 8, 2025
			await user.type(input, '07/08/2025');
			await user.tab();
			
			await waitFor(() => {
				expect(input.value).toBe('07/08/2025');
			});
			
			// Submit the form
			const submitButton = screen.getByText('Submit');
			await user.click(submitButton);
			
			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalled();
				const submittedValue = onSubmit.mock.calls[0][0].testDate;
				
				// Should save as "2025-07-08T00:00:00.000Z" (UTC midnight)
				// NOT as "2025-07-07T18:30:00.000Z" (which would be wrong)
				expect(submittedValue).toBe('2025-07-08T00:00:00.000Z');
			});
		});

		it('should correctly handle round-trip: save and retrieve date (India timezone scenario)', async () => {
			const user = userEvent.setup();
			
			// Step 1: User selects July 8, 2025 and saves
			const onSubmit1 = vi.fn();
			render(<FormDatePickerWrapperWithDefault onSubmit={onSubmit1} />);
			
			const input1 = screen.getByLabelText('Test Date') as HTMLInputElement;
			await user.type(input1, '07/08/2025');
			await user.tab();
			
			await waitFor(() => {
				expect(input1.value).toBe('07/08/2025');
			});
			
			const submitButton1 = screen.getByText('Submit');
			await user.click(submitButton1);
			
			await waitFor(() => {
				expect(onSubmit1).toHaveBeenCalled();
			});
			
			const savedDate = onSubmit1.mock.calls[0][0].testDate;
			expect(savedDate).toBe('2025-07-08T00:00:00.000Z');
			
			// Step 2: Retrieve the saved date from API and display
			// Simulate API returning the saved date (possibly with time component)
			const apiResponse = savedDate; // Or could be "2025-07-08T18:30:00Z" from API
			
			render(<FormDatePickerWrapperWithDefault defaultValue={apiResponse} />);
			
			const input2 = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			await waitFor(() => {
				// Should still display as July 8, 2025 (correct date)
				expect(input2.value).toBe('07/08/2025');
			});
		});

		it('should handle date with time component from API and normalize correctly', async () => {
			// Test case: API returns "2025-07-08T18:30:00Z" (6:30 PM UTC = next day in IST)
			// But we want to display and store as July 8, 2025
			const apiDateWithTime = '2025-07-08T18:30:00Z';
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			
			render(<FormDatePickerWrapperWithDefault defaultValue={apiDateWithTime} onSubmit={onSubmit} />);
			
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			await waitFor(() => {
				// Should display as July 8, 2025 (not July 9)
				expect(input.value).toBe('07/08/2025');
			});
			
			// Submit without changing - should save the normalized date
			const submitButton = screen.getByText('Submit');
			await user.click(submitButton);
			
			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalled();
				const submittedValue = onSubmit.mock.calls[0][0].testDate;
				
				// Should be normalized to UTC midnight: "2025-07-08T00:00:00.000Z"
				expect(submittedValue).toBe('2025-07-08T00:00:00.000Z');
			});
		});

		it('should handle calendar date selection without timezone shift', async () => {
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			
			render(<FormDatePickerWrapperWithDefault onSubmit={onSubmit} />);
			
			// Open calendar
			const buttons = screen.getAllByRole('button');
			const calendarButton = buttons[buttons.length - 1];
			await user.click(calendarButton);
			
			await waitFor(() => {
				expect(screen.getByRole('dialog')).toBeInTheDocument();
			});
			
			// Select July 8, 2025 from calendar
			// Find the button for July 8, 2025
			const dateButtons = screen.getAllByRole('gridcell');
			let selectedDate = false;
			
			for (const cell of dateButtons) {
				const button = cell.querySelector('button');
				if (button && !button.disabled && button.textContent === '8') {
					// Check if it's July 2025 (we might need to navigate)
					fireEvent.click(button);
					selectedDate = true;
					break;
				}
			}
			
			if (selectedDate) {
				await waitFor(() => {
					const input = screen.getByLabelText('Test Date') as HTMLInputElement;
					// Should display July 8, 2025
					expect(input.value).toContain('07/08/2025');
				});
				
				// Submit
				const submitButton = screen.getByText('Submit');
				await user.click(submitButton);
				
				await waitFor(() => {
					expect(onSubmit).toHaveBeenCalled();
					const submittedValue = onSubmit.mock.calls[0][0].testDate;
					
					// Should save as UTC midnight for July 8, 2025
					expect(submittedValue).toMatch(/^2025-07-08T00:00:00\.000Z$/);
				});
			}
		});

		it('should handle manual date input without timezone shift', async () => {
			const onSubmit = vi.fn();
			const user = userEvent.setup();
			
			render(<FormDatePickerWrapperWithDefault onSubmit={onSubmit} />);
			
			const input = screen.getByLabelText('Test Date') as HTMLInputElement;
			
			// User manually types July 8, 2025
			await user.type(input, '07/08/2025');
			await user.tab();
			
			await waitFor(() => {
				expect(input.value).toBe('07/08/2025');
			});
			
			// Submit
			const submitButton = screen.getByText('Submit');
			await user.click(submitButton);
			
			await waitFor(() => {
				expect(onSubmit).toHaveBeenCalled();
				const submittedValue = onSubmit.mock.calls[0][0].testDate;
				
				// Should save as "2025-07-08T00:00:00.000Z" (not shifted to previous day)
				expect(submittedValue).toBe('2025-07-08T00:00:00.000Z');
			});
		});
	});
});

