import { PenTool, Plus, Lock } from 'lucide-react'

export default function Journal() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Journal</h1>
          <p className="text-gray-600 mt-1">Write private journal entries about your study journey</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          <Plus className="w-5 h-5" />
          New Entry
        </button>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Lock className="w-5 h-5 text-purple-600" />
        <p className="text-sm text-purple-700">
          Your journal entries are private by default. You can choose to share specific entries with your mentor.
        </p>
      </div>

      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
        <PenTool className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No journal entries yet</h3>
        <p className="text-gray-500">Start writing to capture your thoughts and reflections</p>
      </div>
    </div>
  )
}
