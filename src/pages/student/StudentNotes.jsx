import NotesPage from '../../components/notes/NotesPage'

// Student Notes — thin wrapper; all logic lives in the shared NotesPage.
// Notes are private per user (RLS, migration 009).
export default function StudentNotes() {
  return <NotesPage role="student" />
}
