import { createContext, useContext } from 'react';

export type FormValidteFieldFunc = (
	fieldId: string,
	values: unknown
) => {
	[key: string]: string;
};

const FormValidateFieldContext = createContext<FormValidteFieldFunc | null>(null);

interface FormValidateFieldProviderProps {
	validateField: FormValidteFieldFunc;
	children?: React.ReactNode;
}

export const FormValidateFieldProvider: React.FC<FormValidateFieldProviderProps> = ({
	validateField,
	children,
}) => {
	return (
		<FormValidateFieldContext.Provider value={validateField}>
			{children}
		</FormValidateFieldContext.Provider>
	);
};
// eslint-disable-next-line react-refresh/only-export-components
export const useFormValidateField = (): FormValidteFieldFunc => {
	const context = useContext(FormValidateFieldContext);
	if (!context) {
		throw new Error('useFormValidateField must be used within a FormValidateFieldProvider');
	}
	return context;
};
