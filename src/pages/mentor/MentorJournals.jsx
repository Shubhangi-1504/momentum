import { BookOpen, Eye } from 'lucide-react'

export default function MentorJournals() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Student Journals</h1>
        <p className="text-gray-600 mt-1">View journal entries shared by your students</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center gap-3">
        <Eye className="w-5 h-5 text-blue-600" />
        <p className="text-sm text-blue-700">
          You can only see journal entries that students have explicitly chosen to share with you.
        </p>
      </div>

      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
        <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No shared journals yet</h3>
        <p className="text-gray-500">Journal entries shared by students will appear here</p>
      </div>
    </div>
  )
}
