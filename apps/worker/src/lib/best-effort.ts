import type { WorkerLogger } from './logger'

export type BestEffort = (
  context: object,
  message: string,
  task: () => Promise<unknown>,
) => Promise<void>

/** Returns a runner that awaits a side task and logs its failure instead of throwing. */
export function createBestEffort(logger: WorkerLogger): BestEffort {
  return async (context, message, task) => {
    try {
      await task()
    } catch (error) {
      logger.error({ ...context, err: error }, message)
    }
  }
}
