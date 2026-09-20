/** Counts apply only to usage records observed within the selected scope and range. */
export type UsageCostCoverage = {
  pricedRecords: number
  unpricedRecords: number
  /** Older or aggregated sources cannot establish per-record price availability. */
  unclassifiedRecords: number
}
