import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/services/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      // Không thử lại lỗi 4xx (sai quyền, không tồn tại...): thử lại cũng không khác.
      retry: (count, error) => count < 1 && !(error instanceof ApiError && error.status >= 400 && error.status < 500),
    },
  },
});
