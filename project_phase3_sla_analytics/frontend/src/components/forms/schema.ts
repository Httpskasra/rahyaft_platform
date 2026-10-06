export type SharedFormOption = { label: string; value: string };
export type SharedFormField = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "email"
    | "tel"
    | "date"
    | "select"
    | "checkbox"
    | "rating";
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  options?: SharedFormOption[];
  helpText?: string;
};
export type SharedFormSection = {
  title?: string;
  description?: string;
  fields: SharedFormField[];
};
export type SharedFormSchema = {
  title?: string;
  description?: string;
  sections: SharedFormSection[];
};
export type SharedFormAnswers = Record<string, string | number | boolean>;
