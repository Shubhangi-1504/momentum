import { BarChart3 } from 'lucide-react'

export default function StudentProgress() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Progress</h1>
        <p className="text-gray-600 mt-1">Track your overall academic progress</p>
      </div>

      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
        <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No progress data yet</h3>
        <p className="text-gray-500">Start tracking your study activities to see your progress</p>
      </div>
    </div>
  )
}
