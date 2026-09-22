import ChatInterface from '../../components/chat/ChatInterface'

// Student Chat — thin wrapper so the shared interface can adapt
// labels/empty states per role. All logic lives in ChatInterface.
export default function StudentChat() {
  return <ChatInterface role="student" />
}
