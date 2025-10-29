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
				const nextMonth = new Date();
				nextMonth.setMonth(nextMonth.getMonth() + 1);
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
				const nextYear = new Date();
				nextYear.setFullYear(nextYear.getFullYear() + 1);
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
	});
});

