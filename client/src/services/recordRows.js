// List endpoints may return an array or a paginated { data, pagination } object.
export function recordRows(payload) {
  if (Array.isArray(payload)) return payload;
  return Array.isArray(payload?.data) ? payload.data : [];
}
