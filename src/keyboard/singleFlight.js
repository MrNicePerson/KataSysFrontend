export async function runSingleFlight(pending, key, work) {
  if (pending.has(key)) return null
  pending.add(key)
  try {
    return await work()
  } finally {
    pending.delete(key)
  }
}
