export interface SchemaField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  options?: string[];
  columns?: {
    id: string;
    label: string;
    type: string;
    options?: string[];
  }[];
}


