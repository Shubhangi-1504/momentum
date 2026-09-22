import ChatInterface from '../../components/chat/ChatInterface'

// Mentor Chat — thin wrapper so the shared interface can adapt
// labels/empty states per role. All logic lives in ChatInterface.
export default function MentorChat() {
  return <ChatInterface role="mentor" />
}
