import React from 'react';
import { FormDatePicker } from './date-picker-component';
import { Form, Formik } from 'formik';
import { format } from 'date-fns';

interface FormValues {
	startDate: string | null;
}

const initialValues: FormValues = {
	startDate: "2024-09-06T00:00:00.000Z",
};

export default function App() {
	return (
		<div className="app">
			<h1>Welcome to form-date-picker</h1>
			<Formik
				initialValues={initialValues}
				validate={(values) => {
					const errors: Partial<Record<keyof FormValues, string>> = {};
					if (!values.startDate) errors.startDate = 'Start date is required';

					return errors;
				}}
				onSubmit={(values) => {
					alert(
						`Submitted!\nStart: ${
							values.startDate ? format(new Date(values.startDate), 'P') : '—'
						}`
					);
				}}
			>
				{({ handleSubmit, errors, touched }) => (
					<Form onSubmit={handleSubmit} noValidate>
						{/* ✅ Start Date Field */}
						{/* 
							You can use either initialValues (via Formik) or defaultValue (via textFieldProps).
							If defaultValue is provided, it takes precedence over initialValues.
							Example with defaultValue:
							textFieldProps={{
								required: true,
								defaultValue: "2024-10-15T00:00:00.000Z" // This will override initialValues.startDate
							}}
						*/}
						<FormDatePicker<FormValues>
							fieldName="startDate"
							label="Start Date"							
							disabled={false}
							helperText={
								touched.startDate && errors.startDate ? errors.startDate : ''
							}
							textFieldProps={{
								required: true,
								defaultValue: "2024-10-15T00:00:00.000Z"
							}}
						/>

						<button type="submit">Submit</button>
					</Form>
				)}
			</Formik>
		</div>
	);
}

