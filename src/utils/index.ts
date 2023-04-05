// @ts-ignore
export const withRetry = async (f: any, retries = 2) => {
    try {
      const res = await f()
      return res
    } catch (e) {
        console.log('withRetry', retries)
        if (retries === 0) {
            throw e
        }
        retries--
        return withRetry(f, retries)
    }
}