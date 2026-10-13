import { GraduationCap, Briefcase } from 'lucide-react'

const roles = [
  {
    id: 'student',
    label: 'Student',
    icon: GraduationCap,
  },
  {
    id: 'mentor',
    label: 'Mentor',
    icon: Briefcase,
  },
]

export default function RoleSelector({ selectedRole, onRoleChange }) {
  return (
    <div className="ln-switch" role="group" aria-label="Choose your role">
      {roles.map((role) => {
        const Icon = role.icon
        const isActive = selectedRole === role.id

        return (
          <button
            key={role.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onRoleChange(role.id)}
            className={`ln-switch-btn ${isActive ? 'ln-switch-btn--active' : ''}`}
          >
            <Icon className="ln-switch-icon" />
            <span>{role.label}</span>
          </button>
        )
      })}
    </div>
  )
}
