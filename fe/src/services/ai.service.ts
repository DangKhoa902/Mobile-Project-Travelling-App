import { useMutation } from "@tanstack/react-query";

import { apiClient } from "@/services/api/client";
import type { AssistantReply, AssistantTurn } from "@/types/api";

export { useAiStatus } from "@/services/support.service";

// Tối đa 20 lượt, lượt cuối là "user", vai trò xen kẽ bắt đầu bằng "user".
export async function askAssistant(messages: AssistantTurn[]) {
  const { data } = await apiClient.post<{ data: AssistantReply }>("/ai/assistant", { messages });
  return data.data;
}

export function useAskAssistant() {
  return useMutation({ mutationFn: (messages: AssistantTurn[]) => askAssistant(messages) });
}
