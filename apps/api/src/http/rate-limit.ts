export const rateLimits = {
  auth: { max: 60, timeWindow: '1 minute' },
  invitationPublic: { max: 10, timeWindow: '1 minute' },
  invitationCreate: { max: 20, timeWindow: '1 hour' },
  resetRedeem: { max: 5, timeWindow: '15 minutes' },
  resetIssue: { max: 10, timeWindow: '1 hour' },
  uploadCreate: { max: 30, timeWindow: '1 minute' },
  boosterOpen: { max: 30, timeWindow: '1 minute' },
  cardAction: { max: 60, timeWindow: '1 minute' },
  adminAction: { max: 60, timeWindow: '1 minute' },
  accountDelete: { max: 5, timeWindow: '15 minutes' },
} as const
