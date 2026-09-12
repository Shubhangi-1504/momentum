import { BookOpen, Plus } from 'lucide-react'

export default function StudyTracker() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Study Tracker</h1>
          <p className="text-gray-600 mt-1">Manage your assignments and study tasks</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="w-5 h-5" />
          Add Assignment
        </button>
      </div>

      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
        <p className="text-gray-500">Start by adding your first assignment</p>
      </div>
    </div>
  )
}
