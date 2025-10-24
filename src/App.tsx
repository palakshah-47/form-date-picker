import React from 'react';
import { FormDatePicker } from './date-picker-component';
import { Form, Formik } from 'formik';
import { format } from 'date-fns';

interface FormValues {
	startDate: string | null;
}

const initialValues: FormValues = {
	startDate: null,
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
						<FormDatePicker<FormValues>
							fieldName="startDate"
							label="Start Date"
							helperText={
								touched.startDate && errors.startDate ? errors.startDate : ''
							}
						/>

						<button type="submit">Submit</button>
					</Form>
				)}
			</Formik>
		</div>
	);
}

