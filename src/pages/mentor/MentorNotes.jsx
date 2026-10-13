import NotesPage from '../../components/notes/NotesPage'

// Mentor Notes — thin wrapper; all logic lives in the shared NotesPage.
// Notes are private per user (RLS, migration 009).
export default function MentorNotes() {
  return <NotesPage role="mentor" />
}
