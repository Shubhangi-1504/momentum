import { GraduationCap, Briefcase } from 'lucide-react'

const roles = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
    description: 'Track your study progress',
  },
  {
    id: 'mentor',
    label: 'Mentor',
    icon: Briefcase,
    description: 'Guide your students',
  },
]

export default function RoleSelector({ selectedRole, onRoleChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {roles.map((role) => {
        const Icon = role.icon
        const isActive = selectedRole === role.id

        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onRoleChange(role.id)}
            className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
              isActive
                ? 'border-[#4CAF50] bg-[#F1F8E9] shadow-md shadow-[#4CAF50]/10'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200 ${
                isActive
                  ? 'bg-[#4CAF50] text-white'
                  : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-500'
              }`}
            >
              <Icon className="w-4.5 h-4.5" />
            </div>
            <span
              className={`text-sm font-semibold transition-colors duration-200 ${
                isActive ? 'text-[#2E7D32]' : 'text-gray-600'
              }`}
            >
              {role.label}
            </span>
            <span
              className={`text-xs transition-colors duration-200 ${
                isActive ? 'text-[#4CAF50]' : 'text-gray-400'
              }`}
            >
              {role.description}
            </span>

            {isActive && (
              <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-[#4CAF50] rounded-full ring-2 ring-white" />
            )}
          </button>
        )
      })}
    </div>
  )
}
