export const REQUIRED_CHAT_MODEL = 'gpt-5.6-luna';

export function getRequiredChatModel(): string {
  if (localStorage.getItem('smartChatModel') !== REQUIRED_CHAT_MODEL) {
    localStorage.setItem('smartChatModel', REQUIRED_CHAT_MODEL);
  }

  return REQUIRED_CHAT_MODEL;
}
