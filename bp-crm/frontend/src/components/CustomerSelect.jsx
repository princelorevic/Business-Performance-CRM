import { api } from '../api/client.js';
import { useAsync } from '../hooks/useAsync.js';
import { SelectField } from './ui/Field.jsx';

// Loads the first 100 customers for pickers (search-as-you-type is a later improvement).
export function CustomerSelect({ value, onChange, error }) {
  const { data } = useAsync(() => api.get('/customers', { pageSize: 100, sort: 'name', order: 'asc' }), []);
  const options = (data?.data ?? []).map((c) => ({ value: String(c.id), label: c.name }));
  return <SelectField label="Customer" value={value} onChange={onChange} error={error} options={options} placeholder="Select a customer" required />;
}
