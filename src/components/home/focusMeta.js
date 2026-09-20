// Status/priority presentation shared with the Study Tracker's semantics.
export const STATUS_META = {
  pending: { label: 'Pending', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', classes: 'bg-green-50 text-green-700 border-green-200' },
  overdue: { label: 'Overdue', classes: 'bg-red-50 text-red-700 border-red-200' },
}

export const PRIORITY_META = {
  low: { label: 'Low', classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  medium: { label: 'Medium', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  high: { label: 'High', classes: 'bg-red-50 text-red-700 border-red-200' },
}
