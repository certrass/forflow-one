import { translate } from '@/i18n/i18n'

export function jevDeliveryCopy() {
  return {
    mode: translate('forflow.jevDelivery.mode', 'Check mode'),
    delivery: translate('forflow.jevDelivery.delivery', 'Delivery quality'),
    record: translate('forflow.jevDelivery.record', 'Single record'),
    scope: translate(
      'forflow.jevDelivery.scope',
      'Review one requirement against explicitly selected evidence. Every result requires human review.'
    ),
    criterion: translate('forflow.jevDelivery.criterion', 'Review requirement'),
    criterionHint: translate(
      'forflow.jevDelivery.criterionHint',
      'Uses this review version’s goal. To change it, edit the goal and reread the review first.'
    ),
    sources: translate('forflow.jevDelivery.sources', 'Review materials'),
    sourceHint: translate(
      'forflow.jevDelivery.sourceHint',
      'Choose up to 12 materials. Mark verification instructions as handoff instructions.'
    ),
    select: translate('forflow.jevDelivery.select', 'Select evidence'),
    handoff: translate('forflow.jevDelivery.handoff', 'Handoff instructions'),
    noSources: translate(
      'forflow.jevDelivery.noSources',
      'No readable evidence in this version. Reread the review or adjust its input scope.'
    ),
    selected: translate('forflow.jevDelivery.selected', 'Selected'),
    reviewRequired: translate('forflow.jevDelivery.reviewRequired', 'Awaiting review'),
    stale: translate(
      'forflow.jevDelivery.stale',
      'Historical question or evaluator version · rerun before adopting'
    ),
    clarity: translate('forflow.jevDelivery.clarity', 'Requirement clarity'),
    evidence: translate('forflow.jevDelivery.evidence', 'Evidence against the requirement'),
    nonconformance: translate(
      'forflow.jevDelivery.nonconformance',
      'Documented current nonconformance'
    ),
    operability: translate('forflow.jevDelivery.operability', 'Handoff operability'),
    coverage: translate('forflow.jevDelivery.coverage', 'Handoff coverage of the requirement'),
    operabilityHint: translate(
      'forflow.jevDelivery.operabilityHint',
      '0–4 describes how actionable the instructions are, not delivery quality or acceptance. No aggregate score is calculated.'
    ),
    confidence: translate('forflow.jevDelivery.confidence', 'Model confidence'),
    probability: translate('forflow.jevDelivery.probability', 'Probability of yes'),
    distribution: translate('forflow.jevDelivery.distribution', 'Probability distribution'),
    actionLabel: translate('forflow.jevDelivery.actionLabel', 'Program-generated follow-up'),
    scoreDifference: translate(
      'forflow.jevDelivery.scoreDifference',
      'Recomputed from displayed probabilities'
    ),
    scoreDifferenceHint: translate(
      'forflow.jevDelivery.scoreDifferenceHint',
      'Differs from the reported score; retained as a numeric diagnostic, not an acceptance threshold.'
    ),
    roles: {
      user_input: translate('forflow.jevDelivery.userInput', 'User-provided material'),
      assistant_claim: translate('forflow.jevDelivery.assistantClaim', 'Assistant claim'),
      tool_call: translate('forflow.jevDelivery.toolCall', 'Tool call'),
      execution_result: translate('forflow.jevDelivery.executionResult', 'Execution result'),
      artifact: translate('forflow.jevDelivery.artifact', 'Artifact'),
      derived_summary: translate('forflow.jevDelivery.derivedSummary', 'Derived summary')
    },
    choices: {
      clear: translate('forflow.jevDelivery.clear', 'Clear requirement'),
      ambiguous: translate('forflow.jevDelivery.ambiguous', 'Requirement needs clarification'),
      missing: translate('forflow.jevDelivery.missing', 'Requirement missing'),
      supported: translate(
        'forflow.jevDelivery.supported',
        'Selected evidence supports the requirement'
      ),
      unmet: translate('forflow.jevDelivery.unmet', 'Evidence of nonconformance'),
      insufficient: translate('forflow.jevDelivery.insufficient', 'More evidence needed'),
      conflicting: translate('forflow.jevDelivery.conflicting', 'Conflicting evidence'),
      full: translate('forflow.jevDelivery.full', 'Full coverage'),
      partial: translate('forflow.jevDelivery.partial', 'Partial coverage'),
      none: translate('forflow.jevDelivery.none', 'No coverage'),
      unclear: translate('forflow.jevDelivery.unclear', 'Unable to determine coverage')
    },
    actions: {
      clarity: translate(
        'forflow.jevDelivery.actionClarity',
        'Clarify the acceptance requirement, then reread and check the new version.'
      ),
      evidence: translate(
        'forflow.jevDelivery.actionEvidence',
        'Locate the evidence gap, nonconformance or conflict and register the follow-up for human review.'
      ),
      nonconformance: translate(
        'forflow.jevDelivery.actionNonconformance',
        'Verify the current nonconformance against the original record and track its resolution.'
      ),
      handoff: translate(
        'forflow.jevDelivery.actionHandoff',
        'Complete handoff instructions and their link to this requirement, then review the updated evidence.'
      )
    }
  }
}
